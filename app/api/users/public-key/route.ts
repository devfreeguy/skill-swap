import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";

/** Store the caller's E2E messaging public key so partners can encrypt to them. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  const { publicKey } = (await request.json()) as { publicKey?: string };
  if (!publicKey || typeof publicKey !== "string") {
    return NextResponse.json({ error: "publicKey is required" }, { status: 400 });
  }

  await db.user.update({
    where: { id: currentUser.id },
    data: { publicKey },
  });

  return NextResponse.json({ success: true });
}
