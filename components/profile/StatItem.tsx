/** Compact labelled stat used in the profile's exchange statistics grid. */
export default function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-background border border-border">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground leading-none">{value}</p>
    </div>
  );
}
