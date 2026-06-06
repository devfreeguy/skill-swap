import { IconCheck } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type ProgressStep = {
  label: string;
  icon: ReactNode;
  done: boolean;
  active: boolean;
};

export default function SwapProgressTracker({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="flex items-start w-full min-w-[320px]">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-start flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              className={`size-10 rounded-full flex items-center justify-center border-2 transition-all ${
                step.done
                  ? "bg-success border-success text-white"
                  : step.active
                  ? "bg-success/10 border-success text-success"
                  : "bg-transparent border-border text-muted"
              }`}
            >
              {step.done ? <IconCheck size={18} /> : step.icon}
            </div>
            <span
              className={`text-xs font-medium text-center leading-tight max-w-[72px] ${
                step.done || step.active ? "text-success" : "text-muted"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 mx-3 mt-5 shrink ${
                step.done ? "bg-success" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
