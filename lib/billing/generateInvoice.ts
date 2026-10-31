import { Prisma, BillingPeriod, InvoiceStatus } from "@prisma/client";
import { addDays, addMonths, addYears } from "date-fns";
import { getNextInvoiceNumber } from "@/lib/sequence";
import { roundMoney, addMoney } from "@/lib/money";
import { calculateEligibleDiscounts, DiscountRule } from "@/lib/billing/discounts";
import { prisma } from "@/lib/prisma";

export class AlreadyBilledError extends Error {
  constructor(subscriptionNumber: string, periodStart: Date) {
    super(
      `Subscription ${subscriptionNumber} is already billed for period starting ${periodStart.toISOString()}`
    );
    this.name = "AlreadyBilledError";
  }
}

export function computePeriodEnd(periodStart: Date, billingPeriod: BillingPeriod): Date {
  const start = new Date(periodStart);
  switch (billingPeriod) {
    case "DAILY":
      return addDays(start, 1);
    case "WEEKLY":
      return addDays(start, 7);
    case "MONTHLY":
      return addMonths(start, 1);
    case "YEARLY":
      return addYears(start, 1);
    default:
      return addMonths(start, 1);
  }
}

export interface GenerateInvoiceParams {
  subscriptionId: string;
  periodStart: Date;
  periodEnd?: Date;
  status?: InvoiceStatus;
}

export interface GeneratedInvoiceResult {
  invoiceId: string;
  invoiceNumber: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  nextInvoiceDate: Date;
}

/**
 * Builds and records an invoice for a specific subscription and period.
 * 1. Reads subscription, checks idempotency, and resolves active discounts.
 * 2. Computes line amounts, taxes, and eligible discounts.
 * 3. Atomic transaction performs write operations: sequential number, invoice creation,
 *    discount usage increments, and subscription nextInvoiceDate advancement.
 */
