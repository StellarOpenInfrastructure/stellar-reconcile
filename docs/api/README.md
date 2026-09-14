# API reference

Versioned under `/api/v1`. OpenAPI: [`openapi.json`](openapi.json) (served at
`/api/v1/openapi.json`, UI at `/docs`).

Errors: `{ "error": { "code", "message", "requestId", "details?" } }`.

| HTTP | code                                                  |
| ---- | ----------------------------------------------------- |
| 400  | `VALIDATION_ERROR`, `INVALID_RANGE`, `INVALID_AMOUNT` |
| 404  | `RUN_NOT_FOUND`, `EXCEPTION_NOT_FOUND`                |
| 503  | `COLLECTOR_UNAVAILABLE` (Horizon unreachable)         |
| 500  | `INTERNAL`                                            |

## Import records

```http
POST /api/v1/records
{ "records": [ { "id": "inv-1001", "account": "G…", "asset": "native", "amount": "100", "timestamp": "2026-03-01T10:00:00Z", "memo": "inv-1001", "txHash": "…" } ] }
```

Upsert keyed by `(account, id)`. Max 5000 per request.

## Run

```http
POST /api/v1/runs
{ "account": "G…", "from": "2026-03-01T00:00:00Z", "to": "2026-03-02T00:00:00Z",
  "openingBalances": [{ "asset": "native", "balance": "3500" }], "expectedFees": "0.001", "matchWindowSeconds": 86400 }
```

Returns the run with `summary.stats`, `summary.exceptions`, `summary.assets`,
`summary.fees`.

## Exceptions

`GET /api/v1/runs/:id/exceptions?status=open&severity=high&page=1&pageSize=50`

`PATCH /api/v1/exceptions/:id` with `{ "status": "resolved", "note": "…" }`.

`GET /api/v1/runs/:id/export.csv` streams
`id,type,severity,account,asset,amount,status,description,createdAt`.
