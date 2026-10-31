import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { roundMoney } from "@/lib/money";
import { measureTiming, TimingResult } from "@/lib/timing";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  format,
} from "date-fns";

export interface ReportFilterParams {
  preset?: "this_month" | "last_month" | "quarter" | "custom" | "all";
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  planId?: string;
  status?: string;
}

export interface SummaryCardsData {
  activeSubscriptions: number;
  mrr: number;
  revenueCollected: number;
  outstandingAmount: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface MonthlyRevenuePoint {
  month: string;
  label: string;
  revenue: number;
}

export interface StatusDistributionPoint {
  status: string;
  count: number;
}

export interface OverdueInvoiceRow {
  id: string;
  number: string;
  dueDate: string;
  daysOverdue: number;
  customerName: string;
  customerEmail: string;
  subscriptionNumber: string;
  total: number;
  amountPaid: number;
  amountDue: number;
}

export interface RecentPaymentRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  method: string;
  amount: number;
  paymentDate: string;
  note?: string | null;
}

export interface ReportData {
  summary: SummaryCardsData;
  revenueChart: MonthlyRevenuePoint[];
  statusChart: StatusDistributionPoint[];
  overdueInvoices: OverdueInvoiceRow[];
  recentPayments: RecentPaymentRow[];
  filterOptions: {
    customers: Array<{ id: string; name: string }>;
    plans: Array<{ id: string; name: string }>;
  };
  queryDurationMs: number;
  resolvedDates: {
    from: string;
    to: string;
  };
}

