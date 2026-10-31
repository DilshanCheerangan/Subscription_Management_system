"use client";

import React, { useState } from "react";
import { Sidebar, UserRole } from "./sidebar";
import { Topbar } from "./topbar";
import { X } from "lucide-react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 antialiased">
      {/* Fixed Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-shrink-0 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-40">
        <Sidebar role={role} userName={userName} userEmail={userEmail} />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col">
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Close mobile menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar
              role={role}
              userName={userName}
              userEmail={userEmail}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area — offset by sidebar width on desktop */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        <Topbar
          role={role}
          userName={userName}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
