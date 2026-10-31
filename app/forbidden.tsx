import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-xl border border-slate-200/90 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-100 text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200/60">
            HTTP 403 Forbidden
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Access Denied
          </h1>
          <p className="text-sm text-slate-500">
            You do not have the required role or permissions to view this administrative resource.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Switch Account
          </Link>
          <Link
            href="/portal"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            Customer Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
