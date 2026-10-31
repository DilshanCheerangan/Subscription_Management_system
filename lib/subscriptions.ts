import { roundMoney } from "@/lib/money";

export interface LineCalculationInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  taxPercentage?: number;
}

export interface CalculatedLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  untaxedAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface SubscriptionTotalsResult {
  lines: CalculatedLine[];
  subtotal: number;
  totalTax: number;
  total: number;
}

/**
 * Shared server function to calculate line item amounts and totals
 * with half-up rounding at line level per MASTER.md §2 & §4.
 */
export function calculateSubscriptionTotals(
  lines: LineCalculationInput[]
): SubscriptionTotalsResult {
  let subtotal = 0;
  let totalTax = 0;

  const calculatedLines: CalculatedLine[] = lines.map((line) => {
    const qty = Math.max(1, Number(line.quantity) || 1);
    const unitPrice = Math.max(0, Number(line.unitPrice) || 0);
    const taxRate = Math.max(0, Number(line.taxPercentage) || 0);

    const untaxedAmount = roundMoney(qty * unitPrice);
    const taxAmount = roundMoney(untaxedAmount * (taxRate / 100));
    const totalAmount = roundMoney(untaxedAmount + taxAmount);

    subtotal = roundMoney(subtotal + untaxedAmount);
    totalTax = roundMoney(totalTax + taxAmount);

    return {
      productId: line.productId,
      variantId: line.variantId || null,
      quantity: qty,
      unitPrice,
      taxPercentage: taxRate,
      untaxedAmount,
      taxAmount,
      totalAmount,
    };
  });

  const total = roundMoney(subtotal + totalTax);

  return {
    lines: calculatedLines,
    subtotal,
    totalTax,
    total,
  };
}
