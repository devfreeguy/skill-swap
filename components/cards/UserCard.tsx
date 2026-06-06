import { Avatar, Button, Card, Chip } from "@heroui/react";
import Link from "next/link";
import { parseSkills } from "@/lib/skills";

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
    <Card className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-accent/30 transition-colors">
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
          {teach.length > 0 && (
            <p className="text-xs text-muted truncate">{teach.slice(0, 2).join(", ")}</p>
          )}
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-col gap-2 text-xs flex-1">
        {teach.length > 0 && (
          <div>
            <p className="uppercase tracking-wider text-muted font-semibold mb-1.5">Teaches</p>
            <div className="flex flex-wrap gap-1">
              {teach.slice(0, 3).map((s) => (
                <Chip key={s} size="sm" color="default">{s}</Chip>
              ))}
              {teach.length > 3 && (
                <Chip size="sm" color="default">+{teach.length - 3}</Chip>
              )}
            </div>
          </div>
        )}
        {learn.length > 0 && (
          <div>
            <p className="uppercase tracking-wider text-muted font-semibold mb-1.5">Wants to Learn</p>
            <div className="flex flex-wrap gap-1">
              {learn.slice(0, 3).map((s) => (
                <Chip key={s} size="sm" className="border border-accent/40 text-accent bg-transparent">{s}</Chip>
              ))}
              {learn.length > 3 && (
                <Chip size="sm" color="default">+{learn.length - 3}</Chip>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/users/${user.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            View Profile
          </Button>
        </Link>
        <Link href={`/users/${user.id}`} className="flex-1">
          <Button
            size="sm"
            className="w-full font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Request Swap
          </Button>
        </Link>
      </div>
    </Card>
  );
}
