"use client";

import { Switch } from "@heroui/react";
import { useNetworkContext } from "@/components/providers/NetworkProvider";
import { useState } from "react";
import type { ActiveNetwork } from "@/lib/network";

export default function NetworkToggle() {
  const { isMainnet, setNetwork } = useNetworkContext();
  const [switching, setSwitching] = useState(false);

  async function handleToggle(selected: boolean) {
    if (switching) return;
    setSwitching(true);
    const next: ActiveNetwork = selected ? "mainnet" : "preprod";
    await setNetwork(next);
    window.location.reload();
  }

  return (
    <div className="mx-2 px-3 py-2 rounded-lg bg-background border border-border flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <span
          className={`size-1.5 rounded-full shrink-0 ${
            isMainnet ? "bg-success" : "bg-warning"
          }`}
        />
        <span className="text-[11px] font-medium text-muted">
          {isMainnet ? "Mainnet" : "Preprod"}
        </span>
      </div>
      <Switch
        isSelected={isMainnet}
        onChange={handleToggle}
        size="sm"
        isDisabled={switching}
        aria-label={`Switch to ${isMainnet ? "Preprod Testnet" : "Mainnet"}`}
      >
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch>
    </div>
  );
}
