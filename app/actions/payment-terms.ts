"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { paymentTermSchema, PaymentTermFormValues } from "@/lib/validators/config";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface GetPaymentTermsFilter {
  search?: string;
  active?: boolean | "ALL";
  page?: number;
  limit?: number;
}

export async function getPaymentTermsAction(filter: GetPaymentTermsFilter = {}) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentTermWhereInput = {};

    if (filter.search && filter.search.trim() !== "") {
      where.name = { contains: filter.search.trim(), mode: "insensitive" };
    }

    if (filter.active !== undefined && filter.active !== "ALL") {
      where.active = filter.active === true;
    }

    const [total, paymentTerms] = await Promise.all([
      prisma.paymentTerm.count({ where }),
      prisma.paymentTerm.findMany({
        where,
        orderBy: [{ days: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    const formattedTerms = paymentTerms.map((pt) => ({
      id: pt.id,
      name: pt.name,
      days: pt.days,
      active: pt.active,
      createdAt: pt.createdAt.toISOString(),
      updatedAt: pt.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        paymentTerms: formattedTerms,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load payment terms";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createPaymentTermAction(values: PaymentTermFormValues) {
  try {
    await requireRole(["ADMIN"]);

    const validated = paymentTermSchema.parse(values);

    const term = await prisma.paymentTerm.create({
      data: {
        name: validated.name.trim(),
        days: validated.days,
        active: validated.active,
      },
    });

    revalidatePath("/admin/payment-terms");
    return { success: true, data: { id: term.id, name: term.name } };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to create payment term";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updatePaymentTermAction(id: string, values: PaymentTermFormValues) {
  try {
    await requireRole(["ADMIN"]);

    const validated = paymentTermSchema.parse(values);

    const term = await prisma.paymentTerm.update({
      where: { id },
      data: {
        name: validated.name.trim(),
        days: validated.days,
        active: validated.active,
      },
    });

    revalidatePath("/admin/payment-terms");
    return { success: true, data: { id: term.id, name: term.name } };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to update payment term";
    return {
      success: false,
      error: message,
    };
  }
}

export async function togglePaymentTermActiveAction(id: string) {
  try {
    await requireRole(["ADMIN"]);

    const existing = await prisma.paymentTerm.findUnique({
      where: { id },
      select: { active: true },
    });

    if (!existing) {
      return { success: false, error: "Payment term not found" };
    }

    const updated = await prisma.paymentTerm.update({
      where: { id },
      data: { active: !existing.active },
    });

    revalidatePath("/admin/payment-terms");
    return { success: true, active: updated.active };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to toggle payment term status";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deletePaymentTermAction(id: string) {
  try {
    await requireRole(["ADMIN"]);

    // Check if referenced by subscriptions
    const subCount = await prisma.subscription.count({
      where: { paymentTermId: id },
    });

    if (subCount > 0) {
      return {
        success: false,
        error: `Cannot delete payment term: It is currently assigned to ${subCount} subscription(s). Please deactivate it instead.`,
      };
    }

    await prisma.paymentTerm.delete({ where: { id } });

    revalidatePath("/admin/payment-terms");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete payment term";
    return {
      success: false,
      error: message,
    };
  }
}
