/**
 * Money and decimal calculation helpers.
 * Ensures consistent 2-decimal half-up rounding across all calculations per MASTER.md.
 */

export const DEFAULT_CURRENCY = "INR";

/**
 * Rounds a number to 2 decimal places using standard half-up rounding.
 * Avoids IEEE 754 floating-point inaccuracies by using EPSILON.
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function addMoney(a: number, b: number): number {
  return roundMoney(a + b);
}

export function subtractMoney(a: number, b: number): number {
  return roundMoney(a - b);
}

export function multiplyMoney(a: number, b: number): number {
  return roundMoney(a * b);
}

export function divideMoney(a: number, b: number): number {
  if (b === 0) return 0;
  return roundMoney(a / b);
}

/**
 * Computes line total, tax amount, and final total with half-up rounding.
 */
export function computeLineTotal(
  quantity: number,
  unitPrice: number,
  taxPercentage = 0,
  taxFixed = 0,
  discountAmount = 0
): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  const rawSubtotal = multiplyMoney(quantity, unitPrice);
  const subtotal = Math.max(0, subtractMoney(rawSubtotal, discountAmount));
  const percentageTax = multiplyMoney(subtotal, taxPercentage / 100);
  const taxAmount = addMoney(percentageTax, taxFixed);
  const total = addMoney(subtotal, taxAmount);

  return {
    subtotal: roundMoney(subtotal),
    taxAmount: roundMoney(taxAmount),
    total: roundMoney(total),
  };
}
