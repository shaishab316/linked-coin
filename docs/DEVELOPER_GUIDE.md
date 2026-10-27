# Linked Coin — Complete Developer Documentation

**Repository:** https://github.com/shaishab316/linked-coin  
**Product:** Linked Coin  
**Product type:** Offline-first personal finance and financial history management  
**Architecture:** Next.js + Drizzle ORM + PostgreSQL + IndexedDB  
**Primary goals:** Simplicity, reliability, privacy, data ownership, flexible financial analysis, and data-loss prevention.

---

## 1. Product Vision

Linked Coin is a personal finance application that helps users track their money, understand where it goes, manage debts between people, and explore their complete financial history.

The application must remain useful without an internet connection. Users should be able to record expenses, income, transfers, loans, repayments, and other financial events offline. When connectivity returns, the application synchronizes changes with the server and makes them available on other devices.

The application should be simple for everyday use while providing advanced capabilities for users who need detailed financial analysis.

### 1.1 Core principles

1. **Offline-first:** Core financial operations must work without an internet connection.
2. **Reliable financial history:** Never silently overwrite or discard recorded financial events.
3. **Data ownership:** Users can export their records and create backups.
4. **Financial correctness:** Use exact monetary arithmetic and atomic ledger operations.
5. **Privacy and security:** Each user's financial data must remain isolated.
6. **Simple authentication:** Begin with username and password, without unnecessary authentication complexity.
7. **Powerful search:** Provide a single, flexible query interface for financial records.
8. **Performance:** Use database indexes, pagination, efficient queries, and read models where appropriate.
9. **Progressive development:** Build a dependable MVP before adding optional integrations.

### 1.2 What Linked Coin is not

The initial version is not intended to be a banking platform, a payment processor, an accounting package for businesses, or a cryptocurrency wallet.

External bank synchronization, automated bank feeds, and third-party financial integrations can be considered later.

---

## 2. Functional Requirements

### 2.1 Accounts

Users can create and manage financial accounts, including:

- Cash and physical wallets.
- Bank accounts.
- Savings accounts.
- Digital wallets.
- Credit accounts, if supported by the selected balance model.
- Custom accounts.

Each account should have a name, account type, currency, creation date, optional description, and active or archived status.

Users can view:

- Current balance.
- Historical balance.
- Income and expenses.
- Transfers in and out.
- Transaction history.
- Account-specific reports.

Archiving an account must not delete its transactions.

### 2.2 Income and expenses

Users can record income and expenses with:

- Amount and currency.
- Transaction date and time.
- Source or destination account.
- One or more tags.
- Description and optional notes.
- Optional person or external reference.
- Creation and modification metadata.
- Links to related transactions.

The interface should support quick entry with as few steps as possible.

### 2.3 Transfers

Users can move money between their own accounts.

A transfer must create linked ledger entries in one atomic operation. The source account decreases and the destination account increases.

A transfer must not be counted as income or expense in consolidated spending reports.

Fees, if applicable, should be recorded separately as expenses.

### 2.4 People and personal debts

Users can maintain a list of people and track money owed to or by them.

Example:

1. A user lends ৳1,000 to a friend.
2. Linked Coin records the user's cash reduction and the amount receivable from the friend.
3. The friend repays ৳400.
4. Linked Coin records the repayment and updates the outstanding balance.
5. The user can see that ৳600 remains outstanding.

The system must distinguish between:

- Money the user owns.
- Money the user owes.
- Money other people owe the user.
- Money transferred between the user's own accounts.

A debt must not be incorrectly counted as ordinary income or expense when it is created or repaid.

### 2.5 Tags and categories

Users can organize financial events with tags such as:

- Food
- Transport
- Rent
- Education
- Salary
- Freelancing
- Medical
- Family
- Personal loans

Support hierarchical tags, for example:

`Food → Restaurants → Fast Food`

Tags can be assigned to multiple transactions. Users should be able to filter, group, and compare transactions by tag.

Deleting or archiving a tag must not destroy the underlying financial history.

### 2.6 Dashboard

The dashboard should provide:

- Total assets and liabilities.
- Net position.
- Current balances by account.
- Income versus expenses.
- Recent financial events.
- Spending by category.
- Monthly cash flow.
- Outstanding debts by person.
- Synchronization status.
- Useful summaries for a selected date range.

The dashboard should use consistent financial definitions. For example, transfers between owned accounts should not inflate income or expenses.

### 2.7 Search and advanced filtering

Provide one unified query bar that supports multiple filters in a single search interface.

Example:

`date:2026-01-01..2026-01-31 tag:Food account:Cash amount:>500 type:expense`

The interface should turn filters into editable chips rather than requiring users to memorize query syntax.

Support:

- Date and time ranges.
- Accounts.
- People.
- Tags and nested tags.
- Transaction types.
- Minimum and maximum amounts.
- Text search.
- Included and excluded tags.
- Currency.
- Grouping and sorting.
- Saved queries.
- Downloading the filtered results.

The system should support combining conditions, including AND, OR, and NOT where appropriate.

### 2.8 Charts and financial relationships

Provide interactive visualizations for:

- Income and expenses over time.
- Monthly cash flow.
- Spending by tag.
- Account balance history.
- Debt by person.
- Income source comparisons.
- Financial relationships and money flows.

Selecting a chart element should open the relevant filtered transactions.

### 2.9 Import and export

Users should be able to:

- Export transactions to CSV.
- Export structured data to JSON.
- Export reports to XLSX.
- Download all personal data.
- Export filtered search results.
- Export data for a chosen date range.
- Import transactions from CSV and supported spreadsheet formats.
- Back up data before major changes.

Google Sheets integration can be added in a later phase.

### 2.10 Offline and multi-device support

Users must be able to:

