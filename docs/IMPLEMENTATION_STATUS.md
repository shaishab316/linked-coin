# Linked Coin — Implementation Status

**Date:** October 2026  
**Status:** Completed & Verified  
**Specifications:** [DEVELOPER_GUIDE.md](file:///c:/Users/Incognito/Projects/linked-coin/docs/DEVELOPER_GUIDE.md)  
**Test Suite:** 19/19 Passing (`pnpm test`)  
**Typecheck:** Clean (`pnpm typecheck`)  
**Production Build:** Clean Next.js 16 build (`pnpm build`) with all 17 dynamic and static routes  

---

## 1. Executive Summary

Linked Coin has been built completely fresh in strict alignment with the specifications set forth in [DEVELOPER_GUIDE.md](file:///c:/Users/Incognito/Projects/linked-coin/docs/DEVELOPER_GUIDE.md). No legacy or outdated code was retained. The implementation delivers an offline-first personal finance platform featuring double-entry atomic accounting, immutable append-only event logging, interpersonal debt tracking, hierarchical tag categorization, a unified query builder with tokenized parsing and filter chips, and full JSON/CSV data backup and export.

---

## 2. Architecture & Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions, Route Handlers, React 19)
- **Language:** TypeScript 5.9 with strict type checking enabled
- **Database & ORM:** PostgreSQL (with PL/pgSQL deferred constraint triggers) + Drizzle ORM
- **Offline Storage:** IndexedDB managed via Dexie.js (`src/offline/database.ts`) with outbox mutation queue
- **Monetary Arithmetic:** Minor integer units (`bigint`) with currency-specific scale mapping
- **Styling:** Tailwind CSS v4 with dark mode, responsive glassmorphic cards, and custom CSS variables
- **Testing:** Vitest with isolated database integration and unit tests

---

## 3. Core Modules & Specifications Implemented

### 3.1 Double-Entry Accounting Engine & Invariants
- **Exact Minor Units:** All monetary values stored and calculated using `bigint` minor units (e.g., cents, paisa, or whole yen) with zero floating-point imprecision.
- **Atomic Balanced Legs:** Every transaction writes at least two entry legs (`debit` and `credit`). The sum of debits strictly equals the sum of credits.
- **Database Trigger Enforcement:** PostgreSQL deferred constraint trigger `linked_coin_assert_entry_invariants` validates on commit:
  - Minimum of 2 entries per transaction.
  - User ownership matches across transaction and all entries.
  - Exact currency match across all entries.
  - `sum(debit) == sum(credit)`.
- **Non-Destructive Reversals:** Transactions are never deleted or mutated. Reversals create compensating transactions pointing bidirectionally via `reversesTransactionId` and `reversedByTransactionId`.
- **Append-Only Event Ledger:** Financial events table (`financial_events`) logs all creations and reversals with an enforcing PostgreSQL trigger preventing `UPDATE` or `DELETE`.

### 3.2 Accounts & Financial Portfolios
- **Supported Account Types:** Cash, Bank, Savings, Digital Wallet, Credit, and Custom accounts.
- **Live Ledger Balances:** Balances are derived dynamically from unreversed ledger entries.
- **Opening Balances:** Setting an initial balance creates an atomic `adjustment` transaction balancing against equity.
- **Safe Archiving:** Accounts can be archived and unarchived without affecting historical transactions or reports.

### 3.3 People & Personal Debt Tracking
- **Interpersonal Ledgers:** Dedicated tracking for money lent (`loan_given`), borrowed (`loan_received`), and respective repayments (`repayment_received`, `repayment_made`).
- **Clean Segregation:** Loans and repayments update the person's net balance (receivable vs. payable) without polluting income or expense reports.
- **Outstanding Summary:** The dashboard and People views display live receivables, payables, and transaction history per contact.

### 3.4 Hierarchical Tags
- **Tree Structure:** Tags support parent-child relationships (e.g., `Food -> Dining Out -> Cafes`).
- **Multi-Tagging:** Transactions can be linked to multiple tags simultaneously via `transaction_tags`.
- **Safe Removal:** Tags can be deleted without corrupting transaction entries.

### 3.5 Unified Query Builder
- **Tokenized Parsing (`parseQueryString`):**
  - Parses free text and structured tokens: `date:2026-01-01..2026-01-31`, `type:expense`, `amount:>500`, `currency:USD`, `account:<uuid>`, `tag:<uuid>`, `person:<uuid>`, `is:reversed`, and `sort:amount:desc`.
- **AST Compilation:** Safely transforms the parsed AST into parameterized SQL with subqueries for accounts and tags.
- **Filter Chips (`astToChips`):** Converts AST state into interactive, editable UI chips.
- **Saved Queries:** Users can save, name, and recall custom query templates via the `saved_queries` table.

### 3.6 Offline-First Synchronization
- **IndexedDB (Dexie.js):** Local database stores accounts, transactions, entries, people, tags, and outbox mutations.
- **Outbox Queue:** Offline user actions are enqueued with unique mutation IDs and timestamps.
- **Sync Protocol:**
  - `POST /api/sync/push`: Submits queued mutations with idempotency keys.
  - `POST /api/sync/pull`: Fetches new server events using monotonic sequence cursors.
- **Sync UI:** Header status pill (`SyncStatusPill`) reflects online/offline status and pending outbox count.

### 3.7 Data Ownership & Export
- **Full JSON Backup:** Complete dump of users, accounts, people, tags, transactions, entries, links, and events via `GET /api/export/backup`.
- **CSV Export & Sanitization:** Filtered transaction export (`GET /api/export/transactions`) with CSV formula injection sanitization (escaping `=`, `+`, `-`, `@`).

### 3.8 Secure Authentication
- **Password Hashing:** Argon2id with cryptographically random salts.
- **Session Management:** Cryptographically random session tokens hashed with SHA-256 before storage in PostgreSQL; transmitted via secure `httpOnly`, `sameSite: "lax"` cookies.

---

## 4. Test Suite & Verification Results

The automated test suite runs via Vitest with database integration against the development PostgreSQL instance:

```text
 ✓ src/features/query-builder/parser.test.ts (3 tests)
 ✓ src/lib/money/money.test.ts (5 tests)
 ✓ src/lib/auth/auth.test.ts (2 tests)
 ✓ src/features/accounts/service.test.ts (2 tests)
 ✓ src/features/people/service.test.ts (1 test)
 ✓ src/features/ledger/service.test.ts (6 tests)

 Test Files  6 passed (6)
      Tests  19 passed (19)
```

### TypeScript Validation
```bash
pnpm typecheck
# Output: $ tsc --noEmit (Completed with 0 errors)
```

### Next.js Production Build
```bash
pnpm build
# Output: Compiled successfully. Generating static & dynamic pages (17/17 routes generated cleanly).
```

---

## 5. Directory Structure & Key Files

```text
src/
├── app/
│   ├── (auth)/             # sign-in, sign-up routes
│   ├── (dashboard)/        # dashboard, accounts, transactions, people, tags, query, data
│   ├── api/
│   │   ├── export/         # backup (JSON), transactions (CSV)
│   │   └── sync/           # push, pull endpoints
│   ├── globals.css         # Dark theme styling, glassmorphism, responsive utilities
│   └── layout.tsx          # Root layout & font configuration
├── components/
│   ├── navigation.tsx      # Sidebar & mobile header navigation
│   └── sync-status-pill.tsx# Offline/Online sync status badge
├── db/
│   ├── migrations/         # SQL migration scripts & triggers
│   ├── schema/             # Drizzle ORM table schemas (users, accounts, ledger, etc.)
│   └── index.ts            # PostgreSQL pool connection
├── features/
│   ├── accounts/           # Accounts service, validation, actions, dialogs
│   ├── auth/               # Password hashing, sessions, cookie management
│   ├── import-export/      # JSON backup and CSV export services
│   ├── insights/           # Cash flow, net worth, category spending calculations
│   ├── ledger/             # Double-entry transaction creation, reversals, balance queries
│   ├── people/             # Contact debts, receivables, loans, repayments
│   ├── query-builder/      # Query parser, AST validator, SQL compiler, UI chips
│   └── tags/               # Hierarchical tag management
├── lib/
│   ├── auth/               # Argon2id password & SHA-256 session token helpers
│   ├── config/             # Zod environment variable validation
│   ├── dates/              # ISO date formatting utilities
│   ├── errors/             # AppError standardized error hierarchy
│   └── money/              # Exact minor unit arithmetic and currency precision maps
└── offline/
    ├── database.ts         # Dexie IndexedDB local database
    ├── outbox.ts           # Offline mutation queue
    └── sync-engine.ts      # Push & pull synchronization logic
```
