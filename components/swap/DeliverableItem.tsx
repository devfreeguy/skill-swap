import { IconDownload, IconFileText, IconLink } from "@tabler/icons-react";

type Props = {
  type: "link" | "notes";
  title: string;
  subtitle?: string;
  href?: string;
};

export default function DeliverableItem({ type, title, subtitle, href }: Props) {
  const inner = (
    <div className="flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3 group hover:border-border/60 transition-colors">
      <div className="size-9 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
        {type === "link" ? (
          <IconLink size={16} className="text-success" />
        ) : (
          <IconFileText size={16} className="text-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
      </div>
      {href && (
        <IconDownload
          size={16}
          className="text-muted group-hover:text-foreground transition-colors shrink-0"
        />
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return <div>{inner}</div>;
}
