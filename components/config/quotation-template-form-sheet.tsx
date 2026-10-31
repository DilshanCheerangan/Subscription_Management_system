"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import {
  createQuotationTemplateAction,
  updateQuotationTemplateAction,
} from "@/app/actions/quotation-templates";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2, AlertCircle, Loader2 } from "lucide-react";

export interface TemplateProductVariantOption {
  id: string;
  attributeName: string;
  attributeValue: string;
  extraPrice: number;
}

export interface TemplateProductOption {
  id: string;
  name: string;
  salesPrice: number;
  type: string;
  variants: TemplateProductVariantOption[];
}

export interface TemplatePlanOption {
  id: string;
  name: string;
  billingPeriod: string;
  price: number;
}

export interface TemplateTaxOption {
  id: string;
  name: string;
  percentage: number;
}

export interface QuotationTemplateLineItem {
  id?: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice?: number | null;
  taxId?: string | null;
}

export interface QuotationTemplateFormData {
  id?: string;
  name: string;
  validityDays: number;
  planId?: string | null;
  lines: QuotationTemplateLineItem[];
}

interface QuotationTemplateFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: QuotationTemplateFormData | null;
  products: TemplateProductOption[];
  plans: TemplatePlanOption[];
  taxes: TemplateTaxOption[];
  onSuccess: () => void;
}

