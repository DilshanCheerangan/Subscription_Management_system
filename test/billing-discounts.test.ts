import { describe, it, expect } from "vitest";
import {
  calculateEligibleDiscounts,
  isDiscountActiveAndWithinLimits,
  DiscountRule,
  LineForDiscount,
} from "@/lib/billing/discounts";

describe("Discount Engine - Eligibility & Application", () => {
  const referenceDate = new Date("2026-10-31T12:00:00Z");

  const sampleLines: LineForDiscount[] = [
    { productId: "prod-cloud-erp", quantity: 2, unitPrice: 2000, subtotal: 4000 },
    { productId: "prod-support", quantity: 1, unitPrice: 1000, subtotal: 1000 },
  ]; // Total = 5000

  it("evaluates active status and date validity correctly", () => {
    const activeRule: DiscountRule = {
      id: "disc-1",
      name: "Halloween Sale",
      type: "PERCENTAGE",
      value: 10,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-11-01"),
      usedCount: 0,
      scope: "SUBSCRIPTION",
      active: true,
    };

    expect(isDiscountActiveAndWithinLimits(activeRule, referenceDate)).toBe(true);

    // Inactive rule
    expect(
      isDiscountActiveAndWithinLimits({ ...activeRule, active: false }, referenceDate)
    ).toBe(false);

    // Expired rule
    expect(
      isDiscountActiveAndWithinLimits(
        { ...activeRule, endDate: new Date("2026-10-15") },
        referenceDate
      )
    ).toBe(false);

    // Future rule
    expect(
      isDiscountActiveAndWithinLimits(
        { ...activeRule, startDate: new Date("2026-11-15") },
        referenceDate
      )
    ).toBe(false);

    // Exhausted usage limit
    expect(
      isDiscountActiveAndWithinLimits(
        { ...activeRule, usageLimit: 10, usedCount: 10 },
        referenceDate
      )
    ).toBe(false);

    // Within usage limit
    expect(
      isDiscountActiveAndWithinLimits(
        { ...activeRule, usageLimit: 10, usedCount: 9 },
        referenceDate
      )
    ).toBe(true);
  });

  it("applies subscription-wide percentage discount properly", () => {
    const discount: DiscountRule = {
      id: "sub-10",
      name: "10% Off Everything",
      type: "PERCENTAGE",
      value: 10,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-11-01"),
      usedCount: 0,
      scope: "SUBSCRIPTION",
      active: true,
    };

    const result = calculateEligibleDiscounts(sampleLines, [discount], referenceDate);
    expect(result.appliedDiscounts).toHaveLength(1);
    expect(result.appliedDiscounts[0].amount).toBe(500); // 10% of 5000 = 500
    expect(result.totalDiscount).toBe(500);
    expect(result.finalSubtotal).toBe(4500);
  });

  it("applies product-scoped discount only to matching product lines", () => {
    const productDiscount: DiscountRule = {
      id: "prod-disc",
      name: "Cloud ERP 25% Off",
      type: "PERCENTAGE",
      value: 25,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-11-01"),
      usedCount: 0,
      scope: "PRODUCT",
      productIds: ["prod-cloud-erp"],
      active: true,
    };

    const result = calculateEligibleDiscounts(
      sampleLines,
      [productDiscount],
      referenceDate
    );
    // Cloud ERP subtotal = 4000. 25% of 4000 = 1000.
    expect(result.appliedDiscounts).toHaveLength(1);
    expect(result.appliedDiscounts[0].amount).toBe(1000);
    expect(result.totalDiscount).toBe(1000);
    expect(result.finalSubtotal).toBe(4000);
  });

  it("enforces minPurchase and minQuantity thresholds", () => {
    const highThresholdDiscount: DiscountRule = {
      id: "high-thresh",
      name: "Spend 10k get 1k off",
      type: "FIXED",
      value: 1000,
      minPurchase: 10000,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-11-01"),
      usedCount: 0,
      scope: "SUBSCRIPTION",
      active: true,
    };

    // Subtotal is 5000 < 10000 -> should not apply
    const result = calculateEligibleDiscounts(
      sampleLines,
      [highThresholdDiscount],
      referenceDate
    );
    expect(result.appliedDiscounts).toHaveLength(0);
    expect(result.totalDiscount).toBe(0);
    expect(result.finalSubtotal).toBe(5000);

    // Quantity threshold test
    const qtyDiscount: DiscountRule = {
      id: "qty-thresh",
      name: "Buy 5 items get 500 off",
      type: "FIXED",
      value: 500,
      minQuantity: 5,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-11-01"),
      usedCount: 0,
      scope: "SUBSCRIPTION",
      active: true,
    };

    // Total quantity is 3 < 5 -> should not apply
    const qtyResult = calculateEligibleDiscounts(sampleLines, [qtyDiscount], referenceDate);
    expect(qtyResult.appliedDiscounts).toHaveLength(0);
    expect(qtyResult.totalDiscount).toBe(0);
  });

  it("CRITICAL RULE: never pushes a total below zero", () => {
    const massiveDiscount: DiscountRule = {
      id: "huge-fixed",
      name: "Flat 10000 Discount",
      type: "FIXED",
      value: 10000,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-11-01"),
      usedCount: 0,
      scope: "SUBSCRIPTION",
      active: true,
    };

    // Total subtotal is only 5000, discount should cap at 5000 and total must be 0
    const result = calculateEligibleDiscounts(
      sampleLines,
      [massiveDiscount],
      referenceDate
    );
    expect(result.appliedDiscounts[0].amount).toBe(5000);
    expect(result.totalDiscount).toBe(5000);
    expect(result.finalSubtotal).toBe(0);
  });

  it("handles combination of product and subscription discounts in correct order", () => {
    const productDiscount: DiscountRule = {
      id: "p-disc",
      name: "500 off ERP",
      type: "FIXED",
      value: 500,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-11-01"),
      usedCount: 0,
      scope: "PRODUCT",
      productIds: ["prod-cloud-erp"],
      active: true,
    };

    const subDiscount: DiscountRule = {
      id: "s-disc",
      name: "10% off remainder",
      type: "PERCENTAGE",
      value: 10,
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-11-01"),
      usedCount: 0,
      scope: "SUBSCRIPTION",
      active: true,
    };

    // Subtotal: 5000
    // Product disc: 500 -> remaining 4500
    // Sub disc: 10% of 4500 = 450 -> remaining 4050
    const result = calculateEligibleDiscounts(
      sampleLines,
      [productDiscount, subDiscount],
      referenceDate
    );
    expect(result.appliedDiscounts).toHaveLength(2);
    expect(result.appliedDiscounts[0].amount).toBe(500);
    expect(result.appliedDiscounts[1].amount).toBe(450);
    expect(result.totalDiscount).toBe(950);
    expect(result.finalSubtotal).toBe(4050);
  });
});
