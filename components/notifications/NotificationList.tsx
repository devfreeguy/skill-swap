import { IconBellOff } from "@tabler/icons-react";
import NotificationCard, { type NotificationItem } from "./NotificationCard";

export default function NotificationList({
  items,
  onItemClick,
}: {
  items: NotificationItem[];
  onItemClick: (n: NotificationItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <IconBellOff size={40} className="text-muted/30" />
        <p className="text-sm font-medium text-foreground">
          You&apos;re all caught up
        </p>
        <p className="text-xs text-muted">No new notifications right now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
      {items.map((n) => (
        <NotificationCard key={n.id} notification={n} onClick={onItemClick} />
      ))}
    </div>
  );
}
