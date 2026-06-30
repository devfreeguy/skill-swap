import { Button, Card } from "@heroui/react";
import Link from "next/link";

export default function DiscoverMoreCard() {
  return (
    <Card className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-55 hover:border-accent/40 transition-colors">
      <p className="text-muted text-sm font-medium">Discover More</p>
      <Link href="/users">
        <Button variant="secondary" size="sm">
          Browse All
        </Button>
      </Link>
    </Card>
  );
}
