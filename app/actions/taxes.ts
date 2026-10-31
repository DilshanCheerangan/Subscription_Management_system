"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { taxSchema, TaxFormValues } from "@/lib/validators/config";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface GetTaxesFilter {
  search?: string;
  active?: boolean | "ALL";
  page?: number;
  limit?: number;
}

export async function getTaxesAction(filter: GetTaxesFilter = {}) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TaxWhereInput = {};

    if (filter.search && filter.search.trim() !== "") {
      where.name = { contains: filter.search.trim(), mode: "insensitive" };
    }

    if (filter.active !== undefined && filter.active !== "ALL") {
      where.active = filter.active === true;
    }

    const [total, taxes] = await Promise.all([
      prisma.tax.count({ where }),
      prisma.tax.findMany({
        where,
        orderBy: [{ percentage: "desc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    const formattedTaxes = taxes.map((t) => ({
      id: t.id,
      name: t.name,
      percentage: Number(t.percentage),
      fixedAmount: Number(t.fixedAmount),
      active: t.active,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        taxes: formattedTaxes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load taxes";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createTaxAction(values: TaxFormValues) {
  try {
    await requireRole(["ADMIN"]);

    const validated = taxSchema.parse(values);

    const tax = await prisma.tax.create({
      data: {
        name: validated.name.trim(),
        percentage: validated.percentage,
        fixedAmount: validated.fixedAmount ?? 0,
        active: validated.active,
      },
    });

    revalidatePath("/admin/taxes");
    return { success: true, data: { id: tax.id, name: tax.name } };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to create tax rule";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateTaxAction(id: string, values: TaxFormValues) {
  try {
    await requireRole(["ADMIN"]);

    const validated = taxSchema.parse(values);

    const tax = await prisma.tax.update({
      where: { id },
      data: {
        name: validated.name.trim(),
        percentage: validated.percentage,
        fixedAmount: validated.fixedAmount ?? 0,
        active: validated.active,
      },
    });

    revalidatePath("/admin/taxes");
    return { success: true, data: { id: tax.id, name: tax.name } };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to update tax rule";
    return {
      success: false,
      error: message,
    };
  }
}

export async function toggleTaxActiveAction(id: string) {
  try {
    await requireRole(["ADMIN"]);

    const existing = await prisma.tax.findUnique({
      where: { id },
      select: { active: true },
    });

    if (!existing) {
      return { success: false, error: "Tax rule not found" };
    }

    const updated = await prisma.tax.update({
      where: { id },
      data: { active: !existing.active },
    });

    revalidatePath("/admin/taxes");
    return { success: true, active: updated.active };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to toggle tax status";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteTaxAction(id: string) {
  try {
    await requireRole(["ADMIN"]);

    // Check for references before deletion
    const [subLineCount, invLineCount, tmplLineCount] = await Promise.all([
      prisma.subscriptionLine.count({ where: { taxId: id } }),
      prisma.invoiceLine.count({ where: { taxId: id } }),
      prisma.quotationTemplateLine.count({ where: { taxId: id } }),
    ]);

    if (subLineCount > 0 || invLineCount > 0 || tmplLineCount > 0) {
      return {
        success: false,
        error: `Cannot delete tax: It is currently referenced by existing subscriptions (${subLineCount}), invoices (${invLineCount}), or templates (${tmplLineCount}). Consider deactivating it instead.`,
      };
    }

    await prisma.tax.delete({ where: { id } });

    revalidatePath("/admin/taxes");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete tax rule";
    return {
      success: false,
      error: message,
    };
  }
}
