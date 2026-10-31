"use client";

import { useRouter } from "next/navigation";
import { Search, Bell, LogOut, ChevronDown, Menu } from "lucide-react";
import { UserRole } from "./sidebar";
import { logoutAction } from "@/app/actions/auth";
import { useState } from "react";

interface TopbarProps {
  role?: UserRole;
  userName?: string;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

export function Topbar({ role = "ADMIN", userName = "Admin User", onLogout, onToggleMobileMenu }: TopbarProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      await logoutAction();
      router.push("/login");
      router.refresh();
    }
  };

  const roleColors: Record<UserRole, string> = {
    ADMIN: "text-indigo-600",
    STAFF: "text-amber-600",
    CUSTOMER: "text-emerald-600",
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Left: Mobile Menu + Search */}
      <div className="flex flex-1 items-center gap-3 max-w-lg">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label="Toggle mobile menu"
            className="md:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="relative flex-1 hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </div>

      {/* Right: Notifications + User Menu */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2.5 pr-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block max-w-[120px] truncate">{userName}</span>
            <span className={`hidden sm:block text-xs font-semibold ${roleColors[role]}`}>
              · {role}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1.5 w-52 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 py-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
                  <p className={`text-[11px] font-medium ${roleColors[role]}`}>{role}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
