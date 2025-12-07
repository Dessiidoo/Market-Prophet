# Gold Dust AI - Autonomous Trading Platform

## Overview

Gold Dust AI is a full-stack autonomous wealth generation platform that uses AI-driven market analysis to execute trading strategies. The application features a futuristic terminal-style interface where users can invest capital, monitor AI-generated trades in real-time, and withdraw profits through integrated payment processing.

**Core Purpose:** Enable users to leverage autonomous AI trading algorithms for market analysis and automated trade execution, with seamless payment integration for deposits and withdrawals.

**Key Features:**
- AI-powered market analysis and trade signal generation
- Real-time portfolio tracking and visualization
- Stripe payment integration for deposits and withdrawals
- Responsive terminal-style dashboard with live updates
- Alpha Vantage API integration for market data

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React 18 with TypeScript
- **Routing:** Wouter for client-side routing
- **State Management:** TanStack React Query for server state
- **UI Framework:** Radix UI primitives with shadcn/ui component library
- **Styling:** TailwindCSS with custom theme configuration
- **Animation:** Framer Motion for UI animations
- **Charts:** Recharts for data visualization

**Design Pattern:** Component-based architecture with:
- Custom hooks for reusable logic (`use-mobile`, `use-toast`)
- Shared utility functions in `@/lib/utils`
- Path aliases for clean imports (`@/`, `@shared/`, `@assets/`)

**Key Architectural Decisions:**
- Single-page application (SPA) with client-side routing
- Component library follows atomic design principles
- Futuristic terminal aesthetic with Orbitron, Rajdhani, and JetBrains Mono fonts
- Dark theme with green primary color (#22c55e) for cyberpunk styling

### Backend Architecture

**Runtime:** Node.js with Express.js
- **Language:** TypeScript with ES Modules
- **Build System:** esbuild for server bundling, Vite for client bundling
- **Development:** tsx for TypeScript execution during development

**API Design:**
- RESTful API endpoints under `/api/*`
- JSON request/response format
- Portfolio management endpoints (create, read, update)
- Trade recording and retrieval
- Market data caching layer
- Stripe webhook handling for payment events

**Key Architectural Decisions:**
- Separation of concerns: routes, storage, services
- Service layer pattern for business logic (MarketService, StripeService)
- Middleware-based request processing
- Static file serving with SPA fallback routing

### Data Layer

**Database:** PostgreSQL via Drizzle ORM
- **Migration Tool:** Drizzle Kit
- **Connection:** node-postgres (pg) driver
- **Schema Location:** `shared/schema.ts` for client/server sharing

**Database Schema:**
1. **Users Table:** Authentication and user management
   - UUID primary key
   - Username/password credentials
   
2. **Portfolios Table:** Investment tracking
   - Initial investment amount
   - Current value (updated by AI trades)
   - Stripe Connect account integration
   - Onboarding status tracking

3. **Trades Table:** AI-generated trade history
   - Symbol, action (BUY/SELL), confidence score
   - Price and timestamp
   - Reasoning for trade decision
   - Portfolio association

4. **Market Cache Table:** API rate limiting optimization
   - Cached market data with expiration
   - Reduces external API calls

5. **Withdrawals Table:** Payout tracking
   - Amount, status, portfolio association
   - Stripe payout ID linkage

**Schema Validation:** Zod schemas generated from Drizzle tables via `drizzle-zod`

### External Dependencies

**Payment Processing:**
- **Stripe:** Complete payment infrastructure
  - Checkout Sessions for deposits
  - Connect Express accounts for user payouts
  - Managed webhooks via `stripe-replit-sync`
  - Environment-aware configuration (development/production)
  - Automatic schema synchronization on startup

**Market Data:**
- **Alpha Vantage API:** Real-time and historical market data
  - Rate-limited requests (12-second delay between calls)
  - Quote data retrieval for trading symbols
  - Cached responses to optimize API usage

**Replit Integration:**
- Connector system for secure credential management
- Development vs. production environment detection
- Automatic domain configuration for webhooks
- Vite plugins for development tooling (cartographer, dev-banner)
- Meta image plugin for OpenGraph tags

**Development Tools:**
- Replit runtime error overlay
- Source map support for debugging
- Hot module replacement (HMR) via Vite

**Session Management:**
- `connect-pg-simple` for PostgreSQL session storage
- Express session middleware (implementation implied but not shown)

**Security Considerations:**
- Environment variable validation (DATABASE_URL, API keys)
- Webhook signature verification
- CORS configuration (referenced but not shown)
- Rate limiting (express-rate-limit referenced in build config)