"use client";

import React from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import {
  ArrowLeft,
  Printer,
  Receipt,
  Layers,
  Calendar,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

export interface PortalInvoiceData {
  id: string;
  number: string;
  status: string;
  isOverdue: boolean;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  subscription: {
    id: string;
    number: string;
    planName: string;
    billingPeriod: string;
    paymentTermName: string;
  };
  lines: Array<{
    id: string;
    productName: string;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    taxName: string;
    taxPercentage: number;
    subtotal: number;
    taxAmount: number;
    total: number;
  }>;
  discounts: Array<{
    id: string;
    name: string;
    type: string;
    value: number;
    amount: number;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    runningBalance: number;
    paymentDate: string;
    note?: string | null;
    recordedByName: string;
  }>;
  createdAt: string;
}

export function PortalInvoiceClient({ data }: { data: PortalInvoiceData }) {
  const badgeStatus =
    data.status === "PAID"
      ? "PAID"
      : data.isOverdue
      ? "OVERDUE"
      : "CONFIRMED";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/portal/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Invoices
        </Link>

        <Link
          href={`/portal/invoices/${data.id}/print`}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-md text-xs font-semibold hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <Printer className="h-3.5 w-3.5 text-slate-500" />
          Print / Save PDF
        </Link>
      </div>

      {/* Overdue Warning Notice Banner if applicable */}
      {data.isOverdue && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-sm block">Invoice is Overdue</span>
            Payment of {formatCurrency(data.balance)} was due on{" "}
            {new Date(data.dueDate).toLocaleDateString()}. Please complete payment or contact support to avoid service interruption.
          </div>
        </div>
      )}

      {/* Main Card Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Invoice {data.number}</h1>
            <StatusBadge status={badgeStatus} />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Period: {new Date(data.periodStart).toLocaleDateString()} to{" "}
            {new Date(data.periodEnd).toLocaleDateString()} • Due{" "}
            {new Date(data.dueDate).toLocaleDateString()}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500 block">Outstanding Balance</span>
          <span
            className={`text-xl font-bold ${
              data.balance > 0
                ? data.isOverdue
                  ? "text-rose-600"
                  : "text-amber-700"
                : "text-emerald-600"
            }`}
          >
            {formatCurrency(data.balance)}
          </span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Lines, Discounts, Payments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              Invoice Line Items
            </h2>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Tax</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">{l.productName}</span>
                        {l.variantName && (
                          <span className="text-slate-400 text-[11px] block">{l.variantName}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 font-medium">
                        {l.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-medium">
                        {formatCurrency(l.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {l.taxPercentage > 0 ? `${l.taxPercentage}%` : "0%"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(l.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="border-t border-slate-100 pt-4 space-y-1.5 text-xs max-w-xs ml-auto">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900">{formatCurrency(data.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes:</span>
                <span className="font-medium text-slate-900">{formatCurrency(data.taxTotal)}</span>
              </div>
              {data.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discounts Applied:</span>
                  <span>-{formatCurrency(data.discountTotal)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>Invoice Total:</span>
                <span className="text-indigo-600">{formatCurrency(data.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Amount Paid:</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(data.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                <span>Balance Due:</span>
                <span className={data.balance > 0 ? "text-rose-600" : "text-emerald-600"}>
                  {formatCurrency(data.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Card with Running Balance */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              Recorded Payments & Receipts ({data.payments.length})
            </h2>

            {data.payments.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No payments recorded yet for this invoice.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                      <th className="py-2.5 px-3">Reference / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {p.method.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                          {formatCurrency(p.runningBalance)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 italic text-[11px]">
                          {p.note || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Subscription & Schedule Details */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              Subscription Source
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 block">Subscription:</span>
                <Link
                  href={`/portal/subscriptions/${data.subscription.id}`}
                  className="font-bold text-indigo-600 hover:underline text-sm"
                >
                  {data.subscription.number}
                </Link>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Plan:</span>
                <span className="font-semibold text-slate-900">
                  {data.subscription.planName} ({data.subscription.billingPeriod.toLowerCase()})
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Payment Term:</span>
                <span className="font-medium text-slate-800">
                  {data.subscription.paymentTermName}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              Key Billing Dates
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Period Start:</span>
                <span className="font-medium text-slate-900">
                  {new Date(data.periodStart).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Period End:</span>
                <span className="font-medium text-slate-900">
                  {new Date(data.periodEnd).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-2">
                <span>Payment Due:</span>
                <span className={data.isOverdue ? "font-bold text-rose-600" : "font-semibold text-indigo-600"}>
                  {new Date(data.dueDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
