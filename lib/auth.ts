import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthToken } from "./cookies";
import { verifyToken } from "./jwt";
import prisma from "./prisma";
import type { User } from "../app/generated/prisma/client";

export async function getCurrentUser(
  request: NextRequest
): Promise<User | null> {
  const token = getAuthToken(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
