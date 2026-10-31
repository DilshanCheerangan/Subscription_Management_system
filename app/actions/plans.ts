"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { planSchema, PlanFormValues } from "@/lib/validators/catalog";
import { derivePlanStatus } from "@/lib/catalog";
import { Prisma, BillingPeriod } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface GetPlansFilter {
  search?: string;
  billingPeriod?: BillingPeriod | "ALL";
  active?: boolean | "ALL";
  page?: number;
  limit?: number;
}

export async function getPlansAction(filter: GetPlansFilter = {}) {
  try {
    // Both ADMIN and STAFF can view plans
    await requireRole(["ADMIN", "STAFF"]);

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PlanWhereInput = {};

    if (filter.search && filter.search.trim() !== "") {
      where.name = { contains: filter.search.trim(), mode: "insensitive" };
    }

    if (filter.billingPeriod && filter.billingPeriod !== "ALL") {
      where.billingPeriod = filter.billingPeriod;
    }

    if (filter.active !== undefined && filter.active !== "ALL") {
      where.active = filter.active === true;
    }

    const [total, plans] = await Promise.all([
      prisma.plan.count({ where }),
      prisma.plan.findMany({
        where,
        include: {
          linkedProduct: {
            select: { id: true, name: true, salesPrice: true, type: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formattedPlans = plans.map((p) => {
      const derivedStatus = derivePlanStatus(p.availableFrom, p.availableTo, p.active);

      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        billingPeriod: p.billingPeriod,
        minQuantity: p.minQuantity,
        availableFrom: p.availableFrom ? p.availableFrom.toISOString() : null,
        availableTo: p.availableTo ? p.availableTo.toISOString() : null,
        derivedStatus,
        linkedProductId: p.linkedProductId,
        linkedProduct: p.linkedProduct
          ? {
              id: p.linkedProduct.id,
              name: p.linkedProduct.name,
              salesPrice: Number(p.linkedProduct.salesPrice),
              type: p.linkedProduct.type,
            }
          : null,
        autoClose: p.autoClose,
        closable: p.closable,
        pausable: p.pausable,
        renewable: p.renewable,
        active: p.active,
        createdAt: p.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        plans: formattedPlans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load plans";
    return {
      success: false,
      error: message,
    };
  }
}

export async function getPlanByIdAction(id: string) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        linkedProduct: {
          select: { id: true, name: true, salesPrice: true },
        },
      },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    return {
      success: true,
      data: {
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        billingPeriod: plan.billingPeriod,
        minQuantity: plan.minQuantity,
        availableFrom: plan.availableFrom ? plan.availableFrom.toISOString() : null,
        availableTo: plan.availableTo ? plan.availableTo.toISOString() : null,
        derivedStatus: derivePlanStatus(plan.availableFrom, plan.availableTo, plan.active),
        linkedProductId: plan.linkedProductId,
        linkedProduct: plan.linkedProduct
          ? {
              id: plan.linkedProduct.id,
              name: plan.linkedProduct.name,
              salesPrice: Number(plan.linkedProduct.salesPrice),
            }
          : null,
        autoClose: plan.autoClose,
        closable: plan.closable,
        pausable: plan.pausable,
        renewable: plan.renewable,
        active: plan.active,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch plan";
    return { success: false, error: message };
  }
}

export async function createPlanAction(data: PlanFormValues) {
  try {
    // Only ADMIN can create plans
    await requireRole(["ADMIN"]);

    const validated = planSchema.parse(data);

    const plan = await prisma.plan.create({
      data: {
        name: validated.name.trim(),
        price: new Prisma.Decimal(validated.price),
        billingPeriod: validated.billingPeriod,
        minQuantity: validated.minQuantity,
        availableFrom: validated.availableFrom ? new Date(validated.availableFrom) : null,
        availableTo: validated.availableTo ? new Date(validated.availableTo) : null,
        linkedProductId: validated.linkedProductId || null,
        autoClose: validated.autoClose,
        closable: validated.closable,
        pausable: validated.pausable,
        renewable: validated.renewable,
        active: validated.active,
      },
    });

    revalidatePath("/admin/plans");
    revalidatePath("/admin/products");

    return { success: true, data: { id: plan.id } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create plan";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updatePlanAction(id: string, data: PlanFormValues) {
  try {
    // Only ADMIN can update plans
    await requireRole(["ADMIN"]);

    const validated = planSchema.parse(data);

    await prisma.plan.update({
      where: { id },
      data: {
        name: validated.name.trim(),
        price: new Prisma.Decimal(validated.price),
        billingPeriod: validated.billingPeriod,
        minQuantity: validated.minQuantity,
        availableFrom: validated.availableFrom ? new Date(validated.availableFrom) : null,
        availableTo: validated.availableTo ? new Date(validated.availableTo) : null,
        linkedProductId: validated.linkedProductId || null,
        autoClose: validated.autoClose,
        closable: validated.closable,
        pausable: validated.pausable,
        renewable: validated.renewable,
        active: validated.active,
      },
    });

    revalidatePath("/admin/plans");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update plan";
    return {
      success: false,
      error: message,
    };
  }
}

export async function togglePlanActiveAction(id: string, active: boolean) {
  try {
    await requireRole(["ADMIN"]);

    await prisma.plan.update({
      where: { id },
      data: { active },
    });

    revalidatePath("/admin/plans");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update plan status";
    return { success: false, error: message };
  }
}

export async function deletePlanAction(id: string) {
  try {
    await requireRole(["ADMIN"]);

    const activeSubscriptions = await prisma.subscription.count({
      where: { planId: id },
    });

    if (activeSubscriptions > 0) {
      await prisma.plan.update({
        where: { id },
        data: { active: false },
      });
      revalidatePath("/admin/plans");
      return {
        success: true,
        message: "Plan is associated with existing subscriptions; it has been deactivated instead of deleted.",
      };
    }

    await prisma.plan.delete({
      where: { id },
    });

    revalidatePath("/admin/plans");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete plan";
    return { success: false, error: message };
  }
}
