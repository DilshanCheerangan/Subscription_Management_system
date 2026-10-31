import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import {
  PrismaClient,
  Role,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentMethod,
  BillingPeriod,
  Prisma,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// Helper to chunk arrays for createMany
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const CUSTOMER_COMPANIES = [
  "Acme Corp", "Nexus Software", "Vertex Analytics", "Quantum Systems", "CyberPulse",
  "BlueSky Media", "Starlight Cloud", "Horizon AI", "Apex Innovations", "Nova Tech",
  "Pinnacle Systems", "Catalyst Dynamics", "Synergy Labs", "AeroByte", "Vanguard Digital",
  "Echo Wave", "Prism Cloud", "Zenith Solutions", "Atlas Networks", "Titan Infrastructure",
  "InfiniStream", "Orbit Enterprise", "Hyperion Web", "PulsePoint", "Crestview Media",
  "Silverline Logistics", "Solaris Computing", "Beacon Health", "FusionWorks", "Solstice AI",
  "OmniFlow", "Stratum Capital", "Terraform Dynamics", "Eon Technologies", "Archon Systems",
  "Velocity SaaS", "Ironclad Security", "Vector Data", "Meridian Solutions", "Lumina Cloud",
  "CoreStack", "NextGen Mobility", "TrueNorth Dev", "CipherCore", "Stratus Global",
  "Paramount Commerce", "Synapse Robotics", "AlphaEdge", "Frontier Web", "Zephyr Labs",
];

async function main() {
  const startTime = Date.now();
  console.log("=== Brightloop SMS: High-Performance Data Seeding (Phase 8) ===");
  console.log("Target: 50 customers, 2,000 subscriptions, 5,000 invoices with realistic payments.");
  console.log("Goal: Complete in under 2 minutes using createMany bulk batches.\n");

  // 1. Ensure Base Configuration & Demo Products Exist
  console.log("[1/6] Verifying base catalog, plans, taxes, and payment terms...");
  const existingPlans = await prisma.plan.findMany();
  const existingProducts = await prisma.product.findMany({ include: { variants: true } });
  const existingTaxes = await prisma.tax.findMany();
  const existingPaymentTerms = await prisma.paymentTerm.findMany();

  if (existingPlans.length === 0 || existingProducts.length === 0 || existingTaxes.length === 0) {
    console.error("Base catalog missing! Please run 'npm run db:seed' first to populate base plans, products and taxes.");
    process.exit(1);
  }

  const tax18 = existingTaxes.find((t) => Number(t.percentage) === 18) || existingTaxes[0];
  const tax5 = existingTaxes.find((t) => Number(t.percentage) === 5) || existingTaxes[0];
  const defaultPaymentTerm = existingPaymentTerms.find((p) => p.days === 15) || existingPaymentTerms[0];

  // Ensure Demo Staff Account Exists
  const staffHash = bcrypt.hashSync("Staff@12345", 10);
  await prisma.user.upsert({
    where: { email: "staff@brightloop.test" },
    update: { role: Role.STAFF },
    create: {
      email: "staff@brightloop.test",
      name: "Brightloop Staff Support",
      role: Role.STAFF,
      passwordHash: staffHash,
    },
  });

  // 2. Create 50 Customers
  console.log("[2/6] Generating 50 Customers with pre-hashed credentials...");
  const customerPasswordHash = bcrypt.hashSync("Customer@12345", 10);
  const customerIds: string[] = [];
  const customerRows: Prisma.UserCreateManyInput[] = [];

  for (let i = 1; i <= 50; i++) {
    const id = crypto.randomUUID();
    customerIds.push(id);
    const company = CUSTOMER_COMPANIES[i - 1] || `Customer Enterprise ${i}`;
    customerRows.push({
      id,
      email: `customer${i}@brightloop.test`,
      name: company,
      role: Role.CUSTOMER,
      passwordHash: customerPasswordHash,
      createdAt: new Date(Date.now() - (500 - i * 5) * 86400000),
    });
  }

  // Upsert or insert customers safely
  const existingCustomers = await prisma.user.findMany({
    where: { email: { in: customerRows.map((c) => c.email) } },
    select: { id: true, email: true },
  });
  const existingEmailSet = new Set(existingCustomers.map((c) => c.email));
  const newCustomersToInsert = customerRows.filter((c) => !existingEmailSet.has(c.email));

  if (newCustomersToInsert.length > 0) {
    await prisma.user.createMany({ data: newCustomersToInsert });
  }

  // Refetch all 50 customer IDs
  const allSeededCustomers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
    select: { id: true },
    take: 50,
  });
  const activeCustomerIds = allSeededCustomers.map((c) => c.id);
  console.log(`✓ 50 Customers verified (Total available: ${activeCustomerIds.length})`);

  // 3. Generate 2,000 Subscriptions
  console.log("[3/6] Generating 2,000 Subscriptions & Subscription Lines...");
  const subscriptionRows: Prisma.SubscriptionCreateManyInput[] = [];
  const subscriptionLineRows: Prisma.SubscriptionLineCreateManyInput[] = [];
  const subscriptionIds: string[] = [];

  // Determine starting sequence offset to avoid collisions
  const countExistingSubs = await prisma.subscription.count();
  const subNumberOffset = 10000 + countExistingSubs;

  const now = new Date();
  const statuses: SubscriptionStatus[] = [
    ...Array(1300).fill(SubscriptionStatus.ACTIVE),
    ...Array(250).fill(SubscriptionStatus.CONFIRMED),
    ...Array(200).fill(SubscriptionStatus.PAUSED),
    ...Array(150).fill(SubscriptionStatus.CLOSED),
    ...Array(100).fill(SubscriptionStatus.QUOTATION),
  ];

  for (let i = 0; i < 2000; i++) {
    const subId = crypto.randomUUID();
    subscriptionIds.push(subId);

    const customerId = activeCustomerIds[i % activeCustomerIds.length];
    const plan = existingPlans[i % existingPlans.length];
    const status = statuses[i % statuses.length];

    // Distribute start dates over the past 365 days
    const daysAgo = Math.floor(Math.random() * 330) + 10;
    const startDate = new Date(now.getTime() - daysAgo * 86400000);

    let expiryDate: Date | null = null;
    let nextInvoiceDate: Date | null = null;

    if (plan.billingPeriod === BillingPeriod.DAILY) {
      nextInvoiceDate = new Date(startDate.getTime() + 1 * 86400000);
      expiryDate = new Date(startDate.getTime() + 90 * 86400000);
    } else if (plan.billingPeriod === BillingPeriod.WEEKLY) {
      nextInvoiceDate = new Date(startDate.getTime() + 7 * 86400000);
      expiryDate = new Date(startDate.getTime() + 180 * 86400000);
    } else if (plan.billingPeriod === BillingPeriod.YEARLY) {
      nextInvoiceDate = new Date(startDate.getTime() + 365 * 86400000);
      expiryDate = new Date(startDate.getTime() + 730 * 86400000);
    } else {
      nextInvoiceDate = new Date(startDate.getTime() + 30 * 86400000);
      expiryDate = new Date(startDate.getTime() + 365 * 86400000);
    }

    if (status === SubscriptionStatus.CLOSED) {
      nextInvoiceDate = null;
    }

    const subNumber = `SUB-${String(subNumberOffset + i + 1).padStart(5, "0")}`;

    subscriptionRows.push({
      id: subId,
      number: subNumber,
      customerId,
      planId: plan.id,
      status,
      startDate,
      expiryDate,
      paymentTermId: defaultPaymentTerm?.id,
      nextInvoiceDate,
      notes: `High-volume performance benchmark subscription #${i + 1}`,
      createdAt: startDate,
      updatedAt: startDate,
    });

    // Generate 1 primary line for plan/product
    const product = existingProducts[i % existingProducts.length];
    const variant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    const unitPrice = Number(plan.price) > 0 ? Number(plan.price) : Number(product.salesPrice);
    const tax = i % 2 === 0 ? tax18 : tax5;
    const taxAmount = (unitPrice * Number(tax.percentage)) / 100;
    const lineTotal = unitPrice + taxAmount;

    subscriptionLineRows.push({
      id: crypto.randomUUID(),
      subscriptionId: subId,
      productId: product.id,
      variantId: variant?.id || null,
      quantity: 1,
      unitPrice: new Prisma.Decimal(unitPrice),
      taxId: tax.id,
      amount: new Prisma.Decimal(lineTotal),
      createdAt: startDate,
      updatedAt: startDate,
    });
  }

  // Insert Subscriptions in chunks of 1000
  for (const chunk of chunkArray(subscriptionRows, 1000)) {
    await prisma.subscription.createMany({ data: chunk });
  }
  // Insert Subscription Lines in chunks of 1000
  for (const chunk of chunkArray(subscriptionLineRows, 1000)) {
    await prisma.subscriptionLine.createMany({ data: chunk });
  }
  console.log(`✓ 2,000 Subscriptions & 2,000 Subscription Lines inserted.`);

  // 4. Generate 5,000 Invoices
  console.log("[4/6] Generating 5,000 Invoices & Lines with realistic lifecycle distribution...");
  const invoiceRows: Prisma.InvoiceCreateManyInput[] = [];
  const invoiceLineRows: Prisma.InvoiceLineCreateManyInput[] = [];
  const paymentRows: Prisma.PaymentCreateManyInput[] = [];

  const countExistingInvoices = await prisma.invoice.count();
  const invNumberOffset = 10000 + countExistingInvoices;

  // Realistic status mix:
  // - 3,200 PAID (~64%)
  // - 1,000 CONFIRMED Overdue (~20%)
  // - 500 CONFIRMED Outstanding upcoming (~10%)
  // - 200 DRAFT (~4%)
  // - 100 CANCELLED (~2%)
  const invoiceStatuses: { status: InvoiceStatus; isOverdue: boolean }[] = [
    ...Array(3200).fill({ status: InvoiceStatus.PAID, isOverdue: false }),
    ...Array(1000).fill({ status: InvoiceStatus.CONFIRMED, isOverdue: true }),
    ...Array(500).fill({ status: InvoiceStatus.CONFIRMED, isOverdue: false }),
    ...Array(200).fill({ status: InvoiceStatus.DRAFT, isOverdue: false }),
    ...Array(100).fill({ status: InvoiceStatus.CANCELLED, isOverdue: false }),
  ];

  const paymentMethods = [
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.UPI,
    PaymentMethod.CARD,
    PaymentMethod.CASH,
  ];

  for (let i = 0; i < 5000; i++) {
    const invId = crypto.randomUUID();
    const invNumber = `INV-${String(invNumberOffset + i + 1).padStart(5, "0")}`;

    // Associate with one of the seeded subscriptions
    const subIndex = i % subscriptionRows.length;
    const sub = subscriptionRows[subIndex];
    const subLine = subscriptionLineRows[subIndex];

    const { status, isOverdue } = invoiceStatuses[i % invoiceStatuses.length];

    // Period staggering so (subscriptionId, periodStart) is always strictly unique
    const cycleIndex = Math.floor(i / subscriptionRows.length);
    const startDateObj = new Date(sub.startDate);
    const periodStart = new Date(startDateObj.getTime() + cycleIndex * 30 * 86400000);
    const periodEnd = new Date(periodStart.getTime() + 30 * 86400000);

    let dueDate: Date;
    if (isOverdue) {
      // Due 5 to 60 days in the past
      const daysOverdue = Math.floor(Math.random() * 55) + 5;
      dueDate = new Date(now.getTime() - daysOverdue * 86400000);
    } else if (status === InvoiceStatus.PAID) {
      // Paid in the past
      dueDate = new Date(periodStart.getTime() + 15 * 86400000);
    } else {
      // Due in the future (next 5 to 30 days)
      const futureDays = Math.floor(Math.random() * 25) + 5;
      dueDate = new Date(now.getTime() + futureDays * 86400000);
    }

    const subtotal = Number(subLine.unitPrice);
    const taxTotal = Number(subLine.amount) - subtotal;
    const total = subtotal + taxTotal;

    let amountPaid = 0;
    if (status === InvoiceStatus.PAID) {
      amountPaid = total;
    } else if (status === InvoiceStatus.CONFIRMED && isOverdue && i % 3 === 0) {
      // A small fraction of overdue invoices have a partial payment
      amountPaid = Math.floor(total * 0.4);
    }

    invoiceRows.push({
      id: invId,
      number: invNumber,
      subscriptionId: sub.id!,
      customerId: sub.customerId!,
      status,
      periodStart,
      periodEnd,
      dueDate,
      subtotal: new Prisma.Decimal(subtotal),
      taxTotal: new Prisma.Decimal(taxTotal),
      discountTotal: new Prisma.Decimal(0),
      total: new Prisma.Decimal(total),
      amountPaid: new Prisma.Decimal(amountPaid),
      createdAt: periodStart,
      updatedAt: dueDate,
    });

    invoiceLineRows.push({
      id: crypto.randomUUID(),
      invoiceId: invId,
      productId: subLine.productId!,
      variantId: subLine.variantId,
      quantity: subLine.quantity,
      unitPrice: subLine.unitPrice,
      taxId: subLine.taxId,
      subtotal: new Prisma.Decimal(subtotal),
      taxAmount: new Prisma.Decimal(taxTotal),
      total: new Prisma.Decimal(total),
    });

    // Create payment records where amountPaid > 0
    if (amountPaid > 0) {
      const paymentDate = new Date(dueDate.getTime() - 2 * 86400000);
      paymentRows.push({
        id: crypto.randomUUID(),
        invoiceId: invId,
        method: paymentMethods[i % paymentMethods.length],
        amount: new Prisma.Decimal(amountPaid),
        paymentDate: paymentDate < now ? paymentDate : now,
        note: `Electronic settlement for ${invNumber}`,
        createdAt: paymentDate < now ? paymentDate : now,
      });
    }
  }

  // Insert Invoices in chunks of 1000
  for (const chunk of chunkArray(invoiceRows, 1000)) {
    await prisma.invoice.createMany({ data: chunk });
  }
  // Insert Invoice Lines in chunks of 1000
  for (const chunk of chunkArray(invoiceLineRows, 1000)) {
    await prisma.invoiceLine.createMany({ data: chunk });
  }
  console.log(`✓ 5,000 Invoices & 5,000 Invoice Lines inserted.`);

  // 5. Insert Payments
  console.log(`[5/6] Inserting ${paymentRows.length} Payment records...`);
  for (const chunk of chunkArray(paymentRows, 1000)) {
    await prisma.payment.createMany({ data: chunk });
  }
  console.log(`✓ ${paymentRows.length} Payments inserted.`);

  // 6. Update Sequential Counters in DB
  console.log("[6/6] Updating sequential number sequence counters...");
  await prisma.numberSequence.upsert({
    where: { type: "SUBSCRIPTION" },
    update: { nextValue: subNumberOffset + 2000 + 1 },
    create: { type: "SUBSCRIPTION", nextValue: subNumberOffset + 2000 + 1 },
  });

  await prisma.numberSequence.upsert({
    where: { type: "INVOICE" },
    update: { nextValue: invNumberOffset + 5000 + 1 },
    create: { type: "INVOICE", nextValue: invNumberOffset + 5000 + 1 },
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n========================================================`);
  console.log(`🎉 HIGH-VOLUME PERFORMANCE SEED COMPLETE in ${durationSec}s!`);
  console.log(`- 50 Customers`);
  console.log(`- 2,000 Subscriptions`);
  console.log(`- 5,000 Invoices (Paid, Overdue, Outstanding, Draft)`);
  console.log(`- ${paymentRows.length} Payments`);
  console.log(`========================================================\n`);
}

main()
  .catch((e) => {
    console.error("[PerfSeed] Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
