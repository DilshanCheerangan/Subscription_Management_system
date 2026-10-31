import { describe, it, expect } from "vitest";
import {
  roundMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  computeLineTotal,
} from "@/lib/money";

describe("Tax & Money Engine - Line Level Rounding (Half-Up)", () => {
  it("performs standard half-up rounding on fractional cents", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10.0);
    expect(roundMoney(10.0051)).toBe(10.01);
    expect(roundMoney(123.456)).toBe(123.46);
    expect(roundMoney(123.454)).toBe(123.45);
  });

  it("avoids floating point drift in basic arithmetic", () => {
    // 0.1 + 0.2 in JS is 0.30000000000000004
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    // 0.3 - 0.2 in JS is 0.09999999999999998
    expect(subtractMoney(0.3, 0.2)).toBe(0.1);
    // multiplication
    expect(multiplyMoney(19.99, 3)).toBe(59.97);
  });

  it("computes line item subtotal, tax amount, and total with 18% GST", () => {
    // 3 units at ₹199.95 = 599.85
    // 18% tax on 599.85 = 107.973 -> half up to 107.97
    // Total = 599.85 + 107.97 = 707.82
    const result = computeLineTotal(3, 199.95, 18);
    expect(result.subtotal).toBe(599.85);
    expect(result.taxAmount).toBe(107.97);
    expect(result.total).toBe(707.82);
  });

  it("computes line item with 5% GST and fixed cess/duty", () => {
    // 2 units at ₹1000 = 2000
    // 5% tax = 100
    // Fixed fee = ₹50
    // Total tax = ₹150, Total = ₹2150
    const result = computeLineTotal(2, 1000, 5, 50);
    expect(result.subtotal).toBe(2000);
    expect(result.taxAmount).toBe(150);
    expect(result.total).toBe(2150);
  });

  it("handles zero tax and zero quantity gracefully", () => {
    const zeroTax = computeLineTotal(5, 500, 0);
    expect(zeroTax.subtotal).toBe(2500);
    expect(zeroTax.taxAmount).toBe(0);
    expect(zeroTax.total).toBe(2500);

    const zeroQty = computeLineTotal(0, 500, 18);
    expect(zeroQty.subtotal).toBe(0);
    expect(zeroQty.taxAmount).toBe(0);
    expect(zeroQty.total).toBe(0);
  });

  it("applies line-level discount prior to tax calculation", () => {
    // 1 unit at ₹1000 with ₹200 discount -> subtotal ₹800
    // 18% tax on ₹800 = ₹144
    // Total = ₹944
    const result = computeLineTotal(1, 1000, 18, 0, 200);
    expect(result.subtotal).toBe(800);
    expect(result.taxAmount).toBe(144);
    expect(result.total).toBe(944);
  });
});
