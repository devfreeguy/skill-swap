# SkillSwap

> Teach What You Know. Learn What You Don't.

SkillSwap is a peer-to-peer skill exchange platform that matches
users based on what they can teach and what they want to learn.
Each completed exchange produces a verifiable proof record that is
anchored on the Cardano blockchain, and every conversation is
end-to-end encrypted with wallet-derived keys.

Built for the Piece of Pie Hackathon by Gimbalabs — 12 weeks,
public commits, real users.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + HeroUI v3 + Framer Motion |
| Database | NeonDB (PostgreSQL) + Prisma v7 |
| Auth | Twitter/X OAuth2 + Cardano wallet (CIP-8 signature) |
| Wallet | `@cardano-foundation/cardano-connect-with-wallet` + MeshSDK |
| On-chain | Proof anchoring with Blockfrost → Koios → Maestro fallback |
| Messaging | End-to-end encrypted (tweetnacl, wallet-derived keys) |
| Realtime | Pusher Channels (primary) → Ably (fallback) |
| Media | Cloudinary (avatars, deliverables, message files) |
| Deployment | Vercel |

---

## Core Features

- **Perfect Match Detection** — Finds users who teach what you want and want what you teach, both ways. Multi-skill aware (skills are normalized before scoring).
- **End-to-End Encrypted Messaging** — Per-swap conversations encrypted with keys derived from a wallet signature; the server never sees plaintext.
- **Two-Sided Deliverables & Completion** — Each party submits concrete deliverables; a swap only completes once both sides have delivered and confirmed.
- **On-Chain Proof of Skill Swap** — Completed swaps produce a deterministic proof hash that the user's wallet anchors on Cardano (`PENDING → ANCHORING → ANCHORED`), with automatic provider fallback.
- **Mandatory Wallet Gate** — A connected Cardano wallet is required to use the app; it signs proofs and secures messaging.
- **Swap Request Fee** — Requesting a swap costs a small on-chain fee (default 2 ADA) paid to the platform treasury to keep SkillSwap sustainable. It is refunded in full — automatically, from a platform hot wallet — only when the other party declines. Accepting, cancelling, or completing keeps the fee.
- **Realtime Everything** — Swap requests, accept/decline, messages, and notifications update live without polling.

---

## Getting Started

### Prerequisites
- Node.js 20+
- **pnpm** (this project uses pnpm, not npm)
- A Neon (PostgreSQL) database
- A Cardano wallet (Eternl, Nami, or Lace)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/skillswap.git
cd skillswap

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Generate the Prisma client (outputs to app/generated/prisma/)
npx prisma generate

# Push the schema to a fresh database
npx prisma db push

# Run the development server
pnpm dev
```

Open http://localhost:3000

> **Note:** `pnpm build` and `pnpm dev` should not share the same `.next`
> directory. If you switch between them and see stale-chunk 404s, run
> `rm -rf .next` and restart.

---

## Environment Variables

Create a `.env` file in the root (see `.env.example`):

```env
# Database
DATABASE_URL=                    # NeonDB connection string

# Auth
JWT_SECRET=                      # secret for jose JWT signing
NEXTAUTH_URL=                    # app base URL (cookie domain)
TWITTER_CLIENT_ID=               # X/Twitter OAuth2 app
TWITTER_CLIENT_SECRET=

# Cardano
NEXT_PUBLIC_CARDANO_NETWORK=     # "mainnet" | "preprod" | "preview" (default preprod)
BLOCKFROST_API_KEY=              # on-chain submit/verify (optional for proofs; REQUIRED for refunds)
MAESTRO_API_KEY=                 # optional provider fallback

# Swap fee (leave the platform address blank to disable fees)
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS=  # treasury receive address (addr1…/addr_test1…)
NEXT_PUBLIC_SWAP_FEE_LOVELACE=        # fee in lovelace (default 2000000 = 2 ADA)
PLATFORM_WALLET_MNEMONIC=             # server secret: treasury seed phrase, signs refunds

# Realtime (Pusher primary, Ably fallback)
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
ABLY_API_KEY=

# Media
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Project Structure

```
skillswap/
├── app/
│   ├── (auth)/             # login + onboarding (no shared shell)
│   ├── (app)/              # authenticated area — guarded by layout + proxy.ts
│   │   ├── dashboard/      # profile, matches, swaps, notifications
│   │   ├── users/          # discovery grid + public profile dialog
│   │   ├── swaps/[id]/     # swap detail, deliverables, proof
│   │   ├── messages/       # E2E chat (conversation list + context panel)
│   │   ├── notifications/
│   │   └── profile/
│   ├── api/                # route handlers (auth, swaps, messages, users, …)
│   ├── generated/prisma/   # generated Prisma client (reflects the real DB)
│   └── page.tsx            # landing page
├── components/             # auth, dashboard, messaging, swap, layouts, sections, …
├── hooks/                  # custom React hooks (useWalletAuth, …)
├── lib/                    # prisma, jwt, auth, matching, crypto/e2e, cardano/, realtime, …
├── prisma/                 # schema.prisma (in sync with the real DB)
└── styles/                 # global styles, theme
```

Route protection is handled by `proxy.ts` (Next.js 16's middleware
file name) plus a server-side guard in `app/(app)/layout.tsx`.

---

## Database Schema

Models: `User`, `Swap`, `Proof`, `Delivery`, `Message`, `Notification`, `WalletNonce`.

```
User    → teachSkill + learnSkill (JSON-stringified arrays), walletAddress, publicKey
Swap    → connects two users, lifecycle:
           PENDING → ACTIVE → COMPLETED | DECLINED | CANCELLED
           two-sided done/delivered flags + per-user last-read timestamps
           swap-fee fields: feeTxHash, feeLovelace, refundAddress, refundTxHash,
           paymentStatus (CONFIRMED at request → KEPT | REFUNDED | REFUND_PENDING | FAILED)
Proof   → created on completion; deterministic metadataHash,
           on-chain status (PENDING → ANCHORING → ANCHORED | FAILED)
Delivery → many per participant per swap (LINK/FILE/IMAGE/DOCUMENT/TEXT)
Message  → per-swap chat; user text stored as E2E ciphertext, system events as plaintext
WalletNonce → single-use, TTL'd CIP-8 login challenges (DB-backed)
```

---

## Hackathon

This project is being built for the
[Piece of Pie Hackathon](https://www.gimbalabs.com/piece-of-pie)
by Gimbalabs.

- Build period: April 13 – July 19, 2026
- Track: Cardano Pie (20,000 ADA prize pool)
- Weekly progress tweets: #gimbalabs #pieceofpie #hackathon

---

## License

MIT
