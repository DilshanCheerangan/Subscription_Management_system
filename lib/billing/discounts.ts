import { DiscountScope, DiscountType } from "@prisma/client";
import { roundMoney, subtractMoney } from "@/lib/money";

export interface LineForDiscount {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface DiscountRule {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  minPurchase?: number | null;
  minQuantity?: number | null;
  startDate: Date | string;
  endDate: Date | string;
  usageLimit?: number | null;
  usedCount: number;
  scope: DiscountScope;
  active: boolean;
  productIds?: string[];
}

export interface AppliedDiscount {
  discountId: string;
  discountName: string;
  discountType: DiscountType;
  discountValue: number;
  scope: DiscountScope;
  amount: number;
}

export interface DiscountEngineResult {
  appliedDiscounts: AppliedDiscount[];
  totalDiscount: number;
  finalSubtotal: number;
}

/**
 * Validates whether a discount rule is valid on the given date and within usage limits.
 */
export function isDiscountActiveAndWithinLimits(
  discount: DiscountRule,
  referenceDate: Date = new Date()
): boolean {
  if (!discount.active) return false;
  if (discount.value <= 0) return false;

  // Check usage limit
  if (discount.usageLimit !== null && discount.usageLimit !== undefined) {
    if (discount.usedCount >= discount.usageLimit) {
      return false;
    }
  }

  // Check date range (inclusive, standard day boundaries)
  const refTime = referenceDate.getTime();
  const startTime = new Date(discount.startDate).getTime();
  const endTime = new Date(discount.endDate).getTime();

  if (refTime < startTime || refTime > endTime) {
    return false;
  }

  return true;
}

/**
 * Pure function: calculates eligible product-level and subscription-level discounts.
 * Precedence:
 * 1. Product-level discounts apply to matching products first.
 * 2. Subscription-wide discounts apply to the remaining balance.
 * 3. Total discount will NEVER exceed subtotal (final total never below zero).
 */
export function calculateEligibleDiscounts(
  lines: LineForDiscount[],
  availableDiscounts: DiscountRule[],
  referenceDate: Date = new Date()
): DiscountEngineResult {
  const initialSubtotal = lines.reduce(
    (sum, l) => sum + roundMoney(l.quantity * l.unitPrice),
    0
  );

  let remainingSubtotal = roundMoney(initialSubtotal);
  const appliedDiscounts: AppliedDiscount[] = [];

  if (remainingSubtotal <= 0 || availableDiscounts.length === 0) {
    return {
      appliedDiscounts: [],
      totalDiscount: 0,
      finalSubtotal: remainingSubtotal,
    };
  }

  // Filter only currently active and valid discounts
  const activeDiscounts = availableDiscounts.filter((d) =>
    isDiscountActiveAndWithinLimits(d, referenceDate)
  );

  // Group into PRODUCT discounts and SUBSCRIPTION discounts
  const productDiscounts = activeDiscounts.filter((d) => d.scope === "PRODUCT");
  const subscriptionDiscounts = activeDiscounts.filter(
    (d) => d.scope === "SUBSCRIPTION"
  );

  // Track remaining subtotal per line for line-specific discounts
  const lineSubtotals = lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    subtotal: roundMoney(l.quantity * l.unitPrice),
    remaining: roundMoney(l.quantity * l.unitPrice),
  }));

  // 1. Process Product-Level Discounts
  for (const discount of productDiscounts) {
    if (remainingSubtotal <= 0) break;
    const targetProductIds = discount.productIds || [];
    if (targetProductIds.length === 0) continue;

    const matchingLines = lineSubtotals.filter((l) =>
      targetProductIds.includes(l.productId)
    );
    if (matchingLines.length === 0) continue;

    const totalMatchingQty = matchingLines.reduce((sum, l) => sum + l.quantity, 0);
    const totalMatchingSubtotal = matchingLines.reduce(
      (sum, l) => sum + l.remaining,
      0
    );

    // Validate minQuantity
    if (discount.minQuantity && totalMatchingQty < discount.minQuantity) {
      continue;
    }

    // Validate minPurchase
    if (
      discount.minPurchase &&
      totalMatchingSubtotal < Number(discount.minPurchase)
    ) {
      continue;
    }

    let discountAmount = 0;
    if (discount.type === "PERCENTAGE") {
      const percentage = Math.min(100, Math.max(0, discount.value));
      discountAmount = roundMoney(totalMatchingSubtotal * (percentage / 100));
    } else {
      // FIXED discount
      discountAmount = Math.min(totalMatchingSubtotal, discount.value);
    }

    // Never exceed matching subtotal or global remaining subtotal
    discountAmount = Math.min(discountAmount, totalMatchingSubtotal, remainingSubtotal);
    discountAmount = roundMoney(discountAmount);

    if (discountAmount > 0) {
      appliedDiscounts.push({
        discountId: discount.id,
        discountName: discount.name,
        discountType: discount.type,
        discountValue: discount.value,
        scope: discount.scope,
        amount: discountAmount,
      });

      remainingSubtotal = roundMoney(subtractMoney(remainingSubtotal, discountAmount));

      // Deduct proportionally from matching lines
      let allocated = 0;
      for (let i = 0; i < matchingLines.length; i++) {
        const line = matchingLines[i];
        if (i === matchingLines.length - 1) {
          const rem = subtractMoney(discountAmount, allocated);
          line.remaining = Math.max(0, subtractMoney(line.remaining, rem));
        } else {
          const share = roundMoney(
            discountAmount * (line.remaining / (totalMatchingSubtotal || 1))
          );
          allocated = roundMoney(allocated + share);
          line.remaining = Math.max(0, subtractMoney(line.remaining, share));
        }
      }
    }
  }

  // 2. Process Subscription-Level Discounts
  for (const discount of subscriptionDiscounts) {
    if (remainingSubtotal <= 0) break;

    const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
    // Validate minQuantity
    if (discount.minQuantity && totalQty < discount.minQuantity) {
      continue;
    }

    // Validate minPurchase against remaining subtotal
    if (discount.minPurchase && remainingSubtotal < Number(discount.minPurchase)) {
      continue;
    }

    let discountAmount = 0;
    if (discount.type === "PERCENTAGE") {
      const percentage = Math.min(100, Math.max(0, discount.value));
      discountAmount = roundMoney(remainingSubtotal * (percentage / 100));
    } else {
      // FIXED discount
      discountAmount = Math.min(remainingSubtotal, discount.value);
    }

    // Cap at remaining subtotal
    discountAmount = Math.min(discountAmount, remainingSubtotal);
    discountAmount = roundMoney(discountAmount);

    if (discountAmount > 0) {
      appliedDiscounts.push({
        discountId: discount.id,
        discountName: discount.name,
        discountType: discount.type,
        discountValue: discount.value,
        scope: discount.scope,
        amount: discountAmount,
      });

      remainingSubtotal = roundMoney(subtractMoney(remainingSubtotal, discountAmount));
    }
  }

  const totalDiscount = roundMoney(
    appliedDiscounts.reduce((sum, d) => sum + d.amount, 0)
  );

  return {
    appliedDiscounts,
    totalDiscount,
    finalSubtotal: Math.max(0, remainingSubtotal),
  };
}