- Open the application after a successful initial load.
- Create and edit supported records offline.
- See pending synchronization status.
- Retry failed synchronization.
- Resume synchronization after reconnecting.
- Use the same account on multiple devices.
- Recover server-synchronized data after reinstalling the application.

The interface must clearly distinguish locally saved changes from changes confirmed by the server.

---

## 3. Technology Stack

Use one consistent technology stack. Do not introduce Prisma alongside Drizzle.

| Layer | Technology |
|---|---|
| Web framework | Next.js App Router |
| Language | TypeScript, strict mode |
| UI | React |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM and migrations | Drizzle ORM, Drizzle Kit |
| Validation | Zod |
| Offline database | IndexedDB with Dexie.js |
| Offline application shell | Service worker and Web App Manifest |
| Authentication | Server-side sessions, Argon2id password hashing |
| Charts | Recharts |
| Relationship graph | React Flow |
| Unit testing | Vitest |
| Browser testing | Playwright |
| API documentation | OpenAPI, if a public API is exposed |
| Package manager | pnpm |

### 3.1 Architecture decisions

- PostgreSQL is the authoritative shared database.
- Drizzle provides typed schema definitions, queries, and migrations.
- IndexedDB stores local application data and pending changes.
- The service worker caches application resources; it is not the financial database.
- Server-side validation is mandatory even when the client uses Zod.
- Start with a modular monolith rather than microservices.
- Use background jobs only when asynchronous work genuinely requires them.

---

## 4. High-Level Architecture

```text
                 Browser / Installed PWA
                           |
                  Next.js Application
                           |
              +------------+------------+
              |                         |
        React Interface           Server Actions
              |                  / Route Handlers
              |                         |
        IndexedDB / Dexie                |
              |                         |
       Local Change Queue                |
              |                         |
              +------ Sync Protocol -----+
                                        |
                              Authentication Layer
                                        |
                              Application Services
                                        |
                               Drizzle ORM
                                        |
                                   PostgreSQL
                                        |
                      +-----------------+----------------+
                      |                 |                |
                 Ledger Events      Read Models       Backups
```

### 4.1 Main architectural boundaries

**Presentation layer:** Components, forms, navigation, charts, and local UI state.

**Offline data layer:** IndexedDB access, local records, queued commands, synchronization metadata, and local query operations.

**Application layer:** Validated commands, business rules, authorization, and financial operations.

**Persistence layer:** Drizzle queries, database transactions, constraints, indexes, and migrations.

**Synchronization layer:** Uploading local changes, downloading remote changes, retry handling, deduplication, and conflict resolution.

**Reporting layer:** Aggregations, account balances, charts, and export generation.

Keep these boundaries clear so that financial rules do not become scattered across React components.

---

## 5. Suggested Project Structure

```text
linked-coin/
├── docs/
│   ├── DEVELOPER_GUIDE.md
│   ├── DATA_MODEL.md
│   ├── SYNC_PROTOCOL.md
│   └── DEPLOYMENT.md
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── api/
│   │   │   ├── sync/
│   │   │   └── exports/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── charts/
│   │   └── query-builder/
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema/
│   │   ├── queries/
│   │   └── migrations/
│   ├── features/
│   │   ├── auth/
│   │   ├── accounts/
│   │   ├── ledger/
│   │   ├── transactions/
│   │   ├── people/
│   │   ├── tags/
│   │   ├── sync/
│   │   ├── query-builder/
│   │   ├── insights/
│   │   └── import-export/
│   ├── lib/
│   │   ├── auth/
│   │   ├── validation/
│   │   ├── money/
│   │   ├── dates/
│   │   ├── errors/
│   │   └── config/
│   ├── offline/
│   │   ├── database.ts
│   │   ├── repositories/
│   │   ├── outbox.ts
│   │   └── sync-engine.ts
│   └── types/
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.example
```

This is a proposed structure. Keep it practical as the application grows; do not create unnecessary abstractions for every small function.

---

## 6. Financial Data Model

The financial model is the most important part of Linked Coin. Design it before building dashboards and reports.

### 6.1 Core entities

| Entity | Purpose |
|---|---|
| `users` | User identity and account settings |
| `sessions` | Server-side authentication sessions |
| `accounts` | Cash, bank, savings, and other accounts |
| `people` | People involved in loans and repayments |
| `tags` | User-defined labels and categories |
| `ledger_transactions` | Logical financial events |
| `ledger_entries` | Individual debit and credit effects |
| `transaction_tags` | Many-to-many transaction/tag relationships |
| `transaction_links` | Relationships between financial events |
| `financial_events` | Immutable history of accepted commands or changes |
| `account_snapshots` | Rebuildable balance checkpoints |
| `sync_devices` | Registered device synchronization cursors |
| `sync_operations` | Idempotency and operation status where needed |
| `saved_queries` | Saved filter definitions |
| `import_jobs` | Import status and validation summaries |
| `audit_events` | Security-sensitive and administrative actions |

Avoid duplicating the same financial facts across tables unless there is a clear consistency strategy.

### 6.2 User ownership

Every user-owned entity must have an owner relationship.

Prefer ownership-aware foreign keys where practical. For example, an account should not be linkable to a transaction owned by another user.

All server-side reads and writes must enforce ownership. Knowing a record's UUID must never grant access to it.

### 6.3 Monetary representation

Never use JavaScript floating-point arithmetic as the source of truth for money.

Recommended options:

- Store amounts in integer minor units when the currency's minor-unit scale is known and stable.
- Use PostgreSQL `numeric` for values that require decimal precision or more flexible currency handling.

For an integer-minor-unit design:

```ts
type Money = {
  amountMinor: bigint;
  currency: string;
};
```

For example, ৳125.50 is represented as 12,550 poisha if the currency and supported precision use two decimal places.

Do not assume every currency has two decimal places. Define a currency metadata policy and validate supported precision.

