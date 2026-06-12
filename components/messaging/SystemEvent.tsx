import {
  IconArrowsExchange,
  IconCalendar,
  IconCheck,
  IconShieldCheck,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type EventConfig = {
  icon: React.ReactNode;
  title: string;
  description: string;
  colorClass: string;
};

const EVENT_CONFIG: Record<string, EventConfig> = {
  SWAP_ACCEPTED: {
    icon: <IconCheck size={18} />,
    title: "Swap Proposal Accepted",
    description: "The swap was accepted. You can now start exchanging skills.",
    colorClass: "text-accent",
  },
  SWAP_DECLINED: {
    icon: <IconX size={18} />,
    title: "Swap Declined",
    description: "This swap request was declined.",
    colorClass: "text-danger",
  },
  SESSION_SCHEDULED: {
    icon: <IconCalendar size={18} />,
    title: "Session Scheduled",
    description: "A learning session has been scheduled.",
    colorClass: "text-accent",
  },
  DELIVERABLE_SUBMITTED: {
    icon: <IconUpload size={18} />,
    title: "Deliverable Submitted",
    description: "A deliverable was submitted for review.",
    colorClass: "text-warning",
  },
  PROOF_CREATED: {
    icon: <IconShieldCheck size={18} />,
    title: "Swap Completed",
    description:
      "Both parties completed the exchange. Proof recorded on Cardano.",
    colorClass: "text-accent",
  },
  VERIFICATION_COMPLETED: {
    icon: <IconShieldCheck size={18} />,
    title: "Verification Complete",
    description: "Skills have been verified on the blockchain.",
    colorClass: "text-accent",
  },
};

type Props = {
  type: string;
  swapId: string;
};

export default function SystemEvent({ type, swapId }: Props) {
  const config = EVENT_CONFIG[type];
  if (!config) return null;

  return (
    <div className="flex justify-center py-1">
      <div className="bg-surface border border-border rounded-2xl px-5 py-4 max-w-sm w-full flex gap-3 shadow-sm">
        <div
          className={cn(
            "size-9 rounded-xl flex items-center justify-center shrink-0 bg-background border border-border",
            config.colorClass
          )}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{config.title}</p>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            {config.description}
          </p>
          <Link
            href={`/swaps/${swapId}`}
            className="text-xs text-accent hover:text-accent/80 transition-colors mt-2 inline-flex items-center gap-1 font-medium"
          >
            <IconArrowsExchange size={11} />
            View Contract Details
          </Link>
        </div>
      </div>
    </div>
  );
}
