# Drips Wave issue roadmap — stellar-reconcile

This backlog takes the scaffold from a working engine to a system finance
teams can rely on for period close. Every issue is independently actionable.

## How to use this file

Maintainers copy an entry below into a GitHub issue using the **Drips Wave task** template, apply the `wave` label plus the complexity label, and add the `area:*` label. Contributors claim an issue by commenting on it. Every entry is independently actionable: none depends on another entry being finished first unless stated in _Technical notes_.

| Complexity | Label          | Expected points | Typical effort        |
| ---------- | -------------- | --------------- | --------------------- |
| Trivial    | `wave-trivial` | 2               | a few hours           |
| Medium     | `wave-medium`  | 5               | 1–3 days              |
| High       | `wave-high`    | 10              | up to one sprint week |

Totals: **11 trivial**, **10 medium**, **5 high**.

## Index

### Trivial

1. [Neutralise CSV formula injection in exports](#1-neutralise-csv-formula-injection-in-exports) — `area:security`
2. [Add sample dataset and a `make demo` target](#2-add-sample-dataset-and-a-make-demo-target) — `area:docs`
3. [Document the ChainEntry and InternalRecord formats](#3-document-the-chainentry-and-internalrecord-formats) — `area:docs`
4. [Validate asset keys in record import](#4-validate-asset-keys-in-record-import) — `area:backend`
5. [Add `GET /api/v1/exceptions` cross-run listing](#5-add-get-apiv1exceptions-cross-run-listing) — `area:backend`
6. [Return `Location` header and `runId` in run responses](#6-return-location-header-and-runid-in-run-responses) — `area:backend`
7. [Unit tests for HorizonCollector paging with a mocked server](#7-unit-tests-for-horizoncollector-paging-with-a-mocked-server) — `area:backend`
8. [Expose match details in the run summary](#8-expose-match-details-in-the-run-summary) — `area:backend`
9. [Add `make check` and a pre-push git hook example](#9-add-make-check-and-a-pre-push-git-hook-example) — `area:devops`
10. [Seed script for local development](#10-seed-script-for-local-development) — `area:devops`
11. [Add confidence and method columns to CSV export](#11-add-confidence-and-method-columns-to-csv-export) — `area:backend`

### Medium

12. [Soroban token transfer collector via RPC events](#12-soroban-token-transfer-collector-via-rpc-events) — `area:backend`
13. [Cache collected chain entries in PostgreSQL](#13-cache-collected-chain-entries-in-postgresql) — `area:backend`
14. [API-key authentication and exception audit log](#14-api-key-authentication-and-exception-audit-log) — `area:security`
15. [HTTP client SDK package](#15-http-client-sdk-package) — `area:sdk`
16. [Configurable matching strategies](#16-configurable-matching-strategies) — `area:backend`
17. [Account merge and claimable balance amounts via Horizon effects](#17-account-merge-and-claimable-balance-amounts-via-horizon-effects) — `area:backend`
18. [Scheduled runs and webhook notifications](#18-scheduled-runs-and-webhook-notifications) — `area:backend`
19. [Multi-account reconciliation runs](#19-multi-account-reconciliation-runs) — `area:backend`
20. [Close report generator (Markdown/HTML)](#20-close-report-generator-markdownhtml) — `area:docs`
21. [Prometheus metrics and structured run logging](#21-prometheus-metrics-and-structured-run-logging) — `area:devops`

### High

22. [Review UI (Next.js) for exceptions](#22-review-ui-nextjs-for-exceptions) — `area:frontend`
23. [Indexer-backed collector using ledger exports (Galexie/Hubble)](#23-indexer-backed-collector-using-ledger-exports-galexiehubble) — `area:backend`
24. [Double-entry general ledger export](#24-double-entry-general-ledger-export) — `area:backend`
25. [Multi-tenant workspaces with role-based access](#25-multi-tenant-workspaces-with-role-based-access) — `area:security`
26. [Deterministic replay and evidence bundles](#26-deterministic-replay-and-evidence-bundles) — `area:security`

## Trivial issues

### 1. Neutralise CSV formula injection in exports

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:security`

**Problem**

Cells beginning with `=`, `+`, `-`, `@`, tab or CR can execute as formulas when the CSV is opened in spreadsheets. Descriptions and memos are user-controlled.

**Scope**

Prefix dangerous leading characters with a single quote in `csvEscape` (configurable), keeping numeric amount columns untouched.

**Acceptance criteria**

- [ ] Description/memo cells starting with `=`, `+`, `@`, tab, CR are escaped
- [ ] Negative amounts (`-2500`) remain numeric
- [ ] Documented in docs/security/overview.md

**Technical notes**

Apply only to free-text columns; `exceptionsToCsv` knows which columns are text.

**Files likely affected**

- `packages/core/src/reporting/index.ts`
- `packages/core/src/exception-engine/index.test.ts`
- `docs/security/overview.md`

**Tests required**

Unit tests with malicious descriptions.

**Documentation required**

Security overview known gaps list.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 2. Add sample dataset and a `make demo` target

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:docs`

**Problem**

New users cannot see the engine working without a Horizon account with history.

**Scope**

Add `examples/demo/` with a JSON chain export and internal records, plus `scripts/demo.ts` that reconciles them with `StaticCollector` and prints the summary and CSV. Wire `make demo`.

**Acceptance criteria**

- [ ] `make demo` runs offline and prints at least three exception types
- [ ] README quickstart links to it

**Technical notes**

Reuse fixtures from the core tests.

**Files likely affected**

- `examples/demo/*.json`
- `scripts/demo.ts`
- `Makefile`
- `README.md`

**Tests required**

None beyond running the script in CI as a smoke step.

**Documentation required**

README and docs/guides/quickstart.md.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 3. Document the ChainEntry and InternalRecord formats

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:docs`

**Problem**

Integrators need a precise description of every field, sign convention and asset key format.

**Scope**

Write `docs/guides/data-model.md` covering both types, the asset key grammar and examples for each `EntryKind`.

**Acceptance criteria**

- [ ] Every field of both types documented
- [ ] Sign convention and asset key grammar explained with examples

**Technical notes**

Source of truth is `packages/core/src/ledger/types.ts`.

**Files likely affected**

- `docs/guides/data-model.md`
- `README.md`

**Tests required**

None.

**Documentation required**

The guide.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 4. Validate asset keys in record import

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:backend`

**Problem**

`asset` is accepted as any string; a typo like `USDC/G…` silently never matches chain entries.

**Scope**

Add a Zod refinement matching `native`, `CODE:ISSUER` (valid StrKey) or `contract:C…`.

**Acceptance criteria**

- [ ] Invalid asset keys are rejected with a helpful message
- [ ] Existing tests updated

**Technical notes**

Reuse the selector regex pattern from stellar-txguard as a starting point; validate the issuer with `StrKey`.

**Files likely affected**

- `backend/src/schemas.ts`
- `backend/src/app.test.ts`

**Tests required**

API test for invalid keys.

**Documentation required**

docs/api/README.md.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 5. Add `GET /api/v1/exceptions` cross-run listing

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:backend`

**Problem**

Exceptions can only be listed per run; operators want 'all open critical exceptions' regardless of run.

**Scope**

Add a route reusing `Repository.listExceptions` without `runId`, with the same filters and pagination.

**Acceptance criteria**

- [ ] Route documented in OpenAPI
- [ ] Filters by status and severity work

**Technical notes**

The repository already supports an optional `runId`.

**Files likely affected**

- `backend/src/routes/runs.ts`
- `backend/src/app.test.ts`
- `docs/api/README.md`

**Tests required**

API test.

**Documentation required**

API reference table.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 6. Return `Location` header and `runId` in run responses

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:backend`

**Problem**

`POST /runs` returns 201 without a `Location` header, so generic clients cannot follow it.

**Scope**

Set `Location: /api/v1/runs/:id` on creation.

**Acceptance criteria**

- [ ] Header present in test

**Technical notes**

One line in the run route.

**Files likely affected**

- `backend/src/routes/runs.ts`
- `backend/src/app.test.ts`

**Tests required**

API test asserting the header.

**Documentation required**

None.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 7. Unit tests for HorizonCollector paging with a mocked server

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:backend`

**Problem**

`HorizonCollector` has no tests; paging and range cut-off logic could regress silently.

**Scope**

Mock `Horizon.Server` (vi.mock) to return two pages and assert cursor handling and `to` cut-off.

**Acceptance criteria**

- [ ] Tests cover: single page, multi page with cursor, records beyond `to` stop collection
- [ ] No network access

**Technical notes**

Construct fixture records matching `HorizonPaymentLike`.

**Files likely affected**

- `packages/core/src/collector/horizon-collector.test.ts`

**Tests required**

The tests.

**Documentation required**

None.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 8. Expose match details in the run summary

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:backend`

**Problem**

The summary shows match counts but not how they matched; finance wants to know how many were hash vs heuristic matches.

**Scope**

Add `matchesByMethod` to `ReconciliationSummary`.

**Acceptance criteria**

- [ ] Summary includes counts per method
- [ ] OpenAPI unchanged (summary is `unknown`) but documented

**Technical notes**

Compute in `summarize`.

**Files likely affected**

- `packages/core/src/reporting/index.ts`
- `packages/core/src/exception-engine/index.test.ts`
- `docs/api/README.md`

**Tests required**

Unit test.

**Documentation required**

API reference.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 9. Add `make check` and a pre-push git hook example

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:devops`

**Problem**

Contributors forget to run the same four steps CI runs.

**Scope**

Add `check` target and `scripts/git-hooks/pre-push` (documented, opt-in).

**Acceptance criteria**

- [ ] `make check` runs lint, typecheck, test, build
- [ ] Hook install instructions in CONTRIBUTING.md

**Technical notes**

Do not auto-install hooks.

**Files likely affected**

- `Makefile`
- `scripts/git-hooks/pre-push`
- `CONTRIBUTING.md`

**Tests required**

None.

**Documentation required**

CONTRIBUTING.md.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 10. Seed script for local development

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:devops`

**Problem**

`database/seeds` exists but nothing applies it.

**Scope**

Add `scripts/seed.ts` that applies `database/seeds/*.sql` and a `make seed` target.

**Acceptance criteria**

- [ ] `make seed` is idempotent
- [ ] Documented in README Development

**Technical notes**

Mirror `scripts/migrate.ts` without the migrations table.

**Files likely affected**

- `scripts/seed.ts`
- `Makefile`
- `README.md`

**Tests required**

None.

**Documentation required**

README.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 11. Add confidence and method columns to CSV export

- **Complexity:** Trivial (`wave-trivial`)
- **Expected points:** 2
- **Area:** `area:backend`

**Problem**

The CSV lacks matching details that help reviewers triage `LOW_CONFIDENCE_MATCH` rows.

**Scope**

Include `method` and `confidence` from `refs` for match-related exceptions; empty otherwise.

**Acceptance criteria**

- [ ] Columns present, header updated, tests updated

**Technical notes**

Store method/confidence in `refs` when deriving `LOW_CONFIDENCE_MATCH`.

**Files likely affected**

- `packages/core/src/exception-engine/index.ts`
- `packages/core/src/reporting/index.ts`
- `packages/core/src/exception-engine/index.test.ts`

**Tests required**

Unit tests.

**Documentation required**

docs/api/README.md CSV columns.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

## Medium issues

### 12. Soroban token transfer collector via RPC events

- **Complexity:** Medium (`wave-medium`)
- **Expected points:** 5
- **Area:** `area:backend`

**Problem**

Businesses holding SEP-41 tokens (USDC on Soroban, custom tokens) have no chain-side entries.

**Scope**

Add `RpcEventsCollector` that queries Stellar RPC `getEvents` for `transfer` events where the account is `from` or `to`, normalizing into `contract_transfer` entries (amount in token units, asset `contract:C…`).

**Acceptance criteria**

- [ ] Handles paging and the RPC retention window (documents the limit)
- [ ] Unit tests with fixture event payloads
- [ ] Registered via config `COLLECTOR=horizon|rpc|both`

**Technical notes**

Use `rpc.Server.getEvents` with topic filters `['transfer', from, to]`. Amounts are `i128` in `value`.

**Files likely affected**

- `packages/core/src/collector/rpc-events-collector.ts`
- `packages/core/src/normalizer/soroban.ts`
- `backend/src/config.ts`
- `backend/src/app.ts`

**Tests required**

Unit tests with recorded RPC responses.

**Documentation required**

README Stellar infrastructure table and docs/architecture.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 13. Cache collected chain entries in PostgreSQL

- **Complexity:** Medium (`wave-medium`)
- **Expected points:** 5
- **Area:** `area:backend`

**Problem**

Every run re-fetches history from Horizon, which is slow for large accounts and hits rate limits.

**Scope**

Add a `chain_entries` table and a caching `Collector` decorator that stores collected entries and serves ranges already covered.

**Acceptance criteria**

- [ ] Migration added
- [ ] Cache invalidation documented (re-collect on demand)
- [ ] Runs on cached ranges do not call Horizon

**Technical notes**

Track covered ranges per account in a `collection_ranges` table.

**Files likely affected**

- `database/migrations/0002_chain_entries.sql`
- `packages/core/src/collector/caching-collector.ts`
- `backend/src/repository/postgres.ts`

**Tests required**

Integration tests (Postgres) and unit tests for range coverage.

**Documentation required**

docs/architecture/overview.md persistence section.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 14. API-key authentication and exception audit log

- **Complexity:** Medium (`wave-medium`)
- **Expected points:** 5
- **Area:** `area:security`

**Problem**

The API is open; exception status changes are anonymous.

**Scope**

Add bearer API keys (hashed in env), attach `actor` to exception updates, and record every change in an `exception_events` table exposed via `GET /exceptions/:id/history`.

**Acceptance criteria**

- [ ] 401 on missing/invalid keys
- [ ] History endpoint lists actor, old/new status, note, timestamp

**Technical notes**

Constant-time comparison; never log keys.

**Files likely affected**

- `backend/src/auth.ts`
- `backend/src/routes/runs.ts`
- `database/migrations/0003_exception_events.sql`
- `docs/security/overview.md`

**Tests required**

API tests and Postgres integration test.

**Documentation required**

Security overview and API reference.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 15. HTTP client SDK package

- **Complexity:** Medium (`wave-medium`)
- **Expected points:** 5
- **Area:** `area:sdk`

**Problem**

Integrators re-implement request handling for the API.

**Scope**

Create `packages/sdk` (`@stellar-reconcile/sdk`) with typed methods for every route, error mapping and pagination helpers (`for await` over exceptions).

**Acceptance criteria**

- [ ] Dependency-free client
- [ ] Unit tests with fetch mocks
- [ ] README SDK section updated

**Technical notes**

Model after stellar-txguard's SDK.

**Files likely affected**

- `packages/sdk/**`
- `pnpm-workspace.yaml`
- `vitest.config.ts`
- `README.md`

**Tests required**

Unit tests.

**Documentation required**

README.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 16. Configurable matching strategies

- **Complexity:** Medium (`wave-medium`)
- **Expected points:** 5
- **Area:** `area:backend`

**Problem**

The three-pass matcher is fixed; some businesses want memo-only matching or a stricter counterparty requirement.

**Scope**

Introduce a `MatchStrategy` list in `ReconciliationOptions` (ordered passes with per-pass options) with the current behaviour as default.

**Acceptance criteria**

- [ ] Strategies are validated at the API boundary
- [ ] Tests for custom orders and disabled passes

**Technical notes**

Refactor `matchRecords` into composable pass functions.

**Files likely affected**

- `packages/core/src/reconciliation-engine/matcher.ts`
- `packages/core/src/reconciliation-engine/types.ts`
- `backend/src/routes/runs.ts`

**Tests required**

Unit tests.

**Documentation required**

docs/architecture/overview.md matching section.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 17. Account merge and claimable balance amounts via Horizon effects

- **Complexity:** Medium (`wave-medium`)
- **Expected points:** 5
- **Area:** `area:backend`

**Problem**

`account_merge` entries carry amount 0 and claimable balances are ignored; both move value.

**Scope**

Fetch `/accounts/{id}/effects` for `account_credited`/`account_debited` where needed and normalise claimable balance claims/creations.

**Acceptance criteria**

- [ ] account_merge amounts are exact
- [ ] claimable balance create/claim produce entries
- [ ] Fixture-based tests

**Technical notes**

Effects are joined by operation id; keep a small in-memory cache per run.

**Files likely affected**

- `packages/core/src/collector/horizon-collector.ts`
- `packages/core/src/normalizer/horizon.ts`

**Tests required**

Unit tests with effect fixtures.

**Documentation required**

docs/security/overview.md known gaps update.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 18. Scheduled runs and webhook notifications

- **Complexity:** Medium (`wave-medium`)
- **Expected points:** 5
- **Area:** `area:backend`

**Problem**

Reconciliation must be triggered manually.

**Scope**

Add a `schedules` table (account, cron, opening balance source) and a worker loop that creates runs; POST a webhook when a run has ≥1 high/critical exception, with HMAC signature.

**Acceptance criteria**

- [ ] Schedules CRUD endpoints
- [ ] Worker can be disabled via env
- [ ] Webhook signature documented and tested

**Technical notes**

Use `node:timers` and advisory locks in Postgres to avoid double execution across instances.

**Files likely affected**

- `backend/src/scheduler.ts`
- `backend/src/routes/schedules.ts`
- `database/migrations/0004_schedules.sql`
- `docs/guides/webhooks.md`

**Tests required**

Unit tests for cron evaluation and signature; integration test for single execution.

**Documentation required**

New webhooks guide.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 19. Multi-account reconciliation runs

- **Complexity:** Medium (`wave-medium`)
- **Expected points:** 5
- **Area:** `area:backend`

**Problem**

Businesses operate many distribution accounts and want one close report.

**Scope**

Allow `accounts: string[]` in `/runs`, run reconciliations in parallel with bounded concurrency, and aggregate summaries.

**Acceptance criteria**

- [ ] Per-account results retained
- [ ] Aggregate totals by asset
- [ ] Concurrency limit configurable

**Technical notes**

Store per-account child runs referencing a parent run id.

**Files likely affected**

- `backend/src/routes/runs.ts`
- `backend/src/repository/types.ts`
- `database/migrations/0005_parent_runs.sql`

**Tests required**

API tests.

**Documentation required**

API reference.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 20. Close report generator (Markdown/HTML)

- **Complexity:** Medium (`wave-medium`)
- **Expected points:** 5
- **Area:** `area:docs`

**Problem**

Finance wants a human-readable period report, not only CSV.

**Scope**

Add `reporting/close-report.ts` rendering a Markdown report (assets, fees, exception table, match statistics) and `GET /runs/:id/report.md`.

**Acceptance criteria**

- [ ] Deterministic output for fixtures (snapshot test)
- [ ] Route documented

**Technical notes**

Keep HTML rendering out of scope; Markdown is enough for this issue.

**Files likely affected**

- `packages/core/src/reporting/close-report.ts`
- `backend/src/routes/runs.ts`

**Tests required**

Snapshot test.

**Documentation required**

docs/api/README.md.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 21. Prometheus metrics and structured run logging

- **Complexity:** Medium (`wave-medium`)
- **Expected points:** 5
- **Area:** `area:devops`

**Problem**

Operators cannot observe run durations, exception counts or collector latency.

**Scope**

Add `/metrics` with counters (runs by status, exceptions by severity), histograms (run duration, collector latency) and gauge for open exceptions.

**Acceptance criteria**

- [ ] No high-cardinality labels
- [ ] Endpoint optional via env

**Technical notes**

Use `prom-client`.

**Files likely affected**

- `backend/src/metrics.ts`
- `backend/src/app.ts`
- `backend/src/routes/runs.ts`

**Tests required**

Integration test scraping the endpoint.

**Documentation required**

README Deployment.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

## High issues

### 22. Review UI (Next.js) for exceptions

- **Complexity:** High (`wave-high`)
- **Expected points:** 10
- **Area:** `area:frontend`

**Problem**

Reviewing exceptions through curl and CSV does not scale for finance teams.

**Scope**

Create `frontend/` with pages: Runs (list, trigger), Run detail (summary, asset totals), Exceptions (filter, bulk acknowledge/resolve with notes), Settings. Minimal, accessible, developer-oriented design; realistic empty/loading states.

**Acceptance criteria**

- [ ] Works against local API
- [ ] Bulk status update flow tested
- [ ] CI lint/typecheck/build

**Technical notes**

Requires the cross-run exceptions endpoint (trivial issue) — can be built with per-run endpoints first.

**Files likely affected**

- `frontend/**`
- `pnpm-workspace.yaml`
- `.github/workflows/ci.yml`
- `README.md`

**Tests required**

Component tests plus one Playwright smoke test.

**Documentation required**

docs/guides/ui.md and README.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 23. Indexer-backed collector using ledger exports (Galexie/Hubble)

- **Complexity:** High (`wave-high`)
- **Expected points:** 10
- **Area:** `area:backend`

**Problem**

Horizon history can be pruned and rate-limited; large operators export ledgers to data lakes.

**Scope**

Define a `LedgerExportCollector` reading Parquet/JSON ledger exports (as produced by Galexie / stellar-etl) for a range, normalising classic operations and fees without Horizon.

**Acceptance criteria**

- [ ] Reads local files or S3-compatible URLs
- [ ] Produces identical entries to HorizonCollector for a fixture ledger range (cross-check test)
- [ ] Documented setup

**Technical notes**

Start with the JSON export format; Parquet can follow.

**Files likely affected**

- `packages/core/src/collector/ledger-export-collector.ts`
- `docs/guides/indexer-collector.md`
- `tests/fixtures/ledgers/*`

**Tests required**

Fixture-based tests and a cross-check against Horizon normaliser output.

**Documentation required**

New guide and README table.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 24. Double-entry general ledger export

- **Complexity:** High (`wave-high`)
- **Expected points:** 10
- **Area:** `area:backend`

**Problem**

Accounting systems need journal entries, not exception lists.

**Scope**

Map reconciled activity to double-entry journal lines (debit/credit accounts configurable per asset and kind), export as CSV/JSON compatible with common accounting imports, and mark posted entries.

**Acceptance criteria**

- [ ] Journal balances to zero per transaction
- [ ] Account mapping validated
- [ ] Idempotent posting markers

**Technical notes**

Add `journal_lines` table; fees post to an expense account.

**Files likely affected**

- `packages/core/src/reporting/journal.ts`
- `backend/src/routes/journal.ts`
- `database/migrations/0006_journal.sql`
- `docs/guides/journal-export.md`

**Tests required**

Property test: every journal batch sums to zero.

**Documentation required**

New guide.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 25. Multi-tenant workspaces with role-based access

- **Complexity:** High (`wave-high`)
- **Expected points:** 10
- **Area:** `area:security`

**Problem**

One deployment must serve several business units without cross-visibility.

**Scope**

Introduce `workspaces`; scope records, runs and exceptions by workspace; roles `viewer`, `operator`, `admin` enforced per route; API keys belong to a workspace.

**Acceptance criteria**

- [ ] All queries filtered by workspace
- [ ] Role checks tested for every mutating route
- [ ] Migration path for existing data documented

**Technical notes**

Depends on API-key authentication (medium issue).

**Files likely affected**

- `database/migrations/0007_workspaces.sql`
- `backend/src/auth.ts`
- `backend/src/repository/**`
- `backend/src/routes/**`

**Tests required**

Authorization tests for each role × route.

**Documentation required**

docs/security/overview.md and API reference.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged

### 26. Deterministic replay and evidence bundles

- **Complexity:** High (`wave-high`)
- **Expected points:** 10
- **Area:** `area:security`

**Problem**

Auditors need to reproduce a run's result from stored inputs.

**Scope**

Persist the exact inputs of a run (chain entries snapshot, records snapshot, options, engine version) and provide `POST /runs/:id/replay` that recomputes and diffs against the stored result; export an evidence bundle (zip with inputs, result, hashes).

**Acceptance criteria**

- [ ] Replay of an unchanged run yields zero diff
- [ ] Bundle contains SHA-256 of every file
- [ ] Engine version recorded

**Technical notes**

Store snapshots as JSONB with size limits; large runs may stream to object storage (out of scope).

**Files likely affected**

- `database/migrations/0008_run_inputs.sql`
- `backend/src/routes/runs.ts`
- `packages/core/src/reporting/evidence.ts`

**Tests required**

Integration tests for replay equality and diff on tampered inputs.

**Documentation required**

docs/guides/evidence.md.

**Definition of done**

- [ ] All acceptance criteria met
- [ ] Tests added and passing in CI (`make test`, `make lint`, `make build`)
- [ ] Documentation updated as listed above
- [ ] No secrets or credentials introduced
- [ ] PR reviewed and squash-merged
