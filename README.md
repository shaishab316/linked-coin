# Linked Coin

An offline-first personal finance application with double-entry accounting, immutable financial events, interpersonal debt tracking, and flexible query capabilities.

Built strictly according to [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md).

---

## Features

- **Double-Entry Accounting:** Exact integer minor units (`bigint`), zero floating-point imprecision, deferred database triggers validating balanced entry legs (`sum(debit) == sum(credit)`).
- **Accounts & Balances:** Cash, Bank, Savings, Digital Wallet, Credit, and Custom accounts with live balance computations.
- **People & Debt Tracker:** Record loans given, loans received, and repayments without polluting income/expense reports.
- **Hierarchical Tags:** Categorize transactions with nested parent-child tag trees.
- **Unified Query Builder:** Token-based search bar (`tag:`, `account:`, `type:`, `amount:`, `date:`, `is:reversed`), editable filter chips, and saved queries.
- **Offline-First (IndexedDB + Dexie):** Complete client-side database, outbox queue for offline mutations, and push/pull sync engine.
- **Data Ownership:** Full JSON backup and restore, plus CSV transaction exports with formula-injection sanitization.
- **Modern UI:** Responsive, clean dark-mode design with glassmorphic cards and micro-animations.

---

## Tech Stack

- **Framework:** Next.js 16 (React 19, Server Actions, Route Handlers)
- **Database:** PostgreSQL (with PL/pgSQL constraint triggers)
- **ORM:** Drizzle ORM
- **Offline Storage:** IndexedDB with Dexie.js
- **Auth:** Argon2id password hashing + SHA-256 session token cookies
- **Testing:** Vitest

---

## Getting Started

### 1. Prerequisites

- Node.js 20+
- pnpm 9+
- Docker or a local PostgreSQL instance (port 55432)

### 2. Environment Setup

Copy `.env.example` to `.env` and verify database credentials:

```bash
cp .env.example .env
```

Default local database connection:
```env
DATABASE_URL=postgresql://linked_coin:linked_coin_dev@localhost:55432/linked_coin
SESSION_SECRET=a_very_secret_key_at_least_32_characters_long_for_security
```

### 3. Database Migration

Run the migration script to apply schemas and triggers:

```bash
pnpm db:migrate
```

### 4. Running the Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to access Linked Coin.

### 5. Running Tests & Typecheck

```bash
# Run Vitest test suite
pnpm test

# Run TypeScript type check
pnpm typecheck

# Build for production
pnpm build
```

---

## Documentation

- [Developer Guide](docs/DEVELOPER_GUIDE.md): Complete specifications and design architecture.
- [Implementation Status](docs/IMPLEMENTATION_STATUS.md): Current build state, verification logs, and implemented features.
