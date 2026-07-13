export type SkillTagVariant = "teach" | "learn" | "neutral";

type Props = {
  label: string;
  variant?: SkillTagVariant;
  size?: "sm" | "md";
};

const variantStyles: Record<SkillTagVariant, string> = {
  teach: "bg-surface-secondary border border-border text-foreground",
  learn: "bg-accent/10 border border-accent/25 text-accent",
  neutral: "bg-surface-secondary border border-border text-muted",
};

const sizeStyles = {
  sm: "px-2.5 py-0.5 text-xs",
  md: "px-3.5 py-1 text-sm",
};

export default function SkillTag({
  label,
  variant = "neutral",
  size = "sm",
}: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium leading-none ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {label}
    </span>
  );
}
