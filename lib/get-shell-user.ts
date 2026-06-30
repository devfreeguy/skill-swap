import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import prisma from "./prisma";

export type ShellUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export async function getShellUser(): Promise<ShellUser | null> {
  const store = await cookies();
  const token = store.get("skillswap_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // The JWT carries no avatar, so read the current name + avatar from the DB
  // (also keeps the shell fresh if the user updates their profile).
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { name: true, avatarUrl: true },
  });

  return {
    id: payload.id,
    name: user?.name ?? payload.name,
    avatarUrl: user?.avatarUrl ?? null,
  };
}
