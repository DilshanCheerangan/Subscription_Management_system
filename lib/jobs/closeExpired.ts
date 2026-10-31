import { prisma } from "@/lib/prisma";
import { executeSubscriptionTransition } from "@/lib/state-machines/subscription";
import { SubscriptionStatus } from "@prisma/client";

export interface CloseExpiredResult {
  checked: number;
  closedCount: number;
  closedSubscriptionNumbers: string[];
  errors: { subscriptionId: string; number: string; error: string }[];
}

/**
 * Closes subscriptions whose expiryDate has passed, where the plan has autoClose: true.
 * Records the transition in SubscriptionStatusHistory with actorId: null (System).
 */
export async function closeExpiredSubscriptions(): Promise<CloseExpiredResult> {
  const now = new Date();

  // Find all active or paused subscriptions whose expiry date has passed and plan has autoClose
  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED],
      },
      expiryDate: {
        lte: now,
      },
      plan: {
        autoClose: true,
      },
    },
    include: {
      plan: true,
    },
  });

  const result: CloseExpiredResult = {
    checked: expiredSubscriptions.length,
    closedCount: 0,
    closedSubscriptionNumbers: [],
    errors: [],
  };

  for (const sub of expiredSubscriptions) {
    try {
      await prisma.$transaction(async (tx) => {
        await executeSubscriptionTransition(tx, {
          subscriptionId: sub.id,
          targetStatus: SubscriptionStatus.CLOSED,
          actorId: null,
          reason: `Auto-closed by system: Expiry date (${sub.expiryDate?.toLocaleDateString()}) reached with plan autoClose flag enabled.`,
        });
      });

      result.closedCount++;
      result.closedSubscriptionNumbers.push(sub.number);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to auto-close subscription";
      result.errors.push({
        subscriptionId: sub.id,
        number: sub.number,
        error: message,
      });
    }
  }

  return result;
}
