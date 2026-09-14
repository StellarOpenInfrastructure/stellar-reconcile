import type {
  BalanceSnapshot,
  ChainEntry,
  InternalRecord,
  OpeningBalance,
} from "../ledger/types.js";

export type MatchMethod = "tx_hash" | "memo_amount" | "amount_window";

export interface Match {
  internalId: string;
  entryId: string;
  method: MatchMethod;
  /** 1.0 for exact hash matches, lower for heuristic matches. */
  confidence: number;
}

export interface BalanceDiscrepancy {
  account: string;
  asset: string;
  expected: string;
  actual: string;
  difference: string;
}

export interface AssetTotals {
  asset: string;
  chainIn: string;
  chainOut: string;
  internalIn: string;
  internalOut: string;
  /** chain net − internal net */
  difference: string;
}

export interface FeeSummary {
  account: string;
  chainFees: string;
  expectedFees?: string;
  difference?: string;
  transactionCount: number;
}

export interface Duplicate {
  side: "internal" | "chain";
  ids: string[];
  reason: "same_external_ref" | "same_tx_hash" | "same_amount_counterparty_window";
}

export interface ReconciliationInput {
  account: string;
  entries: ChainEntry[];
  records: InternalRecord[];
  balances?: BalanceSnapshot[];
  openingBalances?: OpeningBalance[];
  expectedFees?: string;
  options?: ReconciliationOptions;
}

export interface ReconciliationOptions {
  /** Window for amount-only matching in seconds (default 86400). */
  matchWindowSeconds?: number;
  /** Window for duplicate detection in seconds (default 300). */
  duplicateWindowSeconds?: number;
  /** Ignore failed transactions (default true). */
  ignoreFailed?: boolean;
  /** Include fee entries in balance expectations (default true). */
  includeFees?: boolean;
}

export interface ReconciliationResult {
  account: string;
  matches: Match[];
  unmatchedInternal: InternalRecord[];
  unmatchedChain: ChainEntry[];
  balances: BalanceDiscrepancy[];
  assets: AssetTotals[];
  fees: FeeSummary;
  duplicates: Duplicate[];
  stats: { entries: number; records: number; matched: number; matchRate: number };
}
