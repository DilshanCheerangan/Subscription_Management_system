"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getInvoiceDetailAction } from "@/app/actions/invoices";
import { formatCurrency } from "@/lib/format";
import { Printer, ArrowLeft, Loader2, Building2 } from "lucide-react";
import Link from "next/link";

interface PrintLineItem {
  id: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  taxName: string;
  taxPercentage: number;
  total: number;
}

interface PrintDiscountItem {
  id: string;
  name: string;
  scope: string;
  amount: number;
}

interface PrintInvoiceData {
  id: string;
  number: string;
  status: string;
  createdAt: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  customer: {
    name: string;
    email: string;
  };
  subscription: {
    number: string;
    planName: string;
    billingPeriod: string;
  };
  lines: PrintLineItem[];
  discounts: PrintDiscountItem[];
}

interface PrintInvoiceProps {
  id: string;
}

export function PrintInvoiceClient({ id }: PrintInvoiceProps) {
  const [data, setData] = useState<PrintInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvoice = useCallback(() => {
    getInvoiceDetailAction(id).then((res) => {
      if (res.success && res.data) {
        setData(res.data as unknown as PrintInvoiceData);
      } else {
        setError(res.error || "Failed to load invoice for printing");
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 font-sans">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
        <p className="text-sm font-medium">Preparing printable invoice...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-16 text-center font-sans space-y-4">
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error || "Invoice not found"}
        </div>
        <Link
          href={`/admin/invoices/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Invoice
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0 font-sans text-slate-900">
      {/* Print Controls (Hidden when printed) */}
      <div className="max-w-4xl mx-auto mb-6 px-4 flex items-center justify-between print:hidden">
        <Link
          href={`/admin/invoices/${id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Details
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Invoice Sheet */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 print:border-none shadow-sm print:shadow-none rounded-xl p-8 md:p-12 space-y-8">
        {/* Company Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Brightloop Software
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Brightloop Technologies Pvt Ltd
              <br />
              Enterprise SaaS & Infrastructure Solutions
              <br />
              support@brightloop.test • GSTIN: 27AABCB1234F1Z1
            </p>
          </div>

          <div className="text-right">
            <h1 className="text-2xl font-black text-indigo-600 tracking-tight">TAX INVOICE</h1>
            <p className="text-sm font-bold text-slate-800 mt-1">{data.number}</p>
            <div className="text-xs text-slate-500 mt-2 space-y-0.5">
              <div>Invoice Date: {new Date(data.createdAt).toLocaleDateString()}</div>
              <div>Due Date: {new Date(data.dueDate).toLocaleDateString()}</div>
              <div>Status: <span className="font-semibold uppercase text-slate-800">{data.status}</span></div>
            </div>
          </div>
        </div>

        {/* Bill To & Subscription Meta */}
        <div className="grid grid-cols-2 gap-8 text-xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Billed To
            </span>
            <p className="text-sm font-bold text-slate-900">{data.customer.name}</p>
            <p className="text-slate-600">{data.customer.email}</p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Subscription Reference
            </span>
            <p className="text-sm font-bold text-slate-900">{data.subscription.number}</p>
            <p className="text-slate-600">
              {data.subscription.planName} ({data.subscription.billingPeriod.toLowerCase()})
            </p>
            <p className="text-slate-500 text-[11px] mt-1">
              Service Period: {new Date(data.periodStart).toLocaleDateString()} — {new Date(data.periodEnd).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Lines Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 font-bold text-slate-700 uppercase">
              <tr>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Tax</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.lines.map((l: PrintLineItem) => (
                <tr key={l.id}>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 block">{l.productName}</span>
                    {l.variantName && (
                      <span className="text-[11px] text-slate-500">{l.variantName}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-medium">{l.quantity}</td>
                  <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(l.unitPrice)}</td>
                  <td className="py-3 px-3 text-right text-slate-500">
                    {l.taxName} ({l.taxPercentage}%)
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Applied Discounts if any */}
        {data.discounts && data.discounts.length > 0 && (
          <div className="p-3 bg-emerald-50 rounded-lg text-xs space-y-1">
            <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px]">
              Discounts Applied
            </span>
            {data.discounts.map((d: PrintDiscountItem) => (
              <div key={d.id} className="flex justify-between text-emerald-800">
                <span>{d.name} ({d.scope})</span>
                <span className="font-bold">-{formatCurrency(d.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Totals Section */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
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
            <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-sm text-slate-900">
              <span>Invoice Total:</span>
              <span className="text-indigo-600 font-black">{formatCurrency(data.total)}</span>
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

        {/* Footer Notes */}
        <div className="pt-8 border-t border-slate-200 text-center text-slate-400 text-[11px] leading-relaxed">
          <p className="font-semibold text-slate-700">Thank you for your business!</p>
          <p className="mt-1">
            Payment is due by {new Date(data.dueDate).toLocaleDateString()}. Please remit payments referencing
            invoice number {data.number}.
          </p>
        </div>
      </div>
    </div>
  );
}
