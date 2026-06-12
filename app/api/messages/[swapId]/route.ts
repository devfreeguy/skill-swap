import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { uploadMessageFile } from "@/lib/cloudinary";
import { MessageType } from "@/app/generated/prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ swapId: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { swapId } = await params;

  const swap = await prisma.swap.findUnique({
    where: { id: swapId },
    include: {
      initiator: { select: { id: true, name: true, avatarUrl: true } },
      receiver: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  const isParticipant =
    swap.initiatorId === currentUser.id || swap.receiverId === currentUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { swapId },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ swap, messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ swapId: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { swapId } = await params;

  const swap = await prisma.swap.findUnique({ where: { id: swapId } });
  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  if (swap.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Cannot send messages on inactive swaps" },
      { status: 400 }
    );
  }

  const isParticipant =
    swap.initiatorId === currentUser.id || swap.receiverId === currentUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    content,
    type = "TEXT",
    fileData,
    fileName,
    fileSize,
  } = body as {
    content: string;
    type?: string;
    fileData?: string;
    fileName?: string;
    fileSize?: number;
  };

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const allowedTypes: string[] = [
    MessageType.TEXT,
    MessageType.LINK,
    MessageType.IMAGE,
    MessageType.DOCUMENT,
  ];
  if (!allowedTypes.includes(type)) {
    return NextResponse.json(
      { error: "Invalid message type" },
      { status: 400 }
    );
  }

  let fileUrl: string | undefined;

  if (type === MessageType.IMAGE || type === MessageType.DOCUMENT) {
    if (!fileData) {
      return NextResponse.json(
        { error: "fileData is required for IMAGE and DOCUMENT messages" },
        { status: 400 }
      );
    }

    const tempId = `${swapId}-${Date.now()}`;
    const resourceType = type === MessageType.IMAGE ? "image" : "raw";
    const uploaded = await uploadMessageFile(fileData, tempId, resourceType);
    fileUrl = uploaded.url;
  }

  const message = await prisma.message.create({
    data: {
      swapId,
      senderId: currentUser.id,
      content,
      type: type as MessageType,
      ...(fileUrl && { fileUrl }),
      ...(fileName && { fileName }),
      ...(fileSize !== undefined && { fileSize }),
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(message, { status: 201 });
}
