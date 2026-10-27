# AI Coding Agent Task: Build the Complete Linked Coin Application

## Project

- **Name:** Linked Coin
- **Repository:** https://github.com/shaishab316/linked-coin
- **Current status:** Username/password authentication and basic account management are implemented.
- **Current ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Framework:** Next.js App Router + TypeScript
- **UI:** React + Tailwind CSS

Your job is to continue developing the existing application into a complete, reliable, offline-first personal finance management system.

**Do not rebuild the project from scratch. Inspect the existing codebase, preserve working functionality, and implement the missing features using the current architecture.**

## 1. Start by auditing the repository

Before modifying files:

1. Inspect `package.json`, the App Router pages, components, authentication implementation, database client, all Drizzle schemas, migrations, validation schemas, and existing API routes or Server Actions.
2. Identify exactly which features are already implemented, partially implemented, or missing.
3. Check whether the existing account creation and archive functionality work correctly.
4. Inspect the existing authentication and session implementation before changing it.
5. Check the database schema and migration history before adding tables.
6. Identify existing conventions for errors, validation, UI components, naming, and testing.

Create `docs/IMPLEMENTATION_STATUS.md` with a checklist of implemented, partial, and missing features.

Do not assume that a feature exists merely because its schema or UI component exists. Verify the actual end-to-end behavior.

## 2. Non-negotiable technology rules

Use the existing stack:

- Next.js App Router.
- TypeScript with strict mode.
- PostgreSQL.
- Drizzle ORM and Drizzle Kit.
- Zod for input validation.
- Tailwind CSS.
- IndexedDB with Dexie.js for offline storage.
- Recharts for charts.
- React Flow for relationship visualization, when appropriate.
- Vitest for unit and integration tests.
- Playwright for end-to-end tests.

Rules:

- Do not introduce Prisma.
- Do not replace Drizzle with another ORM.
- Do not replace the existing authentication system without a demonstrated security or correctness problem.
- Do not introduce microservices unnecessarily.
- Do not add dependencies without a clear purpose.
- Do not use floating-point numbers for financial calculations.
- Do not expose database credentials or server secrets to the browser.
- Do not implement fake functionality using static or hardcoded data.

## 3. Implement the missing database schemas

The existing schema directory currently includes `auth.ts` and `accounts.ts`. Audit the project before adding the following schemas, avoiding duplicate tables and overlapping responsibilities.

Recommended domain modules:

```text
src/db/schema/
  auth.ts
  accounts.ts
  people.ts
  tags.ts
  ledger-transactions.ts
  ledger-entries.ts
  financial-events.ts
  transaction-tags.ts
  transaction-links.ts
  account-snapshots.ts
  sync-devices.ts
  sync-operations.ts
  saved-queries.ts
  import-jobs.ts
  index.ts
```

Adjust filenames to match existing project conventions.

### Required entities

**Accounts**
- Cash, bank, savings, digital wallet, credit, and custom account types.
- Currency and description.
- Archive status.
- Creation and update timestamps.
- Correct owner relationships.

**People**
- A user's contacts for tracking money owed to or by other people.
- Name, optional contact information, notes, and timestamps.
- Archiving without deleting financial history.

**Tags**
- User-owned tags.
- Optional parent tag for hierarchy.
- Name, description, and archive status.
- Safe handling of tags referenced by existing transactions.

**Ledger transactions**
- Logical financial transaction.
- Transaction type.
- Occurrence timestamp.
- Description and notes.
- Status and reversal/correction references where appropriate.
- Stable UUID.
- Owner relationship.

**Ledger entries**
- Account or financial ledger target.
- Exact signed or debit/credit amount.
- Currency.
- Link to the logical transaction.
- Validated financial direction.

**Financial events**
- Immutable accepted financial events.
- Stable event ID.
- Schema version.
- Event type and validated payload.
- Occurrence timestamp.
- Server acceptance timestamp or sequence.
- Idempotency key.
- Optional device ID.

**Transaction relationships**
- Links between loans and repayments.
- Reversals and corrections.
- Links between related transactions.
- Support for multiple repayments against one loan.

**Synchronization**
- Registered devices where needed.
- Pending operation identifiers.
- Idempotency enforcement.
- Server-issued synchronization cursor.
- Explicit operation status.

**Other**
- Account snapshots or derived balance checkpoints.
- Saved query definitions.
- Import job status and validation summaries.

