import type { BalanceSnapshot, ChainEntry } from "../ledger/types.js";
import type { Collector, CollectRange, CollectResult } from "./types.js";

/** Serves pre-built entries. Used by tests and by CSV/JSON imports of chain data. */
export class StaticCollector implements Collector {
  readonly name = "static";

  constructor(
    private readonly entries: ChainEntry[],
    private readonly balances: BalanceSnapshot[] = [],
  ) {}

  async collectEntries(account: string, range: CollectRange): Promise<CollectResult> {
    const from = Date.parse(range.from);
    const to = Date.parse(range.to);
    const entries = this.entries.filter((e) => {
      const t = Date.parse(e.timestamp);
      return e.account === account && t >= from && t < to;
    });
    return { entries };
  }

  async collectBalances(account: string): Promise<BalanceSnapshot[]> {
    return this.balances.filter((b) => b.account === account);
  }
}
