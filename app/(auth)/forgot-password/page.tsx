"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { forgotPasswordAction } from "@/app/actions/auth";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const res = await forgotPasswordAction(email);
      setSubmitted(true);
      setMessage(
        res.message ||
          "If that email is registered, we have sent a password reset link to it."
      );
    });
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email to receive a password recovery link"
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to sign in</span>
        </Link>
      }
    >
      {submitted ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900 mb-0.5">Check your inbox</p>
              <p className="leading-relaxed">{message}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center">
            Did not receive the email? Check your spam folder or try again in a few minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@brightloop.test"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending reset link...</span>
              </>
            ) : (
              <>
                <span>Send Reset Link</span>
                <Send className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
