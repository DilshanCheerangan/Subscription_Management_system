"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { productSchema, ProductFormValues } from "@/lib/validators/catalog";
import { Prisma, ProductType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface GetProductsFilter {
  search?: string;
  type?: ProductType | "ALL";
  active?: boolean | "ALL";
  page?: number;
  limit?: number;
}

export async function getProductsAction(filter: GetProductsFilter = {}) {
  try {
    // Both ADMIN and STAFF can view products
    await requireRole(["ADMIN", "STAFF"]);

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (filter.search && filter.search.trim() !== "") {
      where.name = { contains: filter.search.trim(), mode: "insensitive" };
    }

    if (filter.type && filter.type !== "ALL") {
      where.type = filter.type;
    }

    if (filter.active !== undefined && filter.active !== "ALL") {
      where.active = filter.active === true;
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          variants: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formattedProducts = products.map((p) => {
      const sales = Number(p.salesPrice);
      const cost = Number(p.costPrice);
      const marginAmount = sales - cost;
      const marginPercent = sales > 0 ? (marginAmount / sales) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        salesPrice: sales,
        costPrice: cost,
        marginAmount,
        marginPercent,
        notes: p.notes,
        active: p.active,
        createdAt: p.createdAt.toISOString(),
        variantsCount: p.variants.length,
        variants: p.variants.map((v) => ({
          id: v.id,
          attributeName: v.attributeName,
          attributeValue: v.attributeValue,
          extraPrice: Number(v.extraPrice),
        })),
      };
    });

    return {
      success: true,
      data: {
        products: formattedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load products";
    return {
      success: false,
      error: message,
    };
  }
}

export async function getProductByIdAction(id: string) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const sales = Number(product.salesPrice);
    const cost = Number(product.costPrice);
    const marginAmount = sales - cost;
    const marginPercent = sales > 0 ? (marginAmount / sales) * 100 : 0;

    return {
      success: true,
      data: {
        id: product.id,
        name: product.name,
        type: product.type,
        salesPrice: sales,
        costPrice: cost,
        marginAmount,
        marginPercent,
        notes: product.notes,
        active: product.active,
        variants: product.variants.map((v) => ({
          id: v.id,
          attributeName: v.attributeName,
          attributeValue: v.attributeValue,
          extraPrice: Number(v.extraPrice),
        })),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch product";
    return { success: false, error: message };
  }
}

export async function createProductAction(data: ProductFormValues) {
  try {
    // Only ADMIN can create products
    await requireRole(["ADMIN"]);

    const validated = productSchema.parse(data);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: validated.name.trim(),
          type: validated.type,
          salesPrice: new Prisma.Decimal(validated.salesPrice),
          costPrice: new Prisma.Decimal(validated.costPrice),
          notes: validated.notes?.trim() || null,
          active: validated.active,
        },
      });

      if (validated.variants && validated.variants.length > 0) {
        await tx.productVariant.createMany({
          data: validated.variants.map((v) => ({
            productId: created.id,
            attributeName: v.attributeName.trim(),
            attributeValue: v.attributeValue.trim(),
            extraPrice: new Prisma.Decimal(v.extraPrice),
          })),
        });
      }

      return created;
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/plans");

    return { success: true, data: { id: product.id } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create product";
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateProductAction(id: string, data: ProductFormValues) {
  try {
    // Only ADMIN can update products
    await requireRole(["ADMIN"]);

    const validated = productSchema.parse(data);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: validated.name.trim(),
          type: validated.type,
          salesPrice: new Prisma.Decimal(validated.salesPrice),
          costPrice: new Prisma.Decimal(validated.costPrice),
          notes: validated.notes?.trim() || null,
          active: validated.active,
        },
      });

      // Synchronize variants: delete existing and re-insert
      await tx.productVariant.deleteMany({
        where: { productId: id },
      });

      if (validated.variants && validated.variants.length > 0) {
        await tx.productVariant.createMany({
          data: validated.variants.map((v) => ({
            productId: id,
            attributeName: v.attributeName.trim(),
            attributeValue: v.attributeValue.trim(),
            extraPrice: new Prisma.Decimal(v.extraPrice),
          })),
        });
      }
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/plans");

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update product";
    return {
      success: false,
      error: message,
    };
  }
}

export async function toggleProductActiveAction(id: string, active: boolean) {
  try {
    await requireRole(["ADMIN"]);

    await prisma.product.update({
      where: { id },
      data: { active },
    });

    revalidatePath("/admin/products");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update product status";
    return { success: false, error: message };
  }
}

export async function deleteProductAction(id: string) {
  try {
    await requireRole(["ADMIN"]);

    // Check if product is in use
    const [linkedPlans, linkedSubLines, linkedInvLines] = await Promise.all([
      prisma.plan.count({ where: { linkedProductId: id } }),
      prisma.subscriptionLine.count({ where: { productId: id } }),
      prisma.invoiceLine.count({ where: { productId: id } }),
    ]);

    if (linkedPlans > 0 || linkedSubLines > 0 || linkedInvLines > 0) {
      // Soft deactivate instead of hard delete if referenced
      await prisma.product.update({
        where: { id },
        data: { active: false },
      });
      revalidatePath("/admin/products");
      return {
        success: true,
        message: "Product is referenced in active records; it has been deactivated instead of permanently deleted.",
      };
    }

    await prisma.product.delete({
      where: { id },
    });

    revalidatePath("/admin/products");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete product";
    return { success: false, error: message };
  }
}
