import { Avatar, Card, Chip, Separator } from "@heroui/react";
import { parseSkills } from "@/lib/skills";

type Participant = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

/** A swap participant with their teaching/learning skills and role. */
export default function ParticipantCard({
  participant,
  role,
}: {
  participant: Participant;
  role: "Initiator" | "Receiver";
}) {
  const teach = parseSkills(participant.teachSkill);
  const learn = parseSkills(participant.learnSkill);

  return (
    <Card className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar size="md">
          {participant.avatarUrl && (
            <Avatar.Image src={participant.avatarUrl} alt={participant.name} />
          )}
          <Avatar.Fallback className="text-sm font-semibold">
            {participant.name.slice(0, 2).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{participant.name}</p>
          <p className="text-xs text-muted">{role}</p>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-2">
            Teaching
          </p>
          <div className="flex flex-wrap gap-1">
            {teach.length > 0 ? (
              teach.map((s) => (
                <Chip key={s} size="sm">
                  {s}
                </Chip>
              ))
            ) : (
              <span className="text-xs text-muted">-</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-2">
            Learning
          </p>
          <div className="flex flex-wrap gap-1">
            {learn.length > 0 ? (
              learn.map((s) => (
                <Chip
                  key={s}
                  size="sm"
                  className="border border-success/40 text-success"
                >
                  {s}
                </Chip>
              ))
            ) : (
              <span className="text-xs text-muted">-</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
