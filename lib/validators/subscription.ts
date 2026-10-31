import { z } from "zod";
import { SubscriptionStatus } from "@prisma/client";

export const subscriptionLineSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Unit price must be >= 0"),
  taxId: z.string().optional().nullable(),
});

export const subscriptionFormSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  planId: z.string().min(1, "Please select a subscription plan"),
  startDate: z.string().min(1, "Start date is required"),
  expiryDate: z.string().optional().nullable(),
  paymentTermId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  initialStatus: z
    .nativeEnum(SubscriptionStatus)
    .default(SubscriptionStatus.DRAFT),
  lines: z
    .array(subscriptionLineSchema)
    .min(1, "Subscription must have at least one product line"),
});

export type SubscriptionLineFormValues = z.infer<typeof subscriptionLineSchema>;
export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;
