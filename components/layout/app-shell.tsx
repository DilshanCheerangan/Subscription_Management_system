import React from "react";
import { Sidebar, UserRole } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  children: React.ReactNode;
  role?: UserRole;
  userName?: string;
  userEmail?: string;
}

export function AppShell({
  children,
  role = "ADMIN",
  userName = "Admin User",
  userEmail = "admin@brightloop.test",
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 antialiased">
      <Sidebar role={role} userName={userName} userEmail={userEmail} />
      <div className="flex flex-col pl-64 transition-all duration-200">
        <Topbar role={role} userName={userName} />
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
