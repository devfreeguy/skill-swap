import { NextRequest } from "next/server";
import { getAuthToken } from "./cookies";
import { verifyToken } from "./jwt";
import { getPrisma } from "./prisma";
import { getNetwork } from "./network";
import type { User } from "../app/generated/prisma/client";

export async function getCurrentUser(
  request: NextRequest
): Promise<User | null> {
  const token = getAuthToken(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const db = getPrisma(getNetwork(request));
  return db.user.findUnique({ where: { id: payload.id } });
}
