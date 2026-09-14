/**
 * Integration test for PostgresRepository. Runs only when DATABASE_URL is set,
 * e.g. `DATABASE_URL=postgres://reconcile:reconcile@localhost:5432/reconcile pnpm test`.
 * CI provides a service container (see .github/workflows/ci.yml).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { PostgresRepository } from "../backend/src/repository/postgres.js";

const url = process.env.DATABASE_URL;
const ACC = "GAEB2QI5MVRGIBBJRSPYLQQ7WCLDFYFQ3Q2PRVMQBZQMEG3XF32OLBGA";

describe.skipIf(!url)("PostgresRepository", () => {
  let repo: PostgresRepository;

  beforeAll(() => {
    execFileSync("pnpm", ["exec", "tsx", "scripts/migrate.ts"], {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "inherit",
    });
    repo = new PostgresRepository(url!);
  });
  afterAll(async () => repo?.close());

  it("upserts and lists records", async () => {
    const id = `t-${Date.now()}`;
    await repo.upsertRecords([
      {
        id,
        account: ACC,
        asset: "native",
        amount: "12.5",
        timestamp: "2026-03-01T10:00:00Z",
        memo: "m",
      },
    ]);
    await repo.upsertRecords([
      { id, account: ACC, asset: "native", amount: "13", timestamp: "2026-03-01T10:00:00Z" },
    ]);
    const rows = await repo.listRecords(ACC, "2026-03-01T00:00:00Z", "2026-03-02T00:00:00Z");
    const row = rows.find((r) => r.id === id);
    expect(row).toMatchObject({ amount: "13.0000000", asset: "native" });
    expect(row?.memo).toBeUndefined();
  });

  it("stores runs and exceptions, preserving status across re-runs", async () => {
    const runId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await repo.createRun({
      id: runId,
      account: ACC,
      from: "2026-03-01T00:00:00Z",
      to: "2026-03-02T00:00:00Z",
      status: "completed",
      summary: { ok: true } as never,
      createdAt,
    });
    const exId = `UNMATCHED_CHAIN:${runId}`;
    const ex = {
      id: exId,
      type: "UNMATCHED_CHAIN" as const,
      severity: "high" as const,
      account: ACC,
      asset: "native",
      amount: "-2500",
      description: "d",
      refs: { txHashes: ["x"] },
      status: "open" as const,
      createdAt,
    };
    await repo.saveExceptions(runId, [ex]);
    expect((await repo.updateException(exId, "resolved", "done"))?.status).toBe("resolved");

    const runId2 = crypto.randomUUID();
    await repo.createRun({
      id: runId2,
      account: ACC,
      from: "2026-03-01T00:00:00Z",
      to: "2026-03-02T00:00:00Z",
      status: "completed",
      createdAt,
    });
    await repo.saveExceptions(runId2, [ex]);
    const page = await repo.listExceptions({ runId: runId2, page: 1, pageSize: 10 });
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({
      status: "resolved",
      note: "done",
      runId: runId2,
      amount: "-2500.0000000",
    });

    const runs = await repo.listRuns(1, 5);
    expect(runs.total).toBeGreaterThanOrEqual(2);
    expect((await repo.getRun(runId))?.summary).toEqual({ ok: true });
  });
});
