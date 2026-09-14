# Schema

```mermaid
erDiagram
    internal_records {
        text account PK
        text id PK
        text external_ref
        text counterparty
        text asset
        numeric amount
        timestamptz ts
        text memo
        text tx_hash
    }
    reconciliation_runs {
        uuid id PK
        text account
        timestamptz range_from
        timestamptz range_to
        text status
        jsonb summary
        text error
        timestamptz created_at
    }
    reconciliation_exceptions {
        text id PK
        uuid run_id FK
        text type
        text severity
        text account
        text asset
        numeric amount
        text description
        jsonb refs
        text status
        text note
        timestamptz created_at
        timestamptz updated_at
    }
    reconciliation_runs ||--o{ reconciliation_exceptions : produces
```

- Amounts are `numeric(30,7)` — Stellar's native precision. Never use floats.
- Exception ids are deterministic (`TYPE:refs`) so re-running a range does
  not create duplicates; status and notes survive re-runs.
- Chain entries are **not** stored: they are re-collected per run. Caching
  them is a roadmap item (see `docs/drips-wave.md`).
- Migrations are plain SQL files applied in filename order and recorded in
  `schema_migrations`. Never edit an applied migration; add a new file.
