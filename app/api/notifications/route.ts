import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  const notifications = await db.notification.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notifications);
}
