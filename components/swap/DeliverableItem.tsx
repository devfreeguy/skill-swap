import {
  IconExternalLink,
  IconFile,
  IconFileText,
  IconLink,
  IconNote,
  IconPhoto,
  IconTrash,
} from "@tabler/icons-react";
import type { DeliverableType } from "@/app/generated/prisma/client";

export type DeliverableData = {
  id: string;
  type: DeliverableType;
  title?: string | null;
  resourceLink?: string | null;
  notes?: string | null;
  fileName?: string | null;
};

const TYPE_META: Record<
  DeliverableType,
  { icon: typeof IconLink; label: string }
> = {
  LINK: { icon: IconLink, label: "Link" },
  IMAGE: { icon: IconPhoto, label: "Image" },
  DOCUMENT: { icon: IconFileText, label: "Document" },
  FILE: { icon: IconFile, label: "File" },
  TEXT: { icon: IconNote, label: "Note" },
};

export default function DeliverableItem({
  deliverable,
  onRemove,
}: {
  deliverable: DeliverableData;
  onRemove?: (id: string) => void;
}) {
  const meta = TYPE_META[deliverable.type] ?? TYPE_META.LINK;
  const Icon = meta.icon;
  const href = deliverable.resourceLink || undefined;

  const title =
    deliverable.title ||
    deliverable.fileName ||
    (deliverable.type === "TEXT"
      ? deliverable.notes?.slice(0, 60) || "Note"
      : deliverable.resourceLink || meta.label);

  const subtitle =
    deliverable.type === "TEXT"
      ? deliverable.title
        ? deliverable.notes
        : undefined
      : deliverable.resourceLink;

  return (
    <div className="flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3 group hover:border-border/60 transition-colors">
      <div className="size-9 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
        <Icon size={16} className="text-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted truncate">{subtitle}</p>
        )}
      </div>

      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open deliverable"
          className="text-muted hover:text-foreground transition-colors shrink-0"
        >
          <IconExternalLink size={16} />
        </a>
      )}

      {onRemove && (
        <button
          onClick={() => onRemove(deliverable.id)}
          aria-label="Remove deliverable"
          className="text-muted hover:text-danger transition-colors shrink-0"
        >
          <IconTrash size={16} />
        </button>
      )}
    </div>
  );
}
