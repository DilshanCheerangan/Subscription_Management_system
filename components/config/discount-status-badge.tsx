import React from "react";
import { cn } from "@/lib/utils";
import { DiscountStatusDerived } from "@/lib/discounts";
import { Clock, CheckCircle2, AlertTriangle, XCircle, Ban } from "lucide-react";

interface DiscountStatusBadgeProps {
  status: DiscountStatusDerived;
  className?: string;
}

const statusConfigs: Record<
  DiscountStatusDerived,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  SCHEDULED: {
    label: "Scheduled",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: Clock,
  },
  ACTIVE: {
    label: "Active",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  EXHAUSTED: {
    label: "Exhausted",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: AlertTriangle,
  },
  EXPIRED: {
    label: "Expired",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-300",
    icon: XCircle,
  },
  INACTIVE: {
    label: "Inactive",
    bg: "bg-zinc-100",
    text: "text-zinc-500",
    border: "border-zinc-300",
    icon: Ban,
  },
};

export function DiscountStatusBadge({ status, className }: DiscountStatusBadgeProps) {
  const config = statusConfigs[status] || statusConfigs.INACTIVE;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {config.label}
    </span>
  );
}
