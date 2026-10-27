# Linked Coin

Offline-first personal finance and financial history management.
See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for the product,
financial model, synchronization protocol, and roadmap.

The project currently implements **Phase 1 (Foundation)** of that roadmap:
Next.js + strict TypeScript, Tailwind, Drizzle/PostgreSQL, Zod-validated
configuration and inputs, Argon2id username/password authentication with
server-side sessions, and ownership-scoped accounts.

## Requirements

- Node.js 20+
- pnpm 10+
- PostgreSQL 17 (a Docker command is provided below)

## Local setup

```bash
pnpm install

# Start a local PostgreSQL instance on port 55432
docker run -d --name linked-coin-db \
  -e POSTGRES_USER=linked_coin \
  -e POSTGRES_PASSWORD=linked_coin_dev \
  -e POSTGRES_DB=linked_coin \
  -p 55432:5432 postgres:17-alpine

# Create the integration-test database
docker exec linked-coin-db \
  psql -U linked_coin -d linked_coin -c "CREATE DATABASE linked_coin_test;"

cp .env.example .env   # then set a real SESSION_SECRET
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000, create an account, and add a financial account.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm typecheck` | TypeScript in strict mode |
| `pnpm test` | Unit tests plus PostgreSQL integration tests |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |

Integration tests run when `TEST_DATABASE_URL` is set and are skipped
otherwise; point it at a disposable database because the suite truncates
tables between tests:

```bash
TEST_DATABASE_URL=postgresql://linked_coin:linked_coin_dev@localhost:55432/linked_coin_test pnpm test
```

## Structure

```text
src/
├── app/                  # App Router routes ((auth), (dashboard))
├── components/ui/        # Shared form primitives
├── db/                   # Drizzle client, schema, migrations
├── features/
│   ├── auth/             # Validation, Argon2id hashing, sessions, actions
│   └── accounts/         # Ownership-scoped account commands and queries
└── lib/                  # Environment config, password/token helpers, errors
tests/helpers/            # PostgreSQL test harness
```

## Conventions enforced so far

- Money-moving features must enforce ownership server-side; every account
  query takes the authenticated user id.
- Session tokens are stored only as SHA-256 hashes; browser cookies are
  `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Usernames are stored normalized (trimmed, lowercased) so uniqueness is
  case-insensitive.
- Zod validation runs on both the form and the server action.
