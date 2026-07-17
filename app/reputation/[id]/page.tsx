"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PublicHeader from "@/components/layouts/PublicHeader";
import PublicFooter from "@/components/layouts/PublicFooter";
import StatItem from "@/components/profile/StatItem";
import ExchangePair from "@/components/elements/ExchangePair";
import SkillTag from "@/components/elements/SkillTag";
import { parseSkills } from "@/lib/skills";
import { truncateAddress } from "@/lib/utils";
import { Avatar, Button, Chip } from "@heroui/react";
import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconShield,
  IconStar,
  IconTrophy,
} from "@tabler/icons-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProofRecord = {
  id: string;
  teachSkill: string;
  learnSkill: string;
  chainStatus: string | null;
  chainTxHash: string | null;
  network: string | null;
  createdAt: string;
  anchoredAt: string | null;
};

type UserProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  teachSkill: string | null;
  learnSkill: string | null;
  createdAt: string;
  completedSwaps: number;
  proofsEarned: number;
  reputationScore: number;
  proofs: ProofRecord[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function explorerUrl(txHash: string, network: string | null): string {
  const base =
    network === "mainnet"
      ? "https://cardanoscan.io/transaction"
      : "https://preprod.cardanoscan.io/transaction";
  return `${base}/${txHash}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ChainStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case "ANCHORED":
      return (
        <Chip color="success" size="sm">
          <IconCheck size={11} />
          <Chip.Label>Verified on Cardano</Chip.Label>
        </Chip>
      );
    case "ANCHORING":
      return <Chip color="warning" size="sm">Anchoring…</Chip>;
    case "FAILED":
      return <Chip color="danger" size="sm">Failed</Chip>;
    default:
      return <Chip size="sm">Pending</Chip>;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReputationPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setNotFound(true);
        } else {
          setProfile(data as UserProfile);
        }
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (non-secure context)
    }
  }

  if (loading) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-background pt-28 pb-16 flex items-center justify-center">
          <div className="relative w-10 h-10">
            <span className="absolute inset-0 rounded-full border-2 border-accent/20" />
            <span className="absolute inset-0 rounded-full border-t-2 border-accent animate-spin" />
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  if (notFound || !profile) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-background pt-28 pb-16 flex items-center justify-center">
          <p className="text-sm text-muted">Profile not found.</p>
        </main>
        <PublicFooter />
      </>
    );
  }

  const teach = parseSkills(profile.teachSkill);
  const learn = parseSkills(profile.learnSkill);
  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const initials = profile.name.slice(0, 2).toUpperCase();

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-background pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-8">

          {/* ── Identity Card ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col gap-6">

            {/* Avatar + name + skills */}
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
              <Avatar className="size-20 sm:size-24 shrink-0">
                {profile.avatarUrl && (
                  <Avatar.Image src={profile.avatarUrl} alt={profile.name} />
                )}
                <Avatar.Fallback className="text-2xl font-bold">
                  {initials}
                </Avatar.Fallback>
              </Avatar>

              <div className="flex flex-col gap-3 min-w-0">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.name}
                  </h1>
                  <p className="text-sm text-muted mt-0.5">
                    Member since {memberSince}
                  </p>
                </div>

                {(teach.length > 0 || learn.length > 0) && (
                  <div className="flex flex-col gap-2">
                    {teach.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted shrink-0">
                          Teaches
                        </span>
                        {teach.map((s) => (
                          <SkillTag key={s} label={s} variant="teach" />
                        ))}
                      </div>
                    )}
                    {learn.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted shrink-0">
                          Learns
                        </span>
                        {learn.map((s) => (
                          <SkillTag key={s} label={s} variant="learn" />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatItem
                icon={<IconTrophy size={15} className="text-success" />}
                label="Completed Exchanges"
                value={profile.completedSwaps}
              />
              <StatItem
                icon={<IconShield size={15} className="text-accent" />}
                label="Proofs Earned"
                value={profile.proofsEarned}
              />
              <StatItem
                icon={<IconStar size={15} className="text-warning" />}
                label="Reputation Score"
                value={profile.reputationScore}
              />
            </div>

            {/* Copy link */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onPress={copyLink}>
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                {copied ? "Copied!" : "Copy Reputation Link"}
              </Button>
            </div>
          </div>

          {/* ── Verified Exchanges ────────────────────────────────────────── */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Verified Exchanges
            </h2>

            {profile.proofs.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted">
                No verified exchanges yet.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {profile.proofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="rounded-xl border border-border bg-surface p-4 sm:p-5 flex flex-col gap-3"
                  >
                    {/* Skills + status */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <ExchangePair
                        a={proof.teachSkill}
                        b={proof.learnSkill}
                        className="text-sm font-medium text-foreground"
                      />
                      <ChainStatusBadge status={proof.chainStatus} />
                    </div>

                    {/* Date + explorer link */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="text-xs text-muted">
                        {formatDate(proof.createdAt)}
                      </span>

                      {proof.chainStatus === "ANCHORED" &&
                        proof.chainTxHash && (
                          <a
                            href={explorerUrl(
                              proof.chainTxHash,
                              proof.network
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors font-mono"
                          >
                            <IconExternalLink size={11} className="shrink-0" />
                            {truncateAddress(proof.chainTxHash)}
                          </a>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
      <PublicFooter />
    </>
  );
}
