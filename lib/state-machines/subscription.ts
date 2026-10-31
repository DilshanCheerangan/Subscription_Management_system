import { SubscriptionStatus, Prisma } from "@prisma/client";

export interface PlanLifecycleFlags {
  closable: boolean;
  pausable: boolean;
  autoClose: boolean;
  renewable: boolean;
}

export interface TransitionCheckParams {
  currentStatus: SubscriptionStatus;
  targetStatus: SubscriptionStatus;
  planFlags: PlanLifecycleFlags;
  isExpired?: boolean;
}

export interface TransitionActionConfig {
  targetStatus: SubscriptionStatus;
  label: string;
  variant: "default" | "outline" | "destructive" | "secondary";
  confirmPrompt?: string;
}

/**
 * Validates whether a status transition is legally permitted
 * based on the subscription state machine and plan lifecycle flags.
 */
export function validateSubscriptionTransition({
  currentStatus,
  targetStatus,
  planFlags,
  isExpired = false,
}: TransitionCheckParams): { allowed: boolean; error?: string } {
  if (currentStatus === targetStatus) {
    return { allowed: false, error: `Subscription is already in ${currentStatus} status.` };
  }

  // Terminal state: CLOSED cannot transition
  if (currentStatus === SubscriptionStatus.CLOSED) {
    return { allowed: false, error: "Closed subscriptions cannot transition to any other status." };
  }

  switch (currentStatus) {
    case SubscriptionStatus.DRAFT:
      if (
        targetStatus === SubscriptionStatus.QUOTATION ||
        targetStatus === SubscriptionStatus.CONFIRMED
      ) {
        return { allowed: true };
      }
      return {
        allowed: false,
        error: `Draft subscriptions can only transition to Quotation or Confirmed (received ${targetStatus}).`,
      };

    case SubscriptionStatus.QUOTATION:
      if (
        targetStatus === SubscriptionStatus.CONFIRMED ||
        targetStatus === SubscriptionStatus.DRAFT ||
        targetStatus === SubscriptionStatus.CLOSED
      ) {
        return { allowed: true };
      }
      return {
        allowed: false,
        error: `Quotations can only transition to Confirmed, Draft, or Closed (received ${targetStatus}).`,
      };

    case SubscriptionStatus.CONFIRMED:
      if (
        targetStatus === SubscriptionStatus.ACTIVE ||
        targetStatus === SubscriptionStatus.CLOSED
      ) {
        return { allowed: true };
      }
      return {
        allowed: false,
        error: `Confirmed subscriptions can only transition to Active or Closed (received ${targetStatus}).`,
      };

    case SubscriptionStatus.ACTIVE:
      if (targetStatus === SubscriptionStatus.PAUSED) {
        if (!planFlags.pausable) {
          return {
            allowed: false,
            error: "This plan does not permit pausing. Check plan lifecycle settings.",
          };
        }
        return { allowed: true };
      }

      if (targetStatus === SubscriptionStatus.CLOSED) {
        // Allowed if naturally expired, or if plan is marked closable early
        if (isExpired || planFlags.autoClose || planFlags.closable) {
          return { allowed: true };
        }
        return {
          allowed: false,
          error: "This plan does not permit early cancellation before its expiry date.",
        };
      }

      return {
        allowed: false,
        error: `Active subscriptions can only transition to Paused or Closed (received ${targetStatus}).`,
      };

    case SubscriptionStatus.PAUSED:
      if (targetStatus === SubscriptionStatus.ACTIVE) {
        return { allowed: true }; // Resuming is always allowed from Paused
      }

      if (targetStatus === SubscriptionStatus.CLOSED) {
        if (isExpired || planFlags.autoClose || planFlags.closable) {
          return { allowed: true };
        }
        return {
          allowed: false,
          error: "This plan does not permit cancellation while active/paused.",
        };
      }

      return {
        allowed: false,
        error: `Paused subscriptions can only be Resumed (Active) or Closed (received ${targetStatus}).`,
      };

    default:
      return { allowed: false, error: `Unknown subscription status: ${currentStatus}` };
  }
}

/**
 * Returns the legal next transitions available for a given subscription state.
 * Used to render appropriate action buttons in the admin UI and customer portal.
 */
