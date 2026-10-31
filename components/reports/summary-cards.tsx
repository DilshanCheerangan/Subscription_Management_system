import React from "react";
import { formatCurrency } from "@/lib/format";
import { SummaryCardsData } from "@/lib/reporting";
import {
  Repeat,
  TrendingUp,
  CreditCard,
  Receipt,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface SummaryCardsProps {
  summary: SummaryCardsData;
  dateRangeLabel: string;
}

export function SummaryCards({ summary, dateRangeLabel }: SummaryCardsProps) {
  const cards = [
    {
      title: "Active Subscriptions",
      value: summary.activeSubscriptions.toLocaleString(),
      subtitle: "Currently generating recurring revenue",
      icon: Repeat,
      iconClass: "bg-emerald-50 text-emerald-600",
      valueClass: "text-slate-900",
    },
    {
      title: "Monthly Recurring Revenue",
      value: formatCurrency(summary.mrr),
      subtitle: "Normalized MRR across all active contracts",
      icon: TrendingUp,
      iconClass: "bg-indigo-50 text-indigo-600",
      valueClass: "text-indigo-600",
    },
    {
      title: "Collected Revenue",
      value: formatCurrency(summary.revenueCollected),
      subtitle: `Payments settled (${dateRangeLabel})`,
      icon: CreditCard,
      iconClass: "bg-blue-50 text-blue-600",
      valueClass: "text-slate-900",
    },
    {
      title: "Outstanding Receivables",
      value: formatCurrency(summary.outstandingAmount),
      subtitle: "Balance due on confirmed invoices",
      icon: Receipt,
      iconClass: "bg-amber-50 text-amber-700",
      valueClass: summary.outstandingAmount > 0 ? "text-amber-800" : "text-slate-900",
    },
    {
      title: "Overdue Invoices",
      value: summary.overdueCount.toLocaleString(),
      subtitle: `${formatCurrency(summary.overdueAmount)} total overdue balance`,
      icon: AlertTriangle,
      iconClass: "bg-rose-50 text-rose-600",
      valueClass: summary.overdueCount > 0 ? "text-rose-600" : "text-slate-900",
    },
    {
      title: "Overdue Amount",
      value: formatCurrency(summary.overdueAmount),
      subtitle: "Immediate collection follow-up needed",
      icon: Clock,
      iconClass: "bg-rose-50 text-rose-600",
      valueClass: summary.overdueAmount > 0 ? "text-rose-600" : "text-slate-900",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${card.iconClass}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-bold ${card.valueClass}`}>
                {card.value}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
