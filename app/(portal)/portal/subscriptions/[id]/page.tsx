import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPortalSubscriptionDetailAction } from "@/app/actions/portal";
import {
  PortalSubscriptionClient,
  PortalSubscriptionData,
} from "./portal-subscription-client";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function SubscriptionContent({ params }: PageProps) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const res = await getPortalSubscriptionDetailAction(id);
  if (!res.success || res.notFound || !res.data) {
    notFound();
  }

  return (
    <PortalSubscriptionClient
      initialData={res.data as PortalSubscriptionData}
      subscriptionId={id}
    />
  );
}

export default function PortalSubscriptionDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="text-sm font-medium">Loading subscription details...</p>
        </div>
      }
    >
      <SubscriptionContent params={params} />
    </Suspense>
  );
}
