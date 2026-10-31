"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { createPaymentTermAction, updatePaymentTermAction } from "@/app/actions/payment-terms";
import { AlertCircle, Loader2 } from "lucide-react";

export interface PaymentTermFormData {
  id?: string;
  name: string;
  days: number;
  active: boolean;
}

interface PaymentTermFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentTerm?: PaymentTermFormData | null;
  onSuccess: () => void;
}

function PaymentTermFormInner({
  paymentTerm,
  onCancel,
  onSuccess,
}: {
  paymentTerm?: PaymentTermFormData | null;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!paymentTerm?.id;

  const [name, setName] = useState(paymentTerm?.name || "");
  const [days, setDays] = useState<number | "">(paymentTerm?.days ?? 0);
  const [active, setActive] = useState(paymentTerm?.active ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        days: Number(days) || 0,
        active,
      };

      let res;
      if (isEditing && paymentTerm?.id) {
        res = await updatePaymentTermAction(paymentTerm.id, payload);
      } else {
        res = await createPaymentTermAction(payload);
      }

      if (!res.success) {
        setError(res.error || "Failed to save payment term");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Term Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Immediate, 15 Days, Net 30, End of Month"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-500">
            Visible name assigned to customer subscriptions and displayed on invoices.
          </p>
        </div>

        {/* Days */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Due Days (Days from Invoice Date) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="1"
              min="0"
              required
              value={days}
              onChange={(e) => setDays(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0"
              className="w-full pr-14 pl-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
              days
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Set 0 for Immediate payment upon invoice generation. Otherwise, invoice dueDate = invoiceDate + days.
          </p>
        </div>

        {/* Active Switch */}
        <div className="pt-4 border-t border-slate-200">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-slate-800">Term Active</span>
              <p className="text-xs text-slate-500">
                Inactive payment terms cannot be selected when creating new subscriptions.
              </p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Payment Term"}
        </button>
      </div>
    </form>
  );
}

export function PaymentTermFormSheet({
  open,
  onOpenChange,
  paymentTerm,
  onSuccess,
}: PaymentTermFormSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={paymentTerm?.id ? "Edit Payment Term" : "New Payment Term"}
      description={
        paymentTerm?.id
          ? "Update the grace period or status for this term."
          : "Define when customer invoices become due (e.g. Immediate = 0, Net 15, Net 30)."
      }
      width="md"
    >
      <PaymentTermFormInner
        key={paymentTerm?.id || "new"}
        paymentTerm={paymentTerm}
        onCancel={() => onOpenChange(false)}
        onSuccess={() => {
          onOpenChange(false);
          onSuccess();
        }}
      />
    </Sheet>
  );
}
