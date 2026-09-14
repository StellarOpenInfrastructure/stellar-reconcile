import type { ChainEntry, InternalRecord } from "../ledger/types.js";
import { equals } from "../ledger/amounts.js";
import type { Duplicate } from "./types.js";

export function detectDuplicates(
  records: InternalRecord[],
  entries: ChainEntry[],
  windowSeconds: number,
): Duplicate[] {
  const out: Duplicate[] = [];

  // Internal: same externalRef
  const byRef = new Map<string, string[]>();
  for (const r of records) {
    if (!r.externalRef) continue;
    byRef.set(r.externalRef, [...(byRef.get(r.externalRef) ?? []), r.id]);
  }
  for (const ids of byRef.values())
    if (ids.length > 1) out.push({ side: "internal", ids, reason: "same_external_ref" });

  // Internal: same amount + counterparty within window
  const windowMs = windowSeconds * 1000;
  const sorted = [...records].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const flagged = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    if (flagged.has(a.id)) continue;
    const group = [a.id];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]!;
      if (Date.parse(b.timestamp) - Date.parse(a.timestamp) > windowMs) break;
      if (
        b.asset === a.asset &&
        equals(a.amount, b.amount) &&
        a.counterparty &&
        a.counterparty === b.counterparty &&
        !flagged.has(b.id)
      ) {
        group.push(b.id);
      }
    }
    if (group.length > 1) {
      group.forEach((id) => flagged.add(id));
      out.push({ side: "internal", ids: group, reason: "same_amount_counterparty_window" });
    }
  }

  // Chain: same entry id collected twice (overlapping collection ranges)
  const seen = new Map<string, number>();
  for (const e of entries) seen.set(e.id, (seen.get(e.id) ?? 0) + 1);
  for (const [id, n] of seen)
    if (n > 1)
      out.push({ side: "chain", ids: Array(n).fill(id) as string[], reason: "same_tx_hash" });

  return out;
}
