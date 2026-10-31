import React from "react";
import { cn } from "@/lib/utils";

export type StatusType =
  | "DRAFT"
  | "QUOTATION"
  | "CONFIRMED"
  | "ACTIVE"
  | "PAUSED"
  | "CLOSED"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | string;

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  label?: string;
  size?: "sm" | "md" | "lg";
}

const statusStyles: Record<string, string> = {
  // Draft = gray
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  // Quotation = blue
  QUOTATION: "bg-blue-50 text-blue-700 border-blue-200",
  // Confirmed = indigo
  CONFIRMED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  // Active = green
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  // Paused = amber
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
  // Closed = slate
  CLOSED: "bg-slate-200 text-slate-800 border-slate-300",
  // Paid = green
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  // Overdue = red
  OVERDUE: "bg-rose-50 text-rose-700 border-rose-200",
  // Cancelled = gray-outline
  CANCELLED: "bg-transparent text-slate-500 border-slate-300 border-dashed",
};

const defaultStyle = "bg-slate-100 text-slate-700 border-slate-200";

export function StatusBadge({ status, label, size = "md", className, ...props }: StatusBadgeProps) {
  const normalizedKey = status.toUpperCase();
  const style = statusStyles[normalizedKey] || defaultStyle;
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs font-medium",
    md: "px-2.5 py-0.5 text-xs font-semibold",
    lg: "px-3 py-1 text-sm font-semibold",
  };

  const dotColors: Record<string, string> = {
    DRAFT: "bg-slate-400",
    CANCELLED: "bg-slate-400",
    QUOTATION: "bg-blue-500",
    CONFIRMED: "bg-indigo-500",
    ACTIVE: "bg-emerald-500",
    PAID: "bg-emerald-500",
    PAUSED: "bg-amber-500",
    CLOSED: "bg-slate-600",
    OVERDUE: "bg-rose-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border tracking-wide transition-colors shadow-xs",
        style,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", dotColors[normalizedKey] || "bg-slate-400")} />
      {displayLabel}
    </span>
  );
}
