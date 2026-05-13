import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nonce = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: currentUser.id },
    data: { walletNonce: nonce },
  });

  return NextResponse.json({ nonce });
}
