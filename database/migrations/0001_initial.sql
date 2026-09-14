-- stellar-reconcile initial schema
-- Applied by `pnpm run migrate` (scripts/migrate.ts). Migrations are append-only.

create table if not exists schema_migrations (
  name        text primary key,
  applied_at  timestamptz not null default now()
);

create table if not exists internal_records (
  account       text        not null,
  id            text        not null,
  external_ref  text,
  counterparty  text,
  asset         text        not null,
  amount        numeric(30, 7) not null,
  ts            timestamptz not null,
  memo          text,
  tx_hash       text,
  imported_at   timestamptz not null default now(),
  primary key (account, id)
);
create index if not exists internal_records_account_ts_idx on internal_records (account, ts);
create index if not exists internal_records_tx_hash_idx on internal_records (tx_hash) where tx_hash is not null;

create table if not exists reconciliation_runs (
  id          uuid        primary key,
  account     text        not null,
  range_from  timestamptz not null,
  range_to    timestamptz not null,
  status      text        not null check (status in ('completed', 'failed')),
  summary     jsonb,
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists reconciliation_runs_created_idx on reconciliation_runs (created_at desc);

create table if not exists reconciliation_exceptions (
  id          text        primary key,
  run_id      uuid        not null references reconciliation_runs (id) on delete cascade,
  type        text        not null,
  severity    text        not null check (severity in ('low', 'medium', 'high', 'critical')),
  account     text        not null,
  asset       text,
  amount      numeric(30, 7),
  description text        not null,
  refs        jsonb       not null default '{}'::jsonb,
  status      text        not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'ignored')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists reconciliation_exceptions_run_idx on reconciliation_exceptions (run_id, created_at desc);
create index if not exists reconciliation_exceptions_status_idx on reconciliation_exceptions (status, severity);
