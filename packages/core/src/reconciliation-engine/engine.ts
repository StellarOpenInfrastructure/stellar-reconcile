import type { ChainEntry, InternalRecord } from "../ledger/types.js";
import { fromUnits, toUnits } from "../ledger/amounts.js";
import { detectDuplicates } from "./duplicates.js";
import { matchRecords } from "./matcher.js";
import type {
  AssetTotals,
  BalanceDiscrepancy,
  FeeSummary,
  ReconciliationInput,
  ReconciliationResult,
} from "./types.js";

function netByAsset(
  items: { asset: string; amount: string }[],
): Map<string, { in: bigint; out: bigint }> {
  const m = new Map<string, { in: bigint; out: bigint }>();
  for (const it of items) {
    const units = toUnits(it.amount);
    const cur = m.get(it.asset) ?? { in: 0n, out: 0n };
    if (units >= 0n) cur.in += units;
    else cur.out += -units;
    m.set(it.asset, cur);
  }
  return m;
}

export function reconcileAssets(entries: ChainEntry[], records: InternalRecord[]): AssetTotals[] {
  const chain = netByAsset(entries.filter((e) => e.kind !== "fee"));
  const internal = netByAsset(records);
  const assets = new Set([...chain.keys(), ...internal.keys()]);
  return [...assets].sort().map((asset) => {
    const c = chain.get(asset) ?? { in: 0n, out: 0n };
    const i = internal.get(asset) ?? { in: 0n, out: 0n };
    return {
      asset,
      chainIn: fromUnits(c.in),
      chainOut: fromUnits(c.out),
      internalIn: fromUnits(i.in),
      internalOut: fromUnits(i.out),
      difference: fromUnits(c.in - c.out - (i.in - i.out)),
    };
  });
}

export function reconcileBalances(
  input: ReconciliationInput,
  entries: ChainEntry[],
): BalanceDiscrepancy[] {
  if (!input.balances || !input.openingBalances) return [];
  const includeFees = input.options?.includeFees ?? true;
  const out: BalanceDiscrepancy[] = [];
  for (const opening of input.openingBalances) {
    const actual = input.balances.find(
      (b) => b.asset === opening.asset && b.account === opening.account,
    );
    if (!actual) continue;
    let expected = toUnits(opening.balance);
    for (const e of entries) {
      if (e.asset !== opening.asset || e.account !== opening.account) continue;
      if (e.kind === "fee" && !includeFees) continue;
      expected += toUnits(e.amount);
    }
    const diff = toUnits(actual.balance) - expected;
    if (diff !== 0n) {
      out.push({
        account: opening.account,
        asset: opening.asset,
        expected: fromUnits(expected),
        actual: actual.balance,
        difference: fromUnits(diff),
      });
    }
  }
  return out;
}

export function reconcileFees(
  account: string,
  entries: ChainEntry[],
  expectedFees?: string,
): FeeSummary {
  const feeEntries = entries.filter((e) => e.kind === "fee");
  const chainFees = feeEntries.reduce((s, e) => s + -toUnits(e.amount), 0n);
  const summary: FeeSummary = {
    account,
    chainFees: fromUnits(chainFees),
    transactionCount: new Set(feeEntries.map((e) => e.txHash)).size,
  };
  if (expectedFees !== undefined) {
    summary.expectedFees = expectedFees;
    summary.difference = fromUnits(chainFees - toUnits(expectedFees));
  }
  return summary;
}

/** Run every reconciliation for one account. Pure and deterministic. */
export function reconcile(input: ReconciliationInput): ReconciliationResult {
  const opts = input.options ?? {};
  const entries =
    (opts.ignoreFailed ?? true) ? input.entries.filter((e) => e.successful) : input.entries;
  const records = input.records;

  const { matches, unmatchedInternal, unmatchedChain } = matchRecords(
    records,
    entries,
    opts.matchWindowSeconds ?? 86_400,
  );
  const result: ReconciliationResult = {
    account: input.account,
    matches,
    unmatchedInternal,
    unmatchedChain,
    balances: reconcileBalances(input, entries),
    assets: reconcileAssets(entries, records),
    fees: reconcileFees(input.account, entries, input.expectedFees),
    duplicates: detectDuplicates(records, input.entries, opts.duplicateWindowSeconds ?? 300),
    stats: {
      entries: entries.length,
      records: records.length,
      matched: matches.length,
      matchRate: records.length === 0 ? 1 : Number((matches.length / records.length).toFixed(4)),
    },
  };
  return result;
}
