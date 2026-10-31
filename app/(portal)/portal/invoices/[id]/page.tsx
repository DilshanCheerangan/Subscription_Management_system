import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPortalInvoiceDetailAction } from "@/app/actions/portal";
import { PortalInvoiceClient, PortalInvoiceData } from "./portal-invoice-client";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function InvoiceContent({ params }: PageProps) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const res = await getPortalInvoiceDetailAction(id);
  if (!res.success || res.notFound || !res.data) {
    notFound();
  }

  return <PortalInvoiceClient data={res.data as PortalInvoiceData} />;
}

export default function PortalInvoiceDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="text-sm font-medium">Loading invoice details...</p>
        </div>
      }
    >
      <InvoiceContent params={params} />
    </Suspense>
  );
}
