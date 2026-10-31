"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { StatusDistributionPoint } from "@/lib/reporting";
import { Layers } from "lucide-react";

interface StatusChartProps {
  data: StatusDistributionPoint[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#16a34a",
  PAUSED: "#d97706",
  CONFIRMED: "#4f46e5",
  QUOTATION: "#2563eb",
  DRAFT: "#94a3b8",
  CLOSED: "#475569",
};

export function SubscriptionsByStatusChart({ data }: StatusChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600" />
          Subscriptions by Status
        </h2>
        <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No subscriptions found for selected scope.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600" />
          Subscriptions by Status
        </h2>
        <span className="text-xs text-slate-500">Contract lifecycle count</span>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="status"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: unknown) => [Number(value) || 0, "Subscriptions"]}
              labelStyle={{ fontWeight: "bold", color: "#0f172a" }}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.status] || "#6366f1"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
