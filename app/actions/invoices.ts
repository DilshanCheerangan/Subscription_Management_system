"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { runBilling, BillingRunResult } from "@/lib/billing/runBilling";
import { sendInvoiceSummaryEmail } from "@/lib/mail";
import { formatCurrency } from "@/lib/format";

export interface InvoiceFilterParams {
  search?: string;
  status?: InvoiceStatus | "ALL" | "OVERDUE";
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function getInvoicesAction(params: InvoiceFilterParams = {}) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Authentication required" };
    }

    const {
      search,
      status = "ALL",
      customerId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20, // 20 per MASTER.md section 5
    } = params;

    const where: Prisma.InvoiceWhereInput = {};

    // RBAC: CUSTOMER only sees their own invoices
    if (session.role === "CUSTOMER") {
      where.customerId = session.userId;
    } else if (customerId && customerId !== "ALL") {
      where.customerId = customerId;
    }

    // Status / Overdue Filter
    const today = new Date();
    if (status === "OVERDUE") {
      where.status = InvoiceStatus.CONFIRMED;
      where.dueDate = { lt: today };
      // Balance must be > 0: total > amountPaid
      where.amountPaid = { lt: prisma.invoice.fields.total };
    } else if (status && status !== "ALL") {
      where.status = status;
    }

    // Search query (number or customer name/email)
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { number: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { customer: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    // Date range filter on periodStart or createdAt
    if (dateFrom || dateTo) {
      where.periodStart = {};
      if (dateFrom) where.periodStart.gte = new Date(dateFrom);
      if (dateTo) where.periodStart.lte = new Date(dateTo);
    }

    const total = await prisma.invoice.count({ where });

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        subscription: {
          select: { id: true, number: true, plan: { select: { name: true, billingPeriod: true } } },
        },
        _count: {
          select: { lines: true, payments: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const now = new Date();
    const rows = invoices.map((inv) => {
      const totalAmount = Number(inv.total);
      const amountPaid = Number(inv.amountPaid);
      const isOverdue =
        inv.status === InvoiceStatus.CONFIRMED &&
        new Date(inv.dueDate) < now &&
        amountPaid < totalAmount;

      return {
        id: inv.id,
        number: inv.number,
        subscriptionId: inv.subscriptionId,
        subscriptionNumber: inv.subscription.number,
        planName: inv.subscription.plan.name,
        billingPeriod: inv.subscription.plan.billingPeriod,
        customerId: inv.customerId,
        customerName: inv.customer.name,
        customerEmail: inv.customer.email,
        status: inv.status,
        isOverdue,
        periodStart: inv.periodStart.toISOString(),
        periodEnd: inv.periodEnd.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        subtotal: Number(inv.subtotal),
        taxTotal: Number(inv.taxTotal),
        discountTotal: Number(inv.discountTotal),
        total: totalAmount,
        amountPaid,
        balance: Math.max(0, totalAmount - amountPaid),
        lineCount: inv._count.lines,
        paymentCount: inv._count.payments,
        createdAt: inv.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        invoices: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load invoices";
    return { success: false, error: message };
  }
}

export async function getInvoiceDetailAction(id: string) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return { success: false, error: "Authentication required" };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: {
          include: {
            plan: true,
            paymentTerm: true,
          },
        },
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
          },
        },
        discounts: {
          include: {
            discount: true,
          },
        },
        payments: {
          include: {
            recordedBy: { select: { name: true, email: true } },
          },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Role check: Customer can only see their own invoices
    if (session.role === "CUSTOMER" && invoice.customerId !== session.userId) {
      return { success: false, error: "Access denied" };
    }

    const total = Number(invoice.total);
    const amountPaid = Number(invoice.amountPaid);
    const balance = Math.max(0, total - amountPaid);
    const isOverdue =
      invoice.status === InvoiceStatus.CONFIRMED &&
      new Date(invoice.dueDate) < new Date() &&
      amountPaid < total;

    return {
      success: true,
      data: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        isOverdue,
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        subtotal: Number(invoice.subtotal),
        taxTotal: Number(invoice.taxTotal),
        discountTotal: Number(invoice.discountTotal),
        total,
        amountPaid,
        balance,
        createdAt: invoice.createdAt.toISOString(),
        customer: {
          id: invoice.customer.id,
          name: invoice.customer.name,
          email: invoice.customer.email,
        },
        subscription: {
          id: invoice.subscription.id,
          number: invoice.subscription.number,
          planName: invoice.subscription.plan.name,
          billingPeriod: invoice.subscription.plan.billingPeriod,
          paymentTermName: invoice.subscription.paymentTerm?.name || "Immediate",
        },
        lines: invoice.lines.map((l) => ({
          id: l.id,
          productName: l.product.name,
          productType: l.product.type,
          variantName: l.variant?.attributeValue || null,
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice),
          taxName: l.tax?.name || "No Tax",
          taxPercentage: l.tax ? Number(l.tax.percentage) : 0,
          subtotal: Number(l.subtotal),
          taxAmount: Number(l.taxAmount),
          total: Number(l.total),
        })),
        discounts: invoice.discounts.map((d) => ({
          id: d.id,
          name: d.discount.name,
          type: d.discount.type,
          value: Number(d.discount.value),
          scope: d.discount.scope,
          amount: Number(d.amount),
        })),
        payments: invoice.payments.map((p) => ({
          id: p.id,
          method: p.method,
          amount: Number(p.amount),
          paymentDate: p.paymentDate.toISOString(),
          note: p.note,
          recordedByName: p.recordedBy?.name || "System",
        })),
        actions: {
          canConfirm: invoice.status === InvoiceStatus.DRAFT,
          canCancel:
            (invoice.status === InvoiceStatus.DRAFT ||
              invoice.status === InvoiceStatus.CONFIRMED) &&
            amountPaid === 0,
          canSend: invoice.status !== InvoiceStatus.CANCELLED,
          canRecordPayment:
            invoice.status === InvoiceStatus.CONFIRMED && balance > 0,
        },
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load invoice";
    return { success: false, error: message };
  }
}

export async function confirmInvoiceAction(id: string) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return { success: false, error: "Invoice not found" };

    if (invoice.status !== InvoiceStatus.DRAFT) {
      return { success: false, error: `Only Draft invoices can be confirmed (current: ${invoice.status})` };
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CONFIRMED },
    });

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${id}`);
    return { success: true, status: updated.status };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to confirm invoice";
    return { success: false, error: message };
  }
}

export async function cancelInvoiceAction(id: string) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };

    if (invoice.status === InvoiceStatus.PAID) {
      return { success: false, error: "Cannot cancel a paid invoice" };
    }
    if (invoice.status === InvoiceStatus.CANCELLED) {
      return { success: false, error: "Invoice is already cancelled" };
    }
    if (invoice.payments.length > 0) {
      return { success: false, error: "Cannot cancel an invoice with recorded payments" };
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${id}`);
    return { success: true, status: updated.status };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to cancel invoice";
    return { success: false, error: message };
  }
}

export async function sendInvoiceAction(id: string) {
  try {
    await requireRole(["ADMIN", "STAFF"]);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return { success: false, error: "Cannot send a cancelled invoice" };
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const viewUrl = `${baseUrl}/admin/invoices/${invoice.id}`;

    const sent = await sendInvoiceSummaryEmail({
      toEmail: invoice.customer.email,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.number,
      totalFormatted: formatCurrency(Number(invoice.total)),
      dueDateFormatted: new Date(invoice.dueDate).toLocaleDateString(),
      viewUrl,
    });

    return {
      success: true,
      message: sent
        ? `Invoice ${invoice.number} sent to ${invoice.customer.email}`
        : "Email notification logged in console (SMTP not configured)",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send invoice";
    return { success: false, error: message };
  }
}

export async function triggerBillingRunAction(): Promise<{
  success: boolean;
  data?: BillingRunResult;
  error?: string;
}> {
  try {
    await requireRole(["ADMIN", "STAFF"]);
    const result = await runBilling();

    revalidatePath("/admin/invoices");
    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin/billing-run");

    return { success: true, data: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Billing run execution failed";
    return { success: false, error: message };
  }
}