When returning monetary values through JSON, serialize large integers as strings if necessary to avoid precision loss.

### 6.4 Transaction types

Use a controlled set of domain-level transaction types, such as:

- `INCOME`
- `EXPENSE`
- `TRANSFER`
- `LOAN_GIVEN`
- `LOAN_RECEIVED`
- `DEBT_REPAYMENT`
- `DEBT_REPAYMENT_RECEIVED`
- `ADJUSTMENT`
- `REVERSAL`

The exact types should reflect actual business semantics, not simply the form selected in the UI.

### 6.5 Double-entry ledger

Use balanced ledger entries to represent the financial effects of each transaction.

For an ordinary cash expense of ৳500:

- Credit the cash asset account by ৳500.
- Debit the relevant expense account by ৳500.

For a transfer of ৳1,000 from one owned bank account to another:

- Credit the source bank account by ৳1,000.
- Debit the destination bank account by ৳1,000.

The total debits and credits must balance within each transaction and currency.

A database constraint or application-level command must enforce the balancing invariant. Because PostgreSQL cannot express every cross-row invariant as a simple `CHECK`, use a carefully designed transaction-writing service, database transaction, and, if needed, a deferred constraint trigger.

If the first release uses a simplified account model, keep the same financial semantics and leave a clear path to a full double-entry implementation.

### 6.6 People and receivables

Represent money owed by a person as a receivable and money the user owes as a payable.

Example: lending ৳1,000 from cash to a friend:

- Cash decreases by ৳1,000.
- Receivable from that friend increases by ৳1,000.

Repayment of ৳400:

- Cash increases by ৳400.
- Receivable decreases by ৳400.

The outstanding debt becomes ৳600.

Support partial repayments, multiple loans per person, and links from repayments to the original loan or loans. Do not infer that every payment from a person is a loan repayment.

### 6.7 Time fields

Financial records should distinguish:

- `occurredAt`: when the financial event actually happened.
- `recordedAt`: when the server accepted the event.
- `createdAt`: when the logical record was initially created, if needed.
- `updatedAt`: when a mutable metadata field was changed, if such fields exist.
- `clientRecordedAt`: the device-reported time, treated as untrusted metadata.

Store absolute timestamps in UTC and convert them for display using the user's configured time zone.

A backdated transaction must retain its real occurrence date without breaking synchronization order.

---

## 7. Append-Only Financial History

### 7.1 Why history should be immutable

Financial records may need correction, but silently replacing an old financial event makes it difficult to understand previous balances and investigate mistakes.

The accepted financial history should therefore be append-only.

When a transaction is wrong:

1. Record a reversal or compensating event.
2. Record the corrected transaction.
3. Link the correction to the original event.
4. Recalculate affected balances and reports.

Do not permanently erase a financial event simply because the user entered the wrong amount.

User-created drafts may be editable before they become accepted ledger events. Descriptions and tags can also have their own edit policy, provided changes do not silently alter historical financial effects.

### 7.2 Event model

An event should contain enough information to reproduce its financial effect.

Conceptually:

```ts
type FinancialEvent = {
  id: string;
  userId: string;
  transactionId: string;
  eventType: string;
  payload: unknown;
  occurredAt: string;
  recordedAt?: string;
  clientRecordedAt?: string;
  deviceId?: string;
  idempotencyKey: string;
  schemaVersion: number;
};
```

This is a conceptual TypeScript shape, not a final database schema.

Validate payloads with versioned Zod schemas. Avoid accepting arbitrary unvalidated JSON as trusted financial input.

### 7.3 Event identity and ordering

- Generate stable UUIDs for client-created entities and events.
- Preserve event IDs across retries and synchronization.
- Assign server-controlled sequence numbers or cursors for ordering accepted events.
- Use occurrence timestamps for financial reporting, not as the sole synchronization order.
- Handle late-arriving offline events without changing their original occurrence time.

Do not assume client clocks are accurate or synchronized.

### 7.4 Rebuildability

Balance projections and dashboard aggregates should be reproducible from accepted ledger events.

If a projection is corrupted, the system should be able to rebuild it from the authoritative ledger history.

This requirement is more important than optimizing every read in the first release.

---

## 8. Snapshots, Compaction, and Historical Preservation

### 8.1 Snapshots

Snapshots are checkpoints used to speed up balance and history calculations.

A snapshot might record:

- Account ID.
- Balance at a defined sequence.
- Currency.
- Snapshot timestamp.
- Last included event sequence.
- Projection schema version.

When calculating a current balance, the system can load the latest valid snapshot and apply subsequent events.

### 8.2 Snapshots are not the source of truth

Do not delete original financial events merely because a snapshot exists.

Snapshots can become outdated, corrupted, or inconsistent after a bug fix. The original events are necessary to reconstruct the correct result.

### 8.3 Compaction policy

If storage optimization becomes necessary:

- Keep immutable events available in a recoverable archive.
- Record the sequence range covered by each snapshot.
- Validate snapshot checksums or reconciliation totals.
- Test restoration from the archive.
- Preserve event identities and links.
- Never discard the only recoverable copy of financial history.

A future archival system may move old events to cheaper storage, but this should not be part of the MVP until backup and recovery procedures are proven.

### 8.4 Reconciliation

Periodically compare:

- Ledger-derived balances.
- Snapshot balances.
- Account read models.
- Report aggregates.

If a mismatch occurs, mark the affected projection for rebuilding. Do not silently modify original events to make the totals match.

---

## 9. Drizzle ORM and PostgreSQL

### 9.1 Database configuration

Use environment variables rather than hardcoded credentials.

Example `.env.example`:

```dotenv
DATABASE_URL=postgresql://user:password@localhost:5432/linked_coin
SESSION_SECRET=replace_with_a_long_random_secret
APP_URL=http://localhost:3000
NODE_ENV=development
```

