import React from "react";
import { SubscriptionStatus } from "@prisma/client";
import { Check, PauseCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusStepperProps {
  currentStatus: SubscriptionStatus;
  className?: string;
}

const mainSteps: { status: SubscriptionStatus; label: string; stepNumber: number }[] = [
  { status: SubscriptionStatus.DRAFT, label: "Draft", stepNumber: 1 },
  { status: SubscriptionStatus.QUOTATION, label: "Quotation", stepNumber: 2 },
  { status: SubscriptionStatus.CONFIRMED, label: "Confirmed", stepNumber: 3 },
  { status: SubscriptionStatus.ACTIVE, label: "Active", stepNumber: 4 },
  { status: SubscriptionStatus.CLOSED, label: "Closed", stepNumber: 5 },
];

export function SubscriptionStatusStepper({ currentStatus, className }: StatusStepperProps) {
  const isPaused = currentStatus === SubscriptionStatus.PAUSED;

  // Find step index
  const currentStepIndex = isPaused
    ? 3 // Paused is a side state of Active (index 3)
    : mainSteps.findIndex((s) => s.status === currentStatus);

  return (
    <div className={cn("bg-white border border-slate-200 rounded-lg p-5 shadow-2xs", className)}>
      {isPaused && (
        <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between text-xs text-amber-800 font-medium">
          <div className="flex items-center gap-2">
            <PauseCircle className="h-4 w-4 text-amber-600" />
            <span>Subscription is currently <strong>PAUSED</strong>. Recurring billing and renewals are temporarily on hold.</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
            Side State
          </span>
        </div>
      )}

      <div className="flex items-center justify-between relative">
        {/* Background Connecting Track */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />

        {mainSteps.map((step, idx) => {
          const isPassed = !isPaused && idx < currentStepIndex;
          const isCurrent = !isPaused && idx === currentStepIndex;
          const isPausedActive = isPaused && step.status === SubscriptionStatus.ACTIVE;

          let iconContent: React.ReactNode = step.stepNumber;
          let circleClasses = "bg-white border-2 border-slate-300 text-slate-400";
          let labelClasses = "text-slate-500 font-normal";

          if (isPassed) {
            circleClasses = "bg-indigo-600 border-2 border-indigo-600 text-white";
            labelClasses = "text-slate-800 font-medium";
            iconContent = <Check className="h-4 w-4 stroke-[2.5]" />;
          } else if (isCurrent) {
            if (step.status === SubscriptionStatus.CLOSED) {
              circleClasses = "bg-slate-700 border-2 border-slate-700 text-white ring-4 ring-slate-100";
              labelClasses = "text-slate-900 font-bold";
              iconContent = <XCircle className="h-4 w-4" />;
            } else {
              circleClasses = "bg-indigo-600 border-2 border-indigo-600 text-white ring-4 ring-indigo-50";
              labelClasses = "text-indigo-600 font-bold";
            }
          } else if (isPausedActive) {
            circleClasses = "bg-amber-500 border-2 border-amber-500 text-white ring-4 ring-amber-100";
            labelClasses = "text-amber-700 font-bold";
            iconContent = <PauseCircle className="h-4 w-4" />;
          }

          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200",
                  circleClasses
                )}
              >
                {iconContent}
              </div>
              <span className={cn("mt-2 text-xs transition-colors", labelClasses)}>
                {isPausedActive ? "Paused" : step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
