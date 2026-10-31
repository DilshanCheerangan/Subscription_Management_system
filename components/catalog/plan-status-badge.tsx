import React from "react";
import { cn } from "@/lib/utils";
import { PlanStatusDerived } from "@/lib/catalog";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

interface PlanStatusBadgeProps {
  status: PlanStatusDerived;
  className?: string;
}

const statusConfigs: Record<
  PlanStatusDerived,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  UPCOMING: {
    label: "Upcoming",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: Clock,
  },
  AVAILABLE: {
    label: "Available",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  ENDED: {
    label: "Ended",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-300",
    icon: XCircle,
  },
};

export function PlanStatusBadge({ status, className }: PlanStatusBadgeProps) {
  const config = statusConfigs[status] || statusConfigs.ENDED;
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
