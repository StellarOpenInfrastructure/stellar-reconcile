import type { ChainEntry, InternalRecord } from "../ledger/types.js";

export const ACC = "GAEB2QI5MVRGIBBJRSPYLQQ7WCLDFYFQ3Q2PRVMQBZQMEG3XF32OLBGA";
export const CP1 = "GCXQCY4DKUJDJ2FUJQYKBR5ULK2XKYQZGIHWDMPGA2N5UNCHBGRCRCFH";
export const CP2 = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const USDC = `USDC:${CP2}`;

let n = 0;
export function entry(partial: Partial<ChainEntry> & Pick<ChainEntry, "amount">): ChainEntry {
  n += 1;
  const txHash = partial.txHash ?? `hash${n.toString().padStart(3, "0")}`;
  return {
    id: `${txHash}:0`,
    txHash,
    ledger: 1000 + n,
    timestamp: "2026-03-01T10:00:00Z",
    account: ACC,
    counterparty: CP1,
    asset: "native",
    kind: "payment",
    successful: true,
    ...partial,
  };
}

export function record(
  partial: Partial<InternalRecord> & Pick<InternalRecord, "id" | "amount">,
): InternalRecord {
  return {
    account: ACC,
    asset: "native",
    timestamp: "2026-03-01T10:05:00Z",
    counterparty: CP1,
    ...partial,
  };
}

export function reset(): void {
  n = 0;
}
