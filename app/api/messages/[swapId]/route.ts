import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { uploadMessageFile } from "@/lib/cloudinary";
import { emitToUser, emitToSwap } from "@/lib/socket";
import { MessageType } from "@/app/generated/prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ swapId: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const { swapId } = await params;

  const swap = await prisma.swap.findUnique({
    where: { id: swapId },
    include: {
      initiator: {
        select: { id: true, name: true, avatarUrl: true, publicKey: true },
      },
      receiver: {
        select: { id: true, name: true, avatarUrl: true, publicKey: true },
      },
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
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

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
    ciphertext,
    nonce,
    senderPublicKey,
  } = body as {
    content?: string;
    type?: string;
    fileData?: string;
    fileName?: string;
    fileSize?: number;
    ciphertext?: string;
    nonce?: string;
    senderPublicKey?: string;
  };

  // Either plaintext content (files/legacy) or an encrypted payload is required.
  if (!content && !ciphertext) {
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
      content: content ?? "",
      type: type as MessageType,
      ...(ciphertext && { ciphertext }),
      ...(nonce && { nonce }),
      ...(senderPublicKey && { senderPublicKey }),
      ...(fileUrl && { fileUrl }),
      ...(fileName && { fileName }),
      ...(fileSize !== undefined && { fileSize }),
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Real-time fan-out: deliver to the open conversation, and notify the
  // recipient's personal channel for the inbox badge + toast.
  const recipientId =
    swap.initiatorId === currentUser.id ? swap.receiverId : swap.initiatorId;
  emitToSwap(swapId, "message:new", message);
  emitToUser(recipientId, "message:notify", {
    swapId,
    messageId: message.id,
    senderName: currentUser.name,
  });

  return NextResponse.json(message, { status: 201 });
}
