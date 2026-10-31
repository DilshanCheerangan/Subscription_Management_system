import React, { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

async function DynamicShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <AppShell
      role={user?.role || "ADMIN"}
      userName={user?.name || "System Operator"}
      userEmail={user?.email || "admin@brightloop.test"}
    >
      {children}
    </AppShell>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <AppShell
          role="ADMIN"
          userName="Loading..."
          userEmail="admin@brightloop.test"
        >
          {children}
        </AppShell>
      }
    >
      <DynamicShell>{children}</DynamicShell>
    </Suspense>
  );
}
