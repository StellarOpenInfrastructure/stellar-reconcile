import { beforeEach, describe, expect, it } from "vitest";
import { reconcile } from "../reconciliation-engine/engine.js";
import { deriveExceptions, severityForAmount } from "./index.js";
import { exceptionsToCsv, summarize } from "../reporting/index.js";
import { ACC, entry, record, reset } from "../test-support/fixtures.js";

beforeEach(reset);

describe("exception engine", () => {
  it("maps severity thresholds", () => {
    expect(severityForAmount("-5")).toBe("low");
    expect(severityForAmount("100")).toBe("medium");
    expect(severityForAmount("1000")).toBe("high");
    expect(severityForAmount("-10000")).toBe("critical");
  });

  it("derives deterministic exceptions from a result", () => {
    const now = () => new Date("2026-03-02T00:00:00Z");
    const result = reconcile({
      account: ACC,
      entries: [entry({ amount: "2500", txHash: "big" })],
      records: [
        record({ id: "missing", amount: "-3", externalRef: "X" }),
        record({
          id: "missing2",
          amount: "-3",
          externalRef: "X",
          timestamp: "2026-03-01T10:06:00Z",
        }),
      ],
      expectedFees: "0.001",
    });
    const a = deriveExceptions(result, { now });
    const b = deriveExceptions(result, { now });
    expect(a).toEqual(b);
    expect(a.map((e) => e.type)).toEqual([
      "UNMATCHED_INTERNAL",
      "UNMATCHED_INTERNAL",
      "UNMATCHED_CHAIN",
      "ASSET_TOTAL_MISMATCH",
      "FEE_MISMATCH",
      "DUPLICATE_INTERNAL",
      "DUPLICATE_INTERNAL",
    ]);
    expect(a.find((e) => e.type === "UNMATCHED_CHAIN")).toMatchObject({
      severity: "high",
      amount: "2500",
      refs: { txHashes: ["big"] },
    });

    const csv = exceptionsToCsv(a);
    expect(csv.split("\r\n")[0]).toBe(
      "id,type,severity,account,asset,amount,status,description,createdAt",
    );
    expect(csv).toContain('"internal duplicates (same_external_ref): missing, missing2"');

    const summary = summarize(result, a, now());
    expect(summary.exceptions.total).toBe(7);
    expect(summary.exceptions.bySeverity.high).toBe(2); // unmatched chain 2500 + asset total mismatch 2506
  });

  it("flags low-confidence matches", () => {
    const e = entry({ amount: "10", timestamp: "2026-03-01T00:00:00Z" });
    const r = record({ id: "r", amount: "10", timestamp: "2026-03-01T23:00:00Z" });
    const result = reconcile({ account: ACC, entries: [e], records: [r] });
    expect(result.matches[0]!.confidence).toBeLessThan(0.7);
    expect(deriveExceptions(result).map((x) => x.type)).toContain("LOW_CONFIDENCE_MATCH");
  });
});
