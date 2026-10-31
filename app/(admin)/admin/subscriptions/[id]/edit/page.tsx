import React, { Suspense } from "react";
import { EditSubscriptionClient } from "./edit-subscription-client";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function EditSubscriptionContent({ params }: PageProps) {
  const { id } = await params;
  return <EditSubscriptionClient id={id} />;
}

export default function EditSubscriptionPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="text-sm font-medium">Loading subscription editor...</p>
        </div>
      }
    >
      <EditSubscriptionContent params={params} />
    </Suspense>
  );
}
