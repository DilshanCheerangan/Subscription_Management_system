import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

async function HomeRedirectContent(): Promise<React.ReactNode> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "CUSTOMER") {
    redirect("/portal");
  }

  // ADMIN and STAFF default landing per Phase 7
  redirect("/admin/reports");
  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeRedirectContent />
    </Suspense>
  );
}