Use proper PostgreSQL types, foreign keys, unique constraints, indexes, and validated domain values.

For ownership-sensitive relationships, enforce that linked accounts, tags, people, and transactions belong to the same user. Use composite foreign keys or equivalent database constraints where practical, alongside server-side authorization.

Generate and review Drizzle migrations. Never reset or drop existing production data to make the schema fit.

## 4. Financial correctness comes first

Implement the ledger and business rules before dashboards and visualizations.

### Supported financial operations

1. Income.
2. Expense.
3. Transfer between the user's own accounts.
4. Money lent to another person.
5. Money borrowed from another person.
6. Partial loan repayment.
7. Repayment received.
8. Transaction reversal.
9. Corrected transaction.
10. Opening balance or controlled balance adjustment.

### Exact monetary arithmetic

Use integer minor units when supported by the currency's precision, or PostgreSQL `numeric` with an appropriate exact-decimal strategy.

Do not calculate financial values using JavaScript `number` arithmetic without a deliberate precision-safe representation.

Validate currency precision and serialize large integer amounts safely across JSON boundaries.

### Double-entry invariants

Where the ledger uses double-entry accounting, every completed transaction must balance within its currency.

For a ৳500 expense:
- Reduce the cash asset by ৳500.
- Record the corresponding expense effect.

For a ৳1,000 transfer between owned accounts:
- Reduce the source account by ৳1,000.
- Increase the destination account by ৳1,000.
- Do not count the transfer as income or expense.

For a ৳1,000 loan given to a friend:
- Reduce cash by ৳1,000.
- Increase the receivable from that person by ৳1,000.

For a ৳400 repayment:
- Increase cash by ৳400.
- Reduce the receivable by ৳400.

The remaining receivable is ৳600.

Perform all related writes atomically through PostgreSQL transactions. Enforce invariants through constraints and command handlers, not only frontend validation.

Never silently overwrite accepted financial events. Correct them through explicit reversals and replacement events.

## 5. Build the complete transaction management UI

Create a transaction section with:

- Transaction history.
- Create income form.
- Create expense form.
- Transfer form.
- Loan form.
- Repayment form.
- Edit allowed metadata.
- Reverse or correct a financial transaction.
- Transaction detail view.
- Filters and sorting.
- Pagination.
- Search.
- Empty, loading, error, and offline states.

Each transaction should support the appropriate fields:

- Amount.
- Currency.
- Date and time.
- Account.
- Transaction type.
- Tags.
- Person, if relevant.
- Description.
- Optional notes.
- Related transaction references.

Make the most common action—recording an income or expense—fast and simple.

Do not allow generic edits to silently change an accepted transaction's financial effect.

## 6. Complete account management

Extend the existing account page rather than replacing it unnecessarily.

Implement:

- Account list.
- Account creation and validation.
- Account detail page.
- Current balance.
- Balance history.
- Income and expenses by account.
- Transfers in and out.
- Account-specific transaction history.
- Edit account metadata.
- Archive and restore.
- Currency-aware totals.

The displayed balance must come from the ledger or a verified projection, not from a hardcoded initial value.

Do not sum incompatible currencies into one total without a defined exchange-rate policy.

## 7. Build people and debt tracking

Create a People section.

Users should be able to:

- Add and archive people.
- Record money lent.
- Record money borrowed.
- Record partial repayments.
- Link repayments to original loans.
- See outstanding receivables and payables.
- View the complete history for each person.
- Filter transactions by person.
- See debt history and repayment progress.

Validate repayment amounts and outstanding balances. Handle overpayments using an explicit business rule rather than silently producing negative debt.

## 8. Build tags and hierarchical categories

Implement:

- Create, edit, and archive tags.
- Optional nested tags.
- Assign multiple tags to a transaction.
- Filter transactions by one or more tags.
- Include descendants where requested.
- Show spending by tag.
- Preserve historical transactions when tags are archived.

Prevent invalid hierarchy cycles and enforce ownership of parent tags.

## 9. Build a unified advanced query builder

Implement one reusable query builder used by:

- Transaction history.
- Reports.
- Charts.
- Account history.
- People and debt history.
- Filtered exports.

Support filters for:

- Date range.
- Account.
- Person.
- Tags and nested tags.
- Transaction type.
- Minimum and maximum amount.
- Currency.
- Text search.
- Included and excluded values.
- Sorting.
- Grouping.
- Saved queries.

Example query:

`date:2026-01-01..2026-01-31 tag:Food account:Cash amount:>500 type:expense`

