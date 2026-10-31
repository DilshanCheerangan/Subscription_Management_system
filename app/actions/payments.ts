"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { InvoiceStatus, PaymentMethod, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { roundMoney, addMoney, subtractMoney } from "@/lib/money";
import { z } from "zod";

const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  method: z.nativeEnum(PaymentMethod, { message: "Invalid payment method" }),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  note: z.string().optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export async function recordPaymentAction(input: RecordPaymentInput) {
  try {
    const session = await requireRole(["ADMIN", "STAFF"]);

    const validated = recordPaymentSchema.parse(input);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch invoice with lock / current amounts
      const invoice = await tx.invoice.findUnique({
        where: { id: validated.invoiceId },
        include: {
          customer: { select: { id: true, name: true } },
        },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Requirement: Invoice must be CONFIRMED to accept payments
      if (invoice.status !== InvoiceStatus.CONFIRMED) {
        if (invoice.status === InvoiceStatus.PAID) {
          throw new Error("This invoice is already paid in full");
        }
        if (invoice.status === InvoiceStatus.DRAFT) {
          throw new Error("Invoice must be CONFIRMED before payments can be recorded");
        }
        if (invoice.status === InvoiceStatus.CANCELLED) {
          throw new Error("Cannot record payments on a cancelled invoice");
        }
        throw new Error(`Invoice status ${invoice.status} does not permit payments`);
      }

      const total = Number(invoice.total);
      const currentPaid = Number(invoice.amountPaid);
      const balance = Math.max(0, roundMoney(subtractMoney(total, currentPaid)));

      const paymentAmount = roundMoney(validated.amount);

      // Cannot exceed balance!
      if (paymentAmount > balance) {
        throw new Error(
          `Payment amount (${paymentAmount}) cannot exceed the outstanding balance (${balance})`
        );
      }

      // 2. Insert Payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          method: validated.method,
          amount: new Prisma.Decimal(paymentAmount),
          paymentDate: new Date(validated.paymentDate),
          note: validated.note || null,
          recordedById: session.userId,
        },
      });

      // 3. Recompute total paid sum from all payments for consistency
      const allPayments = await tx.payment.findMany({
        where: { invoiceId: invoice.id },
      });

      const newTotalPaid = roundMoney(
        allPayments.reduce((sum, p) => addMoney(sum, Number(p.amount)), 0)
      );

      // 4. If sum(payments) >= total, automatically transition to PAID
      const isFullyPaid = newTotalPaid >= total;
      const newStatus = isFullyPaid ? InvoiceStatus.PAID : invoice.status;

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: new Prisma.Decimal(newTotalPaid),
          status: newStatus,
        },
      });

      return {
        paymentId: payment.id,
        invoiceNumber: invoice.number,
        amount: paymentAmount,
        totalPaid: newTotalPaid,
        remainingBalance: Math.max(0, roundMoney(subtractMoney(total, newTotalPaid))),
        newStatus,
        isFullyPaid,
      };
    });

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${validated.invoiceId}`);
    revalidatePath("/admin/payments");
    revalidatePath("/portal/invoices");
    revalidatePath("/portal");

    return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "Validation failed" };
    }
    const message = error instanceof Error ? error.message : "Failed to record payment";
    return { success: false, error: message };
  }
}

export interface PaymentFilterParams {
  method?: PaymentMethod | "ALL";
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getPaymentsAction(params: PaymentFilterParams = {}) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Authentication required" };
    }

    const {
      method = "ALL",
      customerId,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
    } = params;

    const where: Prisma.PaymentWhereInput = {};

    // Customer isolation
    if (session.role === "CUSTOMER") {
      where.invoice = { customerId: session.userId };
    } else if (customerId && customerId !== "ALL") {
      where.invoice = { customerId };
    }

    // Method filter
    if (method && method !== "ALL") {
      where.method = method;
    }

    // Date range
    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
      if (dateTo) where.paymentDate.lte = new Date(dateTo);
    }

    // Search query on invoice number or customer name/email
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { invoice: { number: { contains: q, mode: "insensitive" } } },
        { invoice: { customer: { name: { contains: q, mode: "insensitive" } } } },
        { invoice: { customer: { email: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const total = await prisma.payment.count({ where });

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            number: true,
            total: true,
            customer: { select: { id: true, name: true, email: true } },
          },
        },
        recordedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const rows = payments.map((p) => ({
      id: p.id,
      invoiceId: p.invoice.id,
      invoiceNumber: p.invoice.number,
      invoiceTotal: Number(p.invoice.total),
      customerId: p.invoice.customer.id,
      customerName: p.invoice.customer.name,
      customerEmail: p.invoice.customer.email,
      method: p.method,
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString(),
      note: p.note,
      recordedByName: p.recordedBy?.name || "System",
      createdAt: p.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        payments: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load payments";
    return { success: false, error: message };
  }
}

export async function getPaymentFilterCustomersAction() {
  try {
    const session = await getSessionUser();
    if (!session || session.role === "CUSTOMER") {
      return { success: false, customers: [] };
    }
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 100,
    });
    return { success: true, customers };
  } catch {
    return { success: false, customers: [] };
  }
}

