# SkillSwap — Final Presentation

---

## Slide 1: Title

- Project name: SkillSwap
- Presenter name: Daniel
- Track(s) pursued: Cardano Pie, Real User Pie

---

## Slide 2: Project Identity

- Project name: SkillSwap
- One-sentence description: A peer-to-peer skill exchange platform where anyone can teach what they know and learn what they need, secured by Cardano wallet authentication and on-chain completion proofs.
- Official public repository: https://github.com/devfreeguy/skill-swap
- Deployed public product: https://myskillswap.xyz
- Official X account: @myskillswap
- Team members as registered: Daniel (solo)

---

## Slide 3: What the Product Does

- Who the user is: Anyone with a skill to teach and something they want to learn — developers, designers, writers, and other professionals who prefer to trade expertise instead of paying for courses or freelancers.

- What the user can do:
  - Sign in with a Cardano wallet (CIP-8) or X/Twitter account
  - Create a profile listing skills to teach and skills to learn
  - Discover other users by skill match and request a swap
  - Chat end-to-end encrypted in a private swap channel
  - Submit deliverables (files, links, text) as proof of teaching
  - Confirm completion, which triggers an on-chain proof anchored to Cardano

- What value the user gets: Learn a real skill from a real person using their own expertise as currency. The on-chain proof creates a verifiable, permanent record of every completed exchange.

- Where payment happens: Initiating a swap requires a 2 ADA platform fee paid at request time. The fee is fully refunded if the receiver declines. It is kept if the swap proceeds or is cancelled.

---

## Slide 4: Live Demo

Recommended flow:

1. Landing page — https://myskillswap.xyz — hero, how it works, CTA
2. Sign in — connect a Cardano wallet (Eternl, Nami, Lace) or continue with X/Twitter
3. Onboarding — select skills to teach and skills to learn
4. Discovery — browse matched users, open a profile dialog showing skill overlap
5. Request a swap — approve the 2 ADA fee in the wallet extension
6. Swap detail — encrypted chat, deliverable upload, mark done
7. Completion — both sides confirm, on-chain proof anchored, Cardano transaction visible on explorer

Demo video: https://ody.sh/QfDMSrwp3R
Mainnet swap history/proof: https://myskillswap.xyz/reputation/cmrqtfsoo000004jlgu2oltxj

---

## Slide 5: How a User Buys the Product

- Pricing/payment prompt: The 2 ADA fee appears in the swap request modal. The user signs a standard CIP-30 transaction in their wallet extension.
- What the user is buying: The right to initiate a skill swap with another user. The fee is held and automatically refunded if the other party declines.
- What happens after payment: The swap moves to PENDING status immediately. The receiver gets a notification. No waiting for on-chain confirmation — the server verifies the fee from the signed transaction directly.
- Fulfillment: Access to the private encrypted swap channel, the deliverables system, and an on-chain proof record upon completion.

---

## Slide 6: Public Repository Evidence

- Repository URL: https://github.com/devfreeguy/skill-swap
- Visibility: Public
- Commit history covers the full 12-week build period including: authentication rewrite, realtime pivot from socket.io to Pusher/Ably, on-chain proof anchoring, E2E messaging, 2 ADA swap fee system with automatic refunds, and Vitest test suite
- Key folders: app/ (Next.js App Router pages and API routes), lib/ (auth, Cardano, matching, realtime), components/ (UI), prisma/ (schema), tests/ (Vitest suite)

---

## Slides 7-18: Twelve Official Weekly Update Posts

Week 1:
Date: April 2026
Post URL: https://x.com/i/status/2050351276605468731
Description: Project kickoff, initial setup, registering for the hackathon

Week 2:
Date: April 2026
Post URL: https://x.com/i/status/2051478017092813095
Post URL 2: https://x.com/i/status/2052331668162166994
Description: Early planning and wireframing

Week 3:
Date: May 2026
Post URL: https://x.com/i/status/2054907833188028766
Description: Shipped landing page, auth screens, onboarding, and backend infrastructure. Fixed MeshJS libsodium conflict by switching to Cardano Foundation library. Fixed Vercel pnpm lockfile mismatch.

Week 4:
Date: May 2026
Post URL: https://x.com/i/status/2056319782996107592
Description: Redesigned auth pages, tightened UI details. Announced matchmaking engine coming next week.

Week 5:
Date: May 2026
Post URL: https://x.com/i/status/2060755065997082637
Description: Deep product architecture week. Redesigned skill exchange model with structured swap delivery, added full chat system to architecture, redesigned app navigation, updated database schema.

Week 6:
Date: June 2026
Post URL: https://x.com/i/status/2063331533013037448
Description: Shipped dashboard, discover page, user profile pages, swaps (list, detail, progress tracker, deliverables), matching engine with PERFECT MATCH/STRONG MATCH/DISCOVERY scoring, and seed data with 12 users from 12 countries. Scrapped TikTok/Reels swipe feed.

Week 7:
Date: June 2026
Post URL: https://x.com/i/status/2065260967680741414
Description: Shipped messaging system (real-time chat, link/image/document support), notifications page, and profile page with skills, wallet connect, and exchange stats.

Week 8:
Date: June 2026
Post URL: https://x.com/i/status/2067933420013928852
Description: Removed mandatory ADA payment gate (Cardano becomes trust/verification layer). Implemented real CIP-8 signature verification. Added dynamic network configuration via environment variable.

Week 9:
Date: June 2026
Post URL: https://x.com/i/status/2070960988698947839
Description: SkillSwap live on Cardano Preprod Testnet. Called for testers and breakers.

