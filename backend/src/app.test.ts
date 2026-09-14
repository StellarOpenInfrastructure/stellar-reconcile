import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StaticCollector, type ChainEntry } from "@stellar-reconcile/core";
import { buildApp, type App } from "./app.js";
import { loadConfig } from "./config.js";
import { InMemoryRepository } from "./repository/memory.js";

const ACC = "GAEB2QI5MVRGIBBJRSPYLQQ7WCLDFYFQ3Q2PRVMQBZQMEG3XF32OLBGA";
const CP = "GCXQCY4DKUJDJ2FUJQYKBR5ULK2XKYQZGIHWDMPGA2N5UNCHBGRCRCFH";
const HASH = "a".repeat(64);

const entries: ChainEntry[] = [
  {
    id: `${HASH}:0`,
    txHash: HASH,
    ledger: 10,
    timestamp: "2026-03-01T10:00:00Z",
    account: ACC,
    counterparty: CP,
    asset: "native",
    amount: "100",
    kind: "payment",
    successful: true,
  },
  {
    id: `${HASH}:fee`,
    txHash: HASH,
    ledger: 10,
    timestamp: "2026-03-01T10:00:00Z",
    account: ACC,
    asset: "native",
    amount: "-0.00001",
    kind: "fee",
    successful: true,
    feeStroops: "100",
  },
  {
    id: `${"b".repeat(64)}:0`,
    txHash: "b".repeat(64),
    ledger: 11,
    timestamp: "2026-03-01T11:00:00Z",
    account: ACC,
    counterparty: CP,
    asset: "native",
    amount: "-2500",
    kind: "payment",
    successful: true,
  },
];

describe("reconcile API", () => {
  let app: App;
  let runId: string;

  beforeAll(async () => {
    const config = loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" });
    app = await buildApp(config, {
      repo: new InMemoryRepository(),
      collector: new StaticCollector(entries, [
        {
          account: ACC,
          asset: "native",
          balance: "1099.99999",
          ledger: 12,
          timestamp: "2026-03-02T00:00:00Z",
        },
      ]),
    });
    await app.ready();
  });
  afterAll(async () => app.close());

  it("health and ready", async () => {
    expect((await app.inject({ url: "/health" })).statusCode).toBe(200);
    const ready = await app.inject({ url: "/ready" });
    expect(ready.json()).toEqual({ status: "ready", checks: { storage: "injected" } });
  });

  it("imports records with validation", async () => {
    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/records",
      payload: {
        records: [
          {
            id: "x",
            account: "not-an-account",
            asset: "native",
            amount: "1",
            timestamp: "2026-03-01T10:00:00Z",
          },
        ],
      },
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe("VALIDATION_ERROR");

    const ok = await app.inject({
      method: "POST",
      url: "/api/v1/records",
      payload: {
        records: [
          {
            id: "inv-1",
            account: ACC,
            counterparty: CP,
            asset: "native",
            amount: "100",
            timestamp: "2026-03-01T10:01:00Z",
            txHash: HASH,
          },
          {
            id: "payout-9",
            account: ACC,
            counterparty: CP,
            asset: "native",
            amount: "-40",
            timestamp: "2026-03-01T12:00:00Z",
          },
        ],
      },
    });
    expect(ok.json()).toEqual({ upserted: 2 });
    const list = await app.inject({
      url: `/api/v1/records?account=${ACC}&from=2026-03-01T00:00:00Z&to=2026-03-02T00:00:00Z`,
    });
    expect(list.json().items).toHaveLength(2);
  });

  it("runs a reconciliation and stores exceptions", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/runs",
      payload: {
        account: ACC,
        from: "2026-03-01T00:00:00Z",
        to: "2026-03-02T00:00:00Z",
        openingBalances: [{ asset: "native", balance: "3500" }],
        expectedFees: "0.00001",
      },
    });
    expect(res.statusCode).toBe(201);
    const run = res.json();
    runId = run.id;
    expect(run.status).toBe("completed");
    expect(run.summary.stats).toEqual({ entries: 3, records: 2, matched: 1, matchRate: 0.5 });
    // unmatched internal payout, unmatched chain 2500, asset totals differ; balance reconciles (3500 + 100 - 0.00001 - 2500)
    expect(run.summary.exceptions.byType).toEqual({
      UNMATCHED_INTERNAL: 1,
      UNMATCHED_CHAIN: 1,
      ASSET_TOTAL_MISMATCH: 1,
    });

    const exceptions = await app.inject({ url: `/api/v1/runs/${runId}/exceptions?severity=high` });
    expect(exceptions.json().total).toBe(2); // unmatched chain (-2500) and asset total mismatch (-2460)
    expect(
      exceptions.json().items.find((e: { type: string }) => e.type === "UNMATCHED_CHAIN"),
    ).toMatchObject({
      amount: "-2500",
      runId,
    });

    const csv = await app.inject({ url: `/api/v1/runs/${runId}/export.csv` });
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.body.split("\r\n").filter(Boolean)).toHaveLength(4);
  });

  it("updates exception status and preserves it across re-runs", async () => {
    const list = (await app.inject({ url: `/api/v1/runs/${runId}/exceptions?status=open` })).json();
    const target = list.items.find((e: { type: string }) => e.type === "UNMATCHED_CHAIN");
    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/exceptions/${encodeURIComponent(target.id)}`,
      payload: { status: "resolved", note: "manual refund" },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json()).toMatchObject({ status: "resolved", note: "manual refund" });

    const rerun = await app.inject({
      method: "POST",
      url: "/api/v1/runs",
      payload: { account: ACC, from: "2026-03-01T00:00:00Z", to: "2026-03-02T00:00:00Z" },
    });
    const again = (
      await app.inject({ url: `/api/v1/runs/${rerun.json().id}/exceptions?status=resolved` })
    ).json();
    expect(again.total).toBe(1);

    const missing = await app.inject({
      method: "PATCH",
      url: "/api/v1/exceptions/nope",
      payload: { status: "ignored" },
    });
    expect(missing.statusCode).toBe(404);
  });

  it("rejects invalid ranges and unknown runs", async () => {
    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/runs",
      payload: { account: ACC, from: "2026-03-02T00:00:00Z", to: "2026-03-01T00:00:00Z" },
    });
    expect(bad.json().error.code).toBe("INVALID_RANGE");
    const unknown = await app.inject({ url: "/api/v1/runs/00000000-0000-4000-8000-000000000000" });
    expect(unknown.statusCode).toBe(404);
  });

  it("paginates runs", async () => {
    const page = (await app.inject({ url: "/api/v1/runs?page=1&pageSize=1" })).json();
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
  });

  it("serves OpenAPI", async () => {
    const doc = (await app.inject({ url: "/api/v1/openapi.json" })).json();
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        "/api/v1/records",
        "/api/v1/runs",
        "/api/v1/runs/{id}/export.csv",
        "/api/v1/exceptions/{id}",
      ]),
    );
  });
});
