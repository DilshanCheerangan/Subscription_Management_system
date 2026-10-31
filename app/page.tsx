import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { getSessionUser } from "@/lib/auth";

async function HomeWithUser() {
  const user = await getSessionUser();

  return (
    <AppShell
      role={user?.role || "ADMIN"}
      userName={user?.name || "System Administrator"}
      userEmail={user?.email || "admin@brightloop.test"}
    >
      <DashboardContent />
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <AppShell
          role="ADMIN"
          userName="Loading..."
          userEmail="admin@brightloop.test"
        >
          <DashboardContent />
        </AppShell>
      }
    >
      <HomeWithUser />
    </Suspense>
  );
}