Week 10:
Date: July 2026
Post URL: https://x.com/i/status/2072107922549506262
Description: Auth completely rewritten (Twitter OAuth2 + CIP-8), nonce store moved to DB, real-time messaging rewired (Pusher/Ably), on-chain proof anchoring, swap session guards, multi-deliverable support.

Week 11:
Date: July 2026
Post URL: https://x.com/i/status/2074070105445507334
Description: Introduced 2 ADA swap fee with automatic full refund on decline. Added account menu in header. Announced mainnet coming soon.

Week 12:
Date: July 2026
Post URL: https://x.com/devfreeguy/status/2078080614448697618
Description: SkillSwap officially launched on Cardano Mainnet at https://myskillswap.xyz

---

## Slide 19: Builder Verification Summary

- Live demo completed: YES
- Official public repository shown: https://github.com/devfreeguy/skill-swap
- Deployed public product: https://myskillswap.xyz
- All 12 official weekly update posts linked: YES
- Public evidence is verifiable: YES

---

# Cardano Pie Evidence

## Cardano Slide A: Mainnet Functionality

How SkillSwap uses Cardano mainnet:

1. CIP-8 Wallet Authentication — Users prove wallet ownership by signing a server-issued nonce with their Cardano private key. Verified server-side using @cardano-foundation/cardano-verify-datasignature. The wallet is the identity.

2. Swap Fee Payment (2 ADA) — Every swap request requires an on-chain ADA payment to the platform treasury. The fee transaction is built and signed in the user's wallet extension (CIP-30), submitted through Blockfrost, Koios, and Maestro fallback, and verified by decoding the signed CBOR before any swap is created.

3. Decline Refund — If the receiver declines, the platform hot wallet automatically refunds the full 2 ADA back to the initiator. Verified on-chain before the refund is issued.

4. On-chain Proof Anchoring — When both parties complete a swap, a Cardano metadata transaction is submitted anchoring the proof hash (swap ID, participants, skills, timestamp). Creates a permanent public record of the exchange.

- Proof anchor tx: https://cardanoscan.io/transaction/350fa8c06384318df4492067bafdf27d9fe0480d8288309ee7abecbb8a268d62
- Platform treasury address: addr1q8gk9dexqfts4etzqrxdenrrzudcxqn443a7hws5rgu8y57dt7qhd4syq8l0yqgp7z06wfaclndsvgk34ut48k5dxvdqmwr3gs
- Mainnet swap history/proof page: https://myskillswap.xyz/reputation/cmrqtfsoo000004jlgu2oltxj

---

# Real User Pie Evidence

## Real User Slide A: Paying User Evidence

- Platform has approximately 5 active users on mainnet
- Proof anchor tx on Cardano mainnet: https://cardanoscan.io/transaction/350fa8c06384318df4492067bafdf27d9fe0480d8288309ee7abecbb8a268d62
- Public reputation/swap history: https://myskillswap.xyz/reputation/cmrqtfsoo000004jlgu2oltxj

## Real User Slide B: Customer Acquisition Story

Who the user is: Michael, a student from MetaC — a tech education initiative that teaches teenagers and adults web development, mobile application development, and graphic design.

How they found the product: Daniel (the builder) volunteers at Metac as an instructor. Students in the program were introduced to SkillSwap directly as part of their learning journey.

Why they decided to use it: Michael and Daniel(the builder) already had complementary skills. Rather than a traditional teaching setup, they used SkillSwap to formalize the exchange — each teaching the other something of value, with the transaction recorded on-chain.

What they paid for: The 2 ADA swap initiation fee on Cardano mainnet to request a skill exchange.

What happened after: The swap was initiated, both parties coordinated via encrypted chat, submitted deliverables, confirmed completion, and an on-chain proof record was anchored to Cardano mainnet.

Community evidence (Metac platform):
- Metac Instagram: https://www.instagram.com/metac_online/
- Supporting proof 1: https://www.instagram.com/p/DYhHzufM5wo/
- Supporting proof 2: https://www.instagram.com/p/DaGZb8dObiy/
- Supporting proof 3: https://www.instagram.com/p/DR7lVPJDBww/

---

## One Slide Summary

Project name: SkillSwap
Repo: https://github.com/devfreeguy/skill-swap
Live product: https://myskillswap.xyz
Demo video link: https://ody.sh/QfDMSrwp3R
X account: @myskillswap

Weekly update posts:
- Week 1: https://x.com/i/status/2050351276605468731
- Week 2: https://x.com/i/status/2051478017092813095
- Week 3: https://x.com/i/status/2054907833188028766
- Week 4: https://x.com/i/status/2056319782996107592
- Week 5: https://x.com/i/status/2060755065997082637
- Week 6: https://x.com/i/status/2063331533013037448
- Week 7: https://x.com/i/status/2065260967680741414
- Week 8: https://x.com/i/status/2067933420013928852
- Week 9: https://x.com/i/status/2070960988698947839
- Week 10: https://x.com/i/status/2072107922549506262
- Week 11: https://x.com/i/status/2074070105445507334
- Week 12: https://x.com/devfreeguy/status/2078080614448697618

Optional track evidence:
Cardano: CIP-8 wallet auth, 2 ADA swap fee with automatic refund on decline, on-chain proof anchoring — https://cardanoscan.io/transaction/350fa8c06384318df4492067bafdf27d9fe0480d8288309ee7abecbb8a268d62
Real User: Michael (Metac student) — paid 2 ADA on mainnet, completed swap, proof anchored on-chain. Metac community: https://www.instagram.com/metac_online/