import { IconArrowsExchange } from "@tabler/icons-react";

/**
 * Renders a skill exchange "A [swap] B", with the swap icon shown in a
 * secondary-surface container (foreground-coloured icon) instead of a plain
 * "↔" character.
 */
export default function ExchangePair({
  a,
  b,
  className,
}: {
  a: string;
  b: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <span>{a}</span>
      <span className="inline-flex items-center justify-center size-5 rounded bg-surface-secondary text-foreground shrink-0">
        <IconArrowsExchange size={12} />
      </span>
      <span>{b}</span>
    </span>
  );
}
