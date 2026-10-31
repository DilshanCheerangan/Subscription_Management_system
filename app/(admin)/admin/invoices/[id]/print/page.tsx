import React, { Suspense } from "react";
import { PrintInvoiceClient } from "./print-invoice-client";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function PrintContent({ params }: PageProps) {
  const { id } = await params;
  return <PrintInvoiceClient id={id} />;
}

export default function PrintInvoicePage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-500 font-sans">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="text-sm font-medium">Loading printable invoice...</p>
        </div>
      }
    >
      <PrintContent params={params} />
    </Suspense>
  );
}
