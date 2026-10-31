"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getSessionUser } from "@/lib/auth";
import {
  subscriptionFormSchema,
  SubscriptionFormValues,
} from "@/lib/validators/subscription";
import { getNextSubscriptionNumber } from "@/lib/sequence";
import {
  executeSubscriptionTransition,
  getLegalNextTransitions,
} from "@/lib/state-machines/subscription";
import { calculateSubscriptionTotals } from "@/lib/subscriptions";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface GetSubscriptionsFilter {
  search?: string;
  status?: SubscriptionStatus | "ALL";
  customerId?: string;
  planId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function getSubscriptionsAction(filter: GetSubscriptionsFilter = {}) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};

    if (filter.search && filter.search.trim() !== "") {
      const q = filter.search.trim();
      where.OR = [
        { number: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { customer: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (filter.status && filter.status !== "ALL") {
      where.status = filter.status;
    }

    if (filter.customerId) {
      where.customerId = filter.customerId;
    }

    if (filter.planId) {
      where.planId = filter.planId;
    }

    if (filter.dateFrom || filter.dateTo) {
      where.startDate = {};
      if (filter.dateFrom) {
        where.startDate.gte = new Date(filter.dateFrom);
      }
      if (filter.dateTo) {
        where.startDate.lte = new Date(filter.dateTo);
      }
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          plan: {
            select: { id: true, name: true, billingPeriod: true, price: true },
          },
          paymentTerm: {
            select: { id: true, name: true, days: true },
          },
          lines: {
            select: { amount: true },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    const formatted = subscriptions.map((s) => {
      const totalAmount = s.lines.reduce((acc, l) => acc + Number(l.amount), 0);

      return {
        id: s.id,
        number: s.number,
        customerId: s.customerId,
        customerName: s.customer.name,
        customerEmail: s.customer.email,
        planId: s.planId,
        planName: s.plan.name,
        planBillingPeriod: s.plan.billingPeriod,
        status: s.status,
        startDate: s.startDate.toISOString(),
        expiryDate: s.expiryDate ? s.expiryDate.toISOString() : null,
        nextInvoiceDate: s.nextInvoiceDate ? s.nextInvoiceDate.toISOString() : null,
        paymentTermName: s.paymentTerm ? s.paymentTerm.name : "—",
        lineCount: s.lines.length,
        totalAmount,
        createdAt: s.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        subscriptions: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load subscriptions";
    return {
      success: false,
      error: message,
    };
  }
}

export async function getSubscriptionDetailAction(id: string) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
        plan: true,
        paymentTerm: true,
        lines: {
          include: {
            product: {
              select: { id: true, name: true, type: true, salesPrice: true },
            },
            variant: {
              select: { id: true, attributeName: true, attributeValue: true, extraPrice: true },
            },
            tax: {
              select: { id: true, name: true, percentage: true },
            },
          },
        },
        history: {
          include: {
            changedBy: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!sub) {
      return { success: false, error: "Subscription not found" };
    }

    // Role check: CUSTOMER can only view their own subscription
    if (session.role === "CUSTOMER" && sub.customerId !== session.userId) {
      return { success: false, error: "Access denied." };
    }

    const isExpired = sub.expiryDate ? new Date(sub.expiryDate) < new Date() : false;

    // Check legal next transitions
    const legalTransitions = getLegalNextTransitions(
      sub.status,
      {
        closable: sub.plan.closable,
        pausable: sub.plan.pausable,
        autoClose: sub.plan.autoClose,
        renewable: sub.plan.renewable,
      },
      isExpired
    );

    // Calculate totals using shared helper
    const totals = calculateSubscriptionTotals(
      sub.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        taxPercentage: l.tax ? Number(l.tax.percentage) : 0,
      }))
    );

    return {
      success: true,
      data: {
        id: sub.id,
        number: sub.number,
        status: sub.status,
        startDate: sub.startDate.toISOString(),
        expiryDate: sub.expiryDate ? sub.expiryDate.toISOString() : null,
        nextInvoiceDate: sub.nextInvoiceDate ? sub.nextInvoiceDate.toISOString() : null,
        notes: sub.notes,
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
        customer: {
          id: sub.customer.id,
          name: sub.customer.name,
          email: sub.customer.email,
          role: sub.customer.role,
          createdAt: sub.customer.createdAt.toISOString(),
        },
        plan: {
          id: sub.plan.id,
          name: sub.plan.name,
          billingPeriod: sub.plan.billingPeriod,
          price: Number(sub.plan.price),
          minQuantity: sub.plan.minQuantity,
          closable: sub.plan.closable,
          pausable: sub.plan.pausable,
          autoClose: sub.plan.autoClose,
          renewable: sub.plan.renewable,
        },
        paymentTerm: sub.paymentTerm
          ? {
              id: sub.paymentTerm.id,
              name: sub.paymentTerm.name,
              days: sub.paymentTerm.days,
            }
          : null,
        lines: sub.lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          productName: l.product.name,
          productType: l.product.type,
          variantId: l.variantId,
          variantName: l.variant
            ? `${l.variant.attributeName}: ${l.variant.attributeValue} (+₹${Number(l.variant.extraPrice)})`
            : null,
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice),
          taxId: l.taxId,
          taxName: l.tax ? `${l.tax.name} (${Number(l.tax.percentage)}%)` : "No Tax",
          taxPercentage: l.tax ? Number(l.tax.percentage) : 0,
          amount: Number(l.amount),
        })),
        totals,
        history: sub.history.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          reason: h.reason,
          changedBy: h.changedBy ? { name: h.changedBy.name, email: h.changedBy.email } : null,
          createdAt: h.createdAt.toISOString(),
        })),
        legalTransitions,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load subscription details";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createSubscriptionAction(values: SubscriptionFormValues) {
  try {
    const session = await requireRole(["ADMIN", "STAFF"]);

    const validated = subscriptionFormSchema.parse(values);

    // Verify Plan exists and check minQuantity constraint
    const plan = await prisma.plan.findUnique({
      where: { id: validated.planId },
    });

    if (!plan) {
      return { success: false, error: "Selected plan does not exist." };
    }

    const totalQuantity = validated.lines.reduce((acc, l) => acc + l.quantity, 0);
    if (totalQuantity < plan.minQuantity) {
      return {
        success: false,
        error: `Total quantity (${totalQuantity}) must be at least the plan's minimum requirement of ${plan.minQuantity} units.`,
      };
    }

    // Pre-load taxes for line amount calculation
    const taxIds = validated.lines.map((l) => l.taxId).filter(Boolean) as string[];
    const taxes = await prisma.tax.findMany({
      where: { id: { in: taxIds } },
    });
    const taxMap = new Map(taxes.map((t) => [t.id, Number(t.percentage)]));

    const startDate = new Date(validated.startDate);
    const expiryDate = validated.expiryDate ? new Date(validated.expiryDate) : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate unique sequential number SUB-00001
      const number = await getNextSubscriptionNumber(tx);

      // 2. Compute line totals with half-up rounding
      const lineInputs = validated.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxPercentage: l.taxId ? taxMap.get(l.taxId) || 0 : 0,
      }));

      const computedTotals = calculateSubscriptionTotals(lineInputs);

      // 3. Create Subscription
      const sub = await tx.subscription.create({
        data: {
          number,
          customerId: validated.customerId,
          planId: validated.planId,
          status: validated.initialStatus,
          startDate,
          expiryDate,
          paymentTermId: validated.paymentTermId || null,
          nextInvoiceDate: startDate, // advance billing starts on startDate
          notes: validated.notes?.trim() || null,
          lines: {
            create: validated.lines.map((l, idx) => ({
              productId: l.productId,
              variantId: l.variantId || null,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              taxId: l.taxId || null,
              amount: computedTotals.lines[idx].totalAmount,
            })),
          },
          history: {
            create: {
              fromStatus: null,
              toStatus: validated.initialStatus,
              changedById: session.userId,
              reason: "Subscription created",
            },
          },
        },
      });

      return sub;
    });

    revalidatePath("/admin/subscriptions");
    return { success: true, data: { id: result.id, number: result.number } };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to create subscription";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateSubscriptionAction(id: string, values: SubscriptionFormValues) {
  try {
    const session = await requireRole(["ADMIN", "STAFF"]);

    const validated = subscriptionFormSchema.parse(values);

    const existing = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!existing) {
      return { success: false, error: "Subscription not found." };
    }

    // Editing lines is only permitted while in DRAFT or QUOTATION status
    if (
      existing.status !== SubscriptionStatus.DRAFT &&
      existing.status !== SubscriptionStatus.QUOTATION
    ) {
      return {
        success: false,
        error: `Cannot modify subscription lines while in ${existing.status} status. Only Draft and Quotation subscriptions can be edited.`,
      };
    }

    const plan = await prisma.plan.findUnique({
      where: { id: validated.planId },
    });

    if (!plan) {
      return { success: false, error: "Selected plan does not exist." };
    }

    const totalQuantity = validated.lines.reduce((acc, l) => acc + l.quantity, 0);
    if (totalQuantity < plan.minQuantity) {
      return {
        success: false,
        error: `Total quantity (${totalQuantity}) must be at least the plan's minimum requirement of ${plan.minQuantity} units.`,
      };
    }

    const taxIds = validated.lines.map((l) => l.taxId).filter(Boolean) as string[];
    const taxes = await prisma.tax.findMany({
      where: { id: { in: taxIds } },
    });
    const taxMap = new Map(taxes.map((t) => [t.id, Number(t.percentage)]));

    const lineInputs = validated.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxPercentage: l.taxId ? taxMap.get(l.taxId) || 0 : 0,
    }));
    const computedTotals = calculateSubscriptionTotals(lineInputs);

    const startDate = new Date(validated.startDate);
    const expiryDate = validated.expiryDate ? new Date(validated.expiryDate) : null;

    await prisma.$transaction(async (tx) => {
      // Delete old lines and re-create
      await tx.subscriptionLine.deleteMany({
        where: { subscriptionId: id },
      });

      await tx.subscription.update({
        where: { id },
        data: {
          customerId: validated.customerId,
          planId: validated.planId,
          startDate,
          expiryDate,
          paymentTermId: validated.paymentTermId || null,
          notes: validated.notes?.trim() || null,
          lines: {
            create: validated.lines.map((l, idx) => ({
              productId: l.productId,
              variantId: l.variantId || null,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              taxId: l.taxId || null,
              amount: computedTotals.lines[idx].totalAmount,
            })),
          },
        },
      });

      await tx.subscriptionStatusHistory.create({
        data: {
          subscriptionId: id,
          fromStatus: existing.status,
          toStatus: existing.status,
          changedById: session.userId,
          reason: "Subscription details and lines updated",
        },
      });
    });

    revalidatePath("/admin/subscriptions");
    revalidatePath(`/admin/subscriptions/${id}`);
    return { success: true, data: { id, number: existing.number } };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to update subscription";
    return {
      success: false,
      error: message,
    };
  }
}

