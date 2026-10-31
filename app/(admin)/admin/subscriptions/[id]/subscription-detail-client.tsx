"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubscriptionStatusStepper } from "@/components/subscriptions/subscription-status-stepper";
import {
  getSubscriptionDetailAction,
  transitionSubscriptionAction,
} from "@/app/actions/subscriptions";
import { formatCurrency } from "@/lib/format";
import { SubscriptionStatus } from "@prisma/client";
import {
  ArrowLeft,
  Edit2,
  Layers,
  Loader2,
  Package,
  User,
  History,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface TransitionAction {
  targetStatus: SubscriptionStatus;
  label: string;
  variant: "default" | "outline" | "destructive" | "secondary";
  confirmPrompt?: string;
}

interface LineItemDetail {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  taxId?: string | null;
  taxName: string;
  taxPercentage: number;
  amount: number;
}

interface HistoryItem {
  id: string;
  fromStatus?: SubscriptionStatus | null;
  toStatus: SubscriptionStatus;
  reason?: string | null;
  changedBy?: { name: string; email: string } | null;
  createdAt: string;
}

interface SubscriptionDetailData {
  id: string;
  number: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate?: string | null;
  nextInvoiceDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
  plan: {
    id: string;
    name: string;
    billingPeriod: string;
    price: number;
    minQuantity: number;
    closable: boolean;
    pausable: boolean;
    autoClose: boolean;
    renewable: boolean;
  };
  paymentTerm?: {
    id: string;
    name: string;
    days: number;
  } | null;
  lines: LineItemDetail[];
  totals: {
    subtotal: number;
    totalTax: number;
    total: number;
  };
  history: HistoryItem[];
  legalTransitions: TransitionAction[];
}

export function SubscriptionDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDetail = useCallback(() => {
    getSubscriptionDetailAction(id).then((res) => {
      if (res.success && res.data) {
        setData(res.data as SubscriptionDetailData);
      } else {
        setError(res.error || "Subscription not found");
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleExecuteTransition = async (targetStatus: SubscriptionStatus, confirmPrompt?: string) => {
    if (confirmPrompt && !confirm(confirmPrompt)) {
      return;
    }

    setTransitioning(true);
    setActionError(null);

    const res = await transitionSubscriptionAction(id, targetStatus);
    if (!res.success) {
      setActionError(res.error || "Failed to update subscription status");
    } else {
      loadDetail();
      router.refresh();
    }
    setTransitioning(false);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
        <p className="text-sm font-medium">Loading subscription details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error || "Subscription not found"}
        </div>
        <Link
          href="/admin/subscriptions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all subscriptions
        </Link>
      </div>
    );
  }

  const isEditable =
    data.status === SubscriptionStatus.DRAFT || data.status === SubscriptionStatus.QUOTATION;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Subscriptions
        </Link>

        {/* Dynamic Transition Action Buttons based on state machine */}
        <div className="flex flex-wrap items-center gap-2">
          {isEditable && (
            <Link
              href={`/admin/subscriptions/${data.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Subscription
            </Link>
          )}

          {data.legalTransitions &&
            data.legalTransitions.map((action) => {
              const isDestructive = action.variant === "destructive";
              const isDefault = action.variant === "default";

              let btnClasses =
                "px-3.5 py-1.5 text-xs font-semibold rounded-md shadow-2xs transition-colors flex items-center gap-1.5 ";
              if (isDestructive) {
                btnClasses += "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100";
              } else if (isDefault) {
                btnClasses += "bg-indigo-600 text-white hover:bg-indigo-700";
              } else {
                btnClasses += "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50";
              }

              return (
                <button
                  key={action.targetStatus}
                  type="button"
                  disabled={transitioning}
                  onClick={() =>
                    handleExecuteTransition(action.targetStatus, action.confirmPrompt)
                  }
                  className={btnClasses}
                >
                  {transitioning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  {action.label}
                </button>
              );
            })}
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{data.number}</h1>
            <StatusBadge status={data.status} size="lg" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Created on {new Date(data.createdAt).toLocaleDateString()} • Customer:{" "}
            <strong>{data.customer.name}</strong> ({data.customer.email})
          </p>
        </div>

        <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Recurring Total
          </span>
          <span className="text-2xl font-bold text-indigo-600">
            {formatCurrency(data.totals.total)}
          </span>
          <span className="text-xs text-slate-500 block">
            per {data.plan.billingPeriod.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Status Stepper across the top */}
      <SubscriptionStatusStepper currentStatus={data.status} />

      {/* 2-Column Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Line Items & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              Line Items ({data.lines.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Product & Variant</th>
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
                        <span className="font-semibold text-slate-900 block">
                          {line.productName}
                        </span>
                        {line.variantName && (
                          <span className="text-xs text-indigo-600 block mt-0.5">
                            {line.variantName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-900">
                        {line.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">
                        {line.taxName}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Untaxed Subtotal:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(data.totals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Taxes:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(data.totals.totalTax)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>Recurring Invoice Total:</span>
                <span className="text-indigo-600">{formatCurrency(data.totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Status Transition History Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600" />
              Transition History & Audit Log
            </h2>

            {data.history.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No transition history logged yet.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:h-full before:w-0.5 before:bg-slate-200">
                {data.history.map((h, i) => (
                  <div key={h.id || i} className="relative flex items-start gap-4 ml-1">
                    <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 ring-4 ring-white z-10">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : `Created as ${h.toStatus}`}
                        </span>
                        <span className="text-slate-400">
                          {new Date(h.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{h.reason}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Actor: {h.changedBy ? `${h.changedBy.name} (${h.changedBy.email})` : "System / Automated Job"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer & Plan Metadata */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-indigo-600" />
              Customer Information
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="font-bold text-slate-900">{data.customer.name}</div>
              <div className="text-xs text-slate-600">{data.customer.email}</div>
              <div className="pt-2 text-xs text-slate-400">
                Account Role: <span className="text-slate-700 font-medium">{data.customer.role}</span>
              </div>
            </div>
          </div>

          {/* Billing & Terms Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              Plan & Contract Terms
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Linked Plan:</span>
                <span className="font-semibold text-slate-900 block text-sm">
                  {data.plan.name}
                </span>
                <span className="text-slate-500">
                  {formatCurrency(data.plan.price)} / {data.plan.billingPeriod.toLowerCase()} (Min {data.plan.minQuantity} qty)
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Payment Term:</span>
                <span className="font-medium text-slate-800">
                  {data.paymentTerm ? `${data.paymentTerm.name} (${data.paymentTerm.days} days)` : "Immediate"}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Upcoming Invoice Date:</span>
                <span className="font-semibold text-indigo-600">
                  {data.nextInvoiceDate ? new Date(data.nextInvoiceDate).toLocaleDateString() : "—"}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Contract Duration:</span>
                <span className="text-slate-800">
                  From: {new Date(data.startDate).toLocaleDateString()}
                  {data.expiryDate && ` — Until: ${new Date(data.expiryDate).toLocaleDateString()}`}
                </span>
              </div>

              {/* Lifecycle flags tags */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                {data.plan.pausable && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Pausable
                  </span>
                )}
                {data.plan.closable && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Closable Early
                  </span>
                )}
                {data.plan.autoClose && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    Auto-Close at Expiry
                  </span>
                )}
                {data.plan.renewable && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Renewable
                  </span>
                )}
              </div>

              {data.notes && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-slate-500 block">Internal Notes:</span>
                  <p className="text-slate-700 bg-slate-50 p-2 rounded mt-1 text-[11px] italic">
                    {data.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
