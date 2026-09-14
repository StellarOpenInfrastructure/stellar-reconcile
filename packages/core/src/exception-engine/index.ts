import { toUnits, abs } from "../ledger/amounts.js";
import type { ReconciliationResult } from "../reconciliation-engine/types.js";

export type ExceptionType =
  | "UNMATCHED_INTERNAL"
  | "UNMATCHED_CHAIN"
  | "BALANCE_MISMATCH"
  | "ASSET_TOTAL_MISMATCH"
  | "FEE_MISMATCH"
  | "DUPLICATE_INTERNAL"
  | "DUPLICATE_CHAIN"
  | "LOW_CONFIDENCE_MATCH";

export type Severity = "low" | "medium" | "high" | "critical";
export type ExceptionStatus = "open" | "acknowledged" | "resolved" | "ignored";

export interface ReconciliationException {
  /** Deterministic id derived from type + refs, so re-running does not create duplicates. */
  id: string;
  type: ExceptionType;
  severity: Severity;
  account: string;
  asset?: string;
  amount?: string;
  description: string;
  refs: { internalIds?: string[]; entryIds?: string[]; txHashes?: string[] };
  status: ExceptionStatus;
  createdAt: string;
}

export interface SeverityThresholds {
  /** Absolute amounts (decimal strings) in the asset's own units. */
  medium: string;
  high: string;
  critical: string;
}

export interface ExceptionEngineOptions {
  thresholds?: SeverityThresholds;
  /** Matches below this confidence produce a LOW_CONFIDENCE_MATCH exception (default 0.7). */
  lowConfidenceBelow?: number;
  now?: () => Date;
}

const DEFAULT_THRESHOLDS: SeverityThresholds = { medium: "100", high: "1000", critical: "10000" };

export function severityForAmount(
  amount: string,
  t: SeverityThresholds = DEFAULT_THRESHOLDS,
): Severity {
  const a = toUnits(abs(amount));
  if (a >= toUnits(t.critical)) return "critical";
  if (a >= toUnits(t.high)) return "high";
  if (a >= toUnits(t.medium)) return "medium";
  return "low";
}

function stableId(type: ExceptionType, ...parts: string[]): string {
  return `${type}:${parts.join("|")}`;
}

/** Convert a ReconciliationResult into actionable, deterministic exceptions. */
export function deriveExceptions(
  result: ReconciliationResult,
  opts: ExceptionEngineOptions = {},
): ReconciliationException[] {
  const t = opts.thresholds ?? DEFAULT_THRESHOLDS;
  const createdAt = (opts.now ?? (() => new Date()))().toISOString();
  const out: ReconciliationException[] = [];
  const base = { account: result.account, status: "open" as const, createdAt };

  for (const r of result.unmatchedInternal) {
    out.push({
      ...base,
      id: stableId("UNMATCHED_INTERNAL", r.id),
      type: "UNMATCHED_INTERNAL",
      severity: severityForAmount(r.amount, t),
      asset: r.asset,
      amount: r.amount,
      description: `internal record ${r.id} (${r.amount} ${r.asset}) has no matching on-chain entry`,
      refs: { internalIds: [r.id] },
    });
  }
  for (const e of result.unmatchedChain) {
    out.push({
      ...base,
      id: stableId("UNMATCHED_CHAIN", e.id),
      type: "UNMATCHED_CHAIN",
      severity: severityForAmount(e.amount, t),
      asset: e.asset,
      amount: e.amount,
      description: `on-chain ${e.kind} ${e.id} (${e.amount} ${e.asset}) has no matching internal record`,
      refs: { entryIds: [e.id], txHashes: [e.txHash] },
    });
  }
  for (const b of result.balances) {
    out.push({
      ...base,
      id: stableId("BALANCE_MISMATCH", b.account, b.asset),
      type: "BALANCE_MISMATCH",
      severity: severityForAmount(b.difference, t),
      asset: b.asset,
      amount: b.difference,
      description: `balance of ${b.asset} is ${b.actual}, expected ${b.expected} (difference ${b.difference})`,
      refs: {},
    });
  }
  for (const a of result.assets) {
    if (toUnits(a.difference) === 0n) continue;
    out.push({
      ...base,
      id: stableId("ASSET_TOTAL_MISMATCH", a.asset),
      type: "ASSET_TOTAL_MISMATCH",
      severity: severityForAmount(a.difference, t),
      asset: a.asset,
      amount: a.difference,
      description: `net ${a.asset} on chain differs from internal records by ${a.difference}`,
      refs: {},
    });
  }
  if (result.fees.difference !== undefined && toUnits(result.fees.difference) !== 0n) {
    out.push({
      ...base,
      id: stableId("FEE_MISMATCH", result.account),
      type: "FEE_MISMATCH",
      severity: severityForAmount(result.fees.difference, t),
      asset: "native",
      amount: result.fees.difference,
      description: `fees paid ${result.fees.chainFees} XLM differ from expected ${result.fees.expectedFees ?? "?"} by ${result.fees.difference}`,
      refs: {},
    });
  }
  for (const d of result.duplicates) {
    const type: ExceptionType = d.side === "internal" ? "DUPLICATE_INTERNAL" : "DUPLICATE_CHAIN";
    out.push({
      ...base,
      id: stableId(type, ...[...new Set(d.ids)].sort()),
      type,
      severity: "medium",
      description: `${d.side} duplicates (${d.reason}): ${d.ids.join(", ")}`,
      refs: d.side === "internal" ? { internalIds: d.ids } : { entryIds: d.ids },
    });
  }
  const minConf = opts.lowConfidenceBelow ?? 0.7;
  for (const m of result.matches) {
    if (m.confidence >= minConf) continue;
    out.push({
      ...base,
      id: stableId("LOW_CONFIDENCE_MATCH", m.internalId, m.entryId),
      type: "LOW_CONFIDENCE_MATCH",
      severity: "low",
      description: `record ${m.internalId} matched entry ${m.entryId} by ${m.method} with confidence ${m.confidence}`,
      refs: { internalIds: [m.internalId], entryIds: [m.entryId] },
    });
  }
  return out;
}
