import React, { Suspense } from "react";
import { InvoiceDetailClient } from "./invoice-detail-client";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function InvoiceDetailContent({ params }: PageProps) {
  const { id } = await params;
  return <InvoiceDetailClient id={id} />;
}

export default function InvoiceDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="text-sm font-medium">Loading invoice details...</p>
        </div>
      }
    >
      <InvoiceDetailContent params={params} />
    </Suspense>
  );
}
