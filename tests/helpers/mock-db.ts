import { vi } from "vitest";

export function makeMockDb(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      ...((overrides.user as object) ?? {}),
    },
    walletNonce: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      ...((overrides.walletNonce as object) ?? {}),
    },
    swap: {
      count: vi.fn().mockResolvedValue(0),
      ...((overrides.swap as object) ?? {}),
    },
    proof: {
      count: vi.fn().mockResolvedValue(0),
      ...((overrides.proof as object) ?? {}),
    },
  };
}

export function makeUser(partial: Record<string, unknown> = {}) {
  return {
    id: "user-123",
    name: "Test User",
    email: null,
    avatarUrl: null,
    bio: null,
    teachSkill: '["Python"]',
    learnSkill: '["React"]',
    walletAddress: "stake_test1abc",
    accountType: "wallet",
    publicKey: null,
    twitterId: null,
    createdAt: new Date(),
    ...partial,
  };
}