The UI should use filter chips, autocomplete, keyboard-friendly interactions, and clear/reset controls.

Store queries as a validated, versioned query AST. Do not concatenate user input into SQL. Translate validated filters into parameterized Drizzle queries.

Support AND, OR, and NOT semantics where appropriate.

All large transaction lists must be paginated. Prefer stable cursor pagination for large histories. Offer reasonable page sizes, such as 20, 50, 100, and 250.

Exporting a query must export every matching record, not just the current page.

## 10. Build the dashboard and analytics

Create a useful dashboard with live database-derived data:

- Total assets.
- Total liabilities.
- Net position.
- Account balances.
- Income versus expenses.
- Monthly cash flow.
- Spending by category.
- Recent transactions.
- Outstanding debt by person.
- Balance history.
- Pending synchronization status.

Use Recharts for standard visualizations.

Use React Flow or another appropriate graph library for financial relationships, such as loans, repayments, accounts, and money movement.

Charts must support drill-down. Selecting a month, tag, account, or person should open the corresponding filtered transaction list.

Keep financial definitions consistent. Transfers between owned accounts must not inflate income or expenses. Loans must not be incorrectly counted as ordinary income or expenses.

Use PostgreSQL aggregations for large datasets rather than loading every transaction into the browser.

## 11. Implement a reliable offline-first PWA

Use Dexie.js and IndexedDB for local data.

Implement:

- Local persistence.
- Offline transaction creation.
- Local account and tag data.
- A durable outbox for pending commands.
- Stable client-generated UUIDs.
- Local schema versioning.
- Synchronization state.
- Retry handling.
- Reconnection handling.
- Application-shell caching.
- Manifest and installation support.
- Recovery behavior after refresh or restart.

The service worker should cache application resources, not serve as the authoritative financial database.

When an offline transaction is created:

1. Validate the command.
2. Save the local record and outbox operation atomically.
3. Update the interface.
4. Mark it as pending.
5. Synchronize when possible.
6. Mark it as server-confirmed only after acknowledgement.

Clearly distinguish locally saved changes from server-confirmed changes.

Request persistent storage where supported. Provide export/recovery options and communicate the risk of browser storage being cleared.

Do not claim that browser storage guarantees zero data loss.

## 12. Implement multi-device synchronization

Build a well-defined push/pull synchronization protocol.

### Push

The client submits pending operations with stable IDs and idempotency keys.

The server:
- Authenticates the user.
- Validates the payload and schema version.
- Checks ownership.
- Deduplicates retries.
- Enforces financial invariants.
- Commits accepted changes atomically.
- Returns explicit operation results.

### Pull

The client supplies its last confirmed server cursor.

The server returns accepted changes after that cursor and the next cursor.

Use server-controlled monotonic cursors or sequence numbers. Do not rely on device timestamps alone.

### Conflict handling

Do not use last-write-wins for financial events.

Concurrent offline-created transactions should generally merge as separate events. Conflicts involving mutable metadata need an explicit policy.

Failed operations must remain recoverable. A failed item must not cause the application to silently discard the rest of the outbox.

Test repeated requests, network timeouts, partial failures, expired sessions, stale cursors, and old client schema versions.

## 13. Implement import and export

Support:

- CSV export.
- JSON full-data backup.
- XLSX reports.
- Date-range exports.
- Filtered query exports.
- Account-specific exports.
- CSV import with column mapping.
- Preview and validation.
- Duplicate detection.
- Error reporting.
- Safe import commits.

Use a staging process for large imports where appropriate.

Never assume identical dates and amounts prove that two transactions are duplicates.

Protect temporary files, enforce upload limits, validate content, and prevent spreadsheet formula injection in exports.

Google Sheets integration is a future enhancement. Do not introduce it before the local import/export workflow is dependable.

## 14. Authentication and data security

Preserve the existing authentication system if it is correct.

Review and enforce:

- Secure password hashing using Argon2id.
- Server-side session validation.
- Secure, HttpOnly cookies.
- Appropriate SameSite and Secure settings.
- Session expiration and revocation.
- Rate limiting.
- CSRF protections where applicable.
- Ownership checks on every protected operation.
- Safe error messages.
- Secret management.
- Security headers.
- No sensitive financial payloads or credentials in logs.

Never store passwords or reusable session credentials in IndexedDB.

Use a consistent authorization layer for Server Actions and Route Handlers. A user must never be able to access another user's records by changing an ID.

