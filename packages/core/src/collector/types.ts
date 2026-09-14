import type { BalanceSnapshot, ChainEntry } from "../ledger/types.js";

export interface CollectRange {
  /** ISO-8601 inclusive lower bound. */
  from: string;
  /** ISO-8601 exclusive upper bound. */
  to: string;
  /** Provider-specific paging cursor. */
  cursor?: string;
  limit?: number;
}

export interface CollectResult {
  entries: ChainEntry[];
  nextCursor?: string;
}

/**
 * A collector produces normalized chain entries for an account.
 *
 * Stellar RPC only retains a short history window and does not index classic
 * payments by account, so history collection uses Horizon (legacy but still
 * the canonical account-history API) or an external indexer. Balance snapshots
 * can come from either.
 */
export interface Collector {
  readonly name: string;
  collectEntries(account: string, range: CollectRange): Promise<CollectResult>;
  collectBalances(account: string): Promise<BalanceSnapshot[]>;
}