Never commit real credentials. Use a secret manager or protected deployment environment for production values.

### 9.2 Drizzle database client

Example `src/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString,
  max: 10,
});

export const db = drizzle(pool, { schema });

export { pool };
```

Choose a PostgreSQL driver supported by the deployment environment and configure connection pooling appropriately.

For serverless deployments, ensure the driver and pool strategy are compatible with the platform. Do not create an unbounded new connection pool for every request.

### 9.3 Drizzle configuration

Example `drizzle.config.ts`:

```ts
import "dotenv/config";

import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
```

Install the relevant packages for the chosen driver and Drizzle tooling. Keep runtime dependencies separate from development-only migration tooling where appropriate.

### 9.4 Example schema

Example `src/db/schema/users.ts`:

```ts
import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    username: text("username").notNull(),

    passwordHash: text("password_hash").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
  ],
);
```

Username normalization and case-insensitive uniqueness must be defined explicitly. A normalized username column or an appropriate PostgreSQL index can enforce the chosen policy.

Example `src/db/schema/accounts.ts`:

```ts
import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    name: text("name").notNull(),

    accountType: text("account_type").notNull(),

    currency: text("currency").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    archivedAt: timestamp("archived_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
  ],
);
```

These are starting examples. In production, use database enums or validated domain values where appropriate, ownership-aware foreign keys, and constraints for supported account types and currencies.

### 9.5 Ledger schema requirements

The final schema should include:

- UUID primary keys.
- Explicit owner relationships.
- Transaction grouping.
- Immutable financial events.
- Ledger entries with exact amounts and currency.
- Stable idempotency keys.
- Server-assigned synchronization sequence or cursor.
- Indexes for the most common filters.
- Foreign keys and appropriate delete restrictions.
- Version fields for evolving event payloads.

Do not rely only on TypeScript types to enforce database integrity.

### 9.6 Migrations

Use Drizzle Kit to generate and apply migrations.

Typical workflow:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Review generated SQL before applying it to production. Use a controlled migration process in deployment, and do not run schema-changing commands automatically on every web request.

Seed development data separately from production migrations.

### 9.7 Database transactions

Financial operations that change multiple ledger rows must execute atomically.

Conceptually:

```ts
await db.transaction(async (tx) => {
  // 1. Validate ownership and business rules.
  // 2. Insert the logical transaction.
  // 3. Insert balanced ledger entries.
  // 4. Append the immutable financial event.
  // 5. Update required synchronization metadata.
});
```

The transaction must either commit all related financial changes or commit none of them.

Use database constraints and concurrency controls to protect invariants under simultaneous requests.

---

## 10. Offline-First PWA

### 10.1 Responsibilities

The offline architecture has three distinct parts:

**Service worker:** Caches the application shell and selected static resources.

**IndexedDB:** Stores local application data, offline-created records, and pending operations.

**Server:** Stores authoritative shared financial history and synchronizes it across devices.

Do not treat service-worker caching as a replacement for IndexedDB or server backups.

### 10.2 Dexie.js database

Create versioned local tables for:

- Accounts.
- People.
- Tags.
- Transactions and ledger representations needed by the client.
- Local financial events.
- Pending synchronization operations.
- Synchronization cursors.
- Local preferences.

Use stable UUIDs so that offline-created records retain their identity after synchronization.

Local records should include synchronization metadata such as:

- `pending`
- `synced`
- `failed`

Avoid storing passwords, password hashes, or reusable server credentials in IndexedDB.

### 10.3 Offline write flow

When a user creates an expense offline:

1. Validate the input.
2. Generate stable IDs for the command and related entities.
3. Write the local transaction and pending operation atomically in IndexedDB.
4. Update the UI immediately.
5. Mark the operation as pending synchronization.
6. Attempt synchronization when connectivity is available.
7. Mark it as server-confirmed only after a successful acknowledgement.

The local UI must not claim the server has permanently stored an event before receiving confirmation.

### 10.4 Local data protection

Browser storage can be evicted, cleared, or lost if a device is damaged.

Therefore:

- Request persistent browser storage where supported.
- Explain when financial changes exist only on the current device.
- Show pending changes clearly.
- Provide manual export or backup options.
- Synchronize promptly when possible.
- Detect and report failed writes and failed sync attempts.
- Test recovery after browser refreshes, restarts, and offline periods.

No web application can guarantee zero data loss on every device. Linked Coin should minimize risk, communicate limitations honestly, and provide recoverable backups.

### 10.5 Service worker behavior

The service worker should:

- Cache the app shell and versioned static resources.
- Avoid caching authenticated financial API responses in a shared cache.
- Avoid serving stale private data after logout.
- Support application updates without corrupting local IndexedDB data.
- Keep database schema migrations compatible with supported application versions.

A service worker should never be the sole location of financial records.

---

## 11. Reliable Synchronization

### 11.1 Synchronization model

Use an offline outbox and server acknowledgement protocol.

The client sends pending operations to the server. The server validates, deduplicates, and atomically accepts valid operations. The server then returns acknowledgements and remote events since the client's last known cursor.

Conceptually:

```text
Local command
    ↓
IndexedDB transaction + outbox
    ↓
Sync request
    ↓
Server authentication and validation
    ↓
Idempotency check
    ↓
PostgreSQL transaction
    ↓
Server acknowledgement + cursor
    ↓
Client marks operation synchronized
```

### 11.2 Idempotency

Network requests may be delivered more than once.

Every operation must have a stable idempotency key or operation ID. The server must prevent the same operation from creating duplicate financial effects.

Enforce this using a unique database constraint scoped appropriately to the authenticated user or device.

If a client retries a request after a timeout, the server should return the original result when the operation was already accepted.

### 11.3 Conflict handling

Avoid last-write-wins behavior for financial amounts and ledger events.

