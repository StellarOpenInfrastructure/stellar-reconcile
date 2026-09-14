import type { ChainEntry } from "../ledger/types.js";
import { stroopsToDecimal } from "../ledger/amounts.js";

/**
 * Minimal structural type for Horizon payment-family records. Declared locally so
 * the normalizer can be unit-tested with plain JSON fixtures and does not depend
 * on SDK typings that change between versions.
 */
export interface HorizonPaymentLike {
  id: string;
  paging_token: string;
  type:
    | "payment"
    | "path_payment_strict_send"
    | "path_payment_strict_receive"
    | "create_account"
    | "account_merge";
  type_i?: number;
  transaction_hash: string;
  transaction_successful: boolean;
  created_at: string;
  source_account: string;
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  /** create_account */
  funder?: string;
  account?: string;
  starting_balance?: string;
  /** account_merge */
  into?: string;
  /** path payments: what the sender actually paid. */
  source_amount?: string;
  source_asset_type?: string;
  source_asset_code?: string;
  source_asset_issuer?: string;
  transaction?: {
    fee_charged?: string | number;
    fee_account?: string;
    memo?: string;
    memo_type?: string;
    ledger?: number;
    operation_count?: number;
  };
}

export function assetKeyOf(type: string | undefined, code?: string, issuer?: string): string {
  if (!type || type === "native") return "native";
  return `${code ?? ""}:${issuer ?? ""}`;
}

function opIndexFromId(id: string): number {
  // Horizon op ids are `${ledgerSeq}${txIdx}${opIdx}` packed; we cannot recover opIdx reliably,
  // so use the paging token which is unique per operation.
  return Number(id.slice(-4)) || 0;
}

/**
 * Normalize one Horizon payment record into zero, one or two ChainEntries from the
 * perspective of `account`: the value movement, plus a fee entry when `account`
 * paid the transaction fee (emitted once per transaction, on the first op we see).
 */
export function normalizeHorizonPayment(
  rec: HorizonPaymentLike,
  account: string,
  seenFeeTx = new Set<string>(),
): ChainEntry[] {
  const out: ChainEntry[] = [];
  const base = {
    txHash: rec.transaction_hash,
    ledger: rec.transaction?.ledger ?? 0,
    timestamp: rec.created_at,
    account,
    successful: rec.transaction_successful,
    ...(rec.transaction?.memo ? { memo: rec.transaction.memo } : {}),
  };
  const id = `${rec.transaction_hash}:${opIndexFromId(rec.id)}`;

  switch (rec.type) {
    case "payment": {
      if (rec.to === account) {
        out.push({
          ...base,
          id,
          kind: "payment",
          asset: assetKeyOf(rec.asset_type, rec.asset_code, rec.asset_issuer),
          amount: rec.amount ?? "0",
          counterparty: rec.from ?? rec.source_account,
        });
      } else if (rec.from === account) {
        out.push({
          ...base,
          id,
          kind: "payment",
          asset: assetKeyOf(rec.asset_type, rec.asset_code, rec.asset_issuer),
          amount: `-${rec.amount ?? "0"}`,
          counterparty: rec.to ?? "",
        });
      }
      break;
    }
    case "path_payment_strict_send":
    case "path_payment_strict_receive": {
      if (rec.to === account) {
        out.push({
          ...base,
          id,
          kind: "path_payment",
          asset: assetKeyOf(rec.asset_type, rec.asset_code, rec.asset_issuer),
          amount: rec.amount ?? "0",
          counterparty: rec.from ?? rec.source_account,
        });
      } else if (rec.from === account) {
        out.push({
          ...base,
          id,
          kind: "path_payment",
          asset: assetKeyOf(rec.source_asset_type, rec.source_asset_code, rec.source_asset_issuer),
          amount: `-${rec.source_amount ?? "0"}`,
          counterparty: rec.to ?? "",
        });
      }
      break;
    }
    case "create_account": {
      if (rec.account === account) {
        out.push({
          ...base,
          id,
          kind: "create_account",
          asset: "native",
          amount: rec.starting_balance ?? "0",
          counterparty: rec.funder ?? rec.source_account,
        });
      } else if (rec.funder === account) {
        out.push({
          ...base,
          id,
          kind: "create_account",
          asset: "native",
          amount: `-${rec.starting_balance ?? "0"}`,
          counterparty: rec.account ?? "",
        });
      }
      break;
    }
    case "account_merge": {
      if (rec.into === account) {
        // Horizon does not include the merged amount on the operation; effects are needed.
        out.push({
          ...base,
          id,
          kind: "account_merge",
          asset: "native",
          amount: "0",
          counterparty: rec.source_account,
        });
      }
      break;
    }
  }

  const feeAccount = rec.transaction?.fee_account ?? rec.source_account;
  if (
    feeAccount === account &&
    rec.transaction?.fee_charged !== undefined &&
    !seenFeeTx.has(rec.transaction_hash)
  ) {
    seenFeeTx.add(rec.transaction_hash);
    out.push({
      ...base,
      id: `${rec.transaction_hash}:fee`,
      kind: "fee",
      asset: "native",
      amount: `-${stroopsToDecimal(rec.transaction.fee_charged)}`,
      feeStroops: String(rec.transaction.fee_charged),
    });
  }
  return out;
}