export function resolveDateRange(params: ReportFilterParams): { from: Date; to: Date } {
  const now = new Date();
  const preset = params.preset || "this_month";

  if (preset === "last_month") {
    const prev = subMonths(now, 1);
    return { from: startOfMonth(prev), to: endOfMonth(prev) };
  }

  if (preset === "quarter") {
    return { from: startOfQuarter(now), to: endOfQuarter(now) };
  }

  if (preset === "custom" && params.dateFrom && params.dateTo) {
    const from = new Date(params.dateFrom);
    const to = new Date(params.dateTo);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (preset === "all") {
    return { from: new Date("2020-01-01"), to: new Date("2099-12-31") };
  }

  // Default: this_month
  return { from: startOfMonth(now), to: endOfMonth(now) };
}

/**
 * Executes pure SQL aggregations for finance dashboard with zero JS row loading.
 */
export async function getFinanceReportData(
  params: ReportFilterParams = {}
): Promise<TimingResult<ReportData>> {
  return measureTiming("getFinanceReportData", async () => {
    const { from: dateFrom, to: dateTo } = resolveDateRange(params);
    const customerId = params.customerId && params.customerId !== "ALL" ? params.customerId : null;
    const planId = params.planId && params.planId !== "ALL" ? params.planId : null;
    const status = params.status && params.status !== "ALL" ? params.status : null;

    // 1. Single Consolidated Summary Query (Active Subscriptions, MRR, Revenue, Outstanding, Overdue)
    const summaryQuery = prisma.$queryRaw<
      Array<{
        active_count: number;
        mrr: Prisma.Decimal | number | null;
        revenue: Prisma.Decimal | number | null;
        outstanding: Prisma.Decimal | number | null;
        overdue_count: number;
        overdue_amount: Prisma.Decimal | number | null;
      }>
    >`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM "Subscription" s
          WHERE s."status" = 'ACTIVE'
            ${customerId ? Prisma.sql`AND s."customerId" = ${customerId}` : Prisma.empty}
            ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
        ) as active_count,
        (
          SELECT COALESCE(SUM(
            CASE
              WHEN p."billingPeriod" = 'MONTHLY' THEN p."price"
              WHEN p."billingPeriod" = 'YEARLY' THEN p."price" / 12.0
              WHEN p."billingPeriod" = 'WEEKLY' THEN p."price" * 4.333333
              WHEN p."billingPeriod" = 'DAILY' THEN p."price" * 30.0
              ELSE p."price"
            END
          ), 0)
          FROM "Subscription" s
          JOIN "Plan" p ON s."planId" = p."id"
          WHERE s."status" = 'ACTIVE'
            ${customerId ? Prisma.sql`AND s."customerId" = ${customerId}` : Prisma.empty}
            ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
        ) as mrr,
        (
          SELECT COALESCE(SUM(pm."amount"), 0)
          FROM "Payment" pm
          JOIN "Invoice" inv ON pm."invoiceId" = inv."id"
          JOIN "Subscription" s ON inv."subscriptionId" = s."id"
          WHERE pm."paymentDate" >= ${dateFrom}
            AND pm."paymentDate" <= ${dateTo}
            ${customerId ? Prisma.sql`AND inv."customerId" = ${customerId}` : Prisma.empty}
            ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
            ${status ? Prisma.sql`AND s."status" = ${status}::"SubscriptionStatus"` : Prisma.empty}
        ) as revenue,
        (
          SELECT COALESCE(SUM(inv."total" - inv."amountPaid"), 0)
          FROM "Invoice" inv
          JOIN "Subscription" s ON inv."subscriptionId" = s."id"
          WHERE inv."status" = 'CONFIRMED'
            AND inv."total" > inv."amountPaid"
            ${customerId ? Prisma.sql`AND inv."customerId" = ${customerId}` : Prisma.empty}
            ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
            ${status ? Prisma.sql`AND s."status" = ${status}::"SubscriptionStatus"` : Prisma.empty}
        ) as outstanding,
        (
          SELECT COUNT(*)::int
          FROM "Invoice" inv
          JOIN "Subscription" s ON inv."subscriptionId" = s."id"
          WHERE inv."status" = 'CONFIRMED'
            AND inv."total" > inv."amountPaid"
            AND inv."dueDate" < CURRENT_DATE
            ${customerId ? Prisma.sql`AND inv."customerId" = ${customerId}` : Prisma.empty}
            ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
            ${status ? Prisma.sql`AND s."status" = ${status}::"SubscriptionStatus"` : Prisma.empty}
        ) as overdue_count,
        (
          SELECT COALESCE(SUM(inv."total" - inv."amountPaid"), 0)
          FROM "Invoice" inv
          JOIN "Subscription" s ON inv."subscriptionId" = s."id"
          WHERE inv."status" = 'CONFIRMED'
            AND inv."total" > inv."amountPaid"
            AND inv."dueDate" < CURRENT_DATE
            ${customerId ? Prisma.sql`AND inv."customerId" = ${customerId}` : Prisma.empty}
            ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
            ${status ? Prisma.sql`AND s."status" = ${status}::"SubscriptionStatus"` : Prisma.empty}
        ) as overdue_amount;
    `;

    // 6. Revenue by Month (Trailing 6 months)
    const sixMonthsAgo = subMonths(new Date(), 6);
    const monthlyRevenueQuery = prisma.$queryRaw<
      Array<{ month_key: string; label: string; revenue: Prisma.Decimal | number }>
    >`
      SELECT
        TO_CHAR(DATE_TRUNC('month', pm."paymentDate"), 'YYYY-MM') as month_key,
        TO_CHAR(DATE_TRUNC('month', pm."paymentDate"), 'Mon YYYY') as label,
        COALESCE(SUM(pm."amount"), 0) as revenue
      FROM "Payment" pm
      JOIN "Invoice" inv ON pm."invoiceId" = inv."id"
      JOIN "Subscription" s ON inv."subscriptionId" = s."id"
      WHERE pm."paymentDate" >= ${sixMonthsAgo}
        ${customerId ? Prisma.sql`AND inv."customerId" = ${customerId}` : Prisma.empty}
        ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
      GROUP BY DATE_TRUNC('month', pm."paymentDate")
      ORDER BY DATE_TRUNC('month', pm."paymentDate") ASC;
    `;

    // 7. Subscriptions by Status via SQL Group By
    const statusDistributionQuery = prisma.$queryRaw<
      Array<{ status: string; count: bigint | number }>
    >`
      SELECT
        s."status"::text as status,
        COUNT(*)::int as count
      FROM "Subscription" s
      WHERE 1=1
        ${customerId ? Prisma.sql`AND s."customerId" = ${customerId}` : Prisma.empty}
        ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
      GROUP BY s."status"
      ORDER BY count DESC;
    `;

    // 8. Overdue Invoices List (Top 10)
    const overdueInvoicesQuery = prisma.$queryRaw<
      Array<{
        id: string;
        number: string;
        dueDate: Date;
        daysOverdue: number;
        customerName: string;
        customerEmail: string;
        subscriptionNumber: string;
        total: Prisma.Decimal | number;
        amountPaid: Prisma.Decimal | number;
        amountDue: Prisma.Decimal | number;
      }>
    >`
      SELECT
        inv."id",
        inv."number",
        inv."dueDate",
        (CURRENT_DATE - inv."dueDate"::date)::int as "daysOverdue",
        u."name" as "customerName",
        u."email" as "customerEmail",
        s."number" as "subscriptionNumber",
        inv."total",
        inv."amountPaid",
        (inv."total" - inv."amountPaid") as "amountDue"
      FROM "Invoice" inv
      JOIN "User" u ON inv."customerId" = u."id"
      JOIN "Subscription" s ON inv."subscriptionId" = s."id"
      WHERE inv."status" = 'CONFIRMED'
        AND inv."total" > inv."amountPaid"
        AND inv."dueDate" < CURRENT_DATE
        ${customerId ? Prisma.sql`AND inv."customerId" = ${customerId}` : Prisma.empty}
        ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
      ORDER BY (CURRENT_DATE - inv."dueDate"::date) DESC
      LIMIT 10;
    `;

    // 9. Recent Payments (Top 10)
    const recentPaymentsQuery = prisma.$queryRaw<
      Array<{
        id: string;
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        method: string;
        amount: Prisma.Decimal | number;
        paymentDate: Date;
        note: string | null;
      }>
    >`
      SELECT
        pm."id",
        pm."paymentDate",
        pm."method"::text as method,
        pm."amount",
        pm."note",
        inv."id" as "invoiceId",
        inv."number" as "invoiceNumber",
        u."name" as "customerName"
      FROM "Payment" pm
      JOIN "Invoice" inv ON pm."invoiceId" = inv."id"
      JOIN "User" u ON inv."customerId" = u."id"
      JOIN "Subscription" s ON inv."subscriptionId" = s."id"
      WHERE 1=1
        ${customerId ? Prisma.sql`AND inv."customerId" = ${customerId}` : Prisma.empty}
        ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
      ORDER BY pm."paymentDate" DESC
      LIMIT 10;
    `;

    // 10. Filter choices
    const customersQuery = prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 100,
    });

    const plansQuery = prisma.plan.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // Execute aggregated queries concurrently in one pipeline
    const [
      summaryRes,
      monthlyRevenueRes,
      statusDistRes,
      overdueInvoicesRes,
      recentPaymentsRes,
      customersRes,
      plansRes,
    ] = await Promise.all([
      summaryQuery,
      monthlyRevenueQuery,
      statusDistributionQuery,
      overdueInvoicesQuery,
      recentPaymentsQuery,
      customersQuery,
      plansQuery,
    ]);

    const sRow = summaryRes[0];
    const summary: SummaryCardsData = {
      activeSubscriptions: Number(sRow?.active_count || 0),
      mrr: roundMoney(Number(sRow?.mrr || 0)),
      revenueCollected: roundMoney(Number(sRow?.revenue || 0)),
      outstandingAmount: roundMoney(Number(sRow?.outstanding || 0)),
      overdueCount: Number(sRow?.overdue_count || 0),
      overdueAmount: roundMoney(Number(sRow?.overdue_amount || 0)),
    };

    const revenueChart: MonthlyRevenuePoint[] = monthlyRevenueRes.map((r) => ({
      month: r.month_key,
      label: r.label,
      revenue: roundMoney(Number(r.revenue)),
    }));

    const statusChart: StatusDistributionPoint[] = statusDistRes.map((r) => ({
      status: r.status,
      count: Number(r.count),
    }));

    const overdueInvoices: OverdueInvoiceRow[] = overdueInvoicesRes.map((inv) => ({
      id: inv.id,
      number: inv.number,
      dueDate: inv.dueDate.toISOString(),
      daysOverdue: Number(inv.daysOverdue),
      customerName: inv.customerName,
      customerEmail: inv.customerEmail,
      subscriptionNumber: inv.subscriptionNumber,
      total: Number(inv.total),
      amountPaid: Number(inv.amountPaid),
      amountDue: Number(inv.amountDue),
    }));

    const recentPayments: RecentPaymentRow[] = recentPaymentsRes.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoiceNumber,
      customerName: p.customerName,
      method: p.method,
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString(),
      note: p.note,
    }));

    return {
      summary,
      revenueChart,
      statusChart,
      overdueInvoices,
      recentPayments,
      filterOptions: {
        customers: customersRes,
        plans: plansRes,
      },
      queryDurationMs: 0, // Injected by measureTiming
      resolvedDates: {
        from: format(dateFrom, "yyyy-MM-dd"),
        to: format(dateTo, "yyyy-MM-dd"),
      },
    };
  });
}
