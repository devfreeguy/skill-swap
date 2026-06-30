import { IconCheck, IconChevronDown } from "@tabler/icons-react";

/** A toggleable filter pill used in the discover/users filter row. */
export default function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
        active
          ? "border-accent bg-accent/10 text-accent font-medium"
          : "border-border text-muted hover:text-foreground hover:border-foreground/30"
      }`}
    >
      {active && <IconCheck size={13} />}
      {label}
      {!active && <IconChevronDown size={13} />}
    </button>
  );
}
