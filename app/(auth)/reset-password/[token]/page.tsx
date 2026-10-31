"use client";

import { use, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordRulesChecklist } from "@/components/auth/password-rules-checklist";
import { resetPasswordAction } from "@/app/actions/auth";
import { isPasswordValid } from "@/lib/validators/password";
import { CheckCircle2, Loader2, KeyRound } from "lucide-react";

function ResetPasswordForm({ tokenPromise }: { tokenPromise: Promise<{ token: string }> }) {
  const router = useRouter();
  const { token } = use(tokenPromise);

  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setError("Please ensure your new password meets all security rules.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const res = await resetPasswordAction({ token, password });
      if (!res.success) {
        setError(res.message || "Failed to reset password.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    });
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Password Updated!</h2>
          <p className="text-xs text-slate-500">
            Your password has been changed successfully. Redirecting you to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          New Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Confirm New Password
        </label>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••••••"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <PasswordRulesChecklist password={password} />

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating password...</span>
          </>
        ) : (
          <>
            <span>Save New Password</span>
            <KeyRound className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <AuthCard
      title="Set a new password"
      subtitle="Create a strong password for your Brightloop account"
      footer={
        <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Back to sign in
        </Link>
      }
    >
      <Suspense
        fallback={
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            <span className="text-sm">Loading security verification...</span>
          </div>
        }
      >
        <ResetPasswordForm tokenPromise={params} />
      </Suspense>
    </AuthCard>
  );
}
