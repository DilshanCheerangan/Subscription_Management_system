"use client";

import { Check, X } from "lucide-react";
import { checkPasswordRules } from "@/lib/validators/password";
import { cn } from "@/lib/utils";

interface PasswordRulesChecklistProps {
  password?: string;
  className?: string;
}

export function PasswordRulesChecklist({
  password = "",
  className,
}: PasswordRulesChecklistProps) {
  const rules = checkPasswordRules(password);

  return (
    <div className={cn("rounded-lg bg-slate-50 p-3 border border-slate-200/80 text-xs space-y-1.5", className)}>
      <div className="font-semibold text-slate-700 mb-1">Password requirements:</div>
      <div className="space-y-1">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className={cn(
              "flex items-center gap-2 transition-colors",
              rule.met ? "text-emerald-700 font-medium" : "text-slate-500"
            )}
          >
            <div
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full transition-colors",
                rule.met ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
              )}
            >
              {rule.met ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : <X className="h-2.5 w-2.5" />}
            </div>
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
