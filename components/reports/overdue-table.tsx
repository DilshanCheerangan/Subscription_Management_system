"use client";

import React from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { OverdueInvoiceRow } from "@/lib/reporting";
import { AlertTriangle, Download, ExternalLink } from "lucide-react";

interface OverdueTableProps {
  invoices: OverdueInvoiceRow[];
  exportQueryString?: string;
}

export function OverdueTable({ invoices, exportQueryString = "" }: OverdueTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            Overdue Invoices ({invoices.length})
          </h2>
          <p className="text-xs text-slate-500">
            Confirmed invoices with outstanding balances past due date
          </p>
        </div>

        <a
          href={`/api/reports/export/overdue${exportQueryString ? `?${exportQueryString}` : ""}`}
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" />
          Export CSV
        </a>
      </div>

      {invoices.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No overdue invoices requiring attention in this scope.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-center">Days Overdue</th>
                <th className="py-2.5 px-3 text-right">Amount Due</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-900 block truncate max-w-[150px]">
                      {inv.customerName}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                      {inv.customerEmail}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      {inv.daysOverdue} {inv.daysOverdue === 1 ? "day" : "days"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                    {formatCurrency(inv.amountDue)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      View <ExternalLink className="h-3 w-3" />
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
