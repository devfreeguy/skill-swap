import { Button, Card } from "@heroui/react";
import Link from "next/link";

export default function DiscoverMoreCard() {
  return (
    <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 bg-surface border border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-55 hover:border-accent/40 transition-[box-shadow,transform,border-color] duration-200">
      <p className="text-muted text-sm font-medium">Discover More</p>
      <Link href="/users">
        <Button variant="secondary" size="sm">
          Browse All
        </Button>
      </Link>
    </Card>
  );
}