## 15. Backups and recovery

Implement or document:

- Database backup schedule.
- Retention policy.
- Independent backup storage.
- Backup encryption and access control.
- Restoration procedure.
- Restore testing.
- Data export.
- Recovery-point and recovery-time targets.

Snapshots are performance optimizations, not replacements for the original financial history.

Do not delete immutable financial events during compaction unless an explicit, tested, recoverable archival policy exists.

## 16. Performance and database integrity

Use Drizzle and PostgreSQL correctly.

Implement:

- Appropriate indexes.
- Foreign keys.
- Unique constraints.
- Ownership constraints where practical.
- Short database transactions.
- Efficient queries.
- Stable pagination.
- Database-side aggregations.
- Safe connection pooling.
- Reviewed migrations.

Use `EXPLAIN ANALYZE` when investigating slow queries.

Do not add Redis, queues, microservices, or distributed caching unless the actual workload justifies them.

## 17. Testing requirements

Use Vitest and Playwright, following the repository's existing conventions.

### Unit tests
- Money calculations.
- Transfers.
- Loans and repayments.
- Reversals.
- Query parsing.
- Date filtering.
- Currency precision.
- Snapshot reconciliation.

### Database integration tests
- Drizzle migrations.
- Ownership enforcement.
- Atomic transfers.
- Concurrent operations.
- Duplicate idempotency keys.
- Failed transaction rollback.
- Foreign-key behavior.

### Offline and synchronization tests
- Offline write and refresh.
- Retry after timeout.
- Duplicate requests.
- Multi-device merge.
- Session expiry.
- Partial sync failure.
- Local database migration.
- Reconnection after extended offline use.

### End-to-end tests
- Sign up and sign in.
- Create an account.
- Record income and expenses.
- Transfer between accounts.
- Record a loan and repayment.
- Filter and paginate transactions.
- View dashboard charts.
- Export filtered results.
- Import data.
- Verify user isolation.

Do not claim a test passes unless it has actually been executed successfully.

## 18. Required implementation workflow

Work incrementally and preserve working features.

### Step 1 — Audit
Inspect the repository and write `docs/IMPLEMENTATION_STATUS.md`.

### Step 2 — Database foundation
Implement the missing Drizzle schemas and reviewed migrations. Preserve existing user, session, and account data.

### Step 3 — Ledger
Implement the financial model and test every core operation.

### Step 4 — UI
Implement transactions, people, debts, tags, and account details.

### Step 5 — Query builder
Implement reusable filters, saved queries, and pagination.

### Step 6 — Dashboard
Implement accurate database-derived reports and chart drill-down.

### Step 7 — Offline support
Implement Dexie, the outbox, and local persistence.

### Step 8 — Synchronization
Implement idempotent push/pull and multi-device conflict handling.

### Step 9 — Import/export
Implement CSV, JSON, and XLSX workflows.

### Step 10 — Hardening
Run tests, review security, inspect migrations, and document deployment and recovery.

After each phase:
1. Run type checking.
2. Run linting.
3. Run the relevant tests.
4. Fix regressions.
5. Update `docs/IMPLEMENTATION_STATUS.md`.
6. Summarize files changed and outstanding issues.

## 19. Definition of done

The project is not complete merely because new pages exist.

A feature is complete only when:

- Its UI works.
- It uses real persisted data.
- Server validation exists.
- Authorization is enforced.
- Financial rules are correct.
- Database changes are atomic where required.
- Pagination and performance are appropriate.
- Offline behavior is defined where relevant.
- Error handling is present.
- Tests exist and have been run.
- Migrations are reviewed.
- Documentation reflects the actual implementation.

## 20. Final instructions to the agent

Start by auditing the repository. Do not generate the entire application in one unreviewed code dump.

Prioritize the financial ledger and database integrity before charts, advanced analytics, and optional integrations.

Make practical engineering decisions independently when the requirements are clear. Ask for clarification only when a decision materially changes the product or risks existing data.

Do not leave fake buttons, placeholder dashboards, static financial numbers, TODO-only implementations, or unimplemented features presented as complete.

At the end of each work session, report:

1. What was implemented.
2. Which files were created or modified.
3. Which migrations were generated.
4. Which tests were executed and their actual results.
5. Any known limitations.
6. The next recommended task.

**Success means turning the existing Linked Coin repository into a functioning, secure, offline-first personal finance application—not merely adding screens or database tables.**