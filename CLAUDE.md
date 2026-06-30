# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server (localhost:3000)
pnpm build        # production build
pnpm lint         # ESLint

npx prisma db push      # sync schema to DB (no migrations)
npx prisma generate     # regenerate client → app/generated/prisma/
npx prisma studio       # open DB browser UI
```

Package manager is **pnpm**. Use `pnpm` not `npm`.

## Critical Gotchas

**Read this before touching anything database-related.**

### `prisma/schema.prisma` is now in sync with the real DB

`schema.prisma` and the generated client in `app/generated/prisma/` now match the live database. (This was **not** true historically — the schema used to be an aspirational redesign that diverged from the DB. That divergence has been reconciled.) The current models are exactly `User`, `Swap`, `Proof`, `Delivery`, `Message`, `Notification`, `WalletNonce` — no `Skill`/`UserSkill`/`Endorsement`/reputation tables exist.

Still, prefer **targeted, additive migrations** over a blanket `npx prisma db push` against the live DB: push can try to reconcile any subtle drift and drop columns. When adding a table, add the model, run `npx prisma generate`, then create just that table with raw SQL (this is exactly how `WalletNonce` was added). Reserve `db push` for fresh/empty databases.

Shape worth remembering:
- **`User`** — `teachSkill: String?` / `learnSkill: String?` are plain scalar strings (see "Skills are stored as JSON-stringified arrays" below), plus `walletAddress`, `twitterId`, `publicKey`.
- **`Swap`** — booleans `initiatorDone`, `receiverDone`, `initiatorDelivered`, `receiverDelivered`; `initiatorLastReadAt` / `receiverLastReadAt` (drive unread counts); `initiatorSkill` / `receiverSkill` (skills chosen for this swap).
- **`Proof`** — `teachSkill`, `learnSkill`, `metadataHash`, on-chain anchor fields (`chainTxHash`, `chainStatus`, `network`, `anchoredAt`).

### Skills are stored as JSON-stringified arrays

The onboarding page sends `{ teachSkills: string[], learnSkills: string[] }` (arrays), which `app/api/users/profile/route.ts` serializes via `JSON.stringify()` into the single `teachSkill`/`learnSkill` string columns. When reading `user.teachSkill`, it may be a raw string like `"Python"` (legacy) or a JSON array string like `'["Python","React"]'`. **Always** normalize with `parseSkills()` (`lib/skills.ts`) before comparing — never compare the raw column. Matching (`lib/matching.ts` `scoreMatch`, used by `app/api/users/matches/route.ts`) already does this correctly and is multi-skill aware.

### Route protection: `proxy.ts` + the `(app)` layout

Next.js 16 uses `proxy.ts` as the middleware file (not `middleware.ts`). It protects `/dashboard`, `/swaps`, `/users`, `/messages`, `/profile`, `/notifications`: checks the JWT cookie, redirects unauthenticated users to `/login`, and redirects non-onboarded users to `/onboarding`. **Keep this list in sync with the pages under `app/(app)/`** — it previously listed a dead `/discover` and omitted `/messages`.

Belt-and-suspenders: `app/(app)/layout.tsx` is a second, server-side guard — it calls `getShellUser()` and redirects to `/login` if there's no session, covering every page in the group regardless of the proxy.

### Wallet auth & the nonce store

Wallet login uses **real CIP-8 signature verification** (`@cardano-foundation/cardano-verify-datasignature`) in `app/api/auth/wallet/route.ts` and `app/api/auth/register/wallet/route.ts` — it cryptographically proves wallet ownership of the signed nonce. The challenge nonces are **DB-backed** (`WalletNonce` table via `lib/wallet-nonce-store.ts`): single-use (atomic delete), 5-min TTL, shared across instances. `storeNonce`/`consumeNonce` are **async** — always `await` them.

## Architecture

**Next.js 16.2.4** (App Router) + **React 19** + **TypeScript**. Consult `node_modules/next/dist/docs/` for any unfamiliar APIs.

### Route layout

```
app/
  (auth)/            # login + onboarding — no shared app shell
  (app)/             # authenticated area — AppShell + WalletGate (layout.tsx guards session)
    dashboard/       # authenticated home: profile, matches, swaps, notifications
    users/           # [page.tsx] discovery grid; [id]/page.tsx public profile dialog + swap request
    swaps/[id]/      # swap detail + deliverables form + proof / on-chain anchor
    messages/        # E2E chat: conversation list + thread + exchange context panel
    notifications/   # notifications list
    profile/         # own profile
  api/
    auth/            # logout, me, twitter/, twitter/callback, wallet/, wallet/nonce, register/wallet
    swaps/           # GET+POST list; [id]/ GET+PATCH; [id]/deliver POST+GET+DELETE; [id]/anchor POST+GET
    users/           # profile (GET+PATCH), matches, perfect-match, public-key, wallet, [id]/ GET, route.ts (discovery)
    messages/        # conversations, unread-count, [swapId]/ GET+POST, [swapId]/read, [swapId]/files
    notifications/   # list + [id] + mark-read
    pusher/auth, ably/token   # realtime private-channel auth
  layout.tsx         # root layout — fonts, ThemeProvider
  providers.tsx      # client wrapper: next-themes ThemeProvider
