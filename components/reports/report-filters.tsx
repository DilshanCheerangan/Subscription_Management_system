"use client";

import React, { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Calendar,
  Filter,
  User,
  Layers,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface FilterProps {
  customers: Array<{ id: string; name: string }>;
  plans: Array<{ id: string; name: string }>;
  activePreset: string;
  activeFrom?: string;
  activeTo?: string;
  activeCustomerId?: string;
  activePlanId?: string;
  activeStatus?: string;
}

export function ReportFilters({
  customers,
  plans,
  activePreset,
  activeFrom = "",
  activeTo = "",
  activeCustomerId = "ALL",
  activePlanId = "ALL",
  activeStatus = "ALL",
}: FilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePresetChange = (preset: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", preset);
    if (preset !== "custom") {
      params.delete("dateFrom");
      params.delete("dateTo");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleReset = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const presets = [
    { label: "This Month", value: "this_month" },
    { label: "Last Month", value: "last_month" },
    { label: "This Quarter", value: "quarter" },
    { label: "Custom Range", value: "custom" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
      {/* Preset Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
            Range:
          </span>
          {presets.map((p) => {
            const isSelected = activePreset === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePresetChange(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {isPending && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Updating analytics...</span>
          </div>
        )}
      </div>

      {/* Select Filters Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Custom Date Inputs if custom is selected */}
        {activePreset === "custom" && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={activeFrom}
              onChange={(e) => updateParam("dateFrom", e.target.value)}
              className="bg-transparent text-xs focus:outline-hidden"
            />
            <span>to</span>
            <input
              type="date"
              value={activeTo}
              onChange={(e) => updateParam("dateTo", e.target.value)}
              className="bg-transparent text-xs focus:outline-hidden"
            />
          </div>
        )}

        {/* Customer filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 max-w-[200px]">
          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={activeCustomerId}
            onChange={(e) => updateParam("customerId", e.target.value)}
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden truncate"
          >
            <option value="ALL">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Plan filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 max-w-[200px]">
          <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={activePlanId}
            onChange={(e) => updateParam("planId", e.target.value)}
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden truncate"
          >
            <option value="ALL">All Plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <select
            value={activeStatus}
            onChange={(e) => updateParam("status", e.target.value)}
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="QUOTATION">Quotation</option>
          </select>
        </div>

        {/* Reset button */}
        {(activePreset !== "this_month" ||
          activeCustomerId !== "ALL" ||
          activePlanId !== "ALL" ||
          activeStatus !== "ALL" ||
          activeFrom ||
          activeTo) && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
}
