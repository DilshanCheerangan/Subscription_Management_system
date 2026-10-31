import { z } from "zod";
import { DiscountType, DiscountScope } from "@prisma/client";

// --- Tax Validation ---
export const taxSchema = z.object({
  name: z.string().min(2, "Tax name must be at least 2 characters"),
  percentage: z.coerce
    .number()
    .min(0, "Tax percentage must be at least 0%")
    .max(100, "Tax percentage cannot exceed 100%"),
  fixedAmount: z.coerce.number().min(0, "Fixed amount must be >= 0").default(0),
  active: z.boolean().default(true),
});

export type TaxFormValues = z.infer<typeof taxSchema>;

// --- Payment Term Validation ---
export const paymentTermSchema = z.object({
  name: z.string().min(2, "Term name must be at least 2 characters"),
  days: z.coerce.number().int().min(0, "Due days must be at least 0 (0 for Immediate)"),
  active: z.boolean().default(true),
});

export type PaymentTermFormValues = z.infer<typeof paymentTermSchema>;

// --- Discount Validation ---
export const discountSchema = z
  .object({
    name: z.string().min(2, "Discount name must be at least 2 characters"),
    type: z.nativeEnum(DiscountType, {
      message: "Select a valid discount type (FIXED or PERCENTAGE)",
    }),
    value: z.coerce.number().min(0.01, "Discount value must be greater than 0"),
    minPurchase: z.coerce.number().min(0, "Min purchase must be >= 0").optional().nullable(),
    minQuantity: z.coerce.number().int().min(1, "Min quantity must be >= 1").optional().nullable(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    usageLimit: z.coerce.number().int().min(1, "Usage limit must be >= 1").optional().nullable(),
    scope: z.nativeEnum(DiscountScope, {
      message: "Select a valid discount scope (PRODUCT or SUBSCRIPTION)",
    }),
    productIds: z.array(z.string()).default([]),
    active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.type === "PERCENTAGE" && data.value > 100) {
        return false;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100%",
      path: ["value"],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be strictly after Start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.scope === "PRODUCT" && (!data.productIds || data.productIds.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Please select at least one product for product-scoped discounts",
      path: ["productIds"],
    }
  );

export type DiscountFormValues = z.infer<typeof discountSchema>;

// --- Quotation Template Validation ---
export const quotationTemplateLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Select a product"),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").default(1),
  unitPrice: z.coerce.number().min(0, "Price must be >= 0").optional().nullable(),
  taxId: z.string().optional().nullable(),
});

export const quotationTemplateSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters"),
  validityDays: z.coerce
    .number()
    .int()
    .min(1, "Validity days must be at least 1 day")
    .default(30),
  planId: z.string().optional().nullable(),
  lines: z.array(quotationTemplateLineSchema).min(1, "Template must contain at least one line item"),
});

export type QuotationTemplateFormValues = z.infer<typeof quotationTemplateSchema>;
export type QuotationTemplateLineFormValues = z.infer<typeof quotationTemplateLineSchema>;
