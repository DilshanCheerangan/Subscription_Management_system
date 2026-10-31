import Link from "next/link";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-xl border border-slate-200/90 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
          <FileQuestion className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200/60">
            HTTP 404
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500">
            The resource, subscription, or page you requested could not be found or has been moved.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/admin/reports"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/portal"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Customer Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
