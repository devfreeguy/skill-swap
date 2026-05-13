import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const swaps = await prisma.swap.findMany({
    where: {
      OR: [{ initiatorId: currentUser.id }, { receiverId: currentUser.id }],
    },
    include: {
      initiator: {
        select: { id: true, name: true, avatarUrl: true, teachSkill: true, learnSkill: true },
      },
      receiver: {
        select: { id: true, name: true, avatarUrl: true, teachSkill: true, learnSkill: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(swaps);
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { receiverId, adaTxHash } = body;

  if (!receiverId || !adaTxHash) {
    return NextResponse.json(
      { error: "receiverId and adaTxHash are required" },
      { status: 400 }
    );
  }

  const blockfrostKey = process.env.BLOCKFROST_API_KEY;
  const network = process.env.NEXT_PUBLIC_BLOCKFROST_NETWORK ?? "mainnet";
  if (blockfrostKey) {
    const baseUrl =
      network === "mainnet"
        ? "https://cardano-mainnet.blockfrost.io/api/v0"
        : `https://cardano-${network}.blockfrost.io/api/v0`;
    const txRes = await fetch(`${baseUrl}/txs/${adaTxHash}`, {
      headers: { project_id: blockfrostKey },
    });
    if (!txRes.ok) {
      return NextResponse.json(
        { error: "Invalid or unconfirmed transaction hash" },
        { status: 400 }
      );
    }
  }

  const swap = await prisma.swap.create({
    data: {
      initiatorId: currentUser.id,
      receiverId,
      adaTxHash,
      status: "PENDING",
    },
  });

  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "SWAP_REQUEST",
      message: `${currentUser.name} wants to swap skills with you!`,
    },
  });

  return NextResponse.json(swap, { status: 201 });
}
