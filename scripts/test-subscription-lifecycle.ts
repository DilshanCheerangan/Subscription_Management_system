import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { prisma } from "../lib/prisma";
import { getNextSubscriptionNumber } from "../lib/sequence";
import {
  validateSubscriptionTransition,
  executeSubscriptionTransition,
} from "../lib/state-machines/subscription";
import { calculateSubscriptionTotals } from "../lib/subscriptions";
import { closeExpiredSubscriptions } from "../lib/jobs/closeExpired";
import { SubscriptionStatus } from "@prisma/client";

async function runTests() {
  console.log("=== Brightloop SMS: Subscription Lifecycle & Engine Tests ===");

  // 1. Test Sequential Numbering
  console.log("\n[Test 1] Concurrency-Safe Sequential Numbering...");
  const numbers = await prisma.$transaction(async (tx) => {
    const num1 = await getNextSubscriptionNumber(tx);
    const num2 = await getNextSubscriptionNumber(tx);
    return [num1, num2];
  });

  console.log(`  Generated: ${numbers[0]}, ${numbers[1]}`);
  if (!numbers[0].startsWith("SUB-") || !numbers[1].startsWith("SUB-")) {
    throw new Error("Sequential numbers must follow SUB-00001 format");
  }
  const n1 = parseInt(numbers[0].replace("SUB-", ""), 10);
  const n2 = parseInt(numbers[1].replace("SUB-", ""), 10);
  if (n2 !== n1 + 1) {
    throw new Error(`Expected consecutive numbers, got ${n1} and ${n2}`);
  }
  console.log("  ✓ Sequential numbering test passed.");

  // 2. Test Shared Calculations Helper
  console.log("\n[Test 2] Line Level Totals & Half-Up Rounding...");
  const calcResult = calculateSubscriptionTotals([
    { productId: "p1", quantity: 2, unitPrice: 2499.5, taxPercentage: 18 },
    { productId: "p2", quantity: 1, unitPrice: 560, taxPercentage: 18 },
    { productId: "p3", quantity: 3, unitPrice: 100, taxPercentage: 0 },
  ]);

  console.log("  Subtotal:", calcResult.subtotal);
  console.log("  Tax:", calcResult.totalTax);
  console.log("  Total:", calcResult.total);
  // line 1: 2 * 2499.5 = 4999, tax 18% = 899.82 -> 5898.82
  // line 2: 1 * 560 = 560, tax 18% = 100.80 -> 660.80
  // line 3: 3 * 100 = 300, tax 0% = 0 -> 300
  // subtotal = 4999 + 560 + 300 = 5859
  // totalTax = 899.82 + 100.80 = 1000.62
  // total = 6859.62
  if (calcResult.subtotal !== 5859 || calcResult.totalTax !== 1000.62 || calcResult.total !== 6859.62) {
    throw new Error(`Calculation mismatch! Expected 5859/1000.62/6859.62, got ${calcResult.subtotal}/${calcResult.totalTax}/${calcResult.total}`);
  }
  console.log("  ✓ Shared calculation test passed.");

  // 3. Test State Machine Transition Rules
  console.log("\n[Test 3] State Machine Legal & Illegal Transitions...");

  // Pausable flag test
  const pausablePlan = { pausable: true, closable: true, autoClose: false, renewable: true };
  const unpausablePlan = { pausable: false, closable: true, autoClose: false, renewable: true };

  const validPause = validateSubscriptionTransition({
    currentStatus: SubscriptionStatus.ACTIVE,
    targetStatus: SubscriptionStatus.PAUSED,
    planFlags: pausablePlan,
  });
  if (!validPause.allowed) throw new Error("ACTIVE -> PAUSED should be allowed when pausable: true");

  const invalidPause = validateSubscriptionTransition({
    currentStatus: SubscriptionStatus.ACTIVE,
    targetStatus: SubscriptionStatus.PAUSED,
    planFlags: unpausablePlan,
  });
  if (invalidPause.allowed) throw new Error("ACTIVE -> PAUSED should be blocked when pausable: false");

  // Closable early flag test
  const unclosablePlan = { pausable: true, closable: false, autoClose: false, renewable: true };
  const blockedClose = validateSubscriptionTransition({
    currentStatus: SubscriptionStatus.ACTIVE,
    targetStatus: SubscriptionStatus.CLOSED,
    planFlags: unclosablePlan,
    isExpired: false,
  });
  if (blockedClose.allowed) throw new Error("ACTIVE -> CLOSED should be blocked when closable: false and not expired");

  const expiredClose = validateSubscriptionTransition({
    currentStatus: SubscriptionStatus.ACTIVE,
    targetStatus: SubscriptionStatus.CLOSED,
    planFlags: unclosablePlan,
    isExpired: true, // past expiry
  });
  if (!expiredClose.allowed) throw new Error("ACTIVE -> CLOSED should be allowed past expiry even if closable: false");

  // Terminal state test
  const closedToActive = validateSubscriptionTransition({
    currentStatus: SubscriptionStatus.CLOSED,
    targetStatus: SubscriptionStatus.ACTIVE,
    planFlags: pausablePlan,
  });
  if (closedToActive.allowed) throw new Error("CLOSED -> ACTIVE should be blocked (terminal state)");

  console.log("  ✓ State machine validation rules test passed.");

  // 4. Test Full Lifecycle DB Execution & History Logging
  console.log("\n[Test 4] Full Database Lifecycle Execution (DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> PAUSED -> ACTIVE -> CLOSED)...");

  // Ensure a test customer exists
  let customer = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        email: "customer-test@brightloop.test",
        name: "Test Customer Org",
        role: "CUSTOMER",
        passwordHash: "dummy",
      },
    });
  }

  const plan = await prisma.plan.findFirst({ where: { pausable: true, closable: true } });
  if (!plan) throw new Error("Pausable plan not found for test");

  const product = await prisma.product.findFirst();
  if (!product) throw new Error("Product not found for test");

  const sub = await prisma.$transaction(async (tx) => {
    const number = await getNextSubscriptionNumber(tx);
    return await tx.subscription.create({
      data: {
        number,
        customerId: customer.id,
        planId: plan.id,
        status: SubscriptionStatus.DRAFT,
        startDate: new Date(),
        nextInvoiceDate: new Date(),
        lines: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: product.salesPrice,
            amount: product.salesPrice,
          },
        },
        history: {
          create: {
            fromStatus: null,
            toStatus: SubscriptionStatus.DRAFT,
            reason: "Initial creation",
          },
        },
      },
    });
  });

  console.log(`  Created test subscription: ${sub.number} (${sub.status})`);

  // DRAFT -> QUOTATION
  await prisma.$transaction(async (tx) => {
    await executeSubscriptionTransition(tx, {
      subscriptionId: sub.id,
      targetStatus: SubscriptionStatus.QUOTATION,
      reason: "Quotation generated and sent to customer",
    });
  });

  // QUOTATION -> CONFIRMED
  await prisma.$transaction(async (tx) => {
    await executeSubscriptionTransition(tx, {
      subscriptionId: sub.id,
      targetStatus: SubscriptionStatus.CONFIRMED,
      reason: "Customer accepted quotation terms",
    });
  });

  // CONFIRMED -> ACTIVE
  await prisma.$transaction(async (tx) => {
    await executeSubscriptionTransition(tx, {
      subscriptionId: sub.id,
      targetStatus: SubscriptionStatus.ACTIVE,
      reason: "Contract activated and provisioning initialized",
    });
  });

  // ACTIVE -> PAUSED
  await prisma.$transaction(async (tx) => {
    await executeSubscriptionTransition(tx, {
      subscriptionId: sub.id,
      targetStatus: SubscriptionStatus.PAUSED,
      reason: "Customer requested temporary seasonal freeze",
    });
  });

  // PAUSED -> ACTIVE
  await prisma.$transaction(async (tx) => {
    await executeSubscriptionTransition(tx, {
      subscriptionId: sub.id,
      targetStatus: SubscriptionStatus.ACTIVE,
      reason: "Seasonal freeze ended, resuming service",
    });
  });

  // ACTIVE -> CLOSED
  await prisma.$transaction(async (tx) => {
    await executeSubscriptionTransition(tx, {
      subscriptionId: sub.id,
      targetStatus: SubscriptionStatus.CLOSED,
      reason: "Subscription concluded upon agreed closure",
    });
  });

  // Verify history
  const history = await prisma.subscriptionStatusHistory.findMany({
    where: { subscriptionId: sub.id },
    orderBy: { createdAt: "asc" },
  });

  console.log(`  Audit History logged ${history.length} transition events.`);
  const statusProgression = history.map((h) => h.toStatus);
  console.log("  Progression:", statusProgression.join(" -> "));

  if (history.length !== 7) {
    throw new Error(`Expected 7 history events (initial + 6 transitions), got ${history.length}`);
  }
  console.log("  ✓ Full lifecycle & audit trail passed.");

  // 5. Test autoClose Job
  console.log("\n[Test 5] AutoClose Expired Subscriptions Job...");
  // Create an expired subscription with autoClose plan
  let autoClosePlan = await prisma.plan.findFirst({ where: { autoClose: true } });
  if (!autoClosePlan) {
    autoClosePlan = await prisma.plan.create({
      data: {
        name: "Test AutoClose Plan",
        billingPeriod: "MONTHLY",
        price: 100,
        autoClose: true,
        closable: true,
        pausable: false,
      },
    });
  }

  const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
  const expiredSub = await prisma.$transaction(async (tx) => {
    const number = await getNextSubscriptionNumber(tx);
    return await tx.subscription.create({
      data: {
        number,
        customerId: customer.id,
        planId: autoClosePlan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        expiryDate: expiredDate,
        nextInvoiceDate: new Date(),
        lines: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 100,
            amount: 100,
          },
        },
      },
    });
  });

  const jobResult = await closeExpiredSubscriptions();
  console.log(`  Job Processed: ${jobResult.checked}, Closed: ${jobResult.closedCount}`);
  if (!jobResult.closedSubscriptionNumbers.includes(expiredSub.number)) {
    throw new Error(`Expected ${expiredSub.number} to be auto-closed by job`);
  }

  const refreshedSub = await prisma.subscription.findUnique({ where: { id: expiredSub.id } });
  if (refreshedSub?.status !== SubscriptionStatus.CLOSED) {
    throw new Error(`Expected status to be CLOSED, got ${refreshedSub?.status}`);
  }
  console.log("  ✓ autoClose job passed.");

  console.log("\n=== ALL SUBSCRIPTION TESTS PASSED SUCCESSFULLY! ===");
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