```

### Auth system

**No NextAuth.** Auth is custom JWT via `jose`:
- Token signed with `JWT_SECRET`, stored as HttpOnly cookie, expires 7 days
- `lib/jwt.ts` — `signToken()` / `verifyToken()`
- `lib/cookies.ts` — `setAuthCookie()` / `getAuthToken()`
- `lib/auth.ts` — `getCurrentUser(req)` reads cookie → verifies JWT → fetches User from DB

Two auth methods (no email/password — that was removed):
1. **Twitter/X OAuth2** — `app/api/auth/twitter/` initiates, `twitter/callback/` exchanges the code (`lib/twitter.ts`).
2. **Cardano wallet** — CIP-8 nonce challenge/sign flow. `app/api/auth/wallet/nonce/` issues a nonce, `app/api/auth/wallet/` verifies the signature, `app/api/auth/register/wallet/` registers a new wallet account. Nonces are DB-backed and single-use (`lib/wallet-nonce-store.ts`, `WalletNonce` table).

A connected wallet is **mandatory** app-wide: `components/layouts/WalletGate.tsx` shows a non-dismissible modal for any signed-in account without a `walletAddress`.

JWT payload shape: `{ id, email, name, onboarded }`. `onboarded` is true when user has both `teachSkill` and `learnSkill` set.

### Database

**Prisma v7** + **NeonDB (PostgreSQL)**. Client output goes to `app/generated/prisma/` (not the default location). Always import from there:

```ts
import prisma from "@/lib/prisma";
import type { User } from "@/app/generated/prisma/client";
```

Schema models: `User`, `Swap`, `Proof`, `Message`, `Delivery`, `Notification`, `WalletNonce`.

**Swap lifecycle (actual code behaviour):** `PENDING → ACTIVE → COMPLETED | DECLINED | CANCELLED`
- Creating a swap is guarded (`app/api/swaps/route.ts`): no second `PENDING`/`ACTIVE` swap with the same person, and no repeat of an already-`COMPLETED` identical skill pair. Concurrent swaps with *different* people are allowed.
- Both parties add deliverables (`[id]/deliver`) and independently confirm via the `complete` action; a side can only confirm after delivering ≥1 item. `COMPLETED` + `Proof` are auto-created server-side once both have delivered and confirmed.
- The `Proof` is anchored on-chain as a separate, retryable step (`[id]/anchor`): the client signs a metadata tx, the server submits it through a provider fallback chain (`PENDING → ANCHORING → ANCHORED | FAILED`).
- `Message` and `Delivery` are fully wired (messaging UI + deliverables UI both exist).

**What is not yet built:** public reputation pages.

### Key lib utilities

| File | Purpose |
|------|---------|
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) plus `relativeTime`, `truncateAddress`, `firstSkill`, `matchPercent` |
| `lib/api.ts` | `requireAuth(request)` / `requireParticipantSwap(swapId, userId)` — route guards used by every API handler |
| `lib/animations.ts` | Framer Motion variant presets |
| `lib/theme.ts` | `useIsDarkMode()` hook (SSR-safe) |
| `lib/cloudinary.ts` | Cloudinary uploads (avatars, deliverables, message files) |
| `lib/wallet-nonce-store.ts` | DB-backed single-use CIP-8 nonce store (async `storeNonce`/`consumeNonce`) |
| `lib/skills.ts` | `parseSkills(raw)` — normalizes null/string/"[...]" → `string[]` |
| `lib/matching.ts` | `scoreMatch(me, candidate)` → `{ score, type, teachOverlap, learnOverlap }` |
| `lib/crypto/e2e.ts` | tweetnacl E2E messaging — wallet-derived key pair, encrypt/decrypt |
| `lib/cardano.ts` | Network resolution (`CARDANO_NETWORK`, `IS_MAINNET`, `CARDANO_LIMIT_NETWORK`). **Type-only** import of `NetworkType` — never import the wallet runtime here (it touches `window` and breaks SSR) |
| `lib/cardano/providers.ts` | On-chain submit/confirm with Blockfrost → Koios → Maestro fallback |
| `lib/socket.ts` | Server-side realtime emit (`emitToUser` / `emitToSwap`) |
| `lib/realtime.ts` | Client subscribe; Pusher primary, Ably fallback |
| `lib/realtime-channels.ts` | Shared channel-name helpers (`userChannel`, `swapChannel`) |
| `lib/get-shell-user.ts` | Reads the session + DB for `{ id, name, avatarUrl }` (JWT carries no avatar) |

### Styling

**Tailwind CSS v4** + **HeroUI v3** + **Framer Motion**. Theme: dark by default (`next-themes`). Custom CSS in `styles/mint-green.css`. Fonts: Public Sans (body), Geist Mono, Cinzel Decorative (brand/headings).

### Component structure

```
components/
  auth/        # LoginPanel — animated auth layout
  elements/    # Logo, WalletConnectButton, ThemeToggle, StepCard, SkillSelector, ExchangePair, FirstRunGuide
  layouts/     # AppShell, AppSidebar, nav.ts, WalletGate, PublicFooter, Loader
  dashboard/   # StatCard, MatchCard, DiscoverMoreCard
  messaging/   # ConversationItem, MessageBubble, MessageComposer, ExchangeContextPanel, SystemEvent
  swap/        # ParticipantCard, DeliverableItem
  users/       # FilterPill, TrendIcon, UserProfileDialog
  notifications/ # NotificationCard, NotificationList
  profile/     # StatItem
  sections/    # Landing page: Hero, Features, HowItWorks, Cardano, Discovery, PerfectMatch, CTA