Two devices may create legitimate financial events while offline. These should normally merge as separate events.

If two devices edit the same mutable field, apply an explicit conflict policy. Depending on the field, the system may:

- Accept a server-authoritative update.
- Ask the user to resolve the conflict.
- Keep both versions for review.
- Apply a documented merge rule.

A conflict must never silently destroy an accepted financial event.

### 11.4 Cursor-based synchronization

The server should assign a monotonic synchronization sequence or cursor to accepted events.

The client stores its last confirmed cursor and requests changes after that position.

Do not use timestamps alone as synchronization cursors. Events can arrive late, device clocks can be wrong, and multiple events can share a timestamp.

### 11.5 Partial failures

A batch can contain multiple operations. The server should return explicit per-operation outcomes or define a clear atomic batch policy.

The client must retain failed operations and retry safely.

Distinguish:

- Temporary network failures.
- Authentication expiry.
- Validation errors.
- Permanent business-rule violations.
- Duplicate requests that were already accepted.
- Schema-version incompatibilities.

Do not discard the outbox simply because one operation failed.

### 11.6 Multiple devices

Register devices with stable identifiers and track synchronization progress where necessary.

Support:

- New device bootstrap.
- Initial account data download.
- Incremental updates.
- Device reconnection after extended offline periods.
- Device logout and session revocation.
- Recovery after local storage is cleared.

Server-side authorization must remain authoritative regardless of what data is stored locally.

---

## 12. Unified Query Builder

### 12.1 User experience

The query builder is a central feature of Linked Coin.

Users should be able to type a search expression or construct a query through selectable filter chips.

Example:

`date:2026-01-01..2026-01-31 tag:Food account:Cash amount:>500 type:expense`

Possible UI flow:

1. The user types `tag:`.
2. Autocomplete displays available tags.
3. The user selects `Food`.
4. A filter chip is created.
5. The user adds a date range and minimum amount.
6. Results update using the combined query.
7. The user saves the query or exports its results.

The textual syntax is an optional convenience. The structured query representation should be the authoritative format.

### 12.2 Query AST

Parse input into a typed abstract syntax tree rather than concatenating user-provided strings into SQL.

Conceptual shape:

```ts
type TransactionQuery = {
  date?: {
    from?: string;
    to?: string;
  };

  accountIds?: string[];
  personIds?: string[];
  tagIds?: string[];

  transactionTypes?: string[];

  amount?: {
    min?: string;
    max?: string;
  };

  text?: string;

  sort?: {
    field: "occurredAt" | "amount";
    direction: "asc" | "desc";
  };

  groupBy?: "day" | "month" | "tag" | "account" | "person";
};
```

Extend this model with explicit AND, OR, and NOT groups when the UI needs more complex logic.

Validate the AST with Zod on both client and server. Limit query complexity, number of selected filters, and text lengths.

### 12.3 Query execution

Translate the validated AST into parameterized Drizzle queries.

- Always apply user ownership filters.
- Validate IDs and enum values.
- Parameterize all user-controlled values.
- Restrict expensive full-text searches where necessary.
- Use indexes for common combinations.
- Separate paginated transaction results from aggregate calculations.

Do not allow user-supplied query syntax to become raw SQL.

### 12.4 Saved queries

Saved queries should store:

- Query name.
- Validated query AST.
- Optional display preferences.
- Sort and grouping options.
- Creation and update timestamps.

Revalidate saved queries when loaded because query formats can change between application versions.

### 12.5 Pagination

All potentially large lists must support pagination.

Suggested page-size options:

- 20
- 50
- 100
- 250

Use cursor pagination for large transaction histories and synchronization feeds. Offset pagination may be appropriate for small reference lists or cases that require direct page navigation.

Use deterministic ordering with a stable tie-breaker such as an ID or server sequence.

Exporting a filtered result must retrieve all matching records, not just the currently visible page.

---

## 13. Charts and Financial Analysis

### 13.1 Chart types

Use Recharts for common dashboards:

- Line charts for account balance and cash-flow trends.
- Bar charts for monthly income and expenses.
- Pie or donut charts for category distribution, where useful.
- Stacked charts for comparisons across categories.
- Tables for exact financial totals.

Use React Flow or a graph-specific library for relationships between accounts, people, loans, and transfers.

### 13.2 Drill-down behavior

Every chart should define what happens when a user selects a data point.

Examples:

- Select a month to open transactions for that month.
- Select a tag to filter spending by that tag.
- Select a person to view loans and repayments.
- Select an account to see balance history.

Pass the relevant query state into the transaction list rather than building a separate filtering implementation for every chart.

### 13.3 Financial definitions

Document and reuse consistent formulas.

**Net worth / net position:**

Assets minus liabilities.

**Net cash flow:**

Cash inflows minus cash outflows during a period, excluding transfers between the user's own accounts.

**Spending by category:**

Sum of qualifying expense events within the selected period.

**Outstanding receivable:**

Unpaid amount owed to the user.

**Outstanding payable:**

Unpaid amount the user owes.

Do not add a receivable to cash before the user actually receives repayment.

### 13.4 Performance

Use server-side SQL aggregations for large datasets. Avoid downloading thousands of transactions into the browser merely to calculate a chart.

Cache derived reports only when measurements justify it, and make sure cache invalidation follows accepted ledger changes.

---

## 14. Import and Export

### 14.1 Export formats

**CSV:** Useful for spreadsheets and simple transaction reports.

**JSON:** Useful for complete backups and migration between systems.

**XLSX:** Useful for formatted financial reports and spreadsheet workflows.

**Google Sheets:** A future optional integration that requires explicit account authorization and appropriate API permissions.

### 14.2 Export options

Users should be able to select:

- Full account data.
- A date range.
- One or more accounts.
- Tags or people.
- Transaction types.
- A saved query.
- A specific report.