export async function transitionSubscriptionAction(
  id: string,
  targetStatus: SubscriptionStatus,
  reason?: string
) {
  try {
    const session = await requireRole(["ADMIN", "STAFF"]);

    const updated = await prisma.$transaction(async (tx) => {
      return await executeSubscriptionTransition(tx, {
        subscriptionId: id,
        targetStatus,
        actorId: session.userId,
        reason: reason || undefined,
      });
    });

    revalidatePath("/admin/subscriptions");
    revalidatePath(`/admin/subscriptions/${id}`);
    return { success: true, status: updated.status };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to change subscription status";
    return {
      success: false,
      error: message,
    };
  }
}

export async function getSubscriptionMetadataAction() {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const [customers, plans, products, taxes, paymentTerms, templates] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CUSTOMER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.plan.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          billingPeriod: true,
          price: true,
          minQuantity: true,
          linkedProductId: true,
          closable: true,
          pausable: true,
          autoClose: true,
          renewable: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { active: true },
        include: {
          variants: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.tax.findMany({
        where: { active: true },
        select: { id: true, name: true, percentage: true },
        orderBy: { percentage: "desc" },
      }),
      prisma.paymentTerm.findMany({
        where: { active: true },
        select: { id: true, name: true, days: true },
        orderBy: { days: "asc" },
      }),
      prisma.quotationTemplate.findMany({
        include: {
          lines: {
            include: {
              product: { select: { id: true, name: true, salesPrice: true } },
              variant: { select: { id: true, attributeName: true, attributeValue: true, extraPrice: true } },
              tax: { select: { id: true, name: true, percentage: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      success: true,
      data: {
        customers,
        plans: plans.map((p) => ({
          id: p.id,
          name: p.name,
          billingPeriod: p.billingPeriod,
          price: Number(p.price),
          minQuantity: p.minQuantity,
          linkedProductId: p.linkedProductId,
          closable: p.closable,
          pausable: p.pausable,
          autoClose: p.autoClose,
          renewable: p.renewable,
        })),
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          salesPrice: Number(p.salesPrice),
          type: p.type,
          variants: p.variants.map((v) => ({
            id: v.id,
            attributeName: v.attributeName,
            attributeValue: v.attributeValue,
            extraPrice: Number(v.extraPrice),
          })),
        })),
        taxes: taxes.map((t) => ({
          id: t.id,
          name: t.name,
          percentage: Number(t.percentage),
        })),
        paymentTerms,
        templates: templates.map((tmpl) => ({
          id: tmpl.id,
          name: tmpl.name,
          validityDays: tmpl.validityDays,
          planId: tmpl.planId,
          lines: tmpl.lines.map((l) => ({
            productId: l.productId,
            productName: l.product.name,
            productSalesPrice: Number(l.product.salesPrice),
            variantId: l.variantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice !== null ? Number(l.unitPrice) : Number(l.product.salesPrice),
            taxId: l.taxId,
          })),
        })),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load subscription builder metadata";
    return {
      success: false,
      error: message,
    };
  }
}
