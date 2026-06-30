import { Card } from "@heroui/react";

export default function StatCard({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <Card className="bg-surface border border-border rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col gap-1.5 sm:gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted leading-tight">
          {label}
        </p>
        <span className="text-muted shrink-0">{icon}</span>
      </div>
      <p
        className={`text-xl sm:text-3xl font-bold ${valueClass ?? "text-foreground"}`}
      >
        {value}
      </p>
    </Card>
  );
}
