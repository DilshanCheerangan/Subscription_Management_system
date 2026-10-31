"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { triggerBillingRunAction } from "@/app/actions/invoices";
import { BillingRunResult } from "@/lib/billing/runBilling";
import {
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Clock,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function BillingRunPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BillingRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastExecutedAt, setLastExecutedAt] = useState<string | null>(null);

  const handleRunBilling = async () => {
    setIsRunning(true);
    setError(null);

    const res = await triggerBillingRunAction();
    if (res.success && res.data) {
      setResult(res.data);
      setLastExecutedAt(new Date().toLocaleTimeString());
    } else {
      setError(res.error || "Billing run failed");
    }
    setIsRunning(false);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Automated Billing Engine"
        description="Execute scheduled recurring invoice runs, catch up missed periods, auto-apply discounts, and enforce contract auto-closing."
      />

      {/* Main Execution Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-600" />
              On-Demand Billing Execution
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Triggers the billing engine for all active subscriptions due on or before today.
              Already-billed periods are safely skipped by the database uniqueness constraint.
            </p>
          </div>

          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunBilling}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Running Billing Engine...</span>
              </>
            ) : (
              <>
                <PlayCircle className="h-5 w-5" />
                <span>Run Billing Engine Now</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Summary Modal / Card */}
        {result && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Billing Run Completed at {lastExecutedAt}
                </h3>
              </div>
              <Link
                href="/admin/invoices"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                View Generated Invoices
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Stat Counters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Invoices Created
                </span>
                <span className="text-2xl font-black text-indigo-600">{result.created}</span>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Periods Skipped (Idempotent)
                </span>
                <span className="text-2xl font-black text-slate-700">{result.skipped}</span>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Contracts Auto-Closed
                </span>
                <span className="text-2xl font-black text-amber-600">{result.closedExpiredCount}</span>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-lg p-4 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Failed Subscriptions
                </span>
                <span
                  className={`text-2xl font-black ${
                    result.failed.length > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {result.failed.length}
                </span>
              </div>
            </div>

            {/* Failure Breakdown if any */}
            {result.failed.length > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-2 text-xs">
                <p className="font-bold text-rose-800">Errors encountered during processing:</p>
                <div className="space-y-1">
                  {result.failed.map((f, i) => (
                    <div key={i} className="flex justify-between text-rose-700">
                      <span className="font-mono font-semibold">{f.subscriptionNumber}:</span>
                      <span>{f.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2-Column Info & Cron Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Architecture Principles */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Billing Engine Guarantees
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span>
                <strong>Idempotency:</strong> Enforced by database unique constraint on{" "}
                <code className="text-indigo-600 font-mono">(subscriptionId, periodStart)</code>.
                Re-running billing multiple times will never produce duplicate invoices.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span>
                <strong>Chronological Catch-Up:</strong> If billing runs are delayed or missed, all
                outstanding periods are billed sequentially in order.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span>
                <strong>Atomic Mutations:</strong> Invoice creation, line item generation, discount
                usage increment, and next invoice date advancement occur in a single transaction.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span>
                <strong>Fault Isolation:</strong> A failure on one subscription does not disrupt or
                rollback the billing of other subscribers.
              </span>
            </li>
          </ul>
        </div>

        {/* Scheduled Cron Configuration */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            Automated Cron Integration
          </h3>
          <p className="text-xs text-slate-500">
            For production automation, trigger the secured background endpoint via cron (e.g. daily at
            midnight):
          </p>

          <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-x-auto space-y-2">
            <div className="text-slate-400"># Trigger billing via curl:</div>
            <div className="text-emerald-400">
              curl -X POST \
              <br />
              &nbsp;&nbsp;https://your-domain.com/api/cron/billing \
              <br />
              &nbsp;&nbsp;-H &quot;Authorization: Bearer CRON_SECRET&quot;
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Protected endpoint requires <code className="text-slate-700">CRON_SECRET</code> configured
            in your environment variables. Both GET and POST methods are supported.
          </p>
        </div>
      </div>
    </div>
  );
}
