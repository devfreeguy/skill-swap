# SkillSwap — Session Report

This report documents the work in a single working session: the recent
changes (verified against the working tree) and the earlier work from the
same conversation. Each item lists the **problem** and the **solution**.

---

## Part A — Recent work (verified against current diffs)

### 1. Extract the sidebar into a standalone component
**Problem:** The desktop sidebar (logo, network chip, "Start New Swap" CTA, nav
with unread badge, user/logout row) was inlined in `AppShell.tsx` as a ~70-line
`<aside>` and couldn't be reused; nav data was duplicated with the mobile bottom nav.

**Solution:**
- Created `components/layouts/nav.ts` — single source of truth: `NAV_ITEMS`,
  `BOTTOM_NAV`, `isActivePath(pathname, href)` (`/dashboard` exact-match, others prefix).
- Created `components/layouts/AppSidebar.tsx` — `"use client"`, props
  `{ user, msgUnread, loggingOut, onLogout }`, reads `usePathname()` internally.
- `AppShell.tsx` — replaced the inline `<aside>` with `<AppSidebar … />`, removed
  dead imports/definitions; mobile + desktop headers and bottom nav now import from `nav.ts`.

**Result:** `tsc --noEmit` clean.

### 2. `ChunkLoadError: Failed to load chunk … react-aria …`
**Problem:** After the component split changed the chunk graph, the browser
requested a stale chunk filename that no longer existed (surfaced misleadingly at
`app/(app)/layout.tsx:14`).

**Solution:** Not a code bug — a stale build artifact. `rm -rf .next`, restart dev,
hard refresh. The extraction regenerated chunk names while the open tab/cache still
referenced the old one.

### 3. `window is not defined` (SSR crash)
**Problem:** `@cardano-foundation/cardano-connect-with-wallet-core` reads
`window.localStorage` at module-eval. `lib/cardano.ts` imported `NetworkType` from it
as a **value**, so any server component importing a constant (e.g. `IS_MAINNET` via the
new `AppSidebar`, `CARDANO_LIMIT_NETWORK` via `messages/page.tsx`) pulled that
`window`-touching runtime into SSR.

**Solution (`lib/cardano.ts`):** switched to `import type { NetworkType }` (erased at
compile time → no runtime `require`). `NetworkType` is a string enum
(`"mainnet" | "testnet"`), so `CARDANO_LIMIT_NETWORK` uses the literal value cast to the
type — same runtime value, zero package evaluation on the server. Browser-only wallet
code still imports the real runtime, which is fine.

**Result:** `tsc --noEmit` clean.

### 4. Message area overflowing instead of scrolling
**Problem:** No ancestor had a *bounded* height, so a tall message list grew the whole
document instead of scrolling internally. Three compounding defects:
- `AppShell` root used `min-h-dvh` (a floor, not a cap).
- Main column was `flex-1 flex flex-col` with no `min-h-0` (flex items default to
  `min-height:auto`, refusing to shrink below content).
- Messages Panel 2 had `max-h-[100dvh-64px]` — **invalid CSS** (Tailwind arbitrary math
  needs `calc()`), silently dropped — plus a redundant second `overflow-y-auto`.

**Solution:**
- `AppShell.tsx`: root → `h-dvh overflow-hidden`; main column gained `min-h-0
  overflow-hidden`; wrapped `{children}` in a `flex-1 min-h-0 flex flex-col
  overflow-y-auto` scroll region.
- `messages/page.tsx`: added `min-h-0` to the page root; Panel 2 →
  `flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden` (removed invalid `max-h` and the
  duplicate scroller so header/banner/composer stay pinned and only the list scrolls);
  added `min-h-0` to the message-list and conversation-list scroll containers.

**Result:** `tsc --noEmit` clean.

### 5. Pre-launch flow verification + `proxy.ts` fix
**What was verified** (traced against the real DB / generated client, not `schema.prisma`):
swap lifecycle (`PENDING → ACTIVE → COMPLETED/DECLINED/CANCELLED`, two-sided
delivery+completion gate, deterministic proof hash, retryable on-chain anchor), all enum
literals present in the real `enums.ts`, every API route guarded by `requireAuth` +
participant re-checks, messaging gated to `ACTIVE` swaps with E2E ciphertext, matching via
`scoreMatch` + `parseSkills`. Confirmed three CLAUDE.md gotchas are now stale (schema in
sync, real CIP-8 wallet auth, multi-skill matching, `/dashboard` exists).

**Bug found & fixed — `proxy.ts` drift:** it protected `/discover` (deleted — renamed to
`/users`) and **omitted `/messages`**. Auth was still enforced by `(app)/layout.tsx`, but
`/messages` skipped the onboarding redirect. Replaced `/discover` → `/messages` in both
`protectedPaths` and the `matcher`.

**Result:** production build green (exit 0).

### 6. Harden the nonce store (the one real launch blocker)
**Problem:** `lib/wallet-nonce-store.ts` kept CIP-8 login nonces in an in-memory `Map` —
doesn't survive restarts and isn't shared across serverless instances → intermittent
"Invalid or expired nonce" failures (a nonce issued by one lambda is unknown to another).

