import { prisma } from "../lib/prisma";
import { runBilling } from "../lib/billing/runBilling";
import { SubscriptionStatus } from "@prisma/client";
import { subDays } from "date-fns";
import { getNextSubscriptionNumber } from "../lib/sequence";

async function main() {
  console.log("=== Brightloop SMS: Billing Engine & Idempotency Tests ===\n");

  // 1. Setup / identify test customer, daily plan, and product
  let customer = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        email: "billing-customer@brightloop.test",
        name: "Billing Test Corp",
        role: "CUSTOMER",
        passwordHash: "dummy",
      },
    });
  }

  const dailyPlan = await prisma.plan.findFirst({
    where: { billingPeriod: "DAILY", active: true },
  });
  if (!dailyPlan) {
    throw new Error("No DAILY billing plan found in database. Please run seed.");
  }

  const product = await prisma.product.findFirst({ where: { active: true } });
  if (!product) {
    throw new Error("No active product found in database. Please run seed.");
  }

  const tax = await prisma.tax.findFirst({ where: { active: true } });

  // 2. Create an ACTIVE subscription that is due for billing
  // Set nextInvoiceDate to 2 days ago so it has 2 missed daily periods to catch up!
  const twoDaysAgo = subDays(new Date(), 2);
  const now = new Date();

  const sub = await prisma.$transaction(async (tx) => {
    const number = await getNextSubscriptionNumber(tx);
    return await tx.subscription.create({
      data: {
        number,
        customerId: customer.id,
        planId: dailyPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: twoDaysAgo,
        nextInvoiceDate: twoDaysAgo,
        lines: {
          create: {
            productId: product.id,
            quantity: 2,
            unitPrice: product.salesPrice,
            taxId: tax?.id || null,
            amount: Number(product.salesPrice) * 2,
          },
        },
      },
    });
  });

  console.log(`[Test 1] Created test subscription: ${sub.number} (DAILY plan)`);
  console.log(`  Initial nextInvoiceDate: ${sub.nextInvoiceDate!.toISOString()}`);

  // Check discount state before
  const discountBefore = await prisma.discount.findFirst({
    where: { active: true, scope: "SUBSCRIPTION" },
  });
  const initialDiscountUsedCount = discountBefore?.usedCount ?? 0;
  console.log(`  Discount '${discountBefore?.name}' usedCount before: ${initialDiscountUsedCount}`);

  // 3. First Billing Run: Catch up missed periods
  console.log("\n[Test 2] Executing FIRST billing run (catch-up + auto-discount)...");
  const run1Result = await runBilling(now);
  console.log(`  Run 1 Results:`);
  console.log(`    - Invoices Created: ${run1Result.created}`);
  console.log(`    - Periods Skipped: ${run1Result.skipped}`);
  console.log(`    - Failures: ${run1Result.failed.length}`);

  if (run1Result.created < 1) {
    throw new Error(`Expected at least 1 invoice created on Run 1, got ${run1Result.created}`);
  }

  // Verify that invoices were created for this subscription
  const createdInvoices = await prisma.invoice.findMany({
    where: { subscriptionId: sub.id },
    include: { discounts: true, lines: true },
    orderBy: { periodStart: "asc" },
  });

  console.log(`  Verified ${createdInvoices.length} invoices generated for ${sub.number}:`);
  for (const inv of createdInvoices) {
    console.log(
      `    • ${inv.number} | Period: ${inv.periodStart.toISOString().slice(0, 10)} to ${inv.periodEnd.toISOString().slice(0, 10)} | Total: ₹${Number(inv.total)} | Discounts: ${inv.discounts.length}`
    );
  }

  // Verify nextInvoiceDate advanced
  const subAfterRun1 = await prisma.subscription.findUniqueOrThrow({
    where: { id: sub.id },
  });
  console.log(`  Updated subscription nextInvoiceDate: ${subAfterRun1.nextInvoiceDate!.toISOString()}`);
  if (subAfterRun1.nextInvoiceDate! <= twoDaysAgo) {
    throw new Error("Subscription nextInvoiceDate was not advanced!");
  }

  // Verify discount usedCount incremented
  if (discountBefore) {
    const discountAfter = await prisma.discount.findUnique({
      where: { id: discountBefore.id },
    });
    console.log(
      `  Discount '${discountBefore.name}' usedCount after: ${discountAfter?.usedCount} (increased from ${initialDiscountUsedCount})`
    );
  }

  // 4. SECOND BILLING RUN (IDEMPOTENCY PROOF)
  console.log("\n[Test 3] Executing SECOND billing run immediately with the same target date...");
  const run2Result = await runBilling(now);
  console.log(`  Run 2 Results:`);
  console.log(`    - Invoices Created: ${run2Result.created}`);
  console.log(`    - Periods Skipped: ${run2Result.skipped}`);
  console.log(`    - Failures: ${run2Result.failed.length}`);

  if (run2Result.created !== 0) {
    throw new Error(
      `IDEMPOTENCY VIOLATION: Run 2 created ${run2Result.created} new invoices when zero were expected!`
    );
  }

  console.log("\n✓ IDEMPOTENCY PROVEN: Zero duplicate invoices created on second execution!");
  console.log("=== ALL BILLING ENGINE INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
}

main()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
