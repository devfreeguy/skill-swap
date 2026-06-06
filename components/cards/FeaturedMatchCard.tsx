import { Avatar, Button, Card, Chip } from "@heroui/react";
import { IconArrowRight, IconBolt } from "@tabler/icons-react";
import Link from "next/link";
import { parseSkills } from "@/lib/skills";

export type FeaturedMatchData = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
  matchPct: number;
};

type Props = {
  match: FeaturedMatchData;
};

export default function FeaturedMatchCard({ match }: Props) {
  const teach = parseSkills(match.teachSkill);
  const learn = parseSkills(match.learnSkill);

  return (
    <Card className="bg-surface border border-border rounded-2xl p-6 flex flex-col sm:flex-row gap-5 hover:border-accent/40 transition-colors">
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar size="lg" className="size-16">
          {match.avatarUrl && (
            <Avatar.Image src={match.avatarUrl} alt={match.name} />
          )}
          <Avatar.Fallback className="text-xl font-bold">
            {match.name.slice(0, 2).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 inline-flex items-center gap-0.5 text-xs font-bold bg-accent text-accent-foreground rounded-full px-1.5 py-0.5">
          <IconBolt size={10} />
          {match.matchPct}%
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div>
          <p className="font-bold text-foreground text-lg leading-tight">{match.name}</p>
          {teach.length > 0 && (
            <p className="text-sm text-muted">{teach.slice(0, 2).join(", ")}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          {teach.length > 0 && (
            <div>
              <p className="uppercase tracking-wider text-muted font-semibold mb-1.5">They Teach</p>
              <div className="flex flex-wrap gap-1">
                {teach.slice(0, 3).map((s) => (
                  <Chip key={s} size="sm" color="default">{s}</Chip>
                ))}
              </div>
            </div>
          )}
          {learn.length > 0 && (
            <div>
              <p className="uppercase tracking-wider text-muted font-semibold mb-1.5">They Want</p>
              <div className="flex flex-wrap gap-1">
                {learn.slice(0, 3).map((s) => (
                  <Chip key={s} size="sm" className="border border-accent/50 text-accent bg-transparent">{s}</Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex items-end sm:items-center shrink-0">
        <Link href={`/users/${match.id}`}>
          <Button className="font-semibold bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-2">
            Request Exchange
            <IconArrowRight size={16} />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
