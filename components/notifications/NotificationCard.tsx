import {
  IconArrowsExchange,
  IconCircleCheck,
  IconCircleX,
  IconShield,
  IconStars,
  IconTrophy,
} from "@tabler/icons-react";
import { formatRelativeTime } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  userId: string;
  swapId: string | null;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type NotifConfig = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  iconClass: string;
};

const NOTIFICATION_CONFIG: Record<string, NotifConfig> = {
  SWAP_REQUEST: {
    icon: IconArrowsExchange,
    title: "New Swap Request",
    iconClass: "text-accent",
  },
  SWAP_ACCEPTED: {
    icon: IconCircleCheck,
    title: "Swap Accepted",
    iconClass: "text-success",
  },
  SWAP_DECLINED: {
    icon: IconCircleX,
    title: "Swap Declined",
    iconClass: "text-danger",
  },
  SWAP_COMPLETED: {
    icon: IconTrophy,
    title: "Swap Completed",
    iconClass: "text-success",
  },
  PERFECT_MATCH: {
    icon: IconStars,
    title: "Perfect Match Found",
    iconClass: "text-warning",
  },
  PROOF_CREATED: {
    icon: IconShield,
    title: "Proof Created",
    iconClass: "text-accent",
  },
};

export default function NotificationCard({
  notification,
  onClick,
}: {
  notification: NotificationItem;
  onClick: (n: NotificationItem) => void;
}) {
  const config: NotifConfig = NOTIFICATION_CONFIG[notification.type] ?? {
    icon: IconArrowsExchange,
    title: notification.type,
    iconClass: "text-muted",
  };
  const Icon = config.icon;

  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full flex items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-surface ${
        !notification.read ? "bg-accent/5" : "bg-background"
      }`}
    >
      <div className={`mt-0.5 shrink-0 ${config.iconClass}`}>
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{config.title}</p>
        <p className="text-sm text-muted mt-0.5 leading-snug">
          {notification.message}
        </p>
        <p className="text-xs text-muted/60 mt-1.5">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {!notification.read && (
        <div className="mt-1.5 shrink-0">
          <span className="block size-2 rounded-full bg-accent" />
        </div>
      )}
    </button>
  );
}
