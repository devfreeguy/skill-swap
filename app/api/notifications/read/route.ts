import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  await db.notification.updateMany({
    where: { userId: currentUser.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