For full backups, include the information required to reconstruct supported records and their relationships. Explain whether the export contains immutable event history, metadata, or both.

### 14.3 Import workflow

1. Upload the file.
2. Detect the format and inspect the columns.
3. Let the user map columns to Linked Coin fields.
4. Preview parsed records.
5. Validate dates, currencies, amounts, accounts, and tags.
6. Detect possible duplicates.
7. Show errors and warnings.
8. Confirm the import.
9. Commit using a documented atomicity policy.
10. Provide an import summary and error report.

For large imports, use a staging table or import job so invalid records can be inspected without partially corrupting financial data.

### 14.4 Duplicate detection

Do not rely on amount and date alone to identify duplicates; two legitimate expenses can have the same values.

Use source transaction IDs when available. Otherwise, generate a fingerprint from selected source fields and let users review ambiguous matches.

Preserve the original source data where practical so imports can be audited.

### 14.5 Security

- Enforce file-size limits.
- Validate file content rather than trusting file extensions.
- Reject malformed or unsupported files.
- Avoid executing spreadsheet formulas.
- Escape values that could trigger formula injection in CSV exports.
- Ensure exports contain only the requesting user's authorized data.
- Use temporary storage with controlled retention for import files.

---

## 15. Authentication and Authorization

### 15.1 Initial authentication scope

Keep the first release simple:

- Sign up.
- Sign in.
- Sign out.
- Session validation.
- Password change.
- Session revocation.

Avoid implementing multiple authentication providers before the basic flow is secure and reliable.

### 15.2 Password storage

Use Argon2id with a suitable, deployment-tested configuration and unique salts.

Never store plaintext passwords or reversibly encrypted passwords.

Add rate limiting to sign-in and sign-up endpoints. Use generic authentication errors where appropriate to reduce account enumeration risks.

### 15.3 Sessions

Use server-managed sessions with high-entropy random tokens.

Store only a hash of the session token in the database where practical. Set browser cookies with:

- `HttpOnly`
- `Secure` in production
- An appropriate `SameSite` policy
- A restricted path and lifetime

Rotate or revoke sessions when needed, especially after password changes or suspicious activity.

### 15.4 Authorization

Every financial operation must validate:

1. The user is authenticated.
2. The user owns the affected records.
3. Related accounts, tags, and people belong to the same owner.
4. The operation satisfies financial business rules.

Apply authorization in the server-side service layer and database queries, not only in the interface.

### 15.5 Additional security controls

- CSRF protection where required by the cookie and request model.
- Request body and query limits.
- Security headers.
- Safe error handling.
- Dependency updates.
- Audit records for important security actions.
- No passwords, session tokens, or sensitive financial payloads in logs.

Do not assume that UUIDs alone provide authorization.

---

## 16. API and Application Service Design

Next.js Server Actions and Route Handlers can be used for internal application operations. Keep a consistent service layer so business logic is not duplicated between them.

### 16.1 Example endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/signin` | Authenticate |
| POST | `/api/auth/signout` | End a session |
| GET | `/api/accounts` | List owned accounts |
| POST | `/api/accounts` | Create an account |
| GET | `/api/transactions` | Query transactions |
| POST | `/api/transactions` | Record a financial command |
| POST | `/api/transfers` | Create an atomic transfer |
| POST | `/api/loans` | Record a loan |
| POST | `/api/repayments` | Record a repayment |
| POST | `/api/sync/push` | Submit pending operations |
| GET | `/api/sync/pull` | Retrieve remote changes |
| POST | `/api/imports` | Start an import |
| POST | `/api/exports` | Generate an export |

These endpoints are a proposed contract. Final request and response schemas should be documented with Zod and, where useful, OpenAPI.

### 16.2 Command-oriented operations

For financial changes, prefer explicit commands such as:

- `createExpense`
- `recordIncome`
- `transferBetweenAccounts`
- `recordLoan`
- `recordRepayment`
- `reverseTransaction`

Each command should validate input, verify ownership, enforce invariants, and commit the financial effects atomically.

This is safer than allowing generic endpoints to update arbitrary ledger columns.

### 16.3 Error format

Return structured errors with:

- A stable error code.
- A safe human-readable message.
- Field-level validation details where appropriate.
- A retryable indicator when meaningful.

Never expose SQL statements, secrets, stack traces, or internal infrastructure details to the client.

---

## 17. Database Performance

### 17.1 Indexing

Consider indexes for common access patterns, including:

- Accounts by user.
- Transactions by owner and occurrence time.
- Ledger entries by account and event sequence.
- Tags by owner and normalized name.
- Transactions by type.
- Transactions by linked person.
- Synchronization events by owner and server sequence.
- Idempotency keys.
- Sessions by token hash or user.

Use composite indexes that match real query patterns. Do not add every possible index: excessive indexes increase write cost and storage.

### 17.2 Query performance

- Select only required columns.
- Use pagination for large result sets.
- Avoid N+1 query patterns.
- Aggregate large datasets in PostgreSQL.
- Use `EXPLAIN ANALYZE` on representative slow queries.
- Monitor connection pool saturation.
- Keep transactions short.
- Avoid long-running exports inside ordinary interactive requests.

### 17.3 Read models

The immutable ledger is the source of truth, but dashboards may use derived read models for fast queries.

Read models must be rebuildable and should be updated consistently with accepted events or through a reliable processing mechanism.

If asynchronous projection processing is introduced, expose its freshness where it matters and provide reconciliation tools.

### 17.4 Avoid premature complexity

Do not start with microservices, Kafka, Kubernetes, or a large distributed caching system unless actual requirements justify them.

A well-structured Next.js application, PostgreSQL, and a reliable offline synchronization protocol are sufficient for an initial production release.

---

## 18. Data Retention, Backups, and Recovery

### 18.1 Backup strategy

