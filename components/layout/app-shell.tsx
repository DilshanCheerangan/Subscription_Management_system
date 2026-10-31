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
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar role={role} userName={userName} userEmail={userEmail} />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl flex flex-col">
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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

      {/* Main Content Area */}
      <div className="flex flex-col md:pl-64 transition-all duration-200">
        <Topbar
          role={role}
          userName={userName}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
