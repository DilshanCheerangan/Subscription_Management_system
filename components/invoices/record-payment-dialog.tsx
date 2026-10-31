"use client";

import React, { useState } from "react";
import { PaymentMethod } from "@prisma/client";
import { recordPaymentAction } from "@/app/actions/payments";
import { formatCurrency } from "@/lib/format";
import {
  CreditCard,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoiceId: string;
  invoiceNumber: string;
  balance: number;
  total: number;
}

export function RecordPaymentDialog({
  isOpen,
  onClose,
  onSuccess,
  invoiceId,
  invoiceNumber,
  balance,
  total,
}: RecordPaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [amount, setAmount] = useState<string>(String(balance));
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }
    if (numAmount > balance) {
      setError(`Payment amount cannot exceed the balance (${formatCurrency(balance)})`);
      return;
    }

    setLoading(true);
    const res = await recordPaymentAction({
      invoiceId,
      method,
      amount: numAmount,
      paymentDate,
      note: note.trim() || null,
    });

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to record payment");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Payment</h2>
              <p className="text-xs text-slate-500">Invoice {invoiceNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount and Balance Summary banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Total Invoice:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(total)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Current Balance:</span>
              <span className="font-bold text-rose-600 text-sm">{formatCurrency(balance)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Payment Method *</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque / Demand Draft</option>
              <option value="OTHER">Other / Manual Settlement</option>
            </select>
          </div>

          {/* Amount Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Payment Amount (₹) *</label>
              <button
                type="button"
                onClick={() => setAmount(String(balance))}
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                Pay Full Balance
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              required
            />
          </div>

          {/* Payment Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              required
            />
          </div>

          {/* Note */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Transaction Reference / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UTR / Transaction ID: 2026103100123"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
