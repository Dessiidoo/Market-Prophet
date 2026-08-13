# GoldDust / Market-Prophet

> AI-native market intelligence and portfolio analytics platform. **Engineering truth standard: the application must never present simulated, random, fabricated, or unverified market behavior as real.**

## Loretta's GoldDust Vision

GoldDust is being built **for Loretta first**. The commercial product can eventually serve other people, but the original purpose is to become Loretta's personal market-intelligence partner and financial decision-support system.

Loretta does not want another generic trading dashboard that merely displays charts. She wants a system that actively watches the markets, finds meaningful opportunities, analyzes them, and brings the important information to her attention without requiring her to manually hunt through dozens of markets and screens.

The personal north star is:

- **Continuously watch relevant markets** using real, timestamped market data.
- **Search broadly for opportunities** rather than assuming one asset or one market is always the answer.
- **Analyze opportunities quantitatively** using reproducible indicators, price action, volatility, momentum, volume, trend, risk, and other validated factors as appropriate.
- **Identify potential entry and exit points** and clearly distinguish an opportunity from a guarantee.
- **Give Loretta a simple actionable signal:** BUY, SELL, HOLD, WATCH, or NO ACTION when the evidence does not justify a trade.
- **Explain why.** Every important signal should show the data, factors, assumptions, timestamp, and model/version behind it.
- **Watch positions after entry.** GoldDust should monitor the original thesis and alert Loretta when conditions materially change.
- **Track outcomes.** The system should record what it predicted, what happened afterward, and where its analysis was right or wrong.
- **Learn from evidence.** Historical performance and prediction outcomes should be used to evaluate and improve models, never to manufacture impressive-looking returns.
- **Protect capital.** Risk, drawdown, position sizing, concentration, liquidity, and uncertainty should be first-class information.
- **Save Loretta time.** The system should surface what matters instead of burying her in financial noise.
- **Remain honest.** If the system does not know, does not have current data, or has insufficient evidence, it must say so.

### What GoldDust is NOT supposed to do

GoldDust is **not** supposed to pretend that it can predict the future with certainty. It must never manufacture confidence, invent market activity, claim to monitor data sources it does not actually access, or turn a simulated return into a claim of real profit.

The objective is not to make the dashboard *look* intelligent. The objective is to make the underlying system genuinely useful to Loretta.

### Personal-first, product-ready

The architecture should be strong enough that GoldDust can eventually become a product for other traders, fintech companies, or financial platforms. But product expansion must not erase the original north star: **build the system that Loretta herself would trust enough to use every day.**

---

## Mission

GoldDust is being developed as a production-grade financial intelligence platform. The goal is a professional market-data terminal that can ingest real market data, calculate reproducible indicators, generate transparent signals, maintain auditable portfolio state, and support rigorous historical testing.

This repository is the source of truth. UI text, animations, generated terminal messages, and README claims must never be treated as evidence that an underlying capability exists.

## Non-Negotiable Engineering Rules

1. **No fake numbers.** Portfolio value, returns, prices, signals, confidence, performance, and statistics must originate from real persisted data or reproducible calculations.
2. **No random financial behavior.** Do not use `Math.random()` or equivalent randomness to manufacture portfolio growth, returns, signals, prices, confidence, or market outcomes.
3. **No fake market activity.** Messages such as "analyzing 48,000 assets" or "monitoring whale wallets" are not acceptable unless the application actually performs those operations and can identify the data source.
4. **Simulation must be labeled.** Backtests and simulations are legitimate features, but they must be explicitly identified as simulated/historical and must never be presented as live trading performance.
5. **Signals must be reproducible.** A signal should be traceable to its inputs, timestamp, asset, methodology, and calculated factors.
6. **Portfolio accounting must be auditable.** Current value and return calculations must derive from persisted portfolio state and actual market prices or explicitly labeled historical prices.
7. **Never claim an implementation that is not present.** README, UI, comments, and terminal output must describe the actual system, not the intended future system.
8. **Financial safety.** The platform is decision-support software, not a guarantee of profit or financial advice. Never promise predictive certainty or guaranteed returns.

## Current Architecture

