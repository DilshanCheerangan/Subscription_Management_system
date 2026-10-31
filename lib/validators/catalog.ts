import { z } from "zod";
import { ProductType, BillingPeriod } from "@prisma/client";

export const productVariantSchema = z.object({
  id: z.string().optional(),
  attributeName: z.string().min(1, "Attribute name is required (e.g., Brand, Size)"),
  attributeValue: z.string().min(1, "Attribute value is required (e.g., Odoo, 16GB)"),
  extraPrice: z.coerce.number().min(0, "Extra price must be >= 0"),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  type: z.nativeEnum(ProductType, {
    message: "Select a valid product type",
  }),
  salesPrice: z.coerce.number().min(0, "Sales price must be >= 0"),
  costPrice: z.coerce.number().min(0, "Cost price must be >= 0"),
  notes: z.string().optional().nullable(),
  active: z.boolean().default(true),
  variants: z.array(productVariantSchema).default([]),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductVariantFormValues = z.infer<typeof productVariantSchema>;

export const planSchema = z
  .object({
    name: z.string().min(2, "Plan name must be at least 2 characters"),
    price: z.coerce.number().min(0, "Price must be >= 0"),
    billingPeriod: z.nativeEnum(BillingPeriod, {
      message: "Select a valid billing period",
    }),
    minQuantity: z.coerce.number().int().min(1, "Minimum quantity must be at least 1").default(1),
    availableFrom: z.string().optional().nullable(),
    availableTo: z.string().optional().nullable(),
    linkedProductId: z.string().optional().nullable(),
    autoClose: z.boolean().default(false),
    closable: z.boolean().default(true),
    pausable: z.boolean().default(false),
    renewable: z.boolean().default(true),
    active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.availableFrom && data.availableTo) {
        const fromDate = new Date(data.availableFrom);
        const toDate = new Date(data.availableTo);
        return toDate > fromDate;
      }
      return true;
    },
    {
      message: "Available To date must be after Available From date",
      path: ["availableTo"],
    }
  );

export type PlanFormValues = z.infer<typeof planSchema>;
