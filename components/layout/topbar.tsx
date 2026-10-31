"use client";

import { useRouter } from "next/navigation";
import { Search, Bell, LogOut, UserCheck } from "lucide-react";
import { UserRole } from "./sidebar";
import { logoutAction } from "@/app/actions/auth";

interface TopbarProps {
  role?: UserRole;
  userName?: string;
  onLogout?: () => void;
}

export function Topbar({ role = "ADMIN", userName = "Admin User", onLogout }: TopbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logoutAction();
      router.push("/login");
      router.refresh();
    }
  };
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-6 backdrop-blur-md">
      {/* Search Input Bar */}
      <div className="flex w-full max-w-md items-center">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search subscriptions, invoices, customers..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Right Action Menu */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 border-r border-slate-200 pr-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-800">{userName}</span> ({role})
          </span>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 text-slate-500" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
