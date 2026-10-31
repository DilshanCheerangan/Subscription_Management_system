"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  SubscriptionForm,
  CustomerOption,
  PlanOption,
  ProductOption,
  TaxOption,
  TemplateOption,
} from "@/components/subscriptions/subscription-form";
import { getSubscriptionMetadataAction } from "@/app/actions/subscriptions";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

function SubscriptionCreateInner() {
  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get("templateId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [taxes, setTaxes] = useState<TaxOption[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<{ id: string; name: string; days: number }[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    getSubscriptionMetadataAction().then((res) => {
      if (res.success && res.data) {
        setCustomers(res.data.customers);
        setPlans(res.data.plans);
        setProducts(res.data.products);
        setTaxes(res.data.taxes);
        setPaymentTerms(res.data.paymentTerms);
        setTemplates(res.data.templates);
      } else {
        setError(res.error || "Failed to load subscription builder options");
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
        <p className="text-sm font-medium">Loading subscription builder options...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href="/admin/subscriptions"
          className="hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Subscriptions
        </Link>
      </div>

      <PageHeader
        title="Create New Subscription"
        description="Configure customer terms, billing plans, product variants, and pre-packaged quotation templates."
      />

      <SubscriptionForm
        customers={customers}
        plans={plans}
        products={products}
        taxes={taxes}
        paymentTerms={paymentTerms}
        templates={templates}
        preselectedTemplateId={templateIdParam}
      />
    </div>
  );
}

export default function NewSubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="text-sm font-medium">Loading subscription creator...</p>
        </div>
      }
    >
      <SubscriptionCreateInner />
    </Suspense>
  );
}
