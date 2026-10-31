export type DiscountStatusDerived = "SCHEDULED" | "ACTIVE" | "EXPIRED" | "EXHAUSTED" | "INACTIVE";

interface DeriveDiscountStatusParams {
  startDate: Date | string;
  endDate: Date | string;
  usageLimit?: number | null;
  usedCount?: number;
  active?: boolean;
}

/**
 * Derives the live status badge state for a discount rule.
 * Priority order:
 * 1. Inactive toggle -> INACTIVE
 * 2. usageLimit reached -> EXHAUSTED
 * 3. endDate passed -> EXPIRED
 * 4. startDate in the future -> SCHEDULED
 * 5. Currently valid -> ACTIVE
 */
export function deriveDiscountStatus({
  startDate,
  endDate,
  usageLimit,
  usedCount = 0,
  active = true,
}: DeriveDiscountStatusParams): DiscountStatusDerived {
  if (!active) {
    return "INACTIVE";
  }

  if (usageLimit !== null && usageLimit !== undefined && usageLimit > 0 && usedCount >= usageLimit) {
    return "EXHAUSTED";
  }

  const now = new Date();
  const end = new Date(endDate);
  if (end < now) {
    return "EXPIRED";
  }

  const start = new Date(startDate);
  if (start > now) {
    return "SCHEDULED";
  }

  return "ACTIVE";
}
