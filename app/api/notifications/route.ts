import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const notifications = await prisma.notification.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notifications);
}
