"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { discountSchema, DiscountFormValues } from "@/lib/validators/config";
import { deriveDiscountStatus } from "@/lib/discounts";
import { Prisma, DiscountType, DiscountScope } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface GetDiscountsFilter {
  search?: string;
  type?: DiscountType | "ALL";
  scope?: DiscountScope | "ALL";
  active?: boolean | "ALL";
  page?: number;
  limit?: number;
}

export async function getDiscountsAction(filter: GetDiscountsFilter = {}) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.DiscountWhereInput = {};

    if (filter.search && filter.search.trim() !== "") {
      where.name = { contains: filter.search.trim(), mode: "insensitive" };
    }

    if (filter.type && filter.type !== "ALL") {
      where.type = filter.type;
    }

    if (filter.scope && filter.scope !== "ALL") {
      where.scope = filter.scope;
    }

    if (filter.active !== undefined && filter.active !== "ALL") {
      where.active = filter.active === true;
    }

    const [total, discounts] = await Promise.all([
      prisma.discount.count({ where }),
      prisma.discount.findMany({
        where,
        include: {
          products: {
            select: { id: true, name: true, type: true, salesPrice: true },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    const formattedDiscounts = discounts.map((d) => {
      const derivedStatus = deriveDiscountStatus({
        startDate: d.startDate,
        endDate: d.endDate,
        usageLimit: d.usageLimit,
        usedCount: d.usedCount,
        active: d.active,
      });

      return {
        id: d.id,
        name: d.name,
        type: d.type,
        value: Number(d.value),
        minPurchase: d.minPurchase !== null ? Number(d.minPurchase) : null,
        minQuantity: d.minQuantity,
        startDate: d.startDate.toISOString(),
        endDate: d.endDate.toISOString(),
        usageLimit: d.usageLimit,
        usedCount: d.usedCount,
        scope: d.scope,
        active: d.active,
        derivedStatus,
        products: d.products.map((p) => ({
          id: p.id,
          name: p.name,
          salesPrice: Number(p.salesPrice),
        })),
        productIds: d.products.map((p) => p.id),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        discounts: formattedDiscounts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load discounts";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createDiscountAction(values: DiscountFormValues) {
  try {
    await requireRole(["ADMIN"]);

    const validated = discountSchema.parse(values);

    const discount = await prisma.discount.create({
      data: {
        name: validated.name.trim(),
        type: validated.type,
        value: validated.value,
        minPurchase: validated.minPurchase ?? null,
        minQuantity: validated.minQuantity ?? null,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        usageLimit: validated.usageLimit ?? null,
        usedCount: 0,
        scope: validated.scope,
        active: validated.active,
        products:
          validated.scope === "PRODUCT" && validated.productIds.length > 0
            ? { connect: validated.productIds.map((id) => ({ id })) }
            : undefined,
      },
    });

    revalidatePath("/admin/discounts");
    return { success: true, data: { id: discount.id, name: discount.name } };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to create discount rule";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateDiscountAction(id: string, values: DiscountFormValues) {
  try {
    await requireRole(["ADMIN"]);

    const validated = discountSchema.parse(values);

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        name: validated.name.trim(),
        type: validated.type,
        value: validated.value,
        minPurchase: validated.minPurchase ?? null,
        minQuantity: validated.minQuantity ?? null,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        usageLimit: validated.usageLimit ?? null,
        // usedCount is read-only and preserved
        scope: validated.scope,
        active: validated.active,
        products:
          validated.scope === "PRODUCT"
            ? { set: validated.productIds.map((pid) => ({ id: pid })) }
            : { set: [] },
      },
    });

    revalidatePath("/admin/discounts");
    return { success: true, data: { id: discount.id, name: discount.name } };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to update discount rule";
    return {
      success: false,
      error: message,
    };
  }
}

export async function toggleDiscountActiveAction(id: string) {
  try {
    await requireRole(["ADMIN"]);

    const existing = await prisma.discount.findUnique({
      where: { id },
      select: { active: true },
    });

    if (!existing) {
      return { success: false, error: "Discount not found" };
    }

    const updated = await prisma.discount.update({
      where: { id },
      data: { active: !existing.active },
    });

    revalidatePath("/admin/discounts");
    return { success: true, active: updated.active };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to toggle discount status";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteDiscountAction(id: string) {
  try {
    await requireRole(["ADMIN"]);

    // Check if referenced by invoice discounts
    const invDiscountCount = await prisma.invoiceDiscount.count({
      where: { discountId: id },
    });

    if (invDiscountCount > 0) {
      return {
        success: false,
        error: `Cannot delete discount: It has already been applied to ${invDiscountCount} invoice(s). Deactivate it instead.`,
      };
    }

    await prisma.discount.delete({ where: { id } });

    revalidatePath("/admin/discounts");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete discount";
    return {
      success: false,
      error: message,
    };
  }
}