function QuotationTemplateFormInner({
  template,
  products,
  plans,
  taxes,
  onCancel,
  onSuccess,
}: {
  template?: QuotationTemplateFormData | null;
  products: TemplateProductOption[];
  plans: TemplatePlanOption[];
  taxes: TemplateTaxOption[];
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!template?.id;

  const [name, setName] = useState(template?.name || "");
  const [validityDays, setValidityDays] = useState<number | "">(template?.validityDays ?? 30);
  const [planId, setPlanId] = useState<string>(template?.planId || "");

  // Default initial line if creating new
  const initialLines: QuotationTemplateLineItem[] =
    template?.lines && template.lines.length > 0
      ? template.lines
      : products.length > 0
      ? [
          {
            productId: products[0].id,
            variantId: products[0].variants.length > 0 ? products[0].variants[0].id : null,
            quantity: 1,
            unitPrice: products[0].salesPrice,
            taxId: taxes.length > 0 ? taxes[0].id : null,
          },
        ]
      : [];

  const [lines, setLines] = useState<QuotationTemplateLineItem[]>(initialLines);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Line item manipulation
  function handleAddLine() {
    if (products.length === 0) return;
    const firstProduct = products[0];
    setLines([
      ...lines,
      {
        productId: firstProduct.id,
        variantId: firstProduct.variants.length > 0 ? firstProduct.variants[0].id : null,
        quantity: 1,
        unitPrice: firstProduct.salesPrice,
        taxId: taxes.length > 0 ? taxes[0].id : null,
      },
    ]);
  }

  function handleRemoveLine(index: number) {
    if (lines.length <= 1) {
      setError("Template must contain at least one line item");
      return;
    }
    setError(null);
    setLines(lines.filter((_, i) => i !== index));
  }

  function handleProductChange(index: number, newProductId: string) {
    const selectedProd = products.find((p) => p.id === newProductId);
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      productId: newProductId,
      variantId:
        selectedProd && selectedProd.variants.length > 0 ? selectedProd.variants[0].id : null,
      unitPrice: selectedProd ? selectedProd.salesPrice : 0,
    };
    setLines(updated);
  }

  function handleVariantChange(index: number, newVariantId: string) {
    const updated = [...lines];
    const currentLine = updated[index];
    const product = products.find((p) => p.id === currentLine.productId);
    const variant = product?.variants.find((v) => v.id === newVariantId);
    const extra = variant ? variant.extraPrice : 0;
    const basePrice = product ? product.salesPrice : 0;

    updated[index] = {
      ...currentLine,
      variantId: newVariantId || null,
      unitPrice: basePrice + extra,
    };
    setLines(updated);
  }

  function handleQuantityChange(index: number, qty: number) {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      quantity: Math.max(1, qty || 1),
    };
    setLines(updated);
  }

  function handlePriceChange(index: number, price: number | null) {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      unitPrice: price,
    };
    setLines(updated);
  }

  function handleTaxChange(index: number, newTaxId: string) {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      taxId: newTaxId || null,
    };
    setLines(updated);
  }

  // Summary calculation preview
  let estimatedUntaxed = 0;
  let estimatedTax = 0;

  lines.forEach((l) => {
    const product = products.find((p) => p.id === l.productId);
    const price = l.unitPrice !== undefined && l.unitPrice !== null ? l.unitPrice : product?.salesPrice || 0;
    const lineTotal = price * l.quantity;
    estimatedUntaxed += lineTotal;

    if (l.taxId) {
      const taxObj = taxes.find((t) => t.id === l.taxId);
      if (taxObj) {
        estimatedTax += lineTotal * (taxObj.percentage / 100);
      }
    }
  });

  const estimatedTotal = estimatedUntaxed + estimatedTax;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (lines.length === 0) {
      setError("Please add at least one line item to this template");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        validityDays: Number(validityDays) || 30,
        planId: planId.trim() !== "" ? planId : null,
        lines: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || null,
          quantity: Number(l.quantity) || 1,
          unitPrice: l.unitPrice !== undefined && l.unitPrice !== null ? Number(l.unitPrice) : null,
          taxId: l.taxId || null,
        })),
      };

      let res;
      if (isEditing && template?.id) {
        res = await updateQuotationTemplateAction(template.id, payload);
      } else {
        res = await createQuotationTemplateAction(payload);
      }

      if (!res.success) {
        setError(res.error || "Failed to save quotation template");
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

        {/* Template Name & Validity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard SaaS Monthly Onboarding"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Validity (Days) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="30"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-slate-500">Default expiry days from creation.</p>
          </div>
        </div>

        {/* Linked Plan */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Linked Subscription Plan (Optional)
          </label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No Plan Linked (Custom Bundle)</option>
            {plans.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name} — ₹{pl.price.toFixed(2)} / {pl.billingPeriod.toLowerCase()}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Automatically pre-fills the subscription plan when creating a quotation from this template.
          </p>
        </div>

        {/* Line Items Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-800">
                Template Line Items ({lines.length})
              </span>
              <p className="text-xs text-slate-500">
                Products, variants, quantities, and applicable tax rates.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Line
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => {
              const selectedProduct = products.find((p) => p.id === line.productId);
              const hasVariants = selectedProduct && selectedProduct.variants.length > 0;

              return (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Line #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Product */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={line.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.salesPrice.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Variant */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Variant / Attribute
                      </label>
                      <select
                        disabled={!hasVariants}
                        value={line.variantId || ""}
                        onChange={(e) => handleVariantChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {!hasVariants ? (
                          <option value="">No variants (Standard)</option>
                        ) : (
                          <>
                            <option value="">Standard (No extra)</option>
                            {selectedProduct.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.attributeName}: {v.attributeValue} (+₹{v.extraPrice})
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={line.quantity}
                        onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Unit Price Override */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Unit Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.unitPrice ?? ""}
                        onChange={(e) =>
                          handlePriceChange(
                            idx,
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                        placeholder={selectedProduct ? String(selectedProduct.salesPrice) : "0.00"}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Tax */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tax Rate</label>
                      <select
                        value={line.taxId || ""}
                        onChange={(e) => handleTaxChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">No Tax (0%)</option>
                        {taxes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.percentage}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estimate Breakdown Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Untaxed Subtotal:</span>
            <span className="font-medium text-slate-900">{formatCurrency(estimatedUntaxed)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Estimated Taxes:</span>
            <span className="font-medium text-slate-900">{formatCurrency(estimatedTax)}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
            <span>Estimated Quotation Total:</span>
            <span className="text-indigo-600">{formatCurrency(estimatedTotal)}</span>
          </div>
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
          {isEditing ? "Save Template" : "Create Template"}
        </button>
      </div>
    </form>
  );
}

export function QuotationTemplateFormSheet({
  open,
  onOpenChange,
  template,
  products,
  plans,
  taxes,
  onSuccess,
}: QuotationTemplateFormSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={template?.id ? "Edit Quotation Template" : "New Quotation Template"}
      description={
        template?.id
          ? "Modify pre-packaged products, quantities, and tax configurations."
          : "Pre-bundle products, plans, and line items for instant 1-click quotation creation."
      }
      width="lg"
    >
      <QuotationTemplateFormInner
        key={template?.id || "new"}
        template={template}
        products={products}
        plans={plans}
        taxes={taxes}
        onCancel={() => onOpenChange(false)}
        onSuccess={() => {
          onOpenChange(false);
          onSuccess();
        }}
      />
    </Sheet>
  );
}
