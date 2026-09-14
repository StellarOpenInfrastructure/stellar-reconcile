import { beforeEach, describe, expect, it } from "vitest";
import { reconcile } from "./engine.js";
import { matchRecords } from "./matcher.js";
import { detectDuplicates } from "./duplicates.js";
import { ACC, CP1, CP2, entry, record, reset, USDC } from "../test-support/fixtures.js";

beforeEach(reset);

describe("matchRecords", () => {
  it("matches by tx hash first", () => {
    const e = entry({ amount: "10", txHash: "aaa" });
    const r = record({ id: "inv-1", amount: "10", txHash: "aaa" });
    const out = matchRecords([r], [e], 3600);
    expect(out.matches).toEqual([
      { internalId: "inv-1", entryId: "aaa:0", method: "tx_hash", confidence: 1 },
    ]);
    expect(out.unmatchedChain).toEqual([]);
  });

  it("does not hash-match when amounts differ", () => {
    const e = entry({ amount: "10", txHash: "aaa" });
    const r = record({ id: "inv-1", amount: "11", txHash: "aaa" });
    const out = matchRecords([r], [e], 3600);
    expect(out.matches).toEqual([]);
    expect(out.unmatchedInternal).toHaveLength(1);
  });

  it("matches by memo and amount", () => {
    const e = entry({ amount: "10", memo: "inv-2" });
    const r = record({ id: "inv-2", amount: "10", memo: "inv-2" });
    expect(matchRecords([r], [e], 3600).matches[0]!.method).toBe("memo_amount");
  });

  it("matches by amount within the window, choosing the closest", () => {
    const far = entry({ amount: "10", timestamp: "2026-03-01T09:00:00Z" });
    const near = entry({ amount: "10", timestamp: "2026-03-01T10:04:00Z" });
    const r = record({ id: "inv-3", amount: "10", timestamp: "2026-03-01T10:05:00Z" });
    const out = matchRecords([r], [far, near], 3600);
    expect(out.matches[0]).toMatchObject({ entryId: near.id, method: "amount_window" });
    expect(out.unmatchedChain).toEqual([far]);
  });

  it("respects counterparty when both sides specify it", () => {
    const e = entry({ amount: "10", counterparty: CP2 });
    const r = record({ id: "inv-4", amount: "10", counterparty: CP1 });
    expect(matchRecords([r], [e], 3600).matches).toEqual([]);
  });

  it("never matches an entry twice", () => {
    const e = entry({ amount: "10" });
    const r1 = record({ id: "a", amount: "10" });
    const r2 = record({ id: "b", amount: "10" });
    const out = matchRecords([r1, r2], [e], 3600);
    expect(out.matches).toHaveLength(1);
    expect(out.unmatchedInternal).toHaveLength(1);
  });

  it("ignores fee entries for matching", () => {
    const fee = entry({ amount: "-0.00001", kind: "fee" });
    expect(matchRecords([], [fee], 3600).unmatchedChain).toEqual([]);
  });
});

describe("detectDuplicates", () => {
  it("finds duplicate external refs and near-duplicate payouts", () => {
    const rs = [
      record({ id: "p1", amount: "-50", externalRef: "PO-1", timestamp: "2026-03-01T10:00:00Z" }),
      record({ id: "p2", amount: "-50", externalRef: "PO-1", timestamp: "2026-03-01T10:01:00Z" }),
      record({ id: "p3", amount: "-50", timestamp: "2026-03-01T12:00:00Z" }),
    ];
    const d = detectDuplicates(rs, [], 300);
    expect(d).toEqual([
      { side: "internal", ids: ["p1", "p2"], reason: "same_external_ref" },
      { side: "internal", ids: ["p1", "p2"], reason: "same_amount_counterparty_window" },
    ]);
  });

  it("flags chain entries collected twice", () => {
    const e = entry({ amount: "1", txHash: "dup" });
    expect(detectDuplicates([], [e, { ...e }], 300)).toEqual([
      { side: "chain", ids: ["dup:0", "dup:0"], reason: "same_tx_hash" },
    ]);
  });
});

describe("reconcile", () => {
  it("produces balance, asset and fee reconciliation", () => {
    const entries = [
      entry({ amount: "100", txHash: "t1" }),
      entry({ amount: "-40", txHash: "t2", counterparty: CP2 }),
      entry({ amount: "-0.00001", txHash: "t2", kind: "fee", id: "t2:fee" }),
      entry({ amount: "7", asset: USDC, txHash: "t3" }),
      entry({ amount: "999", txHash: "failed", successful: false }),
    ];
    const records = [
      record({ id: "in-1", amount: "100", txHash: "t1" }),
      record({ id: "out-1", amount: "-40", counterparty: CP2 }),
    ];
    const result = reconcile({
      account: ACC,
      entries,
      records,
      openingBalances: [{ account: ACC, asset: "native", balance: "1000" }],
      balances: [
        {
          account: ACC,
          asset: "native",
          balance: "1059.99999",
          ledger: 2000,
          timestamp: "2026-03-02T00:00:00Z",
        },
      ],
      expectedFees: "0.00002",
    });
    expect(result.stats).toEqual({ entries: 4, records: 2, matched: 2, matchRate: 1 });
    expect(result.unmatchedChain.map((e) => e.txHash)).toEqual(["t3"]);
    expect(result.balances).toEqual([]); // 1000 + 100 - 40 - 0.00001 = 1059.99999
    expect(result.assets).toEqual([
      {
        asset: USDC,
        chainIn: "7",
        chainOut: "0",
        internalIn: "0",
        internalOut: "0",
        difference: "7",
      },
      {
        asset: "native",
        chainIn: "100",
        chainOut: "40",
        internalIn: "100",
        internalOut: "40",
        difference: "0",
      },
    ]);
    expect(result.fees).toEqual({
      account: ACC,
      chainFees: "0.00001",
      expectedFees: "0.00002",
      difference: "-0.00001",
      transactionCount: 1,
    });
  });

  it("reports balance discrepancies", () => {
    const result = reconcile({
      account: ACC,
      entries: [entry({ amount: "10" })],
      records: [],
      openingBalances: [{ account: ACC, asset: "native", balance: "0" }],
      balances: [
        {
          account: ACC,
          asset: "native",
          balance: "12",
          ledger: 1,
          timestamp: "2026-03-02T00:00:00Z",
        },
      ],
    });
    expect(result.balances).toEqual([
      { account: ACC, asset: "native", expected: "10", actual: "12", difference: "2" },
    ]);
  });
});
