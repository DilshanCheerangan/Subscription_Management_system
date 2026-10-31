import { prisma } from "../lib/prisma";

async function main() {
  console.log("Applying missing performance indexes to PostgreSQL...");

  const queries = [
    'CREATE INDEX IF NOT EXISTS "Subscription_createdAt_idx" ON "Subscription"("createdAt" DESC);',
    'CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt" DESC);',
    'CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt" DESC);',
    'CREATE INDEX IF NOT EXISTS "Payment_paymentDate_idx" ON "Payment"("paymentDate" DESC);',
    'CREATE INDEX IF NOT EXISTS "QuotationTemplate_createdAt_idx" ON "QuotationTemplate"("createdAt" DESC);',
    'CREATE INDEX IF NOT EXISTS "Discount_createdAt_idx" ON "Discount"("createdAt" DESC);',
    'CREATE INDEX IF NOT EXISTS "Product_createdAt_idx" ON "Product"("createdAt" DESC);',
    'CREATE INDEX IF NOT EXISTS "Plan_createdAt_idx" ON "Plan"("createdAt" DESC);',
    'CREATE INDEX IF NOT EXISTS "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");',
  ];

  for (const q of queries) {
    console.log(`Executing: ${q}`);
    await prisma.$executeRawUnsafe(q);
  }

  console.log("All performance indexes applied successfully!");
}

main()
  .catch((e) => {
    console.error("Index error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
