import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPortalInvoiceDetailAction } from "@/app/actions/portal";
import { PrintInvoiceClient } from "@/app/(admin)/admin/invoices/[id]/print/print-invoice-client";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function PrintContent({ params }: PageProps) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  // Strict isolation check
  const res = await getPortalInvoiceDetailAction(id);
  if (!res.success || res.notFound || !res.data) {
    notFound();
  }

  return <PrintInvoiceClient id={id} />;
}

export default function PortalPrintInvoicePage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-500 font-sans">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="text-sm font-medium">Loading printable statement...</p>
        </div>
      }
    >
      <PrintContent params={params} />
    </Suspense>
  );
}
