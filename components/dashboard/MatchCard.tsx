import { Avatar, Button, Card, Chip, Separator } from "@heroui/react";
import { IconBolt } from "@tabler/icons-react";
import { parseSkills } from "@/lib/skills";
import { matchPercent } from "@/lib/utils";
import UserProfileDialog from "@/components/users/UserProfileDialog";

export type MatchCardData = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
  score: number;
};

export default function MatchCard({ match }: { match: MatchCardData }) {
  const pct = matchPercent(match.score);
  const teachSkills = parseSkills(match.teachSkill);
  const learnSkills = parseSkills(match.learnSkill);

  return (
    <Card className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-accent/40 transition-colors">
      <div className="flex justify-end">
        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-surface border border-accent/40 text-accent rounded-full px-2.5 py-1">
          <IconBolt size={12} />
          {pct}% Match
        </span>
      </div>
      <div className="flex items-center gap-3 -mt-2">
        <Avatar size="md">
          {match.avatarUrl && (
            <Avatar.Image src={match.avatarUrl} alt={match.name} />
          )}
          <Avatar.Fallback className="font-semibold">
            {match.name.slice(0, 2).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{match.name}</p>
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-3 text-xs">
        {teachSkills.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="uppercase tracking-wider text-muted font-semibold w-14 shrink-0">
              Teaches
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {teachSkills.slice(0, 2).map((s) => (
                <Chip key={s} size="sm" color="default" className="text-xs">
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {learnSkills.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="uppercase tracking-wider text-muted font-semibold w-14 shrink-0">
              Wants
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-accent font-medium">
                {learnSkills.slice(0, 2).join(", ")}
              </span>
            </div>
          </div>
        )}
      </div>
      <UserProfileDialog userId={match.id}>
        {(open) => (
          <div className="flex gap-2 mt-auto">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onPress={open}
            >
              View Profile
            </Button>
            <Button
              size="sm"
              className="flex-1 font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
              onPress={open}
            >
              Request
            </Button>
          </div>
        )}
      </UserProfileDialog>
    </Card>
  );
}
