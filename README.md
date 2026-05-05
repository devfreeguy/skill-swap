# SkillSwap

> Teach What You Know. Learn What You Don't.

SkillSwap is a peer-to-peer skill exchange platform that matches
users based on what they can teach and what they want to learn.
Every exchange is secured with a small ADA payment via Cardano
wallet and generates a verifiable proof record structured for
future on-chain anchoring.

Built for the Piece of Pie Hackathon by Gimbalabs — 12 weeks,
public commits, real users.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) |
| Styling | Tailwind CSS + HeroUI v3 |
| Database | NeonDB + Prisma |
| Auth | Email/Password + Cardano Wallet |
| Payments | ADA via MeshJS + Blockfrost |
| Animations | Framer Motion |
| Deployment | Vercel |

---

## Core Features

- **Perfect Match Detection** — Finds users who teach what you want and want what you teach, both ways.
- **Proof of Skill Swap** — Every completed exchange generates a verifiable record with ADA tx hash, skills, and timestamp.
- **ADA-Gated Swap Requests** — A small ADA fee filters out time-wasters. Every request is intentional.
- **Blockchain-Ready Records** — Proof records structured for future Cardano anchoring.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Neon database account
- Cardano wallet (Eternl, Nami, or Lace)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/skillswap.git
cd skillswap

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Push database schema
npx prisma db push

# Run development server
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

Create a `.env.local` file in the root:

```env
DATABASE_URL=your_neon_database_url
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
BLOCKFROST_API_KEY=your_blockfrost_api_key
NEXT_PUBLIC_BLOCKFROST_NETWORK=mainnet
```

---

## Project Structure

```
skillswap/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages
│   ├── (dashboard)/       # Protected pages
│   └── page.tsx           # Landing page
├── components/
│   ├── elements/          # Reusable UI elements
│   ├── layouts/           # Layout components
│   └── sections/          # Landing page sections
├── constants/             # Images, config constants
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities, animations
├── prisma/                # Database schema
└── styles/                # Global styles, theme
```

---

## Database Schema

```
User  → has teach_skill + learn_skill
Swap  → connects two users, status lifecycle:
         PENDING → ACTIVE → COMPLETED | DECLINED
Proof → generated on swap completion,
         stores tx hash + skills + timestamp
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
