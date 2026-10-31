"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import { ProductType } from "@prisma/client";
import { createProductAction, updateProductAction } from "@/app/actions/products";
import { Plus, Trash2, Tag, AlertCircle, Sparkles, Loader2 } from "lucide-react";

export interface VariantItem {
  id?: string;
  attributeName: string;
  attributeValue: string;
  extraPrice: number;
}

export interface ProductFormData {
  id?: string;
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  notes?: string | null;
  active: boolean;
  variants: VariantItem[];
}

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductFormData | null;
  onSuccess: () => void;
}

function ProductFormInner({
  product,
  onCancel,
  onSuccess,
}: {
  product?: ProductFormData | null;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!product?.id;

  const [name, setName] = useState(product?.name || "");
  const [type, setType] = useState<ProductType>(product?.type || "SOFTWARE");
  const [salesPrice, setSalesPrice] = useState<number | "">(product?.salesPrice ?? 0);
  const [costPrice, setCostPrice] = useState<number | "">(product?.costPrice ?? 0);
  const [notes, setNotes] = useState(product?.notes || "");
  const [active, setActive] = useState(product?.active ?? true);
  const [variants, setVariants] = useState<VariantItem[]>(product?.variants || []);

  const [selectedPreviewVariantIndex, setSelectedPreviewVariantIndex] = useState<number | null>(
    product?.variants && product.variants.length > 0 ? 0 : null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived calculations
  const numSales = Number(salesPrice) || 0;
  const numCost = Number(costPrice) || 0;
  const marginAmount = numSales - numCost;
  const marginPercent = numSales > 0 ? (marginAmount / numSales) * 100 : 0;

  // Selected variant for effective price preview
  const activeVariant =
    selectedPreviewVariantIndex !== null && variants[selectedPreviewVariantIndex]
      ? variants[selectedPreviewVariantIndex]
      : null;
  const extraPrice = activeVariant ? Number(activeVariant.extraPrice) || 0 : 0;
  const effectivePrice = numSales + extraPrice;

  function handleAddVariant() {
    const newVariant: VariantItem = {
      attributeName: variants.length > 0 ? variants[0].attributeName : "Brand",
      attributeValue: "",
      extraPrice: 0,
    };
    const updated = [...variants, newVariant];
    setVariants(updated);
    if (selectedPreviewVariantIndex === null) {
      setSelectedPreviewVariantIndex(updated.length - 1);
    }
  }

  function handleUpdateVariant(index: number, field: keyof VariantItem, value: string | number) {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  }

  function handleRemoveVariant(index: number) {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
    if (selectedPreviewVariantIndex === index) {
      setSelectedPreviewVariantIndex(updated.length > 0 ? 0 : null);
    } else if (selectedPreviewVariantIndex !== null && selectedPreviewVariantIndex > index) {
      setSelectedPreviewVariantIndex(selectedPreviewVariantIndex - 1);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (numSales < 0 || numCost < 0) {
      setError("Prices must be greater than or equal to zero.");
      return;
    }

    for (const v of variants) {
      if (!v.attributeName.trim() || !v.attributeValue.trim()) {
        setError("All variants must specify both an Attribute Name and an Attribute Value.");
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        type,
        salesPrice: numSales,
        costPrice: numCost,
        notes: notes.trim() || null,
        active,
        variants: variants.map((v) => ({
          attributeName: v.attributeName.trim(),
          attributeValue: v.attributeValue.trim(),
          extraPrice: Number(v.extraPrice) || 0,
        })),
      };

      const result = isEditing && product?.id
        ? await updateProductAction(product.id, payload)
        : await createProductAction(payload);

      if (!result.success) {
        setError(result.error || "An unexpected error occurred.");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save product.";
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

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Basic Information
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Enterprise ERP Suite, Cloud Backup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Product Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProductType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="SOFTWARE">Software (SaaS)</option>
                <option value="SERVICE">Service</option>
                <option value="GOODS">Goods / Hardware</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Status
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <span className="text-xs font-medium text-slate-700">
                  {active ? "Active & Available" : "Inactive / Archived"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Margin Calculator */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pricing & Margin
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sales Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Cost Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>
          </div>

          {/* Live Margin Indicator Card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">Gross Profit Margin:</span>
              <span
                className={`font-semibold ${
                  marginAmount < 0
                    ? "text-rose-600"
                    : marginPercent >= 40
                    ? "text-emerald-600"
                    : "text-indigo-600"
                }`}
              >
                {formatCurrency(marginAmount)} ({marginPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${
                  marginAmount < 0 ? "bg-rose-500" : "bg-indigo-600"
                }`}
                style={{ width: `${Math.max(0, Math.min(100, marginPercent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Product Variants Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Product Variants
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Attribute variations with optional extra pricing (e.g. Brand = Odoo +560)
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddVariant}
              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Variant
            </button>
          </div>

          {variants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
              <Tag className="mx-auto h-6 w-6 text-slate-400 mb-1" />
              <p className="text-xs text-slate-500">
                No variants configured. This product will be sold at its base price.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Attribute (e.g., Brand)"
                      value={v.attributeName}
                      onChange={(e) => handleUpdateVariant(idx, "attributeName", e.target.value)}
                      className="w-full rounded border border-slate-200 px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Value (e.g., Odoo)"
                      value={v.attributeValue}
                      onChange={(e) => handleUpdateVariant(idx, "attributeValue", e.target.value)}
                      className="w-full rounded border border-slate-200 px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="+ Extra (₹)"
                      value={v.extraPrice}
                      onChange={(e) => handleUpdateVariant(idx, "extraPrice", Number(e.target.value) || 0)}
                      className="w-full rounded border border-slate-200 px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-hidden font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Remove variant"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Dynamic Effective Price Preview */}
          {variants.length > 0 && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>Effective Price Preview</span>
              </div>
              <div className="text-xs text-slate-600">
                Select a variant to preview the computed customer-facing unit price:
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPreviewVariantIndex(null)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer ${
                    selectedPreviewVariantIndex === null
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Base Product (No variant)
                </button>
                {variants.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedPreviewVariantIndex(i)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer ${
                      selectedPreviewVariantIndex === i
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {v.attributeValue || `Variant ${i + 1}`} ({v.extraPrice >= 0 ? `+${formatCurrency(v.extraPrice)}` : formatCurrency(v.extraPrice)})
                  </button>
                ))}
              </div>

              <div className="flex items-baseline justify-between border-t border-indigo-100 pt-2 text-xs">
                <span className="text-slate-600">
                  {activeVariant ? (
                    <span>
                      Base ({formatCurrency(numSales)}) + {activeVariant.attributeName}:{" "}
                      <strong>{activeVariant.attributeValue}</strong> (+{formatCurrency(extraPrice)})
                    </span>
                  ) : (
                    <span>Base Sales Price only</span>
                  )}
                </span>
                <span className="text-base font-bold text-indigo-700">
                  {formatCurrency(effectivePrice)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Internal Notes / Description
          </label>
          <textarea
            rows={3}
            placeholder="Technical details, billing terms or product specifications..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
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
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormSheetProps) {
  const isEditing = !!product?.id;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Product" : "Create New Product"}
      description="Define product details, cost, sales margins, and pricing variants."
      width="lg"
    >
      <ProductFormInner
        key={product?.id || "new"}
        product={product}
        onCancel={() => onOpenChange(false)}
        onSuccess={() => {
          onSuccess();
          onOpenChange(false);
        }}
      />
    </Sheet>
  );
}
