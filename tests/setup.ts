import { vi } from "vitest";

// ── Environment variables ─────────────────────────────────────────────────────
process.env.JWT_SECRET = "test-jwt-secret-at-least-32-chars-long!!";
process.env.NEXTAUTH_URL = "http://localhost:3000";
// NODE_ENV is set to "test" automatically by Vitest

// ── next/headers mock (server component only, not available in Node test env) ─
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => undefined),
      set: vi.fn(),
      delete: vi.fn(),
    })
  ),
}));

// ── next/navigation mock ──────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

// ── Cardano signature verification mock (no real wallet in tests) ─────────────
vi.mock("@cardano-foundation/cardano-verify-datasignature", () => ({
  default: vi.fn(() => true),
}));

// ── Cloudinary mock ───────────────────────────────────────────────────────────
vi.mock("@/lib/cloudinary", () => ({
  uploadAvatar: vi.fn(async () => "https://res.cloudinary.com/test/avatar.jpg"),
  uploadFile: vi.fn(async () => "https://res.cloudinary.com/test/file.jpg"),
}));

// ── Realtime / socket mocks ───────────────────────────────────────────────────
vi.mock("@/lib/socket", () => ({
  emitToUser: vi.fn(),
  emitToSwap: vi.fn(),
}));
