# Personal Finance Multi-Agent operations

## Safe local lifecycle

1. Copy `.env.example` to `.env` and set a unique JWT secret of at least 32 characters plus the database URL.
2. Install backend and frontend dependencies explicitly during provisioning.
3. Apply reviewed migrations explicitly with `./scripts/migrate.sh`.
4. Start with `./start.sh`. The launcher refuses occupied ports and missing dependencies; it never installs packages, creates databases, seeds data, applies migrations, or terminates unrelated processes.

Startup performs connection/schema checks only and fails closed when required configuration or durable schema is missing.

## Narrow workflow

`POST /api/finance-workflows/cases` records reconciliable versioned evidence; the calculate and transition endpoints persist formula versions, input digests, approvals, postings, reversals, and corrections.

Posting and reversal are role-gated; approval must be independent and explained. Provider posting remains closed without a period lock and receipt. Every write is tenant-scoped, idempotency/correlation keyed, version checked, and appended to a database audit table protected against update/delete.

## External boundaries

Generated `/api/cf-*` and `/api/gap-*` routes are quarantined where present. Live bank, ledger, billing, CRM, market, filing, tax, and payment credentials plus financial-review sign-off and representative historical corpora remain deployment gates. Provider failures must remain explicit and must not be replaced with fabricated success receipts.

## Validation

Run `node --test backend/test/financePolicy.test.cjs`, syntax-check changed JavaScript with `node --check`, and run `bash -n start.sh scripts/migrate.sh`. CI performs these dependency-free checks and verifies that migrations are transactional and contain no table-drop, truncate, or row-delete statements.

