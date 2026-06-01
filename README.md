# Base Airdrop Checker 🔵

Check your wallet's eligibility for Base ecosystem airdrops — live from Base mainnet RPC.

## Features

- ✅ Live wallet data from Base mainnet (balance + tx count)
- ✅ 6 airdrop protocols checked (Aerodrome, DEGEN, Moonwell, etc.)
- ✅ Status indicators: live / ended
- ✅ Mobile responsive
- ✅ No API keys needed

## Deploy to Vercel

### Option 1: GitHub → Vercel (Recommended)
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import the repo → Deploy (zero config needed)

### Option 2: Vercel CLI
```bash
npm i -g vercel
cd base-airdrop-checker
vercel
```

## Local Dev
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack
- Next.js 14
- Vanilla CSS Modules
- Base mainnet public RPC (`https://mainnet.base.org`)
- No external dependencies (no wagmi, no ethers)
