"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { DiscountType, DiscountScope } from "@prisma/client";
import { createDiscountAction, updateDiscountAction } from "@/app/actions/discounts";
import { deriveDiscountStatus } from "@/lib/discounts";
import { DiscountStatusBadge } from "@/components/config/discount-status-badge";
import { AlertCircle, Loader2 } from "lucide-react";

export interface DiscountProductOption {
  id: string;
  name: string;
  salesPrice: number;
}

export interface DiscountFormData {
  id?: string;
  name: string;
  type: DiscountType;
  value: number;
  minPurchase?: number | null;
  minQuantity?: number | null;
  startDate: string;
  endDate: string;
  usageLimit?: number | null;
  usedCount: number;
  scope: DiscountScope;
  productIds: string[];
  active: boolean;
}

interface DiscountFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount?: DiscountFormData | null;
  availableProducts: DiscountProductOption[];
  onSuccess: () => void;
}

function DiscountFormInner({
  discount,
  availableProducts,
  onCancel,
  onSuccess,
}: {
  discount?: DiscountFormData | null;
  availableProducts: DiscountProductOption[];
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!discount?.id;

  // Format dates for input[type="date"]
  const initialStartDate = discount?.startDate
    ? new Date(discount.startDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const defaultEndDate = new Date();
  defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 1);
  const initialEndDate = discount?.endDate
    ? new Date(discount.endDate).toISOString().slice(0, 10)
    : defaultEndDate.toISOString().slice(0, 10);

  const [name, setName] = useState(discount?.name || "");
  const [type, setType] = useState<DiscountType>(discount?.type || "PERCENTAGE");
  const [value, setValue] = useState<number | "">(discount?.value ?? 10);
  const [minPurchase, setMinPurchase] = useState<number | "">(
    discount?.minPurchase !== undefined && discount?.minPurchase !== null
      ? discount.minPurchase
      : ""
  );
  const [minQuantity, setMinQuantity] = useState<number | "">(
    discount?.minQuantity !== undefined && discount?.minQuantity !== null
      ? discount.minQuantity
      : ""
  );
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [usageLimit, setUsageLimit] = useState<number | "">(
    discount?.usageLimit !== undefined && discount?.usageLimit !== null
      ? discount.usageLimit
      : ""
  );
  const usedCount = discount?.usedCount ?? 0;
  const [scope, setScope] = useState<DiscountScope>(discount?.scope || "SUBSCRIPTION");
  const [productIds, setProductIds] = useState<string[]>(discount?.productIds || []);
  const [active, setActive] = useState(discount?.active ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live status badge preview
  const liveStatus = deriveDiscountStatus({
    startDate: startDate || new Date(),
    endDate: endDate || new Date(),
    usageLimit: usageLimit === "" ? null : Number(usageLimit),
    usedCount,
    active,
  });

  // Toggle product selection
  const toggleProduct = (pid: string) => {
    if (productIds.includes(pid)) {
      setProductIds(productIds.filter((id) => id !== pid));
    } else {
      setProductIds([...productIds, pid]);
    }
  };

  const selectAllProducts = () => {
    setProductIds(availableProducts.map((p) => p.id));
  };

  const deselectAllProducts = () => {
    setProductIds([]);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side rule validations
    const numValue = Number(value);
    if (type === "PERCENTAGE" && numValue > 100) {
      setError("Percentage discount cannot exceed 100%");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError("End date must be strictly after Start date");
      return;
    }

    if (scope === "PRODUCT" && productIds.length === 0) {
      setError("Please select at least one product for product-scoped discounts");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        type,
        value: numValue,
        minPurchase: minPurchase === "" ? null : Number(minPurchase),
        minQuantity: minQuantity === "" ? null : Number(minQuantity),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        usageLimit: usageLimit === "" ? null : Number(usageLimit),
        scope,
        productIds: scope === "PRODUCT" ? productIds : [],
        active,
      };

      let res;
      if (isEditing && discount?.id) {
        res = await updateDiscountAction(discount.id, payload);
      } else {
        res = await createDiscountAction(payload);
      }

      if (!res.success) {
        setError(res.error || "Failed to save discount rule");
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

        {/* Live Status Indicator Bar */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Calculated Status
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Live preview based on dates, limits, and active switch.
            </p>
          </div>
          <DiscountStatusBadge status={liveStatus} />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Discount Code / Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. WELCOME10, HACKATHON_500, SAAS_SPECIAL"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Type & Value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Discount Type <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DiscountType)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (₹)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Value ({type === "PERCENTAGE" ? "%" : "₹"}) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                {type === "PERCENTAGE" ? "%" : "₹"}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={type === "PERCENTAGE" ? 100 : undefined}
                required
                value={value}
                onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder={type === "PERCENTAGE" ? "10" : "500.00"}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            {type === "PERCENTAGE" && Number(value) > 100 && (
              <p className="mt-1 text-xs text-red-600">Percentage cannot exceed 100%.</p>
            )}
          </div>
        </div>

        {/* Scope: SUBSCRIPTION vs PRODUCT */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Application Scope <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScope("SUBSCRIPTION")}
              className={`px-3 py-2.5 rounded-md border text-sm font-medium text-left transition-colors ${
                scope === "SUBSCRIPTION"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-500"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="font-semibold">Whole Subscription</div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">
                Applied to entire invoice subtotal
              </div>
            </button>
            <button
              type="button"
              onClick={() => setScope("PRODUCT")}
              className={`px-3 py-2.5 rounded-md border text-sm font-medium text-left transition-colors ${
                scope === "PRODUCT"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-500"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="font-semibold">Specific Products</div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">
                Applied only to selected product lines
              </div>
            </button>
          </div>
        </div>

        {/* Product Multi-Select (shown only when scope === PRODUCT) */}
        {scope === "PRODUCT" && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-slate-800">
                  Select Applicable Products <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500">
                  {productIds.length} of {availableProducts.length} product(s) selected
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllProducts}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Select all
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAllProducts}
                  className="text-slate-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {availableProducts.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No active products available. Please create products first.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                {availableProducts.map((p) => {
                  const isChecked = productIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProduct(p.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-800">{p.name}</span>
                      </div>
                      <span className="text-slate-500">₹{p.salesPrice.toFixed(2)}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {productIds.length === 0 && (
              <p className="text-xs text-red-600">At least one product must be selected.</p>
            )}
          </div>
        )}

        {/* Date Constraints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Eligibility Thresholds */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Min Purchase (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minPurchase}
              onChange={(e) => setMinPurchase(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 1000 (optional)"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-slate-500">Minimum pre-tax invoice subtotal.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Min Quantity (Units)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 5 (optional)"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-slate-500">Minimum line item units required.</p>
          </div>
        </div>

        {/* Usage Limits & Read-Only Used Count */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Usage Limit (Max Invoices)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Unlimited"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-500">Leave blank for unlimited redemptions.</p>
            </div>

            <div className="bg-white p-3 rounded-md border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Times Used (Read-Only)
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900">{usedCount}</span>
                <span className="text-xs text-slate-500">
                  {usageLimit !== "" ? `/ ${usageLimit} limit` : "times"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Incremented automatically during billing runs.
              </p>
            </div>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="pt-2 border-t border-slate-200">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-slate-800">Rule Active</span>
              <p className="text-xs text-slate-500">
                Active discounts apply automatically during invoice billing runs.
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
          {isEditing ? "Save Changes" : "Create Discount Rule"}
        </button>
      </div>
    </form>
  );
}

export function DiscountFormSheet({
  open,
  onOpenChange,
  discount,
  availableProducts,
  onSuccess,
}: DiscountFormSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={discount?.id ? "Edit Discount Rule" : "New Discount Rule"}
      description={
        discount?.id
          ? "Update terms, dates, and applicable products."
          : "Configure promotional or contract discounts applied during billing runs."
      }
      width="lg"
    >
      <DiscountFormInner
        key={discount?.id || "new"}
        discount={discount}
        availableProducts={availableProducts}
        onCancel={() => onOpenChange(false)}
        onSuccess={() => {
          onOpenChange(false);
          onSuccess();
        }}
      />
    </Sheet>
  );
}