Maintain backups independent of the primary database server.

At minimum, define:

- Backup frequency.
- Retention period.
- Encryption.
- Access controls.
- Backup failure alerts.
- Restoration procedures.
- Recovery point objective (RPO).
- Recovery time objective (RTO).

A backup stored only on the same machine as the database is not sufficient protection against server loss.

### 18.2 Restore testing

Periodically restore a backup into an isolated environment and verify:

- Schema and migration compatibility.
- User and account records.
- Ledger integrity.
- Transaction counts and reconciliation totals.
- Application startup.
- Critical financial queries.

A successful backup job does not prove that recovery will work.

### 18.3 User exports

Provide a practical way for users to download their data. A full export should document its scope and format.

Keep user-requested exports protected and delete temporary server-side copies according to a defined retention policy.

### 18.4 Data deletion

Define a deletion policy that considers account removal, backups, exports, legal obligations, and the need to preserve ledger integrity.

Append-only history does not mean that every personal detail must be retained forever. Separate financial integrity requirements from personal metadata and document the applicable deletion or anonymization process.

---

## 19. Testing Strategy

### 19.1 Unit tests

Test pure business rules:

- Monetary calculations.
- Transfer balancing.
- Loan and repayment calculations.
- Currency precision.
- Transaction classification.
- Query parsing and validation.
- Date-range boundaries.
- Event reversal behavior.
- Snapshot reconciliation.

### 19.2 Integration tests

Use a real PostgreSQL test instance or an appropriately isolated test database.

Test:

- Drizzle queries and migrations.
- Foreign-key and ownership constraints.
- Concurrent transfers.
- Duplicate synchronization requests.
- Partial repayment scenarios.
- Event reversal and correction.
- Rollback after an invalid ledger operation.
- Pagination under concurrent inserts.

SQLite-only tests are not sufficient for validating PostgreSQL-specific behavior.

### 19.3 Offline tests

Test:

- Create an expense offline.
- Refresh the browser while offline.
- Close and reopen the application.
- Reconnect and synchronize.
- Retry after a timeout.
- Receive the same server event twice.
- Handle an expired session.
- Recover after one operation in a batch fails.
- Open the app after a new version is deployed.

### 19.4 End-to-end tests

Use Playwright to test complete workflows:

1. Sign up and sign in.
2. Create an account.
3. Record income and an expense.
4. Transfer money between accounts.
5. Record a loan and partial repayment.
6. Filter transactions using the query builder.
7. Open a chart and drill down.
8. Export filtered records.
9. Import valid data and reject invalid data.
10. Work offline and synchronize after reconnecting.
11. Verify one user cannot access another user's records.

### 19.5 Financial invariants

Automated tests must verify that:

- Every completed double-entry transaction balances.
- A transfer does not count as ordinary income or expense.
- A repayment does not create a second loan.
- Retrying a command does not duplicate a financial effect.
- Reversals preserve the original event.
- Snapshots reconcile with ledger-derived balances.
- Archived accounts retain historical transactions.

---

## 20. Performance, Reliability, and Monitoring

### 20.1 What to monitor

Track operational metrics such as:

- Request latency and error rate.
- Database connection usage.
- Slow queries.
- Failed login attempts and rate limits.
- Sync success and failure rates.
- Pending synchronization backlog.
- Import/export failures.
- Background task failures, if background processing is used.
- Backup success and restore-test results.

Do not log raw financial descriptions, passwords, session tokens, or complete transaction payloads by default.

### 20.2 User-facing reliability

Provide clear feedback when:

- The device is offline.
- Changes are saved locally but not synchronized.
- Synchronization is retrying.
- A record needs user attention.
- The server confirms the change.
- The browser is low on available storage, where detectable.

Monitoring is not just collecting graphs. Establish thresholds, alerts, incident procedures, and regular reviews of recurring failures.

### 20.3 Performance targets

Define measurable targets after establishing a baseline. Useful initial goals include:

- Fast local transaction entry.
- Responsive filtering for ordinary personal datasets.
- Bounded memory usage during large exports.
- Predictable synchronization retries.
- No duplicate financial effects under retries.
- Clear visibility into data that has not reached the server.

Do not promise specific throughput or user capacity before load testing on the intended deployment.

---

## 21. Deployment and Configuration

### 21.1 Environments

Keep separate configurations for:

- Local development.
- Automated tests.
- Staging.
- Production.

Use separate databases and credentials. Never test destructive migrations against production.

### 21.2 Production deployment checklist

- [ ] Configure HTTPS.
- [ ] Set secure environment variables.
- [ ] Configure PostgreSQL backups.
- [ ] Apply reviewed Drizzle migrations.
- [ ] Verify session cookie settings.
- [ ] Enable rate limiting.
- [ ] Configure security headers.
- [ ] Verify user isolation.
- [ ] Test offline behavior.
- [ ] Test synchronization retries.
- [ ] Test export and restore procedures.
- [ ] Configure error and performance monitoring.
- [ ] Confirm no secrets are committed.
- [ ] Test the production build.
- [ ] Document rollback procedures.

### 21.3 Deployment commands

The exact scripts depend on `package.json`, but a typical workflow is:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Apply database migrations through a controlled deployment step, then start the application using the deployment platform's process manager.

Do not assume the project already has every script above; define them explicitly.

### 21.4 Environment validation

Validate required environment variables at startup with Zod. Fail fast when required configuration is missing.

Do not expose database credentials or server-only secrets through client-side environment variables.

---

## 22. Development Roadmap

Build the product in phases, with reliability gates between phases.

### Phase 1 — Foundation

- Initialize Next.js and strict TypeScript.
- Configure Tailwind CSS.
- Configure Drizzle and PostgreSQL.
- Add Zod validation.
- Create the initial schema and migrations.
- Implement username/password authentication.
- Establish reusable UI components and error handling.

