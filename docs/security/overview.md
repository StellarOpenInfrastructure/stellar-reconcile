# Security overview

## Assets protected

- Integrity of financial evidence: results must be deterministic and exact.
- Operator work (exception statuses and notes).

## Trust assumptions

- Horizon returns complete, correct payment history for the requested range.
  Missing history produces false `UNMATCHED_INTERNAL` exceptions rather than
  silent success.
- The database is reachable only by the API.
- Internal records are supplied by an authorised system; the API does not
  authenticate callers in this scaffold.

## Attack surfaces

| Surface       | Control                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| Record import | Zod validation, size caps (5 MB / 5000 records), amounts validated as decimals                                     |
| SQL           | `postgres` tagged templates only; no string concatenation                                                          |
| CSV export    | RFC 4180 quoting; cells starting with `=`, `+`, `-`, `@` are **not** yet neutralised — see roadmap (CSV injection) |
| Logs          | pino redaction; record contents are not logged                                                                     |
| Horizon       | outbound only; failures map to 503                                                                                 |

## Known gaps

- No authentication or authorisation.
- No audit log of who changed an exception.
- CSV formula injection hardening pending.
- `account_merge` amounts require Horizon effects and are reported as 0.