export function getLegalNextTransitions(
  currentStatus: SubscriptionStatus,
  planFlags: PlanLifecycleFlags,
  isExpired: boolean = false
): TransitionActionConfig[] {
  const actions: TransitionActionConfig[] = [];

  switch (currentStatus) {
    case SubscriptionStatus.DRAFT:
      actions.push({
        targetStatus: SubscriptionStatus.QUOTATION,
        label: "Send / Propose Quotation",
        variant: "default",
      });
      actions.push({
        targetStatus: SubscriptionStatus.CONFIRMED,
        label: "Confirm Subscription",
        variant: "secondary",
      });
      break;

    case SubscriptionStatus.QUOTATION:
      actions.push({
        targetStatus: SubscriptionStatus.CONFIRMED,
        label: "Accept & Confirm",
        variant: "default",
      });
      actions.push({
        targetStatus: SubscriptionStatus.DRAFT,
        label: "Return to Draft",
        variant: "outline",
      });
      actions.push({
        targetStatus: SubscriptionStatus.CLOSED,
        label: "Reject / Cancel",
        variant: "destructive",
        confirmPrompt: "Are you sure you want to reject and close this quotation?",
      });
      break;

    case SubscriptionStatus.CONFIRMED:
      actions.push({
        targetStatus: SubscriptionStatus.ACTIVE,
        label: "Activate Subscription",
        variant: "default",
      });
      actions.push({
        targetStatus: SubscriptionStatus.CLOSED,
        label: "Cancel Subscription",
        variant: "destructive",
        confirmPrompt: "Are you sure you want to cancel this confirmed subscription?",
      });
      break;

    case SubscriptionStatus.ACTIVE:
      if (planFlags.pausable) {
        actions.push({
          targetStatus: SubscriptionStatus.PAUSED,
          label: "Pause Subscription",
          variant: "outline",
          confirmPrompt: "Pause recurring billing for this subscription?",
        });
      }
      if (isExpired || planFlags.closable || planFlags.autoClose) {
        actions.push({
          targetStatus: SubscriptionStatus.CLOSED,
          label: "Close Subscription",
          variant: "destructive",
          confirmPrompt: "Terminate and close this active subscription?",
        });
      }
      break;

    case SubscriptionStatus.PAUSED:
      actions.push({
        targetStatus: SubscriptionStatus.ACTIVE,
        label: "Resume Subscription",
        variant: "default",
      });
      if (isExpired || planFlags.closable || planFlags.autoClose) {
        actions.push({
          targetStatus: SubscriptionStatus.CLOSED,
          label: "Close Subscription",
          variant: "destructive",
          confirmPrompt: "Close and permanently terminate this paused subscription?",
        });
      }
      break;

    case SubscriptionStatus.CLOSED:
      // Terminal
      break;
  }

  return actions;
}

/**
 * Transitions a subscription to a new target status inside a Prisma transaction,
 * creating an immutable status history audit log.
 */
export async function executeSubscriptionTransition(
  tx: Prisma.TransactionClient,
  params: {
    subscriptionId: string;
    targetStatus: SubscriptionStatus;
    actorId?: string | null;
    reason?: string | null;
  }
) {
  const { subscriptionId, targetStatus, actorId, reason } = params;

  const subscription = await tx.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: true,
    },
  });

  if (!subscription) {
    throw new Error("Subscription not found.");
  }

  const isExpired = subscription.expiryDate ? new Date(subscription.expiryDate) < new Date() : false;

  const validation = validateSubscriptionTransition({
    currentStatus: subscription.status,
    targetStatus,
    planFlags: {
      closable: subscription.plan.closable,
      pausable: subscription.plan.pausable,
      autoClose: subscription.plan.autoClose,
      renewable: subscription.plan.renewable,
    },
    isExpired,
  });

  if (!validation.allowed) {
    throw new Error(validation.error || "Illegal status transition.");
  }

  // Update subscription record
  const updateData: Prisma.SubscriptionUpdateInput = {
    status: targetStatus,
  };

  // If transitioning to ACTIVE and nextInvoiceDate is missing, initialize it to startDate or now
  if (targetStatus === SubscriptionStatus.ACTIVE && !subscription.nextInvoiceDate) {
    updateData.nextInvoiceDate = subscription.startDate || new Date();
  }

  const updatedSubscription = await tx.subscription.update({
    where: { id: subscriptionId },
    data: updateData,
  });

  // Create immutable audit log entry in SubscriptionStatusHistory
  await tx.subscriptionStatusHistory.create({
    data: {
      subscriptionId,
      fromStatus: subscription.status,
      toStatus: targetStatus,
      changedById: actorId || null,
      reason: reason || `Status changed from ${subscription.status} to ${targetStatus}`,
    },
  });

  return updatedSubscription;
}
