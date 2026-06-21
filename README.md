# Market-Prophet

> An AI-native trading signal terminal — a professional dark-mode dashboard that surfaces real-time market predictions, buy/sell signals, and profit analytics through a purpose-built financial UI.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## Overview

Market-Prophet is a deployable AI trading signal dashboard built for the retail algo-trading era. It combines a polished dark-mode SPA with a persistent backend to deliver what most retail traders cannot build themselves: a Bloomberg-style terminal experience powered by AI-generated market predictions.

The frontend is a purpose-built financial UI — not a generic admin panel repurposed for finance, but a ground-up design with components explicitly built for trading analytics: an AI terminal output panel, live trade signal cards with buy/sell directionality, and a real-time profit chart. The backend provides a clean REST API layer over PostgreSQL, making every signal, prediction, and portfolio event persistent, auditable, and queryable.

In a market where Bloomberg Terminal charges $24,000/year per seat, Market-Prophet represents a modern, AI-native alternative with open architecture and a UX that Bloomberg's 1980s-era interface cannot match. This is a working MVP with a clear path to SaaS subscription, white-label licensing, or acquisition by a retail brokerage looking to modernize their platform.

---

## Key Features

- **AI Terminal Interface** — A custom terminal-style UI component (`ai-terminal.tsx`) that streams AI-generated market analysis and trade commentary in real time, giving the platform a distinctly professional, algorithmic feel
- **Trade Signal Cards** — Visual buy/sell/hold signal cards (`trade-card`) displaying asset, direction, confidence level, and entry metadata — designed for at-a-glance decision support
- **Profit Chart** — A dedicated `profit-chart` component rendering portfolio performance over time, built on top of the shadcn/ui chart primitives with financial-grade styling
- **Persistent Signal History** — PostgreSQL-backed persistence via Drizzle ORM ensures every prediction, signal, and trade event is stored, versioned, and retrievable — not ephemeral like most demo dashboards
- **REST API Layer** — Express.js backend exposing clean endpoints for signal retrieval, portfolio state, and AI prediction ingestion, making the system composable and integration-ready
- **Futuristic Dark-Mode UI** — Full Tailwind CSS dark theme with shadcn/ui components, purpose-styled for financial data density — the kind of UI that justifies a premium price point
- **Replit-Ready Full-Stack Architecture** — Vite (client) + Express (server) monorepo structure that deploys out of the box on Replit and can be migrated to any Node.js host

---

## How It Works

```
┌─────────────────────────────────────────────────────┐
│                  MARKET-PROPHET                     │
│                                                     │
│  [AI Engine / LLM]  ──▶  Express REST API           │
│                               │                     │
│                         Drizzle ORM                 │
│                               │                     │
│                          PostgreSQL                 │
│                               │                     │
│                    React SPA (Vite)                 │
│          ┌────────────────────────────┐             │
│          │  AI Terminal  │ Trade Cards│             │
│          │  Profit Chart │ Signal Feed│             │
│          └────────────────────────────┘             │
└─────────────────────────────────────────────────────┘
```

1. **Signal Generation** — An AI/algorithmic engine (LLM or quantitative model) produces trade signals and market commentary
2. **API Ingestion** — The Express backend receives, validates, and persists signals to PostgreSQL via Drizzle ORM
3. **Frontend Consumption** — The React SPA polls or subscribes to the API, rendering signals as trade cards, terminal output, and chart data
4. **User Interface** — Traders interact with a dark-mode dashboard that presents actionable intelligence without noise

---

## Installation & Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or managed — Neon, Supabase, Railway all work)
- npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/Dessiidoo/Market-Prophet.git
cd Market-Prophet
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/market_prophet

# AI Provider (if applicable)
OPENAI_API_KEY=sk-...

# App
NODE_ENV=development
PORT=5000
```

### 4. Push Database Schema

```bash
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

The app runs at `http://localhost:5000` — the Express server serves both the API and the Vite-built frontend in production mode.

---

## Usage

Once running, the dashboard provides:

- **AI Terminal Panel** — Live stream of AI market commentary and reasoning
- **Signal Feed** — Real-time buy/sell/hold signals with asset identifiers and confidence scores
- **Profit Chart** — Visual portfolio performance curve updated as signals are acted upon
- **Trade Cards** — Individual signal cards with full metadata for manual review or automated execution

### Deploying to Replit

This project is pre-configured for Replit deployment via `.replit`. Import the repo into Replit, set your environment variables in the Secrets panel, and click Run.

### Deploying to Production

```bash
npm run build
npm start
```

The build outputs a production-optimized Vite bundle served by Express. Deploy to Railway, Render, Fly.io, or any Node.js host with PostgreSQL support.

---

## Why This Exists

Retail traders have two options today: expensive institutional platforms (Bloomberg at $24K/year, Refinitiv at $22K/year) or consumer apps that hide their signal logic behind black-box UX. Neither is satisfying for a sophisticated retail trader or a small fund that wants to own its tooling.

Market-Prophet is the third option: an open-architecture, AI-native signal terminal that a fintech team can white-label, a developer can extend, and a trader can actually understand. The combination of a modern React frontend, a typed TypeScript backend, and a relational database for signal history makes it production-grade in a way that most trading dashboard demos are not.

**Target use cases:**
- Retail algorithmic traders who want a professional-grade signal dashboard
- Fintech startups building AI-powered advisory products
- Brokerages modernizing their trader-facing tools
- Developers building quantitative research platforms

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| UI Components | shadcn/ui + Tailwind CSS |
| Backend | Express.js (Node.js) |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Hosting | Replit (dev), any Node host (prod) |

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*Market-Prophet is an early-stage MVP. Signal accuracy depends on the AI/algorithmic engine connected to the backend. This project does not constitute financial advice.*