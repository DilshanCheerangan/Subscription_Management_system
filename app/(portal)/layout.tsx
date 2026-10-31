import React, { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

async function DynamicCustomerShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <AppShell
      role={user?.role || "CUSTOMER"}
      userName={user?.name || "Customer Account"}
      userEmail={user?.email || "customer@portal.test"}
    >
      {children}
    </AppShell>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <AppShell
          role="CUSTOMER"
          userName="Loading..."
          userEmail="customer@portal.test"
        >
          {children}
        </AppShell>
      }
    >
      <DynamicCustomerShell>{children}</DynamicCustomerShell>
    </Suspense>
  );
}
