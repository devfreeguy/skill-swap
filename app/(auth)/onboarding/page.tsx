"use client";

import Logo from "@/components/elements/Logo";
import SkillSelector from "@/components/elements/SkillSelector";
import LemniscateLoader from "@/components/layouts/Loader";
import { parseSkills } from "@/lib/skills";
import { truncateAddress } from "@/lib/utils";
import { fadeUp, stagger } from "@/lib/animations";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Input,
  Label,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { IconCamera, IconCircleCheck } from "@tabler/icons-react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const WalletConnectButton = dynamic(
  () => import("@/components/elements/WalletConnectButton"),
  { ssr: false }
);

type SessionUser = {
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  walletAddress?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [teachSkills, setTeachSkills] = useState<string[]>([]);
  const [learnSkills, setLearnSkills] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: SessionUser & { error?: string }) => {
        if (data.error) {
          router.replace("/login");
          return;
        }
        if (data.teachSkill && data.learnSkill) {
          router.replace("/dashboard");
          return;
        }
        setName(data.name ?? "");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatarUrl ?? null);
        setWalletAddress(data.walletAddress ?? null);
        setTeachSkills(parseSkills(data.teachSkill));
        setLearnSkills(parseSkills(data.learnSkill));
        setAuthLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
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
  }

  async function handleSubmit() {
    setError("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!walletAddress) {
      setError("Connect your wallet to continue.");
      return;
    }
    if (teachSkills.length === 0 || learnSkills.length === 0) {
      setError("Add at least one skill to teach and one to learn.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        bio: bio.trim() || null,
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
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return <LemniscateLoader loading text="Loading..." overlayOpacity={1} />;
  }

  const displayAvatar = avatarPreview ?? avatarUrl;
  const initials = (name || "?").slice(0, 2).toUpperCase();

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-4 py-16">
      <LemniscateLoader
        loading={isSubmitting}
        text="Saving..."
        overlayOpacity={1}
      />

      <motion.div
        className="w-full max-w-lg"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <Card className="bg-surface border border-border rounded-2xl p-8 flex flex-col gap-6 overflow-visible">
            <div className="flex justify-center">
              <Logo />
            </div>

            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Complete your profile
              </h1>
              <p className="text-sm text-muted">
                Tell us a bit about yourself and what you want to swap.
              </p>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="size-20">
                {displayAvatar && (
                  <Avatar.Image src={displayAvatar} alt={name} />
                )}
                <Avatar.Fallback className="text-xl font-bold">
                  {initials}
                </Avatar.Fallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              >
                <IconCamera size={13} />
                {displayAvatar ? "Change Avatar" : "Add Avatar"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <TextField
              className="w-full"
              value={name}
              onChange={setName}
              isRequired
            >
              <Label>Full Name</Label>
              <Input className="bg-background" placeholder="Your full name" />
            </TextField>

            <TextField className="w-full" value={bio} onChange={setBio}>
              <Label>Bio</Label>
              <TextArea
                className="bg-background"
                placeholder="A short bio - what you do, what you love teaching…"
                rows={3}
              />
            </TextField>

            <SkillSelector
              label="Skills I Teach"
              selected={teachSkills}
              onChange={setTeachSkills}
            />

            <SkillSelector
              label="Skills I Want to Learn"
              selected={learnSkills}
              onChange={setLearnSkills}
            />

            {/* Wallet - required to use the platform */}
            <div className="flex flex-col gap-2">
              <Label>Wallet</Label>
              {walletAddress ? (
                <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/5 px-4 py-3">
                  <IconCircleCheck size={18} className="text-success shrink-0" />
                  <span className="text-sm text-foreground">
                    Wallet connected
                  </span>
                  <span className="ml-auto text-xs font-mono text-muted">
                    {truncateAddress(walletAddress)}
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted">
                    A Cardano wallet is required - it signs your on-chain swap
                    proofs and secures your messages.
                  </p>
                  <WalletConnectButton
                    mode="link"
                    onLinked={() =>
                      fetch("/api/auth/me")
                        .then((r) => r.json())
                        .then((d) => setWalletAddress(d.walletAddress ?? null))
                        .catch(() => {})
                    }
                  />
                </>
              )}
            </div>

            {error && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            <Button
              onPress={handleSubmit}
              isPending={isSubmitting}
              isDisabled={!walletAddress}
              className="w-full rounded-full bg-accent text-accent-foreground font-semibold"
            >
              {isSubmitting ? "Saving..." : "Continue"}
            </Button>
          </Card>
        </motion.div>
      </motion.div>
    </main>
  );
}