```text
Market Data Sources
        |
        v
Data Validation / Normalization
        |
        v
Signal & Analytics Engine
        |
        +----> Transparent Signal Records
        |
        +----> Portfolio Accounting
        |             |
        |             v
        |        PostgreSQL
        |
        v
Express REST API
        |
        v
React / Vite Dashboard
        |
        +---- AI Terminal
        +---- Live Signals
        +---- Portfolio Metrics
        +---- Performance / Backtest Views
```

### Stack

- React + TypeScript + Vite
- Express.js / Node.js
- Drizzle ORM
- PostgreSQL
- Tailwind CSS + shadcn/ui
- Render/Replit-compatible Node deployment
- Stripe Checkout / Stripe Connect for payment and payout infrastructure where configured

## What Is Already Known

### Portfolio dashboard

A previous dashboard implementation generated chart growth with random values. That behavior was removed in commit **`6f166d3b`**. The chart now consumes persisted portfolio value from the backend rather than inventing growth in the browser.

**Known-good checkpoint:** `6f166d3b`

Do not regress this behavior.

### Stripe

Stripe payment infrastructure and Stripe Connect are separate concerns:

- **Checkout/payment:** handles customer payment.
- **Connect:** handles connected-account/payout onboarding.

Do not mix the two flows. Stripe Managed Payments may reject unsupported Checkout parameters, including `payment_method_types`, unless Managed Payments is disabled for the request/account configuration. Product tax-code requirements may also apply when Managed Payments is enabled.

## Real vs. Simulated State

### Must be real in production mode

- Market prices and timestamps
- Asset identifiers
- Portfolio positions and balances
- Transaction records
- Portfolio valuation
- Return calculations
- Signal inputs and calculations
- Data-source status

### May be simulated, but only when explicitly labeled

- Historical backtests
- Paper trading
- Stress tests
- Synthetic test fixtures
- Demo environments

A demo environment must not silently masquerade as a live market environment.

## Signal Engine Requirements

A production signal should contain enough information to audit it, including at minimum:

- Asset symbol/identifier
- Signal direction: BUY / SELL / HOLD
- Timestamp
- Source market data timestamp
- Price used
- Indicator/factor values used by the model
- Model/version identifier
- Confidence or score methodology
- Reason/explanation suitable for audit

If an LLM is used, the LLM may explain or synthesize analysis, but it must not invent market observations. Quantitative inputs must come from actual application data.

## Portfolio Requirements

The portfolio system should distinguish clearly between:

- Cash balance
- Open positions
- Position quantity
- Cost basis
- Current market value
- Unrealized P&L
- Realized P&L
- Total return
- Benchmark return

Return calculations must be deterministic. The dashboard must not manufacture projected balances from arbitrary growth factors.

## Backtesting Requirements

Backtests must:

- Use timestamped historical data
- Avoid look-ahead bias
- Account for transaction costs/slippage where appropriate
- Record strategy/model version
- Show the test period
- Distinguish historical performance from live performance
- Be reproducible from the same inputs

A backtest result is **not** evidence of future profit.

## Deployment

The project can run as a Node application with a Vite frontend and Express backend.

Typical production flow:

```bash
npm install
npm run build
npm start
```

Required environment configuration depends on enabled features. Database-backed deployments require `DATABASE_URL`. Payment features require the appropriate Stripe secrets. AI features require the configured AI provider credentials.

Never commit secrets, API keys, payment credentials, or database credentials.

## Working With This Repository

Before changing code:

1. Inspect the existing implementation instead of trusting the README.
2. Trace the data path from source -> backend -> database -> API -> UI.
3. Identify whether a displayed value is real, calculated, persisted, historical, or simulated.
4. Preserve working functionality while removing demo behavior.
5. Make changes in coherent batches when possible.
6. Verify the actual deployed commit before declaring a feature live.
7. Test the API/data path, not only the visual dashboard.

### Builder handoff rule

A new developer or AI coding agent should **not ask Loretta to re-explain the project's history** before inspecting this repository. Start with this README, inspect the current code, git history, environment configuration, database schema, and deployment configuration, then identify what is implemented versus planned.

## Product Positioning

GoldDust is intended to become a transparent, AI-assisted market intelligence and portfolio analytics platform. It should compete on clarity, auditability, useful signal synthesis, and an excellent financial-data UX rather than unsupported claims of perfect prediction.

## Disclaimer

GoldDust is financial software and does not guarantee investment outcomes. Market signals and analytics are decision-support tools. Users remain responsible for their own investment decisions.
