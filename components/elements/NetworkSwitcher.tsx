"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { useNetworkContext } from "@/components/providers/NetworkProvider";
import type { ActiveNetwork } from "@/lib/network";

/**
 * Pill toggle that switches the active Cardano network (mainnet / preprod).
 * Switching logs the user out — wallet addresses differ per network, so the
 * JWT from one network is not valid on the other.
 */
export default function NetworkSwitcher() {
  const { network, isMainnet } = useNetworkContext();
  const [loading, setLoading] = useState(false);

  async function switchTo(target: ActiveNetwork) {
    if (target === network || loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/switch-network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: target }),
      });
      // Redirect to login — the user must re-authenticate on the new network.
      window.location.href = "/login";
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary p-0.5">
      <Button
        size="sm"
        variant="ghost"
        className={`h-6 px-2.5 text-[10px] font-semibold rounded-md transition-colors ${
          !isMainnet
            ? "bg-warning/20 text-warning"
            : "text-muted hover:text-foreground"
        }`}
        onPress={() => switchTo("preprod")}
        isDisabled={loading}
      >
        Preprod
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className={`h-6 px-2.5 text-[10px] font-semibold rounded-md transition-colors ${
          isMainnet
            ? "bg-success/20 text-success"
            : "text-muted hover:text-foreground"
        }`}
        onPress={() => switchTo("mainnet")}
        isDisabled={loading}
      >
        Mainnet
      </Button>
    </div>
  );
}
