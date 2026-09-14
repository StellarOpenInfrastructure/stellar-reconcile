import type { ChainEntry, InternalRecord } from "../ledger/types.js";
import { equals } from "../ledger/amounts.js";
import type { Match } from "./types.js";

export interface MatchOutcome {
  matches: Match[];
  unmatchedInternal: InternalRecord[];
  unmatchedChain: ChainEntry[];
}

/**
 * Three-pass matcher. Each pass consumes matched items so an entry is never
 * matched twice:
 *  1. exact transaction hash
 *  2. same asset + amount + memo
 *  3. same asset + amount within a time window (closest first)
 */
export function matchRecords(
  records: InternalRecord[],
  entries: ChainEntry[],
  windowSeconds: number,
): MatchOutcome {
  const matches: Match[] = [];
  const freeRecords = new Map(records.map((r) => [r.id, r]));
  const freeEntries = new Map(entries.filter((e) => e.kind !== "fee").map((e) => [e.id, e]));

  // Pass 1: tx hash
  const byHash = new Map<string, ChainEntry[]>();
  for (const e of freeEntries.values()) {
    const list = byHash.get(e.txHash) ?? [];
    list.push(e);
    byHash.set(e.txHash, list);
  }
  for (const r of [...freeRecords.values()]) {
    if (!r.txHash) continue;
    const candidates = (byHash.get(r.txHash) ?? []).filter(
      (e) => freeEntries.has(e.id) && e.asset === r.asset && equals(e.amount, r.amount),
    );
    const hit = candidates[0];
    if (hit) {
      matches.push({ internalId: r.id, entryId: hit.id, method: "tx_hash", confidence: 1 });
      freeRecords.delete(r.id);
      freeEntries.delete(hit.id);
    }
  }

  // Pass 2: memo + amount + asset
  for (const r of [...freeRecords.values()]) {
    if (!r.memo) continue;
    const hit = [...freeEntries.values()].find(
      (e) => e.memo === r.memo && e.asset === r.asset && equals(e.amount, r.amount),
    );
    if (hit) {
      matches.push({ internalId: r.id, entryId: hit.id, method: "memo_amount", confidence: 0.9 });
      freeRecords.delete(r.id);
      freeEntries.delete(hit.id);
    }
  }

  // Pass 3: amount + asset within window, closest timestamp wins
  const windowMs = windowSeconds * 1000;
  for (const r of [...freeRecords.values()]) {
    const t = Date.parse(r.timestamp);
    let best: { entry: ChainEntry; delta: number } | undefined;
    for (const e of freeEntries.values()) {
      if (e.asset !== r.asset || !equals(e.amount, r.amount)) continue;
      if (r.counterparty && e.counterparty && r.counterparty !== e.counterparty) continue;
      const delta = Math.abs(Date.parse(e.timestamp) - t);
      if (delta <= windowMs && (!best || delta < best.delta)) best = { entry: e, delta };
    }
    if (best) {
      const confidence = Math.max(0.5, 0.8 - best.delta / windowMs / 4);
      matches.push({
        internalId: r.id,
        entryId: best.entry.id,
        method: "amount_window",
        confidence: Number(confidence.toFixed(3)),
      });
      freeRecords.delete(r.id);
      freeEntries.delete(best.entry.id);
    }
  }

  return {
    matches,
    unmatchedInternal: [...freeRecords.values()],
    unmatchedChain: [...freeEntries.values()],
  };
}