**Completion condition:** A user can securely sign in, and database ownership rules are tested.

### Phase 2 — Core financial ledger

- Accounts.
- Tags.
- Income and expenses.
- Transfers.
- Ledger entries and immutable events.
- Reversals and corrections.
- Account balance calculations.
- Basic transaction history.

**Completion condition:** Core financial invariants pass automated tests.

### Phase 3 — Offline-first foundation

- Configure IndexedDB with Dexie.
- Implement local repositories.
- Add the outbox.
- Support offline transaction creation.
- Add the service worker and manifest.
- Display pending synchronization status.

**Completion condition:** Local writes survive ordinary reloads and reconnect safely without duplicate server effects.

### Phase 4 — Synchronization

- Push and pull contracts.
- Stable event IDs.
- Idempotency enforcement.
- Server cursors.
- Retry policies.
- Conflict handling.
- Initial device bootstrap.

**Completion condition:** Offline changes can be merged across multiple devices and failure scenarios are tested.

### Phase 5 — People and debt tracking

- People management.
- Loans and repayments.
- Outstanding balances.
- Transaction relationships.
- Debt history and reports.

**Completion condition:** Partial repayments and multiple loans produce correct balances.

### Phase 6 — Advanced search

- Multi-select query builder.
- Filter chips and autocomplete.
- Nested tags.
- AND/OR/NOT conditions.
- Saved queries.
- Cursor pagination.
- Query-specific exports.

**Completion condition:** The same validated query produces consistent results across the transaction list, exports, and reports.

### Phase 7 — Dashboard and visualizations

- Cash-flow charts.
- Spending by tag.
- Account balance history.
- Debt summaries.
- Drill-down interactions.
- Relationship graph.

**Completion condition:** Chart totals reconcile with the underlying ledger.

### Phase 8 — Import and export

- CSV import/export.
- JSON backup.
- XLSX reports.
- Import validation and duplicate review.
- Large-export handling.
- Recovery documentation.

**Completion condition:** Users can export and re-import supported data without unintended duplication.

### Phase 9 — Production hardening

- Backup automation.
- Restore tests.
- Performance profiling.
- Security review.
- Offline failure testing.
- Monitoring and alerts.
- Deployment and rollback documentation.

**Completion condition:** Critical failure scenarios are tested and recovery procedures are documented.

### Future enhancements

Consider these only after the core product is stable:

- Google Sheets synchronization.
- Optional bank imports.
- Recurring transactions.
- Budget planning.
- Shared household finances.
- More advanced forecasting.
- Additional authentication methods.
- Encrypted user-controlled backup options.

---

## 23. Definition of Done

A feature is not complete merely because its interface works.

Before marking a financial feature complete, verify:

- [ ] Inputs are validated on the server.
- [ ] User ownership is enforced.
- [ ] Financial calculations use exact arithmetic.
- [ ] Related database changes are atomic.
- [ ] Duplicate requests cannot duplicate financial effects.
- [ ] Offline behavior is defined.
- [ ] Synchronization behavior is defined.
- [ ] Error states are visible and recoverable.
- [ ] Relevant tests exist.
- [ ] Large lists use pagination.
- [ ] Relevant indexes exist where justified.
- [ ] Logs avoid exposing sensitive data.
- [ ] Export and history behavior are documented.
- [ ] Migrations are reviewed.

---

## 24. Important Edge Cases

The implementation must account for the following situations:

1. A user records a transaction offline and submits it repeatedly.
2. A transaction is backdated.
3. Two devices create transactions at the same time.
4. A device clock is inaccurate.
5. A transfer succeeds locally but the server request times out.
6. A loan is repaid in several installments.
7. A repayment is larger than the remaining debt.
8. An account is archived while it has pending synchronization operations.
9. A tag is renamed or archived.
10. A saved query refers to a removed tag.
11. A browser clears its local database.
12. An application update changes the IndexedDB schema.
13. An import contains duplicate or malformed records.
14. A CSV export contains text that resembles a spreadsheet formula.
15. A user requests data belonging to another account owner.
16. A backup succeeds but restoration fails.
17. A projection or snapshot does not match the original ledger.
18. A user creates financial records in different currencies.
19. A synchronization cursor is stale or invalid.
20. An old offline client sends an event using a previous schema version.

Each edge case should have a documented behavior and tests wherever applicable.

---

## 25. Final Architecture Rules

These rules should guide all implementation decisions:

1. **Use Drizzle ORM and PostgreSQL. Do not add Prisma.**
2. Keep the application as a modular monolith until a genuine scaling requirement justifies splitting it.
3. Treat the server's accepted financial history as the shared source of truth.
4. Keep financial history immutable; correct mistakes with explicit compensating events.
5. Use exact monetary arithmetic.
6. Use PostgreSQL transactions and constraints for financial integrity.
7. Use IndexedDB for offline data and a separate outbox for pending synchronization.
8. Never silently discard unsynchronized financial operations.
9. Use stable IDs, idempotency keys, and server-issued synchronization cursors.
10. Do not use last-write-wins for financial events.
11. Apply ownership checks to every protected server operation.
12. Make snapshots and reporting projections rebuildable.
13. Use one validated query model across search, charts, and exports.
14. Paginate every potentially large list.
15. Keep backups independent of the primary server and test restoration.
16. Build advanced features only after the core ledger and synchronization protocol are reliable.

## Conclusion

Linked Coin should be built around a dependable financial ledger, an offline-first user experience, and a synchronization protocol that handles retries, multiple devices, and network failures safely.

**The recommended implementation order is: PostgreSQL + Drizzle schema → authentication → financial ledger → automated integrity tests → IndexedDB offline storage → synchronization → query builder → charts → import/export → production hardening.**

Getting the financial model and synchronization rules right early will make future features easier to build without sacrificing data integrity.