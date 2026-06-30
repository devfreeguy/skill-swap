import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const { id } = await params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (notification.userId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return NextResponse.json(updated);
}
