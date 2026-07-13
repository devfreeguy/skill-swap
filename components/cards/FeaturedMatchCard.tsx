import { Avatar, Button, Card } from "@heroui/react";
import { IconArrowRight, IconBolt } from "@tabler/icons-react";
import { parseSkills } from "@/lib/skills";
import SkillTag from "@/components/elements/SkillTag";
import UserProfileDialog from "@/components/users/UserProfileDialog";

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
    <Card className="shadow-sm hover:shadow-lg hover:-translate-y-1 bg-surface border border-border rounded-2xl p-6 flex flex-col sm:flex-row gap-5 hover:border-accent/40 transition-[box-shadow,transform,border-color] duration-200">
      {/* Avatar + match badge */}
      <div className="relative shrink-0">
        <Avatar size="lg" className="size-16">
          {match.avatarUrl && (
            <Avatar.Image src={match.avatarUrl} alt={match.name} />
          )}
          <Avatar.Fallback className="text-xl font-bold">
            {match.name.slice(0, 2).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 inline-flex items-center gap-0.5 text-[11px] font-bold bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 leading-none">
          <IconBolt size={10} />
          {match.matchPct}%
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <p className="font-bold text-foreground text-lg leading-tight">
          {match.name}
        </p>

        <div className="flex flex-wrap gap-4">
          {teach.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1.5">
                They Teach
              </p>
              <div className="flex flex-wrap gap-1">
                {teach.slice(0, 3).map((s) => (
                  <SkillTag key={s} label={s} variant="teach" />
                ))}
              </div>
            </div>
          )}
          {learn.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1.5">
                They Want
              </p>
              <div className="flex flex-wrap gap-1">
                {learn.slice(0, 3).map((s) => (
                  <SkillTag key={s} label={s} variant="learn" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex items-end sm:items-center shrink-0">
        <UserProfileDialog userId={match.id}>
          {(open) => (
            <Button
              onPress={open}
              className="font-semibold bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-2"
            >
              Request Exchange
              <IconArrowRight size={16} />
            </Button>
          )}
        </UserProfileDialog>
      </div>
    </Card>
  );
}
