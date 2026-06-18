"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import { parseSkills } from "@/lib/skills";
import { scoreMatch } from "@/lib/matching";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  Modal,
  Surface,
} from "@heroui/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

type ProfileUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
  createdAt: string;
};

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [me, setMe] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [swapError, setSwapError] = useState("");
  const [swapSuccess, setSwapSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch(`/api/users/${userId}`).then((r) => r.json()),
    ])
      .then(([me, user]) => {
        if (me.error) { router.replace("/login"); return; }
        if (user.error) { setNotFound(true); setLoading(false); return; }
        setMe(me);
        setProfile(user);
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router, userId]);

  async function requestSwap() {
    setSwapError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId }),
      });
      const data = await res.json();
      if (!res.ok) { setSwapError(data.error || "Failed to create swap request."); return; }
      setSwapSuccess(true);
      setTimeout(() => router.push(`/swaps/${data.id}`), 1200);
    } catch {
      setSwapError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LemniscateLoader loading text="Loading..." overlayOpacity={1} />;
  if (!me) return null;

  if (notFound || !profile) {
    return (
      <main className="flex-1 px-6 py-16 text-center">
        <p className="text-muted">User not found.</p>
      </main>
    );
  }

  const teach = parseSkills(profile.teachSkill);
  const learn = parseSkills(profile.learnSkill);
  const match = scoreMatch(me, profile);
  const isOwnProfile = me.id === profile.id;
  const joinedDate = new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <main className="flex-1 px-6 py-6 flex flex-col gap-6 max-w-2xl">
      <Card className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar size="lg">
            {profile.avatarUrl && <Avatar.Image src={profile.avatarUrl} alt={profile.name} />}
            <Avatar.Fallback className="text-lg font-semibold">{profile.name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
            <p className="text-sm text-muted">Joined {joinedDate}</p>
            {!isOwnProfile && match.type !== "DISCOVERY" && (
              <Chip size="sm" color={match.type === "PERFECT_MATCH" ? "success" : "accent"} className="mt-2">
                {match.type === "PERFECT_MATCH" ? "Perfect Match" : "Strong Match"}
              </Chip>
            )}
          </div>
        </div>

        {/* Skills */}
        {teach.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Teaches</p>
            <div className="flex flex-wrap gap-2">
              {teach.map((s) => <Chip key={s} color="accent">{s}</Chip>)}
            </div>
          </div>
        )}
        {learn.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Wants to learn</p>
            <div className="flex flex-wrap gap-2">
              {learn.map((s) => <Chip key={s} color="success">{s}</Chip>)}
            </div>
          </div>
        )}

        {/* Match insight */}
        {!isOwnProfile && (match.learnOverlap.length > 0 || match.teachOverlap.length > 0) && (
          <div className="bg-background rounded-xl p-4 flex flex-col gap-2 text-sm">
            {match.learnOverlap.length > 0 && (
              <p className="text-muted">
                <span className="text-foreground font-medium">{profile.name}</span> can teach you:{" "}
                <span className="text-accent-foreground">{match.learnOverlap.join(", ")}</span>
              </p>
            )}
            {match.teachOverlap.length > 0 && (
              <p className="text-muted">
                You can teach <span className="text-foreground font-medium">{profile.name}</span>:{" "}
                <span className="text-accent-foreground">{match.teachOverlap.join(", ")}</span>
              </p>
            )}
          </div>
        )}

        {/* Request Swap */}
        {!isOwnProfile && (
          <Modal>
            <Button className="w-full rounded-full bg-accent text-accent-foreground font-semibold">Request Swap</Button>
            <Modal.Backdrop>
              <Modal.Container placement="auto">
                <Modal.Dialog className="sm:max-w-md">
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>Request Swap with {profile.name}</Modal.Heading>
                    <p className="mt-1.5 text-sm text-muted">Send a swap request to {profile.name}. They&apos;ll be notified and can accept or decline.</p>
                  </Modal.Header>
                  <Modal.Body className="p-6">
                    <Surface variant="default">
                      <div className="flex flex-col gap-4">
                        {swapError && (
                          <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Description>{swapError}</Alert.Description></Alert.Content></Alert>
                        )}
                        {swapSuccess && (
                          <Alert status="success"><Alert.Indicator /><Alert.Content><Alert.Description>Swap request sent! Redirecting…</Alert.Description></Alert.Content></Alert>
                        )}
                      </div>
                    </Surface>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button slot="close" variant="secondary">Cancel</Button>
                    <Button onPress={requestSwap} isPending={submitting} isDisabled={swapSuccess}>Send Request</Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        )}

        {isOwnProfile && (
          <Button variant="secondary" className="w-full" onPress={() => router.push("/onboarding")}>Edit Your Skills</Button>
        )}
      </Card>
    </main>
  );
}
