"use client";

import { parseSkills } from "@/lib/skills";
import { scoreMatch } from "@/lib/matching";
import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { CARDANO_LIMIT_NETWORK } from "@/lib/cardano";
import {
  PAYMENTS_ENABLED,
  PLATFORM_WALLET_ADDRESS,
  SWAP_FEE_ADA,
  SWAP_FEE_LOVELACE,
} from "@/lib/cardano/fee";
import SkillTag from "@/components/elements/SkillTag";
import {
  Alert,
  Avatar,
  Button,
  Modal,
  Spinner,
} from "@heroui/react";
import { IconWallet } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

function getAvailableWallets() {
  if (typeof window === "undefined") return [];
  const cardano = (window as unknown as Record<string, unknown>).cardano as Record<string, { name?: string; icon?: string }> | undefined;
  if (!cardano) return [];
  return ["nami", "eternl", "lace", "flint", "vespr", "begin", "typhon"]
    .filter((key) => cardano[key])
    .map((key) => ({ id: key, name: cardano[key].name || key, icon: cardano[key].icon }));
}

type SessionUser = {
  id: string;
  name: string;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

type ProfileUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
  createdAt: string;
};

type Props = {
  userId: string;
  /** Render-prop trigger; call `open()` to show the dialog. */
  children: (open: () => void) => React.ReactNode;
};

/**
 * Opens a user's public profile in a dialog instead of navigating to
 * /users/[id]. Profile + viewer data are fetched lazily on first open so a
 * grid of these costs nothing until a card is actually clicked.
 */
