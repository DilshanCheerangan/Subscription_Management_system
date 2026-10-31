"use client";

import React from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { RecentPaymentRow } from "@/lib/reporting";
import { Wallet, Download, ExternalLink } from "lucide-react";

interface RecentPaymentsTableProps {
  payments: RecentPaymentRow[];
  exportQueryString?: string;
}

export function RecentPaymentsTable({
  payments,
  exportQueryString = "",
}: RecentPaymentsTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-600" />
            Recent Payments Settled ({payments.length})
          </h2>
          <p className="text-xs text-slate-500">
            Chronological log of customer receipts and collection methods
          </p>
        </div>

        <a
          href={`/api/reports/export/payments${exportQueryString ? `?${exportQueryString}` : ""}`}
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" />
          Export CSV
        </a>
      </div>

      {payments.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No payments recorded in selected window.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Note</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                    {new Date(p.paymentDate).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <Link
                      href={`/admin/invoices/${p.invoiceId}`}
                      className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {p.invoiceNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-900 block truncate max-w-[150px]">
                      {p.customerName}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {p.method.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 italic max-w-[180px] truncate">
                    {p.note || "-"}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/invoices/${p.invoiceId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Invoice <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
