/**
 * Domain model. Two sides are reconciled:
 *
 *  - `ChainEntry`   — what happened on Stellar (collected + normalized)
 *  - `InternalRecord` — what the business believes happened (invoices, payouts, ledger lines)
 *
 * Amounts are decimal strings; arithmetic uses `bigint` units (7 decimals) via `amounts.ts`.
 * Sign convention: positive = credit to `account`, negative = debit from `account`.
 */

export type EntryKind =
  | "payment"
  | "path_payment"
  | "create_account"
  | "account_merge"
  | "contract_transfer"
  | "fee"
  | "trade"
  | "other";

export interface ChainEntry {
  /** Stable id: `${txHash}:${operationIndex}` or `${txHash}:fee`. */
  id: string;
  txHash: string;
  ledger: number;
  /** ISO-8601 close time. */
  timestamp: string;
  account: string;
  counterparty?: string;
  /** Asset key: "native", "CODE:ISSUER" or "contract:C...". */
  asset: string;
  /** Signed decimal amount from the perspective of `account`. */
  amount: string;
  kind: EntryKind;
  memo?: string;
  /** Present when kind === "fee" or when the tx paid a fee from this account. */
  feeStroops?: string;
  successful: boolean;
}

export interface InternalRecord {
  /** Business-side id (invoice number, payout id). Must be unique per import. */
  id: string;
  /** Optional reference to an external system (ERP document id). */
  externalRef?: string;
  account: string;
  counterparty?: string;
  asset: string;
  /** Signed decimal amount, same convention as ChainEntry. */
  amount: string;
  /** ISO-8601 expected time. */
  timestamp: string;
  memo?: string;
  /** If the business already knows the tx hash, matching is exact. */
  txHash?: string;
}

export interface BalanceSnapshot {
  account: string;
  asset: string;
  balance: string;
  ledger: number;
  timestamp: string;
}

export interface OpeningBalance {
  account: string;
  asset: string;
  balance: string;
}
