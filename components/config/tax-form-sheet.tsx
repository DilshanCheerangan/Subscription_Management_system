"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { createTaxAction, updateTaxAction } from "@/app/actions/taxes";
import { AlertCircle, Loader2 } from "lucide-react";

export interface TaxFormData {
  id?: string;
  name: string;
  percentage: number;
  fixedAmount?: number;
  active: boolean;
}

interface TaxFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax?: TaxFormData | null;
  onSuccess: () => void;
}

function TaxFormInner({
  tax,
  onCancel,
  onSuccess,
}: {
  tax?: TaxFormData | null;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!tax?.id;

  const [name, setName] = useState(tax?.name || "");
  const [percentage, setPercentage] = useState<number | "">(tax?.percentage ?? 18);
  const [fixedAmount, setFixedAmount] = useState<number | "">(tax?.fixedAmount ?? 0);
  const [active, setActive] = useState(tax?.active ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        percentage: Number(percentage) || 0,
        fixedAmount: Number(fixedAmount) || 0,
        active,
      };

      let res;
      if (isEditing && tax?.id) {
        res = await updateTaxAction(tax.id, payload);
      } else {
        res = await createTaxAction(payload);
      }

      if (!res.success) {
        setError(res.error || "Failed to save tax rule");
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
            Tax Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. GST 18%, VAT Standard, Cess"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-500">
            Descriptive label displayed on quotations and invoice line items.
          </p>
        </div>

        {/* Percentage */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Percentage (%) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              value={percentage}
              onChange={(e) => setPercentage(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="18"
              className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
              %
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Standard rate applied to untaxed line amount.</p>
        </div>

        {/* Fixed Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Fixed Surcharge / Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
              ₹
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Optional fixed cess or surcharge added on top of percentage.
          </p>
        </div>

        {/* Active Switch */}
        <div className="pt-4 border-t border-slate-200">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-slate-800">Rule Active</span>
              <p className="text-xs text-slate-500">
                Inactive taxes are hidden from new quotation and subscription dropdowns.
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
          {isEditing ? "Save Changes" : "Create Tax Rule"}
        </button>
      </div>
    </form>
  );
}

export function TaxFormSheet({ open, onOpenChange, tax, onSuccess }: TaxFormSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={tax?.id ? "Edit Tax Rule" : "New Tax Rule"}
      description={
        tax?.id
          ? "Update the tax percentage or status."
          : "Configure a new tax rate applicable to catalog items and subscriptions."
      }
      width="md"
    >
      <TaxFormInner
        key={tax?.id || "new"}
        tax={tax}
        onCancel={() => onOpenChange(false)}
        onSuccess={() => {
          onOpenChange(false);
          onSuccess();
        }}
      />
    </Sheet>
  );
}
