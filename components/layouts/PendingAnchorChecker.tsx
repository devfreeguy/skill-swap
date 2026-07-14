"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AnchorProofModal from "@/components/swap/AnchorProofModal";

type PendingProof = {
  swapId: string;
  metadataHash: string;
  network: string;
  chainStatus: string;
};

export default function PendingAnchorChecker() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<PendingProof[]>([]);

  async function fetchPending() {
    try {
      const r = await fetch("/api/proofs/pending");
      const data: unknown = await r.json();
      if (Array.isArray(data)) setQueue(data as PendingProof[]);
    } catch {}
  }

  // Re-fetch on every navigation so anchored proofs drop out immediately
  // (the API only returns PENDING / FAILED, never ANCHORING / ANCHORED).
  useEffect(() => {
    fetchPending();
  }, [pathname]);

  // The swap detail page shows its own anchor modal for the currently open
  // swap — skip that one to avoid two modals at once.
  const currentSwapId = pathname.match(/\/swaps\/([^/]+)/)?.[1];
  const current = queue.find((p) => p.swapId !== currentSwapId) ?? null;

  if (!current) return null;

  return (
    <AnchorProofModal
      swapId={current.swapId}
      metadataHash={current.metadataHash}
      network={current.network}
      isOpen
      onSubmitted={fetchPending}
    />
  );
}
