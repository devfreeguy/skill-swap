"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import SkillSelector from "@/components/elements/SkillSelector";
import ThemeToggle from "@/components/elements/ThemeToggle";
import WalletConnectButton from "@/components/elements/WalletConnectButton";
import { parseSkills } from "@/lib/skills";
import { truncateAddress } from "@/lib/utils";
import StatItem from "@/components/profile/StatItem";
import {
  Avatar,
  Button,
  Card,
  Input,
  Label,
  Separator,
  TextField,
  toast,
} from "@heroui/react";
import {
  IconCalendar,
  IconCamera,
  IconShield,
  IconStar,
  IconTrophy,
  IconWallet,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileData = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  teachSkill: string | null;
  learnSkill: string | null;
  walletAddress: string | null;
  createdAt: string;
  completedSwaps: number;
  proofsEarned: number;
  reputationScore: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teachSkills, setTeachSkills] = useState<string[]>([]);
  const [learnSkills, setLearnSkills] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/profile")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          router.replace("/login");
          return;
        }
        setProfile(data);
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        setTeachSkills(parseSkills(data.teachSkill));
        setLearnSkills(parseSkills(data.learnSkill));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = useMemo(() => {
    if (!profile) return false;
    if (avatarFile) return true;
    if (name !== (profile.name ?? "")) return true;
    if (email !== (profile.email ?? "")) return true;
    if (!arraysEqual(teachSkills, parseSkills(profile.teachSkill))) return true;
    if (!arraysEqual(learnSkills, parseSkills(profile.learnSkill))) return true;
    return false;
  }, [profile, name, email, teachSkills, learnSkills, avatarFile]);

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const validTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.danger("Please select a PNG, JPG, or WEBP image.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.danger("Image must be under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setAvatarPreview(dataUrl);
        setAvatarFile(dataUrl);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    []
  );

  const handleCancel = useCallback(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setEmail(profile.email ?? "");
    setTeachSkills(parseSkills(profile.teachSkill));
    setLearnSkills(parseSkills(profile.learnSkill));
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [profile]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name,
        email: email || null,
        teachSkills,
        learnSkills,
      };
      if (avatarFile) body.avatarFile = avatarFile;

      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.danger(data.error || "Failed to save changes.");
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: data.name,
              email: data.email,
              avatarUrl: data.avatarUrl,
              teachSkill: data.teachSkill,
              learnSkill: data.learnSkill,
            }
          : prev
      );
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Profile updated successfully.");
    } catch {
      toast.danger("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [name, email, teachSkills, learnSkills, avatarFile]);

  const handleDisconnectWallet = useCallback(async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/users/wallet", { method: "DELETE" });
      if (!res.ok) {
        toast.danger("Failed to disconnect wallet.");
        return;
      }
      setProfile((prev) => (prev ? { ...prev, walletAddress: null } : prev));
      toast.success("Wallet disconnected.");
    } catch {
      toast.danger("Something went wrong.");
    } finally {
      setDisconnecting(false);
    }
  }, []);

  if (loading) {
    return <LemniscateLoader loading text="Loading…" overlayOpacity={1} />;
  }
  if (!profile) return null;

  const displayAvatar = avatarPreview ?? profile.avatarUrl;
  const initials = profile.name.slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 flex flex-col gap-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profile</h1>
            <p className="text-sm text-muted mt-0.5">
              Manage your profile and skills.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              isDisabled={!isDirty || saving}
              onPress={handleCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              isPending={saving}
              isDisabled={!isDirty}
              onPress={handleSave}
            >
              Save Changes
            </Button>
          </div>
        </div>

        {/* ── Section 1: Profile Information ──────────────────────────────── */}
        <Card className="shadow-sm bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-5">
            Profile Information
          </h2>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <Avatar className="size-20">
                {displayAvatar && (
                  <Avatar.Image src={displayAvatar} alt={profile.name} />
                )}
                <Avatar.Fallback className="text-xl font-bold">
                  {initials}
                </Avatar.Fallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              >
                <IconCamera size={13} />
                Change Avatar
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField className="w-full" value={name} onChange={setName}>
                <Label className="text-xs font-medium uppercase tracking-wide text-muted">
                  Full Name
                </Label>
                <Input className="bg-background" placeholder="Your full name" />
              </TextField>

              <TextField
                className="w-full"
                type="email"
                value={email}
                onChange={setEmail}
              >
                <Label className="text-xs font-medium uppercase tracking-wide text-muted">
                  Email Address
                </Label>
                <Input className="bg-background" placeholder="Add an email" />
              </TextField>
            </div>
          </div>
        </Card>

        {/* ── Sections 2 + 3: Skills ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Skills I Teach
            </h2>
            <SkillSelector
              label="What can you teach?"
              selected={teachSkills}
              onChange={setTeachSkills}
            />
          </Card>

          <Card className="shadow-sm bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Skills I Want to Learn
            </h2>
            <SkillSelector
              label="What do you want to learn?"
              selected={learnSkills}
              onChange={setLearnSkills}
            />
          </Card>
        </div>

        {/* ── Sections 4 + 5: Account + Stats ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 4 - Account */}
          <Card className="shadow-sm bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Account
            </h2>

            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted mb-3">
                Connected Wallet
              </p>

              {profile.walletAddress ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <IconWallet size={16} className="text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Cardano Wallet
                      </p>
                      <p className="text-xs text-muted font-mono truncate">
                        {truncateAddress(profile.walletAddress)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    isPending={disconnecting}
                    onPress={handleDisconnectWallet}
                    className="shrink-0"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-background border border-border">
                  <WalletConnectButton
                    mode="link"
                    onLinked={() => {
                      // Re-fetch profile to show the newly linked wallet address.
                      fetch("/api/users/profile")
                        .then((r) => r.json())
                        .then((data) => {
                          if (data.error) return;
                          setProfile(data);
                        })
                        .catch(() => {});
                    }}
                  />
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Appearance
              </p>
              <ThemeToggle />
            </div>

            <Separator className="my-4" />

            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted mb-2">
                Member ID
              </p>
              <p className="text-xs font-mono text-muted/60 truncate">
                {profile.id}
              </p>
            </div>
          </Card>

          {/* Section 5 - Exchange Statistics */}
          <Card className="shadow-sm bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Exchange Statistics
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatItem
                icon={<IconTrophy size={15} className="text-success" />}
                label="Completed"
                value={profile.completedSwaps}
              />
              <StatItem
                icon={<IconShield size={15} className="text-accent" />}
                label="Proofs Earned"
                value={profile.proofsEarned}
              />
              <StatItem
                icon={<IconStar size={15} className="text-warning" />}
                label="Reputation"
                value={profile.reputationScore}
              />
              <StatItem
                icon={<IconCalendar size={15} className="text-muted" />}
                label="Member Since"
                value={formatMemberSince(profile.createdAt)}
              />
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

