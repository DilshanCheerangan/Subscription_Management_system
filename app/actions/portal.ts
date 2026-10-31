"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { InvoiceStatus, SubscriptionStatus, BillingPeriod, Prisma } from "@prisma/client";
import { executeSubscriptionTransition } from "@/lib/state-machines/subscription";
import { roundMoney, subtractMoney } from "@/lib/money";
import { revalidatePath } from "next/cache";

export async function getPortalDashboardAction() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Authentication required" };
    }

    const customerId = session.userId;

    // 1. Active Subscriptions
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { customerId, status: SubscriptionStatus.ACTIVE },
      include: { plan: { select: { name: true, billingPeriod: true } } },
      orderBy: { nextInvoiceDate: "asc" },
    });

    const activeCount = activeSubscriptions.length;

    // Next billing date: earliest nextInvoiceDate of active subscriptions
    const nextBillingDate =
      activeSubscriptions.length > 0 && activeSubscriptions[0].nextInvoiceDate
        ? activeSubscriptions[0].nextInvoiceDate.toISOString()
        : null;

    // 2. Invoices & Total Amount Due
    const invoices = await prisma.invoice.findMany({
      where: { customerId },
      include: {
        subscription: {
          select: { number: true, plan: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    let totalAmountDue = 0;
    let overdueCount = 0;

    const formattedInvoices = invoices.map((inv) => {
      const total = Number(inv.total);
      const paid = Number(inv.amountPaid);
      const balance = Math.max(0, roundMoney(subtractMoney(total, paid)));
      const isOverdue =
        inv.status === InvoiceStatus.CONFIRMED &&
        new Date(inv.dueDate) < now &&
        balance > 0;

      if (inv.status === InvoiceStatus.CONFIRMED && balance > 0) {
        totalAmountDue += balance;
        if (isOverdue) overdueCount += 1;
      }

      return {
        id: inv.id,
        number: inv.number,
        subscriptionNumber: inv.subscription.number,
        planName: inv.subscription.plan.name,
        periodStart: inv.periodStart.toISOString(),
        periodEnd: inv.periodEnd.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        total,
        amountPaid: paid,
        balance,
        status: inv.status,
        isOverdue,
        createdAt: inv.createdAt.toISOString(),
      };
    });

    // Recent 5 subscriptions
    const allSubscriptions = await prisma.subscription.findMany({
      where: { customerId },
      include: { plan: { select: { name: true, billingPeriod: true, price: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const formattedSubscriptions = allSubscriptions.map((s) => ({
      id: s.id,
      number: s.number,
      planName: s.plan.name,
      billingPeriod: s.plan.billingPeriod,
      price: Number(s.plan.price),
      status: s.status,
      startDate: s.startDate.toISOString(),
      expiryDate: s.expiryDate ? s.expiryDate.toISOString() : null,
      nextInvoiceDate: s.nextInvoiceDate ? s.nextInvoiceDate.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        customerName: session.name || "Valued Customer",
        customerEmail: session.email,
        activeSubscriptionsCount: activeCount,
        nextBillingDate,
        totalAmountDue: roundMoney(totalAmountDue),
        overdueCount,
        recentSubscriptions: formattedSubscriptions,
        recentInvoices: formattedInvoices.slice(0, 5),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard data";
    return { success: false, error: message };
  }
}

export async function getPortalSubscriptionsAction(params: { page?: number; limit?: number } = {}) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Authentication required" };
    }

    const { page = 1, limit = 20 } = params;
    const customerId = session.userId;

    const total = await prisma.subscription.count({ where: { customerId } });

    const subscriptions = await prisma.subscription.findMany({
      where: { customerId },
      include: {
        plan: {
          select: {
            name: true,
            billingPeriod: true,
            price: true,
            pausable: true,
            closable: true,
            renewable: true,
          },
        },
        paymentTerm: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const rows = subscriptions.map((s) => ({
      id: s.id,
      number: s.number,
      planName: s.plan.name,
      billingPeriod: s.plan.billingPeriod,
      price: Number(s.plan.price),
      status: s.status,
      startDate: s.startDate.toISOString(),
      expiryDate: s.expiryDate ? s.expiryDate.toISOString() : null,
      nextInvoiceDate: s.nextInvoiceDate ? s.nextInvoiceDate.toISOString() : null,
      paymentTermName: s.paymentTerm?.name || "Immediate",
      createdAt: s.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        subscriptions: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load subscriptions";
    return { success: false, error: message };
  }
}

export async function getPortalSubscriptionDetailAction(id: string) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Authentication required" };
    }

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        paymentTerm: true,
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
          },
        },
        history: {
          include: { changedBy: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
        invoices: {
          select: {
            id: true,
            number: true,
            total: true,
            amountPaid: true,
            status: true,
            dueDate: true,
            periodStart: true,
            periodEnd: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // STRICT CUSTOMER ISOLATION
    if (!sub || (session.role === "CUSTOMER" && sub.customerId !== session.userId)) {
      return { success: false, notFound: true, error: "Subscription not found" };
    }

    const planFlags = {
      pausable: sub.plan.pausable,
      closable: sub.plan.closable,
      autoClose: sub.plan.autoClose,
      renewable: sub.plan.renewable,
    };

    // Calculate allowed customer actions
    const canPause = sub.status === SubscriptionStatus.ACTIVE && planFlags.pausable;
    const canResume = sub.status === SubscriptionStatus.PAUSED && planFlags.pausable;
    const canClose =
      (sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.PAUSED) &&
      planFlags.closable;
    const canRenew = planFlags.renewable;

    const lines = sub.lines.map((l) => {
      const unitPrice = Number(l.unitPrice);
      const subtotal = roundMoney(unitPrice * l.quantity);
      const total = Number(l.amount);
      const taxAmount = Math.max(0, roundMoney(total - subtotal));
      return {
        id: l.id,
        productName: l.product.name,
        variantName: l.variant?.attributeValue || null,
        quantity: l.quantity,
        unitPrice,
        taxName: l.tax?.name || "No Tax",
        taxPercentage: l.tax ? Number(l.tax.percentage) : 0,
        subtotal,
        taxAmount,
        total,
      };
    });

    const history = sub.history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      notes: h.reason,
      actorName: h.changedBy?.name || "System",
      createdAt: h.createdAt.toISOString(),
    }));

    const now = new Date();
    const invoices = sub.invoices.map((inv) => {
      const total = Number(inv.total);
      const paid = Number(inv.amountPaid);
      const balance = Math.max(0, total - paid);
      const isOverdue =
        inv.status === InvoiceStatus.CONFIRMED && new Date(inv.dueDate) < now && balance > 0;
      return {
        id: inv.id,
        number: inv.number,
        total,
        amountPaid: paid,
        balance,
        status: inv.status,
        isOverdue,
        dueDate: inv.dueDate.toISOString(),
        periodStart: inv.periodStart.toISOString(),
        periodEnd: inv.periodEnd.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        id: sub.id,
        number: sub.number,
        status: sub.status,
        startDate: sub.startDate.toISOString(),
        expiryDate: sub.expiryDate ? sub.expiryDate.toISOString() : null,
        nextInvoiceDate: sub.nextInvoiceDate ? sub.nextInvoiceDate.toISOString() : null,
        paymentTermName: sub.paymentTerm?.name || "Immediate",
        plan: {
          id: sub.plan.id,
          name: sub.plan.name,
          billingPeriod: sub.plan.billingPeriod,
          price: Number(sub.plan.price),
          ...planFlags,
        },
        actions: {
          canPause,
          canResume,
          canClose,
          canRenew,
        },
        lines,
        history,
        invoices,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load subscription details";
    return { success: false, error: message };
  }
}

export async function portalCustomerSubscriptionAction(params: {
  subscriptionId: string;
  action: "PAUSE" | "RESUME" | "CLOSE" | "RENEW";
}) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Authentication required" };
    }

    const { subscriptionId, action } = params;

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    // Isolation check
    if (!sub || (session.role === "CUSTOMER" && sub.customerId !== session.userId)) {
      return { success: false, error: "Subscription not found or access denied" };
    }

    if (action === "PAUSE") {
      if (!sub.plan.pausable) {
        return { success: false, error: "This plan does not permit pausing" };
      }
      if (sub.status !== SubscriptionStatus.ACTIVE) {
        return { success: false, error: "Only active subscriptions can be paused" };
      }

      await prisma.$transaction(async (tx) => {
        await executeSubscriptionTransition(tx, {
          subscriptionId: sub.id,
          targetStatus: SubscriptionStatus.PAUSED,
          actorId: session.userId,
          reason: "Customer paused subscription via portal",
        });
      });
    } else if (action === "RESUME") {
      if (!sub.plan.pausable) {
        return { success: false, error: "This plan does not permit pausing/resuming" };
      }
      if (sub.status !== SubscriptionStatus.PAUSED) {
        return { success: false, error: "Only paused subscriptions can be resumed" };
      }

      await prisma.$transaction(async (tx) => {
        await executeSubscriptionTransition(tx, {
          subscriptionId: sub.id,
          targetStatus: SubscriptionStatus.ACTIVE,
          actorId: session.userId,
          reason: "Customer resumed subscription via portal",
        });
      });
    } else if (action === "CLOSE") {
      if (!sub.plan.closable) {
        return { success: false, error: "This plan does not permit early cancellation" };
      }
      if (sub.status === SubscriptionStatus.CLOSED) {
        return { success: false, error: "Subscription is already closed" };
      }

      await prisma.$transaction(async (tx) => {
        await executeSubscriptionTransition(tx, {
          subscriptionId: sub.id,
          targetStatus: SubscriptionStatus.CLOSED,
          actorId: session.userId,
          reason: "Customer closed subscription via portal",
        });
      });
    } else if (action === "RENEW") {
      if (!sub.plan.renewable) {
        return { success: false, error: "This plan does not permit manual renewal" };
      }

      // Calculate new expiry date based on plan period
      const currentExpiry = sub.expiryDate && new Date(sub.expiryDate) > new Date()
        ? new Date(sub.expiryDate)
        : new Date();

      const newExpiry = new Date(currentExpiry);
      switch (sub.plan.billingPeriod) {
        case BillingPeriod.DAILY:
          newExpiry.setDate(newExpiry.getDate() + 1);
          break;
        case BillingPeriod.WEEKLY:
          newExpiry.setDate(newExpiry.getDate() + 7);
          break;
        case BillingPeriod.MONTHLY:
          newExpiry.setMonth(newExpiry.getMonth() + 1);
          break;
        case BillingPeriod.YEARLY:
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
          break;
      }

      await prisma.$transaction(async (tx) => {
        // If it was closed or expired, reactivate
        const targetStatus =
          sub.status === SubscriptionStatus.CLOSED || sub.status === SubscriptionStatus.PAUSED
            ? SubscriptionStatus.ACTIVE
            : sub.status;

        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            expiryDate: newExpiry,
            status: targetStatus,
          },
        });

        await tx.subscriptionStatusHistory.create({
          data: {
            subscriptionId: sub.id,
            fromStatus: sub.status,
            toStatus: targetStatus,
            reason: `Customer renewed subscription via portal until ${newExpiry.toLocaleDateString()}`,
            changedById: session.userId,
          },
        });
      });
    } else {
      return { success: false, error: "Unknown action" };
    }

    revalidatePath("/portal");
    revalidatePath("/portal/subscriptions");
    revalidatePath(`/portal/subscriptions/${subscriptionId}`);
    revalidatePath("/admin/subscriptions");

    return { success: true, message: `Subscription ${action.toLowerCase()} action processed successfully.` };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to execute subscription action";
    return { success: false, error: message };
  }
}

export async function getPortalInvoicesAction(params: {
  status?: "ALL" | "PAID" | "OUTSTANDING" | "OVERDUE";
  page?: number;
  limit?: number;
} = {}) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Authentication required" };
    }

    const customerId = session.userId;
    const { status = "ALL", page = 1, limit = 20 } = params;

    const where: Prisma.InvoiceWhereInput = { customerId };
    const now = new Date();

    if (status === "PAID") {
      where.status = InvoiceStatus.PAID;
    } else if (status === "OUTSTANDING") {
      where.status = InvoiceStatus.CONFIRMED;
    } else if (status === "OVERDUE") {
      where.status = InvoiceStatus.CONFIRMED;
      where.dueDate = { lt: now };
    }

    const [allCount, outstandingCount, paidCount, overdueCount, total] = await Promise.all([
      prisma.invoice.count({ where: { customerId } }),
      prisma.invoice.count({ where: { customerId, status: InvoiceStatus.CONFIRMED } }),
      prisma.invoice.count({ where: { customerId, status: InvoiceStatus.PAID } }),
      prisma.invoice.count({
        where: { customerId, status: InvoiceStatus.CONFIRMED, dueDate: { lt: now } },
      }),
      prisma.invoice.count({ where }),
    ]);

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        subscription: {
          select: { number: true, plan: { select: { name: true, billingPeriod: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const rows = invoices.map((inv) => {
      const totalAmount = Number(inv.total);
      const paidAmount = Number(inv.amountPaid);
      const balance = Math.max(0, totalAmount - paidAmount);
      const isOverdue =
        inv.status === InvoiceStatus.CONFIRMED && new Date(inv.dueDate) < now && balance > 0;

      return {
        id: inv.id,
        number: inv.number,
        subscriptionNumber: inv.subscription.number,
        planName: inv.subscription.plan.name,
        billingPeriod: inv.subscription.plan.billingPeriod,
        periodStart: inv.periodStart.toISOString(),
        periodEnd: inv.periodEnd.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        total: totalAmount,
        amountPaid: paidAmount,
        balance,
        status: inv.status,
        isOverdue,
        createdAt: inv.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        invoices: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        counts: {
          all: allCount,
          outstanding: outstandingCount,
          paid: paidCount,
          overdue: overdueCount,
        },
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load invoices";
    return { success: false, error: message };
  }
}

export async function getPortalInvoiceDetailAction(id: string) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Authentication required" };
    }

    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        subscription: {
          select: {
            id: true,
            number: true,
            plan: { select: { name: true, billingPeriod: true } },
            paymentTerm: { select: { name: true } },
          },
        },
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
          },
        },
        discounts: { include: { discount: true } },
        payments: {
          include: { recordedBy: { select: { name: true } } },
          orderBy: { paymentDate: "asc" },
        },
      },
    });

    // STRICT CUSTOMER ISOLATION
    if (!inv || (session.role === "CUSTOMER" && inv.customerId !== session.userId)) {
      return { success: false, notFound: true, error: "Invoice not found" };
    }

    const total = Number(inv.total);
    const amountPaid = Number(inv.amountPaid);
    const balance = Math.max(0, total - amountPaid);
    const now = new Date();
    const isOverdue =
      inv.status === InvoiceStatus.CONFIRMED && new Date(inv.dueDate) < now && balance > 0;

    const lines = inv.lines.map((l) => ({
      id: l.id,
      productName: l.product.name,
      variantName: l.variant?.attributeValue || null,
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
      taxName: l.tax?.name || "No Tax",
      taxPercentage: l.tax ? Number(l.tax.percentage) : 0,
      subtotal: Number(l.subtotal),
      taxAmount: Number(l.taxAmount),
      total: Number(l.total),
    }));

    const discounts = inv.discounts.map((d) => ({
      id: d.id,
      name: d.discount.name,
      type: d.discount.type,
      value: Number(d.discount.value),
      scope: d.discount.scope,
      amount: Number(d.amount),
    }));

    // Chronological running balances
    let accum = 0;
    const payments = inv.payments.map((p) => {
      const amt = Number(p.amount);
      accum += amt;
      return {
        id: p.id,
        method: p.method,
        amount: amt,
        runningBalance: Math.max(0, total - accum),
        paymentDate: p.paymentDate.toISOString(),
        note: p.note,
        recordedByName: p.recordedBy?.name || "System",
      };
    });

    return {
      success: true,
      data: {
        id: inv.id,
        number: inv.number,
        status: inv.status,
        isOverdue,
        periodStart: inv.periodStart.toISOString(),
        periodEnd: inv.periodEnd.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        subtotal: Number(inv.subtotal),
        taxTotal: Number(inv.taxTotal),
        discountTotal: Number(inv.discountTotal),
        total,
        amountPaid,
        balance,
        customer: inv.customer,
        subscription: {
          id: inv.subscription.id,
          number: inv.subscription.number,
          planName: inv.subscription.plan.name,
          billingPeriod: inv.subscription.plan.billingPeriod,
          paymentTermName: inv.subscription.paymentTerm?.name || "Immediate",
        },
        lines,
        discounts,
        payments,
        createdAt: inv.createdAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load invoice details";
    return { success: false, error: message };
  }
}
