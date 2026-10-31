"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { BillingPeriod } from "@prisma/client";
import { createPlanAction, updatePlanAction } from "@/app/actions/plans";
import { derivePlanStatus } from "@/lib/catalog";
import { PlanStatusBadge } from "@/components/catalog/plan-status-badge";
import { AlertCircle, Calendar, Link2, Settings2, Loader2 } from "lucide-react";

export interface PlanFormData {
  id?: string;
  name: string;
  price: number;
  billingPeriod: BillingPeriod;
  minQuantity: number;
  availableFrom?: string | null;
  availableTo?: string | null;
  linkedProductId?: string | null;
  autoClose: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
  active: boolean;
}

export interface SimpleProductOption {
  id: string;
  name: string;
  salesPrice: number;
  type: string;
}

interface PlanFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: PlanFormData | null;
  products: SimpleProductOption[];
  onSuccess: () => void;
}

function PlanFormInner({
  plan,
  products,
  onCancel,
  onSuccess,
}: {
  plan?: PlanFormData | null;
  products: SimpleProductOption[];
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!plan?.id;

  const [name, setName] = useState(plan?.name || "");
  const [price, setPrice] = useState<number | "">(plan?.price ?? 0);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(plan?.billingPeriod || "MONTHLY");
  const [minQuantity, setMinQuantity] = useState<number>(plan?.minQuantity ?? 1);
  const [availableFrom, setAvailableFrom] = useState(
    plan?.availableFrom ? plan.availableFrom.substring(0, 10) : ""
  );
  const [availableTo, setAvailableTo] = useState(
    plan?.availableTo ? plan.availableTo.substring(0, 10) : ""
  );
  const [linkedProductId, setLinkedProductId] = useState(plan?.linkedProductId || "");
  const [autoClose, setAutoClose] = useState(plan?.autoClose ?? false);
  const [closable, setClosable] = useState(plan?.closable ?? true);
  const [pausable, setPausable] = useState(plan?.pausable ?? false);
  const [renewable, setRenewable] = useState(plan?.renewable ?? true);
  const [active, setActive] = useState(plan?.active ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived preview status
  const previewStatus = derivePlanStatus(
    availableFrom ? new Date(availableFrom) : null,
    availableTo ? new Date(availableTo) : null,
    active
  );

  // Check date ordering
  const isDateInvalid =
    availableFrom && availableTo && new Date(availableTo) <= new Date(availableFrom);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Plan name is required.");
      return;
    }

    if (Number(price) < 0) {
      setError("Price cannot be negative.");
      return;
    }

    if (Number(minQuantity) < 1) {
      setError("Minimum quantity must be at least 1.");
      return;
    }

    if (isDateInvalid) {
      setError("Available To date must be strictly after Available From date.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        price: Number(price) || 0,
        billingPeriod,
        minQuantity: Number(minQuantity) || 1,
        availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
        availableTo: availableTo ? new Date(availableTo).toISOString() : null,
        linkedProductId: linkedProductId && linkedProductId.trim() !== "" ? linkedProductId : null,
        autoClose,
        closable,
        pausable,
        renewable,
        active,
      };

      const result = isEditing && plan?.id
        ? await updatePlanAction(plan.id, payload)
        : await createPlanAction(payload);

      if (!result.success) {
        setError(result.error || "An unexpected error occurred.");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save plan.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-sm text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Plan Header & Derived Status Banner */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-500 font-medium">Computed Availability: </span>
            <span className="text-slate-700 font-semibold">Live Status</span>
          </div>
          <PlanStatusBadge status={previewStatus} />
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Plan Specification
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Plan Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Starter Monthly, Growth Annual, Pro Daily"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Plan Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Billing Cycle <span className="text-rose-500">*</span>
              </label>
              <select
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="DAILY">Daily</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Min. Quantity Required <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={minQuantity}
                onChange={(e) => setMinQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Subscriptions must order at least this quantity.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5 text-indigo-500" />
                Linked Product (Optional)
              </label>
              <select
                value={linkedProductId}
                onChange={(e) => setLinkedProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">None (Stand-alone Plan)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Pre-fills unit price for lines linked to this product.
              </p>
            </div>
          </div>
        </div>

        {/* Availability Schedule */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Availability Schedule
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Available From
              </label>
              <input
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Available To
              </label>
              <input
                type="date"
                value={availableTo}
                onChange={(e) => setAvailableTo(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-hidden focus:ring-2 ${
                  isDateInvalid
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/30"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                }`}
              />
            </div>
          </div>

          {isDateInvalid && (
            <p className="text-xs text-rose-600 font-medium">
              ⚠️ Available To date must be strictly after Available From date.
            </p>
          )}
        </div>

        {/* Lifecycle Switches (Four Switches per MASTER §4) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Lifecycle & Automation Flags
            </h3>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            {/* Auto-Close Switch */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-medium text-slate-800">
                  Auto-Close at Expiry (autoClose)
                </label>
                <p className="text-[11px] text-slate-500">
                  Subscription closes itself automatically upon reaching availableTo/expiry date.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={autoClose}
                  onChange={(e) => setAutoClose(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Closable Switch */}
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
              <div>
                <label className="text-xs font-medium text-slate-800">
                  Allow Early Closure (closable)
                </label>
                <p className="text-[11px] text-slate-500">
                  Customer or staff can close an active subscription before its expiry date.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={closable}
                  onChange={(e) => setClosable(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Pausable Switch */}
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
              <div>
                <label className="text-xs font-medium text-slate-800">
                  Allow Pause (pausable)
                </label>
                <p className="text-[11px] text-slate-500">
                  Customer or staff can pause an active subscription and resume it later.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={pausable}
                  onChange={(e) => setPausable(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Renewable Switch */}
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
              <div>
                <label className="text-xs font-medium text-slate-800">
                  Allow Renewal (renewable)
                </label>
                <p className="text-[11px] text-slate-500">
                  Permits extending or renewing the subscription period from the customer portal.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={renewable}
                  onChange={(e) => setRenewable(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-white">
          <div>
            <label className="text-xs font-semibold text-slate-800">
              Active Status
            </label>
            <p className="text-[11px] text-slate-500">
              Inactive plans cannot be selected for new quotations or subscriptions.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !!isDateInvalid}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Plan"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PlanFormSheet({
  open,
  onOpenChange,
  plan,
  products,
  onSuccess,
}: PlanFormSheetProps) {
  const isEditing = !!plan?.id;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Subscription Plan" : "Create Subscription Plan"}
      description="Define recurring billing frequency, pricing tiers, availability dates, and lifecycle flags."
      width="lg"
    >
      <PlanFormInner
        key={plan?.id || "new"}
        plan={plan}
        products={products}
        onCancel={() => onOpenChange(false)}
        onSuccess={() => {
          onSuccess();
          onOpenChange(false);
        }}
      />
    </Sheet>
  );
}
