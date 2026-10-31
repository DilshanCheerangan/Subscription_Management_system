export type PlanStatusDerived = "UPCOMING" | "AVAILABLE" | "ENDED";

export function derivePlanStatus(
  availableFrom: Date | string | null | undefined,
  availableTo: Date | string | null | undefined,
  active: boolean
): PlanStatusDerived {
  if (!active) return "ENDED";

  const now = new Date();

  if (availableFrom && new Date(availableFrom) > now) {
    return "UPCOMING";
  }

  if (availableTo && new Date(availableTo) < now) {
    return "ENDED";
  }

  return "AVAILABLE";
}
