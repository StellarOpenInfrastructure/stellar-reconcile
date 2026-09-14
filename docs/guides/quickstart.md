# Quickstart

```bash
make setup && cp .env.example .env
make docker-up          # or: run Postgres yourself and `make migrate`
```

Import records and reconcile a testnet account:

```bash
ACC=GAEB2QI5MVRGIBBJRSPYLQQ7WCLDFYFQ3Q2PRVMQBZQMEG3XF32OLBGA
curl -s localhost:4020/api/v1/records -H 'content-type: application/json' -d "{\"records\":[
  {\"id\":\"inv-1\",\"account\":\"$ACC\",\"asset\":\"native\",\"amount\":\"100\",\"timestamp\":\"2026-03-01T10:00:00Z\"}]}"

RUN=$(curl -s localhost:4020/api/v1/runs -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"from\":\"2026-03-01T00:00:00Z\",\"to\":\"2026-03-08T00:00:00Z\"}" | jq -r .id)

curl -s "localhost:4020/api/v1/runs/$RUN/exceptions" | jq '.items[] | {type, severity, amount}'
curl -s "localhost:4020/api/v1/runs/$RUN/export.csv"
```

Without Postgres, leave `DATABASE_URL` unset to use in-memory storage.
