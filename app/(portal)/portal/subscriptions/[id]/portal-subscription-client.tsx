"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import {
  portalCustomerSubscriptionAction,
  getPortalSubscriptionDetailAction,
} from "@/app/actions/portal";
import {
  ArrowLeft,
  PauseCircle,
  PlayCircle,
  XCircle,
  RefreshCw,
  Receipt,
  Clock,
  Layers,
  Calendar,
  Loader2,
} from "lucide-react";

interface LineItem {
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
}

interface InvoiceSummary {
  id: string;
  number: string;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  isOverdue: boolean;
  dueDate: string;
}

interface StatusHistoryItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  notes?: string | null;
  actorName: string;
  createdAt: string;
}

export interface PortalSubscriptionData {
  id: string;
  number: string;
  status: string;
  startDate: string;
  expiryDate: string | null;
  nextInvoiceDate: string | null;
  paymentTermName: string;
  plan: {
    id: string;
    name: string;
    billingPeriod: string;
    price: number;
    pausable: boolean;
    closable: boolean;
    autoClose: boolean;
    renewable: boolean;
  };
  actions: {
    canPause: boolean;
    canResume: boolean;
    canClose: boolean;
    canRenew: boolean;
  };
  lines: LineItem[];
  history: StatusHistoryItem[];
  invoices: InvoiceSummary[];
}

export function PortalSubscriptionClient({
  initialData,
  subscriptionId,
}: {
  initialData: PortalSubscriptionData;
  subscriptionId: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<PortalSubscriptionData>(initialData);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refreshData = async () => {
    const res = await getPortalSubscriptionDetailAction(subscriptionId);
    if (res.success && res.data) {
      setData(res.data as PortalSubscriptionData);
    }
  };

  const handleAction = async (action: "PAUSE" | "RESUME" | "CLOSE" | "RENEW") => {
    let confirmPrompt = "";
    if (action === "PAUSE") confirmPrompt = "Are you sure you want to pause recurring billing for this subscription?";
    if (action === "CLOSE") confirmPrompt = "Are you sure you want to cancel and close this subscription?";
    if (action === "RENEW") confirmPrompt = "Renew subscription for the next billing cycle?";

    if (confirmPrompt && !confirm(confirmPrompt)) {
      return;
    }

    setLoadingAction(action);
    setMessage(null);

    const res = await portalCustomerSubscriptionAction({ subscriptionId, action });
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Action processed successfully" });
      await refreshData();
      router.refresh();
    } else {
      setMessage({ type: "error", text: res.error || "Action failed" });
    }
    setLoadingAction(null);
  };

  const steps = ["QUOTATION", "CONFIRMED", "ACTIVE", "CLOSED"];
  const currentStepIdx =
    data.status === "PAUSED" ? steps.indexOf("ACTIVE") : steps.indexOf(data.status);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/portal/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Subscriptions
        </Link>

        {/* Allowed Customer Actions ONLY */}
        <div className="flex flex-wrap items-center gap-2">
          {data.actions.canPause && (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleAction("PAUSE")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs font-semibold hover:bg-amber-100 shadow-2xs transition-colors"
            >
              {loadingAction === "PAUSE" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
              )}
              Pause Subscription
            </button>
          )}

          {data.actions.canResume && (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleAction("RESUME")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700 shadow-2xs transition-colors"
            >
              {loadingAction === "RESUME" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              Resume Subscription
            </button>
          )}

          {data.actions.canRenew && (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleAction("RENEW")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 shadow-2xs transition-colors"
            >
              {loadingAction === "RENEW" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Renew Subscription
            </button>
          )}

          {data.actions.canClose && (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={() => handleAction("CLOSE")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-xs font-semibold hover:bg-rose-100 shadow-2xs transition-colors"
            >
              {loadingAction === "CLOSE" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Close Plan
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
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Header Card with Stepper */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{data.plan.name}</h1>
              <StatusBadge status={data.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Contract #{data.number} • {data.plan.billingPeriod.toLowerCase()} billing at{" "}
              {formatCurrency(data.plan.price)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Plan Cost</span>
            <span className="text-xl font-bold text-indigo-600">
              {formatCurrency(data.plan.price)}
            </span>
          </div>
        </div>

        {/* Stepper */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {steps.map((st, i) => {
              const isPast = currentStepIdx > i;
              const isCurrent = currentStepIdx === i;
              return (
                <div key={st} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-50"
                          : isPast
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isPast ? "✓" : i + 1}
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 mt-1 tracking-wider">
                      {st}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        isPast ? "bg-emerald-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Line Items & Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Lines Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Included Services & Products
            </h2>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
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
                      <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                        {l.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
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
          </div>

          {/* Subscription Invoices Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              Billing Invoices ({data.invoices.length})
            </h2>

            {data.invoices.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No invoices generated for this subscription yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.invoices.map((inv) => {
                      const badgeStatus =
                        inv.status === "PAID"
                          ? "PAID"
                          : inv.isOverdue
                          ? "OVERDUE"
                          : "CONFIRMED";
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-indigo-600">
                            {inv.number}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {new Date(inv.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                            {formatCurrency(inv.total)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">
                            <span
                              className={
                                inv.balance > 0
                                  ? inv.isOverdue
                                    ? "text-rose-600"
                                    : "text-amber-700"
                                  : "text-slate-400"
                              }
                            >
                              {formatCurrency(inv.balance)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <StatusBadge status={badgeStatus} size="sm" />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={`/portal/invoices/${inv.id}`}
                              className="text-xs font-semibold text-indigo-600 hover:underline"
                            >
                              View Invoice
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Schedule & Lifecycle Rules */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              Contract Schedule
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Start Date:</span>
                <span className="font-medium text-slate-900">
                  {new Date(data.startDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Next Invoice Date:</span>
                <span className="font-semibold text-indigo-600">
                  {data.nextInvoiceDate
                    ? new Date(data.nextInvoiceDate).toLocaleDateString()
                    : "None"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-2">
                <span>Contract Expiry:</span>
                <span className="font-medium text-slate-900">
                  {data.expiryDate ? new Date(data.expiryDate).toLocaleDateString() : "Ongoing"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              Plan Policy Flags
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Pausable:</span>
                <span className={data.plan.pausable ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                  {data.plan.pausable ? "Yes (Allowed)" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Early Cancellation:</span>
                <span className={data.plan.closable ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                  {data.plan.closable ? "Yes (Allowed)" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Renewable:</span>
                <span className={data.plan.renewable ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                  {data.plan.renewable ? "Yes (Allowed)" : "No"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
