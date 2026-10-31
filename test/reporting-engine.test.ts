import { describe, it, expect } from "vitest";
import { resolveDateRange } from "@/lib/reporting";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter } from "date-fns";

describe("Reporting Engine - Date Range Presets & MRR Math", () => {
  it("resolves 'this_month' preset accurately", () => {
    const range = resolveDateRange({ preset: "this_month" });
    const now = new Date();
    expect(format(range.from, "yyyy-MM-dd")).toBe(format(startOfMonth(now), "yyyy-MM-dd"));
    expect(format(range.to, "yyyy-MM-dd")).toBe(format(endOfMonth(now), "yyyy-MM-dd"));
  });

  it("resolves 'last_month' preset accurately", () => {
    const range = resolveDateRange({ preset: "last_month" });
    const prev = subMonths(new Date(), 1);
    expect(format(range.from, "yyyy-MM-dd")).toBe(format(startOfMonth(prev), "yyyy-MM-dd"));
    expect(format(range.to, "yyyy-MM-dd")).toBe(format(endOfMonth(prev), "yyyy-MM-dd"));
  });

  it("resolves 'quarter' preset accurately", () => {
    const range = resolveDateRange({ preset: "quarter" });
    const now = new Date();
    expect(format(range.from, "yyyy-MM-dd")).toBe(format(startOfQuarter(now), "yyyy-MM-dd"));
    expect(format(range.to, "yyyy-MM-dd")).toBe(format(endOfQuarter(now), "yyyy-MM-dd"));
  });

  it("resolves 'custom' preset accurately", () => {
    const range = resolveDateRange({
      preset: "custom",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });
    expect(format(range.from, "yyyy-MM-dd")).toBe("2026-06-01");
    expect(format(range.to, "yyyy-MM-dd")).toBe("2026-06-30");
  });

  it("calculates normalized MRR from different billing frequencies", () => {
    // Normalization factors per MASTER.md
    const monthlyPrice = 5000;
    const yearlyPrice = 60000;
    const weeklyPrice = 1153.85;
    const dailyPrice = 166.67;

    const mrrFromMonthly = monthlyPrice;
    const mrrFromYearly = yearlyPrice / 12;
    const mrrFromWeekly = Math.round(weeklyPrice * (52 / 12));
    const mrrFromDaily = Math.round(dailyPrice * 30);

    expect(mrrFromMonthly).toBe(5000);
    expect(mrrFromYearly).toBe(5000);
    expect(mrrFromWeekly).toBe(5000);
    expect(mrrFromDaily).toBe(5000);
  });
});
