import { Avatar, Button, Card } from "@heroui/react";
import { parseSkills } from "@/lib/skills";
import SkillTag from "@/components/elements/SkillTag";
import dynamic from "next/dynamic";
const UserProfileDialog = dynamic(
  () => import("@/components/users/UserProfileDialog"),
  { ssr: false }
);

export type UserCardData = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

type Props = {
  user: UserCardData;
};

export default function UserCard({ user }: Props) {
  const teach = parseSkills(user.teachSkill);
  const learn = parseSkills(user.learnSkill);

  return (
    <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-accent/30 transition-[box-shadow,transform,border-color] duration-200">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar size="md">
          {user.avatarUrl && (
            <Avatar.Image src={user.avatarUrl} alt={user.name} />
          )}
          <Avatar.Fallback className="font-semibold">
            {user.name.slice(0, 2).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{user.name}</p>
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-col gap-2.5 flex-1">
        {teach.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1.5">
              Teaches
            </p>
            <div className="flex flex-wrap gap-1.5">
              {teach.slice(0, 3).map((s) => (
                <SkillTag key={s} label={s} variant="teach" />
              ))}
              {teach.length > 3 && (
                <SkillTag label={`+${teach.length - 3}`} variant="neutral" />
              )}
            </div>
          </div>
        )}
        {learn.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1.5">
              Wants to Learn
            </p>
            <div className="flex flex-wrap gap-1.5">
              {learn.slice(0, 3).map((s) => (
                <SkillTag key={s} label={s} variant="learn" />
              ))}
              {learn.length > 3 && (
                <SkillTag label={`+${learn.length - 3}`} variant="neutral" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <UserProfileDialog userId={user.id}>
        {(open) => (
          <div className="flex gap-2">
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
              Request Swap
            </Button>
          </div>
        )}
      </UserProfileDialog>
    </Card>
  );
}
