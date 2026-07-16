import { describe, it, expect } from "vitest";
import { crossNetworkStakeAddr } from "@/lib/network-profile-sync";

// Valid preprod/mainnet pair computed from the same 28-byte key hash (0xAB×28).
// These were generated using the exact bech32 implementation in network-profile-sync.ts.
const PREPROD_ADDR =
  "stake_test1uz46h2at4w46h2at4w46h2at4w46h2at4w46h2at4w46h2cwudutw";
const MAINNET_ADDR =
  "stake1ux46h2at4w46h2at4w46h2at4w46h2at4w46h2at4w46h2cfk870n";

describe("crossNetworkStakeAddr", () => {
  it("returns null for a garbage input", () => {
    expect(crossNetworkStakeAddr("not-an-address", "mainnet")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(crossNetworkStakeAddr("", "preprod")).toBeNull();
  });

  it("converts preprod → mainnet (changes HRP to 'stake')", () => {
    const mainnet = crossNetworkStakeAddr(PREPROD_ADDR, "mainnet");
    expect(mainnet).toBe(MAINNET_ADDR);
  });

  it("round-trips preprod → mainnet → preprod back to original", () => {
    const mainnet = crossNetworkStakeAddr(PREPROD_ADDR, "mainnet")!;
    const backToPreprod = crossNetworkStakeAddr(mainnet, "preprod");
    expect(backToPreprod).toBe(PREPROD_ADDR);
  });

  it("converting preprod address to preprod returns same address", () => {
    const same = crossNetworkStakeAddr(PREPROD_ADDR, "preprod");
    expect(same).toBe(PREPROD_ADDR);
  });
});
