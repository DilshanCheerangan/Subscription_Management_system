import React from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50/80 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Brand Mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-4 ring-indigo-50 transition-transform group-hover:scale-105">
              <Building2 className="h-6 w-6" />
            </div>
          </Link>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="text-xl font-bold tracking-tight text-slate-900">Brightloop</span>
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200/60">
              SMS
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>

        {/* Card Body */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
      </div>
    </div>
  );
}
