import { Prisma } from "@prisma/client";

/**
 * Concurrency-safe sequential number generator for Subscriptions and Invoices.
 * Uses atomic row-level increment on NumberSequence inside a Prisma transaction.
 */
export async function getNextSubscriptionNumber(tx: Prisma.TransactionClient): Promise<string> {
  const sequence = await tx.numberSequence.upsert({
    where: { type: "SUBSCRIPTION" },
    update: { nextValue: { increment: 1 } },
    create: { type: "SUBSCRIPTION", nextValue: 2 },
  });

  const num = sequence.nextValue - 1;
  return `SUB-${String(num).padStart(5, "0")}`;
}

export async function getNextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const sequence = await tx.numberSequence.upsert({
    where: { type: "INVOICE" },
    update: { nextValue: { increment: 1 } },
    create: { type: "INVOICE", nextValue: 2 },
  });

  const num = sequence.nextValue - 1;
  return `INV-${String(num).padStart(5, "0")}`;
}
