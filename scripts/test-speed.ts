import { prisma } from "../lib/prisma";

async function test() {
  await prisma.$queryRaw`SELECT 1`;

  // 1. Subscriptions: 1 query for both data and total count
  const start1 = performance.now();
  const subRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
      s.id, s.number, s.status, s."startDate", s."expiryDate", s."nextInvoiceDate", s."createdAt",
      u.name as "customerName", u.email as "customerEmail",
      p.name as "planName", p."billingPeriod" as "planBillingPeriod", p.price as "planPrice",
      COUNT(*) OVER()::int as "totalCount"
    FROM "Subscription" s
    JOIN "User" u ON s."customerId" = u.id
    JOIN "Plan" p ON s."planId" = p.id
    ORDER BY s."createdAt" DESC
    LIMIT 20 OFFSET 0;
  `;
  const time1 = (performance.now() - start1).toFixed(1);
  console.log(`⚡ Subscriptions 1-Query: ${time1}ms (returned: ${subRows.length})`);

  // 2. Invoices: 1 query for data and total count
  const start2 = performance.now();
  const invRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
      inv.id, inv.number, inv.status, inv."dueDate", inv.total, inv."amountPaid", inv."createdAt",
      u.name as "customerName",
      s.number as "subscriptionNumber",
      COUNT(*) OVER()::int as "totalCount"
    FROM "Invoice" inv
    JOIN "User" u ON inv."customerId" = u.id
    JOIN "Subscription" s ON inv."subscriptionId" = s.id
    ORDER BY inv."createdAt" DESC
    LIMIT 20 OFFSET 0;
  `;
  const time2 = (performance.now() - start2).toFixed(1);
  console.log(`⚡ Invoices 1-Query: ${time2}ms (returned: ${invRows.length})`);

  // 3. Payments: 1 query for data and total count
  const start3 = performance.now();
  const payRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
      pm.id, pm.method, pm.amount, pm."paymentDate", pm.note,
      inv.number as "invoiceNumber",
      u.name as "customerName",
      COUNT(*) OVER()::int as "totalCount"
    FROM "Payment" pm
    JOIN "Invoice" inv ON pm."invoiceId" = inv.id
    JOIN "User" u ON inv."customerId" = u.id
    ORDER BY pm."paymentDate" DESC
    LIMIT 20 OFFSET 0;
  `;
  const time3 = (performance.now() - start3).toFixed(1);
  console.log(`⚡ Payments 1-Query: ${time3}ms (returned: ${payRows.length})`);
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
