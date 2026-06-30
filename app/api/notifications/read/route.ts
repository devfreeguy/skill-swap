import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  await prisma.notification.updateMany({
    where: { userId: currentUser.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
