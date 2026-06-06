import { cookies } from "next/headers";
import { verifyToken } from "./jwt";

export type ShellUser = {
  name: string;
  avatarUrl: string | null;
};

export async function getShellUser(): Promise<ShellUser | null> {
  const store = await cookies();
  const token = store.get("skillswap_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return { name: payload.name, avatarUrl: null };
}
