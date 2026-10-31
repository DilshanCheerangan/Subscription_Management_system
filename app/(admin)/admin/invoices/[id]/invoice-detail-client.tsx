"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import {
  getInvoiceDetailAction,
  confirmInvoiceAction,
  cancelInvoiceAction,
  sendInvoiceAction,
} from "@/app/actions/invoices";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Send,
  Printer,
  Receipt,
  User,
  Calendar,
  Layers,
  Percent,
  CreditCard,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface InvoiceLineItem {
  id: string;
  productName: string;
  productType: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  taxName: string;
  taxPercentage: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

interface InvoiceDiscountItem {
  id: string;
  name: string;
  type: string;
  value: number;
  scope: string;
  amount: number;
}

interface InvoicePaymentItem {
  id: string;
  method: string;
  amount: number;
  paymentDate: string;
  note?: string | null;
  recordedByName: string;
}

interface InvoiceDetailData {
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
  createdAt: string;
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
  lines: InvoiceLineItem[];
  discounts: InvoiceDiscountItem[];
  payments: InvoicePaymentItem[];
  actions: {
    canConfirm: boolean;
    canCancel: boolean;
    canSend: boolean;
    canRecordPayment: boolean;
  };
}

export function InvoiceDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<InvoiceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadInvoice = useCallback(() => {
    getInvoiceDetailAction(id).then((res) => {
      if (res.success && res.data) {
        setData(res.data as InvoiceDetailData);
      } else {
        setError(res.error || "Invoice not found");
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleConfirm = async () => {
    setActionLoading(true);
    const res = await confirmInvoiceAction(id);
    if (res.success) {
      setMessage({ type: "success", text: "Invoice confirmed successfully" });
      loadInvoice();
      router.refresh();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to confirm invoice" });
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this invoice? This action cannot be undone.")) {
      return;
    }
    setActionLoading(true);
    const res = await cancelInvoiceAction(id);
    if (res.success) {
      setMessage({ type: "success", text: "Invoice cancelled" });
      loadInvoice();
      router.refresh();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to cancel invoice" });
    }
    setActionLoading(false);
  };

  const handleSend = async () => {
    setActionLoading(true);
    const res = await sendInvoiceAction(id);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Invoice email sent successfully" });
    } else {
      setMessage({ type: "error", text: res.error || "Failed to send invoice" });
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
        <p className="text-sm font-medium">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error || "Invoice not found"}
        </div>
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Invoices
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {data.actions.canConfirm && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 shadow-2xs transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Confirm Invoice
            </button>
          )}

          {data.actions.canSend && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleSend}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-md text-xs font-semibold hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <Send className="h-3.5 w-3.5 text-slate-400" />
              Send Email Notice
            </button>
          )}

          <Link
            href={`/admin/invoices/${data.id}/print`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-md text-xs font-semibold hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            Print Invoice
          </Link>

          {data.actions.canCancel && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-xs font-semibold hover:bg-rose-100 shadow-2xs transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel Invoice
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Overdue Alert Banner if applicable */}
      {data.isOverdue && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800 font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">Invoice is Overdue</p>
              <p className="text-rose-600">
                Payment was due on {new Date(data.dueDate).toLocaleDateString()}. Outstanding balance:{" "}
                <strong>{formatCurrency(data.balance)}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Invoice Card Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{data.number}</h1>
            {data.isOverdue ? (
              <StatusBadge status="OVERDUE" label="Overdue" size="lg" />
            ) : (
              <StatusBadge status={data.status} size="lg" />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generated on {new Date(data.createdAt).toLocaleDateString()} • Billing Period:{" "}
            <strong>
              {new Date(data.periodStart).toLocaleDateString()} — {new Date(data.periodEnd).toLocaleDateString()}
            </strong>
          </p>
        </div>

        <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Total Payable
          </span>
          <span className="text-2xl font-bold text-indigo-600">{formatCurrency(data.total)}</span>
          <span className="text-xs text-slate-500 block">
            Due on {new Date(data.dueDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Line Items, Discounts & Totals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lines Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              Invoice Lines ({data.lines.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Item & Variant</th>
                    <th className="px-4 py-2.5 text-center">Qty</th>
                    <th className="px-4 py-2.5 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Tax</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.lines.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block">{line.productName}</span>
                        {line.variantName && (
                          <span className="text-xs text-indigo-600 block">{line.variantName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-900">{line.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(line.unitPrice)}</td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">
                        {line.taxName} ({line.taxPercentage}%)
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(line.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Auto-applied Discounts Section */}
            {data.discounts.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-emerald-600" />
                  Auto-Applied Discounts
                </h3>
                <div className="space-y-1.5">
                  {data.discounts.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-2.5 bg-emerald-50/60 border border-emerald-200/60 rounded-lg text-xs"
                    >
                      <div>
                        <span className="font-semibold text-emerald-900">{d.name}</span>
                        <span className="text-emerald-700 text-[11px] block">
                          Scope: {d.scope} • {d.type === "PERCENTAGE" ? `${d.value}% Off` : formatCurrency(d.value)}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-800">-{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals Breakdown */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Untaxed Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(data.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(data.taxTotal)}</span>
              </div>
              {data.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discounts:</span>
                  <span>-{formatCurrency(data.discountTotal)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>Total Amount:</span>
                <span className="text-indigo-600">{formatCurrency(data.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Amount Paid:</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(data.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                <span>Outstanding Balance:</span>
                <span className={data.balance > 0 ? "text-rose-600 font-bold" : "text-emerald-600"}>
                  {formatCurrency(data.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Card (Phase 6 Placeholder/Table) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              Recorded Payments ({data.payments.length})
            </h2>

            {data.payments.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No payments recorded yet. Payments will be registered in Phase 6.
              </div>
            ) : (
              <div className="space-y-2">
                {data.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{formatCurrency(p.amount)}</span>
                      <span className="text-slate-500 block text-[11px]">
                        Method: {p.method} • Date: {new Date(p.paymentDate).toLocaleDateString()}
                      </span>
                      {p.note && <span className="text-slate-400 italic block mt-0.5">{p.note}</span>}
                    </div>
                    <span className="text-slate-400 text-[11px]">by {p.recordedByName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer & Subscription Info */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-indigo-600" />
              Customer Snapshot
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="font-bold text-slate-900">{data.customer.name}</div>
              <div className="text-xs text-slate-600">{data.customer.email}</div>
            </div>
          </div>

          {/* Subscription Context Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              Subscription Source
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 block">Subscription:</span>
                <Link
                  href={`/admin/subscriptions/${data.subscription.id}`}
                  className="font-bold text-indigo-600 hover:underline text-sm block"
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
                <span className="text-slate-800 font-medium">
                  {data.subscription.paymentTermName}
                </span>
              </div>
            </div>
          </div>

          {/* Key Dates Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              Timeline & Due Dates
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
                <span>Payment Due Date:</span>
                <span className={data.isOverdue ? "font-bold text-rose-600" : "font-bold text-indigo-600"}>
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
