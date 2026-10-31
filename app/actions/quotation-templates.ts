"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  quotationTemplateSchema,
  QuotationTemplateFormValues,
} from "@/lib/validators/config";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface GetQuotationTemplatesFilter {
  search?: string;
  page?: number;
  limit?: number;
}

export async function getQuotationTemplatesAction(filter: GetQuotationTemplatesFilter = {}) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.QuotationTemplateWhereInput = {};

    if (filter.search && filter.search.trim() !== "") {
      where.name = { contains: filter.search.trim(), mode: "insensitive" };
    }

    const [total, templates] = await Promise.all([
      prisma.quotationTemplate.count({ where }),
      prisma.quotationTemplate.findMany({
        where,
        include: {
          plan: {
            select: { id: true, name: true, billingPeriod: true, price: true },
          },
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
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    const formattedTemplates = templates.map((t) => ({
      id: t.id,
      name: t.name,
      validityDays: t.validityDays,
      planId: t.planId,
      plan: t.plan
        ? {
            id: t.plan.id,
            name: t.plan.name,
            billingPeriod: t.plan.billingPeriod,
            price: Number(t.plan.price),
          }
        : null,
      lines: t.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product.name,
        productSalesPrice: Number(l.product.salesPrice),
        variantId: l.variantId,
        variantName: l.variant
          ? `${l.variant.attributeName}: ${l.variant.attributeValue} (+₹${Number(l.variant.extraPrice)})`
          : null,
        quantity: l.quantity,
        unitPrice: l.unitPrice !== null ? Number(l.unitPrice) : null,
        taxId: l.taxId,
        taxName: l.tax ? `${l.tax.name} (${Number(l.tax.percentage)}%)` : null,
        taxPercentage: l.tax ? Number(l.tax.percentage) : 0,
      })),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        templates: formattedTemplates,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load quotation templates";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createQuotationTemplateAction(values: QuotationTemplateFormValues) {
  try {
    await requireRole(["ADMIN"]);

    const validated = quotationTemplateSchema.parse(values);

    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.quotationTemplate.create({
        data: {
          name: validated.name.trim(),
          validityDays: validated.validityDays,
          planId: validated.planId || null,
          lines: {
            create: validated.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId || null,
              quantity: line.quantity,
              unitPrice: line.unitPrice ?? null,
              taxId: line.taxId || null,
            })),
          },
        },
      });

      return created;
    });

    revalidatePath("/admin/quotation-templates");
    return { success: true, data: { id: template.id, name: template.name } };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to create quotation template";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateQuotationTemplateAction(id: string, values: QuotationTemplateFormValues) {
  try {
    await requireRole(["ADMIN"]);

    const validated = quotationTemplateSchema.parse(values);

    const template = await prisma.$transaction(async (tx) => {
      // Delete existing lines
      await tx.quotationTemplateLine.deleteMany({
        where: { templateId: id },
      });

      // Update header and create new lines
      const updated = await tx.quotationTemplate.update({
        where: { id },
        data: {
          name: validated.name.trim(),
          validityDays: validated.validityDays,
          planId: validated.planId || null,
          lines: {
            create: validated.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId || null,
              quantity: line.quantity,
              unitPrice: line.unitPrice ?? null,
              taxId: line.taxId || null,
            })),
          },
        },
      });

      return updated;
    });

    revalidatePath("/admin/quotation-templates");
    return { success: true, data: { id: template.id, name: template.name } };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to update quotation template";
    return {
      success: false,
      error: message,
    };
  }
}

export async function duplicateQuotationTemplateAction(id: string) {
  try {
    await requireRole(["ADMIN"]);

    const original = await prisma.quotationTemplate.findUnique({
      where: { id },
      include: {
        lines: true,
      },
    });

    if (!original) {
      return { success: false, error: "Template to duplicate not found" };
    }

    const duplicated = await prisma.$transaction(async (tx) => {
      const copy = await tx.quotationTemplate.create({
        data: {
          name: `${original.name} (Copy)`,
          validityDays: original.validityDays,
          planId: original.planId,
          lines: {
            create: original.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              taxId: l.taxId,
            })),
          },
        },
      });

      return copy;
    });

    revalidatePath("/admin/quotation-templates");
    return { success: true, data: { id: duplicated.id, name: duplicated.name } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to duplicate quotation template";
    return {
      success: false,
      error: message,
    };
  }
}

export async function deleteQuotationTemplateAction(id: string) {
  try {
    await requireRole(["ADMIN"]);

    await prisma.quotationTemplate.delete({
      where: { id },
    });

    revalidatePath("/admin/quotation-templates");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete quotation template";
    return {
      success: false,
      error: message,
    };
  }
}

export async function getTemplateMetadataAction() {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const [products, plans, taxes] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        include: {
          variants: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.plan.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      prisma.tax.findMany({
        where: { active: true },
        orderBy: { percentage: "desc" },
      }),
    ]);

    return {
      success: true,
      data: {
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
        plans: plans.map((pl) => ({
          id: pl.id,
          name: pl.name,
          billingPeriod: pl.billingPeriod,
          price: Number(pl.price),
        })),
        taxes: taxes.map((t) => ({
          id: t.id,
          name: t.name,
          percentage: Number(t.percentage),
        })),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load template builder options";
    return {
      success: false,
      error: message,
    };
  }
}