**Solution:**
- `prisma/schema.prisma`: added `WalletNonce` model (`nonce @id`, `expiresAt`,
  `createdAt`, `@@index([expiresAt])`). Pre-flight confirmed `schema.prisma` is in sync
  with the live DB.
- `npx prisma generate` — regenerated the client cleanly (adds
  `app/generated/prisma/models/WalletNonce.ts`).
- Live DB — created **only** the new table via a targeted one-off `pg` script (no
  `prisma db push`; existing tables untouched). Verified columns; temp script removed.
- `lib/wallet-nonce-store.ts` — async + DB-backed: `storeNonce` inserts with 5-min TTL and
  GCs expired rows; `consumeNonce` uses an **atomic delete** as the single-use primitive
  (concurrent consumes can't both win; missing/expired → `false`).
- Updated three consumers to `await`: `api/auth/wallet/nonce`, `api/auth/wallet`,
  `api/auth/register/wallet`.

**Verification:** `tsc` clean; live functional test ALL PASS (valid→true, double-use→false,
unknown→false, expired→false, no leftover rows); fresh `pnpm build` exit 0.

---

## Part B — Earlier work in this session

### Authentication rewrite
- **Problem/goal:** move off email/password to social + wallet identity.
- **Solution:** removed email/password (deleted `api/auth/login`, `api/auth/register`,
  `AuthPage.tsx`, `PasswordField.tsx`, `lib/mailer.ts`, the register page); added Twitter/X
  OAuth2 (`api/auth/twitter`, `…/callback`, `lib/twitter.ts`) + `LoginPanel.tsx`; made a
  connected Cardano wallet mandatory via `WalletGate.tsx`; implemented real CIP-8 signature
  verification replacing the nonce-possession stub.

### Wallet signature bug
- **Problem:** signature failed on fresh connect — a closure captured a stale `stakeAddress`.
- **Solution:** `stakeAddressRef` to always read the current value.

### Performance / UX
- **Memory/perf:** replaced a 60fps `requestAnimationFrame` Loader with a CSS spinner.
- **SkillSelector:** only 20 skills searchable → controlled filter; leak → `useDeferredValue`/
  debounce; "Cannot change id of an item" → stable `key` + dedupe; selection clearing → keep
  selected items in the collection.

### Realtime (major pivot)
- **Problem:** a socket.io custom server didn't work with Next 16 (308/404 on `/socket.io`)
  and would block Vercel hosting.
- **Solution:** managed **Pusher (primary) → Ably (fallback)**. Added `lib/socket.ts`,
  `lib/realtime.ts`, `lib/realtime-channels.ts`, `api/pusher/auth`, `api/ably/token`. Private
  channels `private-user-${id}` / `private-swap-${id}`. Fixed a Pusher cluster mismatch
  (`mt1` → `us2`) and several TS errors.

### Phase 6 — deliverables, on-chain proof, E2E messaging
- **Deliverables:** `api/swaps/[id]/deliver` (multi-deliverable, Cloudinary), `DeliverableItem`.
- **On-chain proof:** `api/swaps/[id]/anchor` with Blockfrost → Koios → Maestro fallback
  (`lib/cardano/{providers,anchor-client,proof-metadata}.ts`); retryable status machine.
- **E2E messaging:** `lib/crypto/e2e.ts` (tweetnacl, wallet-derived keys), `api/users/public-key`,
  ciphertext columns; endpoints `api/messages/{conversations,unread-count,[swapId],[swapId]/read,[swapId]/files}`.

### Codebase cleanup
- `lib/api.ts` (`requireAuth` / `requireParticipantSwap`) rolled out to all 21 API routes.
- Component extraction: dashboard `{StatCard,MatchCard,DiscoverMoreCard}`, `swap/ParticipantCard`,
  `users/{FilterPill,TrendIcon}`, `profile/StatItem`, `notifications/{NotificationCard,NotificationList}`.
- `lib/utils.ts` — added helpers; fixed a `formatRelativeTime` minutes-vs-hours bug.
- `ExchangePair.tsx` — replaced the `↔` glyph with `IconArrowsExchange`. Removed dead code/em-dashes;
  fixed an awk mis-deletion that left an orphaned block in the swap detail page.

### Swap session model + guards
- **Problem:** re-swapping with the same person spawned a duplicate chat; nothing blocked
  duplicate exchanges.
- **Solution (`api/swaps/route.ts`):** block a new swap while a `PENDING`/`ACTIVE` one exists with
  that person (either direction → 409 with `swapId`); block re-running an already-`COMPLETED`
  identical skill pair → 409. Concurrent swaps with different people still allowed.

### Conversation list UI + avatar
- **Unread/completed:** per-conversation `unread` flag from `initiator/receiverLastReadAt`; completed
  conversations dimmed with a success check; thin left-border accent for unread; local clear on open.
- **Avatar bug:** header/sidebar avatar didn't render — JWT carries no avatar.
  **Solution (`lib/get-shell-user.ts`):** DB lookup for `name` + `avatarUrl`.
- Removed the useless filter tiles in `/users` (kept the functional "Perfect Match" toggle).

---

## Outstanding (non-code)
1. **Production env vars:** `JWT_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_CARDANO_NETWORK`,
   Pusher + Ably keys, Cloudinary, a chain-provider key.
2. **Public reputation pages** — not yet built.