```

### Environment variables

```env
DATABASE_URL=               # NeonDB connection string
JWT_SECRET=                 # for jose JWT signing
NEXTAUTH_URL=               # app base URL (used for cookie domain)

TWITTER_CLIENT_ID=          # X/Twitter OAuth2
TWITTER_CLIENT_SECRET=

NEXT_PUBLIC_CARDANO_NETWORK= # "mainnet" | "preprod" | "preview" (default preprod)
BLOCKFROST_API_KEY=         # on-chain submit/verify (optional — falls back to Koios/Maestro)
MAESTRO_API_KEY=            # optional provider fallback

PUSHER_APP_ID=              # realtime (primary)
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
ABLY_API_KEY=               # realtime (fallback)

CLOUDINARY_CLOUD_NAME=      # image/file uploads
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

@AGENTS.md

<!-- HEROUI-REACT-AGENTS-MD-START -->
[HeroUI React v3 Docs Index]|root: ./.heroui-docs/react|STOP. What you remember about HeroUI React v3 is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: heroui agents-md --react --output AGENTS.md|.:{components\(buttons)\button-group.mdx,components\(buttons)\button.mdx,components\(buttons)\close-button.mdx,components\(buttons)\toggle-button-group.mdx,components\(buttons)\toggle-button.mdx,components\(collections)\dropdown.mdx,components\(collections)\list-box.mdx,components\(collections)\tag-group.mdx,components\(colors)\color-area.mdx,components\(colors)\color-field.mdx,components\(colors)\color-picker.mdx,components\(colors)\color-slider.mdx,components\(colors)\color-swatch-picker.mdx,components\(colors)\color-swatch.mdx,components\(controls)\slider.mdx,components\(controls)\switch.mdx,components\(data-display)\badge.mdx,components\(data-display)\chip.mdx,components\(data-display)\table.mdx,components\(date-and-time)\calendar.mdx,components\(date-and-time)\date-field.mdx,components\(date-and-time)\date-picker.mdx,components\(date-and-time)\date-range-picker.mdx,components\(date-and-time)\range-calendar.mdx,components\(date-and-time)\time-field.mdx,components\(feedback)\alert.mdx,components\(feedback)\meter.mdx,components\(feedback)\progress-bar.mdx,components\(feedback)\progress-circle.mdx,components\(feedback)\spinner.mdx,components\(forms)\checkbox-group.mdx,components\(forms)\checkbox.mdx,components\(forms)\description.mdx,components\(forms)\error-message.mdx,components\(forms)\field-error.mdx,components\(forms)\fieldset.mdx,components\(forms)\form.mdx,components\(forms)\input-group.mdx,components\(forms)\input-otp.mdx,components\(forms)\input.mdx,components\(forms)\label.mdx,components\(forms)\number-field.mdx,components\(forms)\radio-group.mdx,components\(forms)\search-field.mdx,components\(forms)\text-area.mdx,components\(forms)\text-field.mdx,components\(layout)\card.mdx,components\(layout)\separator.mdx,components\(layout)\surface.mdx,components\(layout)\toolbar.mdx,components\(media)\avatar.mdx,components\(navigation)\accordion.mdx,components\(navigation)\breadcrumbs.mdx,components\(navigation)\disclosure-group.mdx,components\(navigation)\disclosure.mdx,components\(navigation)\link.mdx,components\(navigation)\pagination.mdx,components\(navigation)\tabs.mdx,components\(overlays)\alert-dialog.mdx,components\(overlays)\drawer.mdx,components\(overlays)\modal.mdx,components\(overlays)\popover.mdx,components\(overlays)\toast.mdx,components\(overlays)\tooltip.mdx,components\(pickers)\autocomplete.mdx,components\(pickers)\combo-box.mdx,components\(pickers)\select.mdx,components\(typography)\kbd.mdx,components\(utilities)\scroll-shadow.mdx,components\index.mdx,getting-started\(handbook)\animation.mdx,getting-started\(handbook)\colors.mdx,getting-started\(handbook)\composition.mdx,getting-started\(handbook)\styling.mdx,getting-started\(handbook)\theming.mdx,getting-started\(overview)\design-principles.mdx,getting-started\(overview)\quick-start.mdx,getting-started\(ui-for-agents)\agent-skills.mdx,getting-started\(ui-for-agents)\agents-md.mdx,getting-started\(ui-for-agents)\llms-txt.mdx,getting-started\(ui-for-agents)\mcp-server.mdx,getting-started\index.mdx,releases\index.mdx,releases\v3-0-0-alpha-32.mdx,releases\v3-0-0-alpha-33.mdx,releases\v3-0-0-alpha-34.mdx,releases\v3-0-0-alpha-35.mdx,releases\v3-0-0-beta-1.mdx,releases\v3-0-0-beta-2.mdx,releases\v3-0-0-beta-3.mdx,releases\v3-0-0-beta-4.mdx,releases\v3-0-0-beta-6.mdx,releases\v3-0-0-beta-7.mdx,releases\v3-0-0-beta-8.mdx,releases\v3-0-0-rc-1.mdx,releases\v3-0-0.mdx,releases\v3-0-2.mdx,releases\v3-0-3.mdx}|demos/.:{accordion\basic.tsx,accordion\controlled.tsx,accordion\custom-indicator.tsx,accordion\custom-render-function.tsx,accordion\custom-styles.tsx,accordion\disabled.tsx,accordion\faq.tsx,accordion\multiple.tsx,accordion\surface.tsx,accordion\without-separator.tsx,alert-dialog\backdrop-variants.tsx,alert-dialog\close-methods.tsx,alert-dialog\controlled.tsx,alert-dialog\custom-animations.tsx,alert-dialog\custom-backdrop.tsx,alert-dialog\custom-icon.tsx,alert-dialog\custom-portal.tsx,alert-dialog\custom-trigger.tsx,alert-dialog\default.tsx,alert-dialog\dismiss-behavior.tsx,alert-dialog\placements.tsx,alert-dialog\sizes.tsx,alert-dialog\statuses.tsx,alert-dialog\with-close-button.tsx,alert\basic.tsx,autocomplete\allows-empty-collection.tsx,autocomplete\asynchronous-filtering.tsx,autocomplete\controlled-open-state.tsx,autocomplete\controlled.tsx,autocomplete\custom-indicator.tsx,autocomplete\default.tsx,autocomplete\disabled.tsx,autocomplete\email-recipients.tsx,autocomplete\full-width.tsx,autocomplete\location-search.tsx,autocomplete\multiple-select.tsx,autocomplete\required.tsx,autocomplete\single-select.tsx,autocomplete\tag-group-selection.tsx,autocomplete\user-selection-multiple.tsx,autocomplete\user-selection.tsx,autocomplete\variants.tsx,autocomplete\with-description.tsx,autocomplete\with-disabled-options.tsx,autocomplete\with-sections.tsx,avatar\basic.tsx,avatar\colors.tsx,avatar\custom-styles.tsx,avatar\fallback.tsx,avatar\group.tsx,avatar\sizes.tsx,avatar\variants.tsx,badge\basic.tsx,badge\colors.tsx,badge\dot.tsx,badge\placements.tsx,badge\sizes.tsx,badge\variants.tsx,badge\with-content.tsx,breadcrumbs\basic.tsx,breadcrumbs\custom-render-function.tsx,breadcrumbs\custom-separator.tsx,breadcrumbs\disabled.tsx,breadcrumbs\level-2.tsx,breadcrumbs\level-3.tsx,button-group\basic.tsx,button-group\disabled.tsx,button-group\full-width.tsx,button-group\orientation.tsx,button-group\sizes.tsx,button-group\variants.tsx,button-group\with-icons.tsx,button-group\without-separator.tsx,button\basic.tsx,button\custom-render-function.tsx,button\custom-variants.tsx,button\disabled.tsx,button\full-width.tsx,button\icon-only.tsx,button\loading-state.tsx,button\loading.tsx,button\outline-variant.tsx,button\ripple-effect.tsx,button\sizes.tsx,button\social.tsx,button\variants.tsx,button\with-icons.tsx,calendar\basic.tsx,calendar\booking-calendar.tsx,calendar\controlled.tsx,calendar\custom-icons.tsx,calendar\custom-styles.tsx,calendar\default-value.tsx,calendar\disabled.tsx,calendar\focused-value.tsx,calendar\international-calendar.tsx,calendar\min-max-dates.tsx,calendar\multiple-months.tsx,calendar\read-only.tsx,calendar\unavailable-dates.tsx,calendar\with-indicators.tsx,calendar\year-picker.tsx,card\default.tsx,card\horizontal.tsx,card\variants.tsx,card\with-avatar.tsx,card\with-form.tsx,card\with-images.tsx,checkbox-group\basic.tsx,checkbox-group\controlled.tsx,checkbox-group\custom-render-function.tsx,checkbox-group\disabled.tsx,checkbox-group\features-and-addons.tsx,checkbox-group\indeterminate.tsx,checkbox-group\on-surface.tsx,checkbox-group\validation.tsx,checkbox-group\with-custom-indicator.tsx,checkbox\basic.tsx,checkbox\controlled.tsx,checkbox\custom-indicator.tsx,checkbox\custom-render-function.tsx,checkbox\custom-styles.tsx,checkbox\default-selected.tsx,checkbox\disabled.tsx,checkbox\form.tsx,checkbox\full-rounded.tsx,checkbox\indeterminate.tsx,checkbox\invalid.tsx,checkbox\render-props.tsx,checkbox\variants.tsx,checkbox\with-description.tsx,checkbox\with-label.tsx,chip\basic.tsx,chip\statuses.tsx,chip\variants.tsx,chip\with-icon.tsx,close-button\default.tsx,close-button\interactive.tsx,close-button\variants.tsx,close-button\with-custom-icon.tsx,color-area\basic.tsx,color-area\controlled.tsx,color-area\custom-render-function.tsx,color-area\disabled.tsx,color-area\space-and-channels.tsx,color-area\with-dots.tsx,color-field\basic.tsx,color-field\channel-editing.tsx,color-field\controlled.tsx,color-field\custom-render-function.tsx,color-field\disabled.tsx,color-field\form-example.tsx,color-field\full-width.tsx,color-field\invalid.tsx,color-field\on-surface.tsx,color-field\required.tsx,color-field\variants.tsx,color-field\with-description.tsx,color-picker\basic.tsx,color-picker\controlled.tsx,color-picker\with-fields.tsx,color-picker\with-sliders.tsx,color-picker\with-swatches.tsx,color-slider\alpha-channel.tsx,color-slider\basic.tsx,color-slider\channels.tsx,color-slider\controlled.tsx,color-slider\custom-render-function.tsx,color-slider\disabled.tsx,color-slider\rgb-channels.tsx,color-slider\vertical.tsx,color-swatch-picker\basic.tsx,color-swatch-picker\controlled.tsx,color-swatch-picker\custom-indicator.tsx,color-swatch-picker\custom-render-function.tsx,color-swatch-picker\default-value.tsx,color-swatch-picker\disabled.tsx,color-swatch-picker\sizes.tsx,color-swatch-picker\stack-layout.tsx,color-swatch-picker\variants.tsx,color-swatch\accessibility.tsx,color-swatch\basic.tsx,color-swatch\custom-render-function.tsx,color-swatch\custom-styles.tsx,color-swatch\shapes.tsx,color-swatch\sizes.tsx,color-swatch\transparency.tsx,combo-box\allows-custom-value.tsx,combo-box\asynchronous-loading.tsx,combo-box\controlled-input-value.tsx,combo-box\controlled.tsx,combo-box\custom-filtering.tsx,combo-box\custom-indicator.tsx,combo-box\custom-render-function.tsx,combo-box\custom-value.tsx,combo-box\default-selected-key.tsx,combo-box\default.tsx,combo-box\disabled.tsx,combo-box\full-width.tsx,combo-box\menu-trigger.tsx,combo-box\on-surface.tsx,combo-box\required.tsx,combo-box\with-description.tsx,combo-box\with-disabled-options.tsx,combo-box\with-sections.tsx,date-field\basic.tsx,date-field\controlled.tsx,date-field\custom-render-function.tsx,date-field\disabled.tsx,date-field\form-example.tsx,date-field\full-width.tsx,date-field\granularity.tsx,date-field\invalid.tsx,date-field\on-surface.tsx,date-field\required.tsx,date-field\variants.tsx,date-field\with-description.tsx,date-field\with-prefix-and-suffix.tsx,date-field\with-prefix-icon.tsx,date-field\with-suffix-icon.tsx,date-field\with-validation.tsx,date-picker\basic.tsx,date-picker\controlled.tsx,date-picker\custom-render-function.tsx,date-picker\disabled.tsx,date-picker\form-example.tsx,date-picker\format-options-no-ssr.tsx,date-picker\format-options.tsx,date-picker\international-calendar.tsx,date-picker\with-custom-indicator.tsx,date-picker\with-validation.tsx,date-range-picker\basic.tsx,date-range-picker\controlled.tsx,date-range-picker\custom-render-function.tsx,date-range-picker\disabled.tsx,date-range-picker\form-example.tsx,date-range-picker\format-options-no-ssr.tsx,date-range-picker\format-options.tsx,date-range-picker\input-container.tsx,date-range-picker\international-calendar.tsx,date-range-picker\with-custom-indicator.tsx,date-range-picker\with-validation.tsx,description\basic.tsx,disclosure-group\basic.tsx,disclosure-group\controlled.tsx,disclosure\basic.tsx,disclosure\custom-render-function.tsx,drawer\backdrop-variants.tsx,drawer\basic.tsx,drawer\controlled.tsx,drawer\navigation.tsx,drawer\non-dismissable.tsx,drawer\placements.tsx,drawer\scrollable-content.tsx,drawer\with-form.tsx,dropdown\controlled-open-state.tsx,dropdown\controlled.tsx,dropdown\custom-trigger.tsx,dropdown\default.tsx,dropdown\long-press-trigger.tsx,dropdown\single-with-custom-indicator.tsx,dropdown\with-custom-submenu-indicator.tsx,dropdown\with-descriptions.tsx,dropdown\with-disabled-items.tsx,dropdown\with-icons.tsx,dropdown\with-keyboard-shortcuts.tsx,dropdown\with-multiple-selection.tsx,dropdown\with-section-level-selection.tsx,dropdown\with-sections.tsx,dropdown\with-single-selection.tsx,dropdown\with-submenus.tsx,error-message\basic.tsx,error-message\with-tag-group.tsx,field-error\basic.tsx,fieldset\basic.tsx,fieldset\on-surface.tsx,form\basic.tsx,form\custom-render-function.tsx,input-group\default.tsx,input-group\disabled.tsx,input-group\full-width.tsx,input-group\invalid.tsx,input-group\on-surface.tsx,input-group\password-with-toggle.tsx,input-group\required.tsx,input-group\variants.tsx,input-group\with-badge-suffix.tsx,input-group\with-copy-suffix.tsx,input-group\with-icon-prefix-and-copy-suffix.tsx,input-group\with-icon-prefix-and-text-suffix.tsx,input-group\with-keyboard-shortcut.tsx,input-group\with-loading-suffix.tsx,input-group\with-prefix-and-suffix.tsx,input-group\with-prefix-icon.tsx,input-group\with-suffix-icon.tsx,input-group\with-text-prefix.tsx,input-group\with-text-suffix.tsx,input-group\with-textarea.tsx,input-otp\basic.tsx,input-otp\controlled.tsx,input-otp\disabled.tsx,input-otp\form-example.tsx,input-otp\four-digits.tsx,input-otp\on-complete.tsx,input-otp\on-surface.tsx,input-otp\variants.tsx,input-otp\with-pattern.tsx,input-otp\with-validation.tsx,input\basic.tsx,input\controlled.tsx,input\full-width.tsx,input\on-surface.tsx,input\types.tsx,input\variants.tsx,kbd\basic.tsx,kbd\inline.tsx,kbd\instructional.tsx,kbd\navigation.tsx,kbd\special.tsx,kbd\variants.tsx,label\basic.tsx,link\basic.tsx,link\custom-icon.tsx,link\custom-render-function.tsx,link\icon-placement.tsx,link\underline-and-offset.tsx,link\underline-offset.tsx,link\underline-variants.tsx,list-box\controlled.tsx,list-box\custom-check-icon.tsx,list-box\custom-render-function.tsx,list-box\default.tsx,list-box\multi-select.tsx,list-box\virtualization.tsx,list-box\with-disabled-items.tsx,list-box\with-sections.tsx,meter\basic.tsx,meter\colors.tsx,meter\custom-value.tsx,meter\sizes.tsx,meter\without-label.tsx,modal\backdrop-variants.tsx,modal\close-methods.tsx,modal\controlled.tsx,modal\custom-animations.tsx,modal\custom-backdrop.tsx,modal\custom-portal.tsx,modal\custom-trigger.tsx,modal\default.tsx,modal\dismiss-behavior.tsx,modal\placements.tsx,modal\scroll-comparison.tsx,modal\sizes.tsx,modal\with-form.tsx,number-field\basic.tsx,number-field\controlled.tsx,number-field\custom-icons.tsx,number-field\custom-render-function.tsx,number-field\disabled.tsx,number-field\form-example.tsx,number-field\full-width.tsx,number-field\on-surface.tsx,number-field\required.tsx,number-field\validation.tsx,number-field\variants.tsx,number-field\with-chevrons.tsx,number-field\with-description.tsx,number-field\with-format-options.tsx,number-field\with-step.tsx,number-field\with-validation.tsx,pagination\basic.tsx,pagination\controlled.tsx,pagination\custom-icons.tsx,pagination\disabled.tsx,pagination\simple-prev-next.tsx,pagination\sizes.tsx,pagination\with-ellipsis.tsx,pagination\with-summary.tsx,popover\basic.tsx,popover\custom-render-function.tsx,popover\interactive.tsx,popover\placement.tsx,popover\with-arrow.tsx,progress-bar\basic.tsx,progress-bar\colors.tsx,progress-bar\custom-value.tsx,progress-bar\indeterminate.tsx,progress-bar\sizes.tsx,progress-bar\without-label.tsx,progress-circle\basic.tsx,progress-circle\colors.tsx,progress-circle\custom-svg.tsx,progress-circle\indeterminate.tsx,progress-circle\sizes.tsx,progress-circle\with-label.tsx,radio-group\basic.tsx,radio-group\controlled.tsx,radio-group\custom-indicator.tsx,radio-group\custom-render-function.tsx,radio-group\delivery-and-payment.tsx,radio-group\disabled.tsx,radio-group\horizontal.tsx,radio-group\on-surface.tsx,radio-group\uncontrolled.tsx,radio-group\validation.tsx,radio-group\variants.tsx,range-calendar\allows-non-contiguous-ranges.tsx,range-calendar\basic.tsx,range-calendar\booking-calendar.tsx,range-calendar\controlled.tsx,range-calendar\default-value.tsx,range-calendar\disabled.tsx,range-calendar\focused-value.tsx,range-calendar\international-calendar.tsx,range-calendar\invalid.tsx,range-calendar\min-max-dates.tsx,range-calendar\multiple-months.tsx,range-calendar\read-only.tsx,range-calendar\three-months.tsx,range-calendar\unavailable-dates.tsx,range-calendar\with-indicators.tsx,range-calendar\year-picker.tsx,scroll-shadow\custom-size.tsx,scroll-shadow\default.tsx,scroll-shadow\hide-scroll-bar.tsx,scroll-shadow\orientation.tsx,scroll-shadow\visibility-change.tsx,scroll-shadow\with-card.tsx,search-field\basic.tsx,search-field\controlled.tsx,search-field\custom-icons.tsx,search-field\custom-render-function.tsx,search-field\disabled.tsx,search-field\form-example.tsx,search-field\full-width.tsx,search-field\on-surface.tsx,search-field\required.tsx,search-field\validation.tsx,search-field\variants.tsx,search-field\with-description.tsx,search-field\with-keyboard-shortcut.tsx,search-field\with-validation.tsx,select\asynchronous-loading.tsx,select\controlled-multiple.tsx,select\controlled-open-state.tsx,select\controlled.tsx,select\custom-indicator.tsx,select\custom-render-function.tsx,select\custom-value-multiple.tsx,select\custom-value.tsx,select\default.tsx,select\disabled.tsx,select\full-width.tsx,select\multiple-select.tsx,select\on-surface.tsx,select\required.tsx,select\variants.tsx,select\with-description.tsx,select\with-disabled-options.tsx,select\with-sections.tsx,separator\basic.tsx,separator\custom-render-function.tsx,separator\manual-variant-override.tsx,separator\variants.tsx,separator\vertical.tsx,separator\with-content.tsx,separator\with-surface.tsx,skeleton\animation-types.tsx,skeleton\basic.tsx,skeleton\card.tsx,skeleton\grid.tsx,skeleton\list.tsx,skeleton\single-shimmer.tsx,skeleton\text-content.tsx,skeleton\user-profile.tsx,slider\custom-render-function.tsx,slider\default.tsx,slider\disabled.tsx,slider\range.tsx,slider\vertical.tsx,spinner\basic.tsx,spinner\colors.tsx,spinner\sizes.tsx,surface\variants.tsx,switch\basic.tsx,switch\controlled.tsx,switch\custom-render-function.tsx,switch\custom-styles.tsx,switch\default-selected.tsx,switch\disabled.tsx,switch\form.tsx,switch\group-horizontal.tsx,switch\group.tsx,switch\label-position.tsx,switch\render-props.tsx,switch\sizes.tsx,switch\with-description.tsx,switch\with-icons.tsx,switch\without-label.tsx,table\async-loading.tsx,table\basic.tsx,table\column-resizing.tsx,table\custom-cells.tsx,table\empty-state.tsx,table\expandable-rows.tsx,table\pagination.tsx,table\secondary-variant.tsx,table\selection.tsx,table\sorting.tsx,table\tanstack-table.tsx,table\virtualization.tsx,tabs\basic.tsx,tabs\custom-render-function.tsx,tabs\custom-styles.tsx,tabs\disabled.tsx,tabs\secondary-vertical.tsx,tabs\secondary.tsx,tabs\vertical.tsx,tabs\with-separator.tsx,tag-group\basic.tsx,tag-group\controlled.tsx,tag-group\custom-render-function.tsx,tag-group\disabled.tsx,tag-group\selection-modes.tsx,tag-group\sizes.tsx,tag-group\variants.tsx,tag-group\with-error-message.tsx,tag-group\with-list-data.tsx,tag-group\with-prefix.tsx,tag-group\with-remove-button.tsx,textarea\basic.tsx,textarea\controlled.tsx,textarea\full-width.tsx,textarea\on-surface.tsx,textarea\rows.tsx,textarea\variants.tsx,textfield\basic.tsx,textfield\controlled.tsx,textfield\custom-render-function.tsx,textfield\disabled.tsx,textfield\full-width.tsx,textfield\input-types.tsx,textfield\on-surface.tsx,textfield\required.tsx,textfield\textarea.tsx,textfield\validation.tsx,textfield\with-description.tsx,textfield\with-error.tsx,time-field\basic.tsx,time-field\controlled.tsx,time-field\custom-render-function.tsx,time-field\disabled.tsx,time-field\form-example.tsx,time-field\full-width.tsx,time-field\invalid.tsx,time-field\on-surface.tsx,time-field\required.tsx,time-field\with-description.tsx,time-field\with-prefix-and-suffix.tsx,time-field\with-prefix-icon.tsx,time-field\with-suffix-icon.tsx,time-field\with-validation.tsx,toast\callbacks.tsx,toast\custom-indicator.tsx,toast\custom-queue.tsx,toast\custom-toast.tsx,toast\default.tsx,toast\placements.tsx,toast\promise.tsx,toast\simple.tsx,toast\variants.tsx,toggle-button-group\attached.tsx,toggle-button-group\basic.tsx,toggle-button-group\controlled.tsx,toggle-button-group\disabled.tsx,toggle-button-group\full-width.tsx,toggle-button-group\orientation.tsx,toggle-button-group\selection-mode.tsx,toggle-button-group\sizes.tsx,toggle-button-group\without-separator.tsx,toggle-button\basic.tsx,toggle-button\controlled.tsx,toggle-button\disabled.tsx,toggle-button\icon-only.tsx,toggle-button\sizes.tsx,toggle-button\variants.tsx,toolbar\basic.tsx,toolbar\custom-styles.tsx,toolbar\vertical.tsx,toolbar\with-button-group.tsx,tooltip\basic.tsx,tooltip\custom-render-function.tsx,tooltip\custom-trigger.tsx,tooltip\placement.tsx,tooltip\with-arrow.tsx}
<!-- HEROUI-REACT-AGENTS-MD-END -->
