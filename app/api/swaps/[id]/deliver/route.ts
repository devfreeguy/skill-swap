import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { uploadDeliverable } from "@/lib/cloudinary";
import { emitToSwap } from "@/lib/socket";
import type { DeliverableType } from "@/app/generated/prisma/client";

const VALID_TYPES: DeliverableType[] = [
  "LINK",
  "FILE",
  "IMAGE",
  "DOCUMENT",
  "TEXT",
];

/**
 * Add a deliverable to a swap. A participant can add MANY deliverables of
 * varying types - these are the concrete outcomes of the exchange. Adding a
 * deliverable never completes the swap; completion is a separate, explicit
 * two-sided confirmation (PATCH /api/swaps/[id] { action: "complete" }).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  const { id } = await params;
  const body = await request.json();
  const {
    type = "LINK",
    title,
    resourceLink,
    notes,
    file,
    fileName,
    fileSize,
    mimeType,
  } = body as {
    type?: DeliverableType;
    title?: string;
    resourceLink?: string;
    notes?: string;
    file?: string; // base64 data URL for uploads
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };

  const swap = await db.swap.findUnique({ where: { id } });
  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  if (swap.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Swap must be active to add deliverables" },
      { status: 400 }
    );
  }

  const isParticipant =
    swap.initiatorId === currentUser.id || swap.receiverId === currentUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dtype: DeliverableType = VALID_TYPES.includes(type as DeliverableType)
    ? (type as DeliverableType)
    : "LINK";
  const isFileType =
    dtype === "IMAGE" || dtype === "FILE" || dtype === "DOCUMENT";

  // Each deliverable needs content: TEXT carries notes, LINK a URL, and file
  // types either an uploaded file or a pre-existing URL.
  if (dtype === "TEXT") {
    if (!notes || !notes.trim()) {
      return NextResponse.json(
        { error: "Add some text for this deliverable." },
        { status: 400 }
      );
    }
  } else if (dtype === "LINK") {
    if (!resourceLink || !resourceLink.trim()) {
      return NextResponse.json(
        { error: "A link is required for this deliverable." },
        { status: 400 }
      );
    }
  } else if (isFileType && !file && !resourceLink?.trim()) {
    return NextResponse.json(
      { error: "A file is required for this deliverable." },
      { status: 400 }
    );
  }

  // Upload file-type deliverables to Cloudinary; the secure URL becomes the link.
  let finalResourceLink = resourceLink?.trim() || null;
  if (isFileType && file) {
    try {
      const resourceType = dtype === "IMAGE" ? "image" : "raw";
      const { url } = await uploadDeliverable(
        file,
        id,
        currentUser.id,
        resourceType
      );
      finalResourceLink = url;
    } catch {
      return NextResponse.json(
        { error: "File upload failed. Please try again." },
        { status: 502 }
      );
    }
  }

  const delivery = await db.delivery.create({
    data: {
      swapId: id,
      userId: currentUser.id,
      type: dtype,
      title: title?.trim() || null,
      resourceLink: finalResourceLink,
      notes: notes?.trim() || null,
      fileName: fileName || null,
      fileSize: fileSize ?? null,
      mimeType: mimeType || null,
    },
  });

  await db.message.create({
    data: {
      swapId: id,
      senderId: currentUser.id,
      content: "Deliverable submitted",
      type: "DELIVERABLE_SUBMITTED",
    },
  });

  emitToSwap(id, "swap:update");

  return NextResponse.json(delivery, { status: 201 });
}

/** Remove one of your own deliverables (only while the swap is active). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  const { id } = await params;
  const deliveryId = request.nextUrl.searchParams.get("deliveryId");
  if (!deliveryId) {
    return NextResponse.json(
      { error: "deliveryId is required" },
      { status: 400 }
    );
  }

  const [swap, delivery] = await Promise.all([
    db.swap.findUnique({ where: { id } }),
    db.delivery.findUnique({ where: { id: deliveryId } }),
  ]);

  if (!delivery || delivery.swapId !== id) {
    return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
  }
  if (delivery.userId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (swap?.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Can only remove deliverables while the swap is active" },
      { status: 400 }
    );
  }

  await db.delivery.delete({ where: { id: deliveryId } });
  emitToSwap(id, "swap:update");
  return NextResponse.json({ success: true });
}

/** List the current user's deliverables for this swap. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  const { id } = await params;

  const swap = await db.swap.findUnique({ where: { id } });
  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  const isParticipant =
    swap.initiatorId === currentUser.id || swap.receiverId === currentUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deliveries = await db.delivery.findMany({
    where: { swapId: id, userId: currentUser.id },
    orderBy: { submittedAt: "asc" },
  });

  return NextResponse.json(deliveries);
}
