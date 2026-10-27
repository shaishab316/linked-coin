# Implementation Status

_Last updated after the ledger + transaction UI session._

This file tracks what actually works end to end, not what merely has a table.
Update it after every work session.

## Audit notes

The repository previously contained only the foundation: App Router + strict
TypeScript, Tailwind, Drizzle/PostgreSQL, Zod configuration, Argon2id
authentication with server-side sessions, and account create/list/archive.
That functionality was preserved and extended, not rebuilt.

## Implemented and verified

### Ledger and financial correctness

- [x] Double-entry ledger: `ledger_transactions` + `ledger_entries`, with
      integer minor units (`bigint`) and per-currency precision.
- [x] Commands: income, expense, transfer, money lent, money borrowed,
      repayment received, repayment made, opening balance/adjustment.
- [x] Reversals create a linked compensating transaction; the original event is
      never edited or deleted.
- [x] Atomic writes: transaction, entries, tags, loan links, and financial event
      commit in one PostgreSQL transaction.
- [x] Idempotency: unique `(user_id, idempotency_key)` on transactions and
      events; replayed submissions return the original transaction.
- [x] Loan linking with outstanding-balance validation (overpayment rejected).
- [x] Immutable `financial_events` with server sequence, plus DB triggers that
      reject unbalanced entries, mixed currencies, cross-owner entries, and
      event mutation.
- [x] Ownership enforced in every query; account/person/tag ownership also
      checked by a database trigger.
- [x] Ledger-derived account balances, person receivables/payables, and monthly
      cash flow (transfers and loans excluded from income/expense).

### User interface

- [x] Transaction list with type filter, pagination, reversal markers.
- [x] Transaction entry form with type-dependent fields, tag selection, and loan
      linking.
- [x] Transaction detail: balanced entries, related transactions, metadata-only
      editing, reversal flow with reason.
- [x] Accounts page and detail page with live balances, history, metadata
      editing, archive/restore.
- [x] People page and person detail with outstanding balances and history;
      archive/restore.
- [x] Hierarchical tags with parent selection, archive/restore.
- [x] Dashboard: per-currency position, account balances, 6-month cash flow,
      recent transactions.
- [x] Empty states and server-side validation errors surfaced in forms.

### Tests

- [x] 58 Vitest tests: money precision, validation, auth, account ownership,
      ledger invariants (balances, transfers, loans, overpayment, idempotency,
      reversals, cross-user access, DB trigger enforcement, append-only events).

## Partial

- [ ] Transaction filtering: only by type. The unified query builder (date
      ranges, tags, people, amounts, text, AND/OR/NOT, saved queries) is not
      built yet, and pagination is offset-based rather than cursor-based.
- [ ] Dashboard: no Recharts visualizations or React Flow relationship graph
      yet; cash-flow bars are plain HTML.
- [ ] Tags: create and archive only; no rename or parent reassignment (so no
      cycle handling is exposed yet).
- [ ] Authentication hardening: rate limiting, CSRF/security-header review
      outstanding.
- [ ] E2E: flows were verified in a browser with a temporary Playwright script
      that was not committed; there is no Playwright suite in the repository.

## Missing

- [ ] Offline storage (Dexie/IndexedDB), outbox, service worker, PWA manifest.
- [ ] Push/pull synchronization, device registration, cursors, conflict policy.
- [ ] Import/export (CSV, JSON, XLSX) and duplicate detection.
- [ ] Account snapshots and reconciliation tooling.
- [ ] Chart drill-down and relationship graph.
- [ ] Backups, restore testing, monitoring, deployment documentation.

## Known limitations

- Multi-currency totals are never summed; positions and cash flow are grouped
  by currency because no exchange-rate policy exists.
- `datetime-local` input is interpreted as UTC; there is no per-user time zone
  setting yet.
- Account type and currency are immutable after creation so historical entries
  cannot be invalidated silently.
- Reversals cannot be reversed; corrections are made by posting a new command.
- The deferred balance trigger runs per inserted entry at commit; this is
  correct but adds write overhead proportional to entry count.
- Loan outstanding checks use the linked repayments; unlinked repayments still
  reduce the person's balance but not a specific loan's outstanding amount.

## Next recommended task

Step 5 of `docs/plan-next-v2.md`: the unified, versioned query AST with filter
chips, saved queries, and cursor pagination shared by the list, exports, and
reports. After that, offline support (Dexie + outbox) before synchronization.