export async function generateInvoice(
  params: GenerateInvoiceParams,
  passedTx?: Prisma.TransactionClient
): Promise<GeneratedInvoiceResult> {
  const { subscriptionId, periodStart } = params;
  const client = passedTx || prisma;

  // 1. Fetch Subscription with customer snapshot, plan, payment term, and lines with tax info
  const subscription = await client.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      customer: true,
      plan: true,
      paymentTerm: true,
      lines: {
        include: {
          product: true,
          variant: true,
          tax: true,
        },
      },
    },
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  // 2. Check if this period was already billed (Idempotency check)
  const existingInvoice = await client.invoice.findUnique({
    where: {
      subscriptionId_periodStart: {
        subscriptionId,
        periodStart,
      },
    },
  });

  if (existingInvoice) {
    throw new AlreadyBilledError(subscription.number, periodStart);
  }

  // 3. Determine Period and Due Date
  const periodEnd =
    params.periodEnd || computePeriodEnd(periodStart, subscription.plan.billingPeriod);

  const termDays = subscription.paymentTerm?.days ?? 0;
  const dueDate = termDays > 0 ? addDays(periodStart, termDays) : new Date(periodStart);

  // 4. Compute Lines & Raw Subtotals
  const linesForDiscount = subscription.lines.map((line) => {
    const qty = line.quantity;
    const price = Number(line.unitPrice);
    const subtotal = roundMoney(qty * price);
    return {
      lineId: line.id,
      productId: line.productId,
      variantId: line.variantId,
      quantity: qty,
      unitPrice: price,
      subtotal,
      tax: line.tax,
    };
  });

  const rawSubtotal = roundMoney(
    linesForDiscount.reduce((sum, l) => sum + l.subtotal, 0)
  );

  // 5. Query Active Discounts for Auto-Application
  const activeDiscounts = await client.discount.findMany({
    where: {
      active: true,
      startDate: { lte: periodStart },
      endDate: { gte: periodStart },
    },
    include: {
      products: { select: { id: true } },
    },
  });

  const discountRules: DiscountRule[] = activeDiscounts.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    value: Number(d.value),
    minPurchase: d.minPurchase ? Number(d.minPurchase) : null,
    minQuantity: d.minQuantity,
    startDate: d.startDate,
    endDate: d.endDate,
    usageLimit: d.usageLimit,
    usedCount: d.usedCount,
    scope: d.scope,
    active: d.active,
    productIds: d.products.map((p) => p.id),
  }));

  const discountResult = calculateEligibleDiscounts(
    linesForDiscount.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      subtotal: l.subtotal,
    })),
    discountRules,
    periodStart
  );

  // 6. Compute Taxes line by line
  let taxTotal = 0;
  const computedInvoiceLines = linesForDiscount.map((line) => {
    const taxPercentage = line.tax ? Number(line.tax.percentage) : 0;
    const taxFixed = line.tax ? Number(line.tax.fixedAmount) : 0;

    const percentageTax = roundMoney(line.subtotal * (taxPercentage / 100));
    const lineTax = roundMoney(addMoney(percentageTax, taxFixed));
    const lineTotal = roundMoney(addMoney(line.subtotal, lineTax));

    taxTotal = roundMoney(addMoney(taxTotal, lineTax));

    return {
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice: new Prisma.Decimal(line.unitPrice),
      taxId: line.tax?.id || null,
      subtotal: new Prisma.Decimal(line.subtotal),
      taxAmount: new Prisma.Decimal(lineTax),
      total: new Prisma.Decimal(lineTotal),
    };
  });

  const discountTotal = discountResult.totalDiscount;
  // Final total = max(0, subtotal + taxTotal - discountTotal)
  const finalTotal = Math.max(
    0,
    roundMoney(rawSubtotal + taxTotal - discountTotal)
  );

  // 7. Atomic Write Operations
  const executeWrites = async (tx: Prisma.TransactionClient) => {
    // Check again inside tx to ensure atomic idempotency under high concurrency
    const doubleCheck = await tx.invoice.findUnique({
      where: {
        subscriptionId_periodStart: {
          subscriptionId,
          periodStart,
        },
      },
    });
    if (doubleCheck) {
      throw new AlreadyBilledError(subscription.number, periodStart);
    }

    const invoiceNumber = await getNextInvoiceNumber(tx);

    const invoice = await tx.invoice.create({
      data: {
        number: invoiceNumber,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        status: params.status || InvoiceStatus.DRAFT,
        periodStart,
        periodEnd,
        dueDate,
        subtotal: new Prisma.Decimal(rawSubtotal),
        taxTotal: new Prisma.Decimal(taxTotal),
        discountTotal: new Prisma.Decimal(discountTotal),
        total: new Prisma.Decimal(finalTotal),
        amountPaid: new Prisma.Decimal(0),
        lines: {
          create: computedInvoiceLines,
        },
        discounts: {
          create: discountResult.appliedDiscounts.map((d) => ({
            discountId: d.discountId,
            amount: new Prisma.Decimal(d.amount),
          })),
        },
      },
    });

    for (const d of discountResult.appliedDiscounts) {
      await tx.discount.update({
        where: { id: d.discountId },
        data: { usedCount: { increment: 1 } },
      });
    }

    const nextInvoiceDate = periodEnd;
    await tx.subscription.update({
      where: { id: subscription.id },
      data: { nextInvoiceDate },
    });

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      subtotal: rawSubtotal,
      taxTotal,
      discountTotal,
      total: finalTotal,
      nextInvoiceDate,
    };
  };

  if (passedTx) {
    return await executeWrites(passedTx);
  }

  return await prisma.$transaction(executeWrites, { timeout: 15000 });
}

// Backward-compatibility alias
export const generateInvoiceForSubscription = (
  tx: Prisma.TransactionClient,
  params: GenerateInvoiceParams
) => generateInvoice(params, tx);
