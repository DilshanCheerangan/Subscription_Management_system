import React, { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getFinanceReportData, ReportFilterParams } from "@/lib/reporting";
import { ReportFilters } from "@/components/reports/report-filters";
import { SummaryCards } from "@/components/reports/summary-cards";
import { RevenueChart } from "@/components/reports/revenue-chart";
import { SubscriptionsByStatusChart } from "@/components/reports/status-chart";
import { OverdueTable } from "@/components/reports/overdue-table";
import { RecentPaymentsTable } from "@/components/reports/recent-payments-table";
import { Zap, Loader2 } from "lucide-react";

interface ReportsPageProps {
  searchParams: Promise<{
    preset?: "this_month" | "last_month" | "quarter" | "custom" | "all";
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    planId?: string;
    status?: string;
  }>;
}

async function ReportsDashboardContent({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: "this_month" | "last_month" | "quarter" | "custom" | "all";
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    planId?: string;
    status?: string;
  }>;
}) {
  const resolvedParams = await searchParams;

  const filterParams: ReportFilterParams = {
    preset: resolvedParams.preset || "this_month",
    dateFrom: resolvedParams.dateFrom,
    dateTo: resolvedParams.dateTo,
    customerId: resolvedParams.customerId,
    planId: resolvedParams.planId,
    status: resolvedParams.status,
  };

  const reportResult = await getFinanceReportData(filterParams);
  const data = reportResult.data;

  // Build query string for CSV exports
  const exportParams = new URLSearchParams();
  if (filterParams.preset) exportParams.set("preset", filterParams.preset);
  if (filterParams.dateFrom) exportParams.set("dateFrom", filterParams.dateFrom);
  if (filterParams.dateTo) exportParams.set("dateTo", filterParams.dateTo);
  if (filterParams.customerId && filterParams.customerId !== "ALL") {
    exportParams.set("customerId", filterParams.customerId);
  }
  if (filterParams.planId && filterParams.planId !== "ALL") {
    exportParams.set("planId", filterParams.planId);
  }
  const exportQueryString = exportParams.toString();

  const dateRangeLabel =
    filterParams.preset === "last_month"
      ? "Last Month"
      : filterParams.preset === "quarter"
      ? "This Quarter"
      : filterParams.preset === "all"
      ? "All Time"
      : filterParams.preset === "custom"
      ? `${data.resolvedDates.from} to ${data.resolvedDates.to}`
      : "This Month";

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Finance & Operations Dashboard"
        description="Real-time SQL analytics, normalized MRR, cash collections, and receivable risk monitoring"
        badge={
          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <Zap className="h-3 w-3 text-indigo-600" /> Aggregations: {reportResult.durationMs}ms
          </span>
        }
      />

      {/* URL Filter Bar */}
      <ReportFilters
        customers={data.filterOptions.customers}
        plans={data.filterOptions.plans}
        activePreset={filterParams.preset || "this_month"}
        activeFrom={filterParams.dateFrom}
        activeTo={filterParams.dateTo}
        activeCustomerId={filterParams.customerId || "ALL"}
        activePlanId={filterParams.planId || "ALL"}
        activeStatus={filterParams.status || "ALL"}
      />

      {/* 6 Summary Cards */}
      <SummaryCards summary={data.summary} dateRangeLabel={dateRangeLabel} />

      {/* 2 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={data.revenueChart} />
        <SubscriptionsByStatusChart data={data.statusChart} />
      </div>

      {/* 2 Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverdueTable invoices={data.overdueInvoices} exportQueryString={exportQueryString} />
        <RecentPaymentsTable
          payments={data.recentPayments}
          exportQueryString={exportQueryString}
        />
      </div>
    </div>
  );
}

export default function AdminReportsPage({ searchParams }: ReportsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-500 font-sans">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="text-sm font-medium">Computing finance aggregates...</p>
        </div>
      }
    >
      <ReportsDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