export default function UserProfileDialog({ userId, children }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [me, setMe] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<ProfileUser | null>(null);

  const { enabledWallet, connect } = useCardano({ limitNetwork: CARDANO_LIMIT_NETWORK });
  const [submitting, setSubmitting] = useState(false);
  const [swapError, setSwapError] = useState("");
  const [swapStatus, setSwapStatus] = useState("");
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);

  // The specific skills to exchange, chosen for this request.
  const [offeredSkill, setOfferedSkill] = useState(""); // what I'll teach them
  const [requestedSkill, setRequestedSkill] = useState(""); // what I'll learn

  const open = useCallback(() => {
    setIsOpen(true);
    if (loaded || loading) return;
    setLoading(true);
    setError("");
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch(`/api/users/${userId}`).then((r) => r.json()),
    ])
      .then(([meData, userData]) => {
        if (meData?.error || userData?.error) {
          setError(userData?.error || "Couldn't load this profile.");
          return;
        }
        setMe(meData);
        setProfile(userData);
        // Default the skill pickers to the strongest overlap.
        const m = scoreMatch(meData, userData);
        const mine = parseSkills(meData.teachSkill);
        const theirs = parseSkills(userData.teachSkill);
        setOfferedSkill(m.teachOverlap[0] ?? mine[0] ?? "");
        setRequestedSkill(m.learnOverlap[0] ?? theirs[0] ?? "");
        setLoaded(true);
      })
      .catch(() => setError("Couldn't load this profile."))
      .finally(() => setLoading(false));
  }, [loaded, loading, userId]);

  async function handleConnectWallet(walletId: string) {
    setWalletConnecting(true);
    setSwapError("");
    try {
      await connect(walletId);
    } catch {
      setSwapError("Couldn't connect wallet. Make sure it's unlocked and try again.");
    } finally {
      setWalletConnecting(false);
    }
  }

  async function requestSwap() {
    setSwapError("");
    setSwapStatus("");
    if (!offeredSkill || !requestedSkill) {
      setSwapError("Choose what you'll teach and what you want to learn.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        receiverId: userId,
        initiatorSkill: offeredSkill,
        receiverSkill: requestedSkill,
      };

      // Sign the platform fee with the connected wallet before requesting.
      // It's refunded only if this person declines.
      if (PAYMENTS_ENABLED) {
        if (!enabledWallet) {
          setSwapError("Connect your Cardano wallet above to pay the swap fee, then try again.");
          return;
        }
        setSwapStatus(
          `Approve the ${SWAP_FEE_ADA} ADA fee in your wallet…`
        );
        try {
          const { buildAndSignFeeTx } = await import("@/lib/cardano/fee-client");
          const { signedTx, refundAddress } = await buildAndSignFeeTx({
            walletName: enabledWallet,
            toAddress: PLATFORM_WALLET_ADDRESS,
            lovelace: String(SWAP_FEE_LOVELACE),
          });
          payload.signedPaymentTx = signedTx;
          payload.refundAddress = refundAddress;
        } catch {
          setSwapError(
            "Couldn't sign the fee payment. Make sure your wallet is unlocked and has enough ADA, then try again."
          );
          return;
        }
        setSwapStatus("Submitting your request…");
      }

      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSwapError(data.error || "Failed to create swap request.");
        return;
      }
      setSwapSuccess(true);
      setTimeout(() => router.push(`/swaps/${data.id}`), 1000);
    } catch {
      setSwapError("Something went wrong.");
    } finally {
      setSubmitting(false);
      setSwapStatus("");
    }
  }

  const teach = profile ? parseSkills(profile.teachSkill) : [];
  const learn = profile ? parseSkills(profile.learnSkill) : [];
  const mySkills = me ? parseSkills(me.teachSkill) : [];
  const match = me && profile ? scoreMatch(me, profile) : null;
  const isOwnProfile = !!(me && profile && me.id === profile.id);
  const joinedDate = profile
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <>
      {children(open)}

      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        variant="blur"
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />

            {loading || (!profile && !error) ? (
              <div className="flex items-center justify-center py-16">
                <Spinner />
              </div>
            ) : error || !profile ? (
              <div className="p-8 text-center text-muted text-sm">
                {error || "User not found."}
              </div>
            ) : (
              <>
                <Modal.Header>
                  <div className="flex items-start gap-4">
                    <Avatar size="lg">
                      {profile.avatarUrl && (
                        <Avatar.Image
                          src={profile.avatarUrl}
                          alt={profile.name}
                        />
                      )}
                      <Avatar.Fallback className="text-lg font-semibold">
                        {profile.name.slice(0, 2).toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar>
                    <div className="flex-1">
                      <Modal.Heading>{profile.name}</Modal.Heading>
                      <p className="text-sm text-muted">Joined {joinedDate}</p>
                      {!isOwnProfile && match && match.type !== "DISCOVERY" && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none mt-2 ${
                            match.type === "PERFECT_MATCH"
                              ? "bg-success/10 text-success border border-success/20"
                              : "bg-accent/10 text-accent border border-accent/20"
                          }`}
                        >
                          {match.type === "PERFECT_MATCH"
                            ? "Perfect Match"
                            : "Strong Match"}
                        </span>
                      )}
                    </div>
                  </div>
                </Modal.Header>

                <Modal.Body className="flex flex-col gap-5">
                  {profile.bio && (
                    <p className="text-sm text-muted leading-relaxed">
                      {profile.bio}
                    </p>
                  )}

                  {teach.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">
                        Teaches
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {teach.map((s) => (
                          <SkillTag key={s} label={s} variant="teach" size="md" />
                        ))}
                      </div>
                    </div>
                  )}

                  {learn.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">
                        Wants to learn
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {learn.map((s) => (
                          <SkillTag key={s} label={s} variant="learn" size="md" />
                        ))}
                      </div>
                    </div>
                  )}

                  {!isOwnProfile &&
                    match &&
                    (match.learnOverlap.length > 0 ||
                      match.teachOverlap.length > 0) && (
                      <div className="bg-background rounded-xl p-4 flex flex-col gap-2 text-sm">
                        {match.learnOverlap.length > 0 && (
                          <p className="text-muted">
                            <span className="text-foreground font-medium">
                              {profile.name}
                            </span>{" "}
                            can teach you:{" "}
                            <span className="text-accent-foreground">
                              {match.learnOverlap.join(", ")}
                            </span>
                          </p>
                        )}
                        {match.teachOverlap.length > 0 && (
                          <p className="text-muted">
                            You can teach{" "}
                            <span className="text-foreground font-medium">
                              {profile.name}
                            </span>
                            :{" "}
                            <span className="text-accent-foreground">
                              {match.teachOverlap.join(", ")}
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                  {/* Choose the exact skills to exchange in this swap */}
                  {!isOwnProfile && (
                    <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-foreground">
                          What do you want to learn from {profile.name}?
                        </p>
                        {teach.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {teach.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setRequestedSkill(s)}
                                className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm transition-colors ${
                                  requestedSkill === s
                                    ? "border-accent bg-accent/10 text-accent font-medium"
                                    : "border-border text-muted hover:text-foreground"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted">
                            {profile.name} hasn&apos;t listed any skills to teach.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-foreground">
                          What will you teach {profile.name}?
                        </p>
                        {mySkills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {mySkills.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setOfferedSkill(s)}
                                className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm transition-colors ${
                                  offeredSkill === s
                                    ? "border-accent bg-accent/10 text-accent font-medium"
                                    : "border-border text-muted hover:text-foreground"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted">
                            You haven&apos;t listed any skills to teach.{" "}
                            <button
                              type="button"
                              onClick={() => router.push("/onboarding")}
                              className="text-accent hover:underline"
                            >
                              Add some
                            </button>
                            .
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!isOwnProfile && PAYMENTS_ENABLED && (
                    enabledWallet ? (
                      <p className="text-xs text-muted">
                        A {SWAP_FEE_ADA} ADA platform fee keeps SkillSwap running.
                        It&apos;s refunded in full only if {profile.name} declines.
                      </p>
                    ) : (
                      <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <IconWallet size={15} className="text-muted shrink-0" />
                          <p className="text-sm font-medium text-foreground">
                            Connect wallet to pay the {SWAP_FEE_ADA} ADA fee
                          </p>
                        </div>
                        <p className="text-xs text-muted">
                          The fee is refunded if {profile.name} declines your request.
                        </p>
                        {(() => {
                          const wallets = getAvailableWallets();
                          return wallets.length === 0 ? (
                            <p className="text-xs text-muted">
                              No Cardano wallets found. Install Nami, Eternl, or Lace and reload.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {wallets.map((w) => (
                                <button
                                  key={w.id}
                                  type="button"
                                  disabled={walletConnecting}
                                  onClick={() => handleConnectWallet(w.id)}
                                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface-secondary transition-colors text-left cursor-pointer disabled:opacity-50"
                                >
                                  {w.icon && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={w.icon} alt={w.name} width={22} height={22} className="rounded-md shrink-0" />
                                  )}
                                  <span className="text-sm font-medium text-foreground">{w.name}</span>
                                  {walletConnecting && <Spinner size="sm" className="ml-auto" />}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )
                  )}

                  {swapStatus && (
                    <Alert status="accent">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{swapStatus}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}
                  {swapError && (
                    <Alert status="danger">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{swapError}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}
                  {swapSuccess && (
                    <Alert status="success">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>
                          Swap request sent! Redirecting…
                        </Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}
                </Modal.Body>

                <Modal.Footer>
                  <Button slot="close" variant="secondary">
                    Close
                  </Button>
                  {isOwnProfile ? (
                    <Button onPress={() => router.push("/onboarding")}>
                      Edit Your Skills
                    </Button>
                  ) : (
                    <Button
                      onPress={requestSwap}
                      isPending={submitting}
                      isDisabled={swapSuccess || (PAYMENTS_ENABLED && !enabledWallet)}
                      className="bg-accent text-accent-foreground font-semibold"
                    >
                      {PAYMENTS_ENABLED && !enabledWallet ? "Connect Wallet First" : "Request Swap"}
                    </Button>
                  )}
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
