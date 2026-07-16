import { NextRequest } from "next/server";
import { signToken } from "@/lib/jwt";

// NextRequest doesn't accept signal: null (only signal: undefined | AbortSignal)
type SafeRequestInit = Omit<RequestInit, "signal"> & { signal?: AbortSignal };

export async function authedRequest(
  url: string,
  opts: SafeRequestInit & { userId?: string; onboarded?: boolean; network?: string } = {}
) {
  const { userId = "user-123", onboarded = true, network = "preprod", ...rest } = opts;
  const token = await signToken({
    id: userId,
    email: "",
    name: "Test",
    onboarded,
  });
  const headers = new Headers((rest.headers as HeadersInit) ?? {});
  headers.set("cookie", `skillswap_token=${token}; x-skillswap-network=${network}`);
  return new NextRequest(`http://localhost${url}`, { ...rest, headers });
}

export function anonRequest(url: string, opts: SafeRequestInit = {}) {
  return new NextRequest(`http://localhost${url}`, opts);
}
