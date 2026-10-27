# Linked Coin – Ultimate Full UI Redesign Specification
**Complete Component-by-Component + Package + Interaction Document**  
Version 3.0 | 27 October 2026

This is the exhaustive, production-ready redesign specification for Linked Coin. Every screen, component, GitLens-style timeline, advanced data visualization, and ease-of-use feature (including renaming people and accounts) is fully specified.

---

## 1. Recommended npm Packages & Core Dependencies

- **Core UI & Motion:**
  - `framer-motion`: Smooth GitLens-like expand/collapse and page transitions
  - `lucide-react`: Modern icons
  - `clsx`, `tailwind-merge`: Class merging utilities (`cn`)
- **Charts & Data Visualization:**
  - `recharts`: Responsive, accessible charts with custom tooltips and smooth gradient fills
- **Command Palette & Smart Search:**
  - `cmdk`: Fast keyboard-first search and transaction jumping
- **Notifications & Feedback:**
  - `sonner`: Sleek toast notifications with undo support
- **Date & Formatting:**
  - `date-fns`: Rich date grouping and formatting

---

## 2. Global Design System & Tokens

- **Aesthetic:** Modern slate/emerald theme with glassmorphic depth (`bg-slate-900/80`, `backdrop-blur-md`, subtle borders `border-slate-800`).
- **Typography:** Inter / Geist Sans with crisp tabular numerals (`font-mono`) for exact monetary figures.
- **Radius:** Consistent `rounded-2xl` and `rounded-3xl` cards.
- **Directional Semantics:**
  - Emerald (`text-emerald-400`, `bg-emerald-500/10`): Inflow / Income / Debt owed to you (Receivable)
  - Rose (`text-rose-400`, `bg-rose-500/10`): Outflow / Expense / Debt you owe (Payable)
  - Sky/Blue (`text-sky-400`, `bg-sky-500/10`): Internal transfers between accounts
  - Amber/Violet: Debt tracking and balance adjustments

---

## 3. GitLens-Inspired Activity Timeline (Core Feature)

The activity feed functions like a Git commit history:
- **Grouped by Day**: Sticky day headers ("Today • 3 transactions", "Yesterday", etc.)
- **Vertical Activity Track**: Distinct continuous vertical line connecting events.
- **Node Badges**: Color-coded circular icons marking Money In, Money Out, Transfer, Loan Given/Received.
- **Hover/Tap Expansion**: Reveals notes, account routing, person tags, and compensating reversal references.
- **Reversal Indicator**: Distinct badge with bidirectional links for compensated/reversed transactions.

---

## 4. Screen-by-Screen Specification

### 4.1 Dashboard
- Metric cards: Total Liquid Assets, Net Receivables, Net Payables, Monthly Net Flow.
- Recharts Monthly Cash Flow with smooth dual-tone area gradients.
- Category breakdown and spending distribution.
- GitLens-style Recent Activity stream.

### 4.2 Timeline / Activity
- Search bar with quick filters and date ranges.
- GitLens timeline as primary view.
- Multi-tag pill filters.

### 4.3 People & Debts (with Person Rename)
- Inline editing / modal to rename any contact with reactive state updates.
- Real-time loan/repayment balance tracking.
- Person multi-tagging (`#Family`, `#Vendor`, `#Colleague`).

### 4.4 Accounts
- Account cards with live ledger balances and assigned account tags.
- Quick transfer modal between accounts.

---

## 5. Ease-of-Use & Accessibility
- Inline rename for People and Tags
- Optimistic feedback with undo toasts
- Clear visual distinction of money direction
- Full bilingual English and Bengali support
