import {
  IconMinus,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";

/** Up / down / flat trend indicator for trending skills. */
export default function TrendIcon({
  trend,
}: {
  trend: "up" | "down" | "flat";
}) {
  if (trend === "up") return <IconTrendingUp size={16} className="text-accent" />;
  if (trend === "down")
    return <IconTrendingDown size={16} className="text-danger" />;
  return <IconMinus size={16} className="text-muted" />;
}
