import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import {
  generateInvoice,
  computePeriodEnd,
  AlreadyBilledError,
} from "@/lib/billing/generateInvoice";
import { closeExpiredSubscriptions } from "@/lib/jobs/closeExpired";

export interface BillingRunResult {
  created: number;
  skipped: number;
  failed: {
    subscriptionId: string;
    subscriptionNumber: string;
    error: string;
  }[];
  closedExpiredCount: number;
}

/**
 * Executes the billing engine.
 * 1. Closes any expired subscriptions past their expiry date if plan.autoClose is true.
 * 2. Finds ACTIVE subscriptions due for invoicing (nextInvoiceDate <= targetDate).
 * 3. Catches up missed periods in chronological order.
 * 4. Skips already-billed periods idempotently.
 * 5. Isolates individual failures so other subscriptions continue to process.
 */
export async function runBilling(targetDate: Date = new Date()): Promise<BillingRunResult> {
  // Step 1: Run auto-close on expired contracts
  const closeJobResult = await closeExpiredSubscriptions();

  const result: BillingRunResult = {
    created: 0,
    skipped: 0,
    failed: [],
    closedExpiredCount: closeJobResult.closedCount,
  };

  // Step 2: Query active subscriptions due for billing
  // Uses index on Subscription (status, nextInvoiceDate)
  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      nextInvoiceDate: {
        lte: targetDate,
      },
    },
    include: {
      plan: true,
    },
    orderBy: {
      nextInvoiceDate: "asc",
    },
  });

  // Step 3: Process subscriptions one by one in isolated transactions
  for (const sub of activeSubscriptions) {
    let currentNextInvoiceDate = sub.nextInvoiceDate;

    // Catch up missed periods until nextInvoiceDate > targetDate
    while (currentNextInvoiceDate && currentNextInvoiceDate <= targetDate) {
      // If subscription has an expiryDate, do not bill periods starting on or after expiry
      if (sub.expiryDate && currentNextInvoiceDate >= sub.expiryDate) {
        break;
      }

      const periodStart = currentNextInvoiceDate;
      const periodEnd = computePeriodEnd(periodStart, sub.plan.billingPeriod);

      try {
        await generateInvoice({
          subscriptionId: sub.id,
          periodStart,
          periodEnd,
        });

        result.created++;
        currentNextInvoiceDate = periodEnd;
      } catch (err: unknown) {
        if (err instanceof AlreadyBilledError) {
          result.skipped++;
          currentNextInvoiceDate = periodEnd;
          // Advance in DB if it was skipped so future runs don't re-query
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { nextInvoiceDate: periodEnd },
          }).catch(() => {});
        } else {
          const message = err instanceof Error ? err.message : "Unknown billing error";
          result.failed.push({
            subscriptionId: sub.id,
            subscriptionNumber: sub.number,
            error: message,
          });
          // Stop catch-up loop on this subscription to prevent infinite spin on persistent error
          break;
        }
      }
    }
  }

  return result;
}
