import { Horizon } from "@stellar/stellar-sdk";
import { ReconcileError } from "../errors.js";
import type { BalanceSnapshot, ChainEntry } from "../ledger/types.js";
import { normalizeHorizonPayment, type HorizonPaymentLike } from "../normalizer/horizon.js";
import type { Collector, CollectRange, CollectResult } from "./types.js";

export interface HorizonCollectorOptions {
  horizonUrl: string;
  allowHttp?: boolean;
  /** Page size per request (max 200). */
  pageSize?: number;
}

/**
 * Collects payments (payment, path payment, create_account, account_merge) for an
 * account from Horizon. Fees are derived from the parent transaction.
 */
export class HorizonCollector implements Collector {
  readonly name = "horizon";
  private readonly server: Horizon.Server;
  private readonly pageSize: number;

  constructor(opts: HorizonCollectorOptions) {
    this.server = new Horizon.Server(opts.horizonUrl, { allowHttp: opts.allowHttp ?? false });
    this.pageSize = Math.min(opts.pageSize ?? 200, 200);
  }

  async collectEntries(account: string, range: CollectRange): Promise<CollectResult> {
    const from = Date.parse(range.from);
    const to = Date.parse(range.to);
    let builder = this.server
      .payments()
      .forAccount(account)
      .order("asc")
      .limit(this.pageSize)
      .join("transactions");
    if (range.cursor) builder = builder.cursor(range.cursor);
    let page: Awaited<ReturnType<typeof builder.call>>;
    try {
      page = await builder.call();
    } catch (err) {
      throw new ReconcileError("COLLECTOR_UNAVAILABLE", "horizon request failed", {
        reason: err instanceof Error ? err.message : String(err),
      });
    }
    const entries: ChainEntry[] = [];
    let nextCursor: string | undefined;
    for (const rec of page.records) {
      const t = Date.parse(rec.created_at);
      if (t < from) continue;
      if (t >= to) return { entries };
      entries.push(...normalizeHorizonPayment(rec as unknown as HorizonPaymentLike, account));
      nextCursor = rec.paging_token;
    }
    return page.records.length === this.pageSize && nextCursor
      ? { entries, nextCursor }
      : { entries };
  }

  async collectBalances(account: string): Promise<BalanceSnapshot[]> {
    let acc: Horizon.AccountResponse;
    try {
      acc = await this.server.loadAccount(account);
    } catch (err) {
      throw new ReconcileError("COLLECTOR_UNAVAILABLE", "horizon loadAccount failed", {
        reason: err instanceof Error ? err.message : String(err),
      });
    }
    const timestamp = new Date().toISOString();
    return acc.balances.map((b) => ({
      account,
      asset:
        b.asset_type === "native"
          ? "native"
          : "asset_code" in b
            ? `${b.asset_code}:${b.asset_issuer}`
            : `pool:${(b as { liquidity_pool_id?: string }).liquidity_pool_id ?? ""}`,
      balance: b.balance,
      ledger: acc.last_modified_ledger,
      timestamp,
    }));
  }
}
