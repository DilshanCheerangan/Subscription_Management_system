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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      {/* Subtle background pattern */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="w-full max-w-sm">
        {/* Brand Mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="group inline-block">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-4 ring-white transition-transform group-hover:scale-105">
              <Building2 className="h-6 w-6" />
            </div>
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">Brightloop</span>
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
              SMS
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-sm">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>
        )}
      </div>
    </div>
  );
}
