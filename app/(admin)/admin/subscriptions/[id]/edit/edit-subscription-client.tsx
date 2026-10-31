"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import {
  SubscriptionForm,
  CustomerOption,
  PlanOption,
  ProductOption,
  TaxOption,
  TemplateOption,
  InitialSubscriptionData,
} from "@/components/subscriptions/subscription-form";
import {
  getSubscriptionDetailAction,
  getSubscriptionMetadataAction,
} from "@/app/actions/subscriptions";
import { SubscriptionStatus } from "@prisma/client";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";

export function EditSubscriptionClient({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subscriptionData, setSubscriptionData] = useState<InitialSubscriptionData | null>(null);
  const [subscriptionNumber, setSubscriptionNumber] = useState<string>("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [taxes, setTaxes] = useState<TaxOption[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<{ id: string; name: string; days: number }[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    Promise.all([getSubscriptionDetailAction(id), getSubscriptionMetadataAction()]).then(
      ([detailRes, metaRes]) => {
        if (!detailRes.success || !detailRes.data) {
          setError(detailRes.error || "Subscription not found");
          setLoading(false);
          return;
        }

        const sub = detailRes.data;
        if (
          sub.status !== SubscriptionStatus.DRAFT &&
          sub.status !== SubscriptionStatus.QUOTATION
        ) {
          setError(
            `Subscriptions in ${sub.status} status cannot be edited. Only Draft and Quotation subscriptions allow modifications.`
          );
          setLoading(false);
          return;
        }

        setSubscriptionNumber(sub.number);
        setSubscriptionData({
          id: sub.id,
          customerId: sub.customer.id,
          planId: sub.plan.id,
          startDate: sub.startDate,
          expiryDate: sub.expiryDate,
          paymentTermId: sub.paymentTerm?.id || null,
          notes: sub.notes,
          status: sub.status,
          lines: sub.lines.map(
            (l: {
              productId: string;
              variantId?: string | null;
              quantity: number;
              unitPrice: number;
              taxId?: string | null;
            }) => ({
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              taxId: l.taxId,
            })
          ),
        });

        if (metaRes.success && metaRes.data) {
          setCustomers(metaRes.data.customers);
          setPlans(metaRes.data.plans);
          setProducts(metaRes.data.products);
          setTaxes(metaRes.data.taxes);
          setPaymentTerms(metaRes.data.paymentTerms);
          setTemplates(metaRes.data.templates);
        }

        setLoading(false);
      }
    );
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
        <p className="text-sm font-medium">Loading subscription editor...</p>
      </div>
    );
  }

  if (error || !subscriptionData) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>{error || "Subscription could not be loaded"}</span>
        </div>
        <Link
          href={`/admin/subscriptions/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to subscription details
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href={`/admin/subscriptions/${id}`}
          className="hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {subscriptionNumber}
        </Link>
      </div>

      <PageHeader
        title={`Edit Subscription ${subscriptionNumber}`}
        description="Update products, quantities, dates, and pricing terms for this proposal."
      />

      <SubscriptionForm
        initialData={subscriptionData}
        customers={customers}
        plans={plans}
        products={products}
        taxes={taxes}
        paymentTerms={paymentTerms}
        templates={templates}
      />
    </div>
  );
}
