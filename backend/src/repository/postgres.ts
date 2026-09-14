import postgres from "postgres";
import type {
  InternalRecord,
  ReconciliationException,
  ExceptionStatus,
} from "@stellar-reconcile/core";
import type { ExceptionFilter, Page, ReconciliationRun, Repository } from "./types.js";

type Sql = ReturnType<typeof postgres>;
type StoredException = ReconciliationException & { runId: string; note?: string };

interface ExceptionRow {
  id: string;
  run_id: string;
  type: string;
  severity: string;
  account: string;
  asset: string | null;
  amount: string | null;
  description: string;
  refs: ReconciliationException["refs"];
  status: string;
  note: string | null;
  created_at: Date;
}

function rowToException(r: ExceptionRow): StoredException {
  return {
    id: r.id,
    runId: r.run_id,
    type: r.type as ReconciliationException["type"],
    severity: r.severity as ReconciliationException["severity"],
    account: r.account,
    ...(r.asset ? { asset: r.asset } : {}),
    ...(r.amount ? { amount: r.amount } : {}),
    description: r.description,
    refs: r.refs,
    status: r.status as ExceptionStatus,
    ...(r.note ? { note: r.note } : {}),
    createdAt: r.created_at.toISOString(),
  };
}

/**
 * PostgreSQL repository. Schema lives in database/migrations and is applied with
 * `pnpm run migrate`; this class never creates tables itself.
 */
export class PostgresRepository implements Repository {
  private readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, { max: 10, transform: { undefined: null } });
  }

  async upsertRecords(records: InternalRecord[]): Promise<number> {
    if (records.length === 0) return 0;
    const rows = records.map((r) => ({
      id: r.id,
      account: r.account,
      external_ref: r.externalRef ?? null,
      counterparty: r.counterparty ?? null,
      asset: r.asset,
      amount: r.amount,
      ts: new Date(r.timestamp),
      memo: r.memo ?? null,
      tx_hash: r.txHash ?? null,
    }));
    await this.sql`
      insert into internal_records ${this.sql(rows)}
      on conflict (account, id) do update set
        external_ref = excluded.external_ref, counterparty = excluded.counterparty, asset = excluded.asset,
        amount = excluded.amount, ts = excluded.ts, memo = excluded.memo, tx_hash = excluded.tx_hash`;
    return records.length;
  }

  async listRecords(account: string, from: string, to: string): Promise<InternalRecord[]> {
    const rows = await this.sql<
      {
        id: string;
        account: string;
        external_ref: string | null;
        counterparty: string | null;
        asset: string;
        amount: string;
        ts: Date;
        memo: string | null;
        tx_hash: string | null;
      }[]
    >`select * from internal_records where account = ${account} and ts >= ${new Date(from)} and ts < ${new Date(to)} order by ts`;
    return rows.map((r) => ({
      id: r.id,
      account: r.account,
      asset: r.asset,
      amount: r.amount,
      timestamp: r.ts.toISOString(),
      ...(r.external_ref ? { externalRef: r.external_ref } : {}),
      ...(r.counterparty ? { counterparty: r.counterparty } : {}),
      ...(r.memo ? { memo: r.memo } : {}),
      ...(r.tx_hash ? { txHash: r.tx_hash } : {}),
    }));
  }

  async createRun(run: ReconciliationRun): Promise<void> {
    await this.sql`insert into reconciliation_runs ${this.sql({
      id: run.id,
      account: run.account,
      range_from: new Date(run.from),
      range_to: new Date(run.to),
      status: run.status,
      summary: run.summary ? this.sql.json(run.summary as never) : null,
      error: run.error ?? null,
      created_at: new Date(run.createdAt),
    })}`;
  }

  private rowToRun(r: {
    id: string;
    account: string;
    range_from: Date;
    range_to: Date;
    status: string;
    summary: unknown;
    error: string | null;
    created_at: Date;
  }): ReconciliationRun {
    return {
      id: r.id,
      account: r.account,
      from: r.range_from.toISOString(),
      to: r.range_to.toISOString(),
      status: r.status as ReconciliationRun["status"],
      ...(r.summary ? { summary: r.summary as ReconciliationRun["summary"] } : {}),
      ...(r.error ? { error: r.error } : {}),
      createdAt: r.created_at.toISOString(),
    };
  }

  async getRun(id: string): Promise<ReconciliationRun | undefined> {
    const rows = await this.sql<
      Parameters<PostgresRepository["rowToRun"]>[0][]
    >`select * from reconciliation_runs where id = ${id}`;
    return rows[0] ? this.rowToRun(rows[0]) : undefined;
  }

  async listRuns(page: number, pageSize: number): Promise<Page<ReconciliationRun>> {
    const [countRow] = await this.sql<
      { count: string }[]
    >`select count(*)::text as count from reconciliation_runs`;
    const rows = await this.sql<Parameters<PostgresRepository["rowToRun"]>[0][]>`
      select * from reconciliation_runs order by created_at desc limit ${pageSize} offset ${(page - 1) * pageSize}`;
    return {
      items: rows.map((r) => this.rowToRun(r)),
      total: Number(countRow?.count ?? 0),
      page,
      pageSize,
    };
  }

  async saveExceptions(runId: string, exceptions: ReconciliationException[]): Promise<void> {
    if (exceptions.length === 0) return;
    const rows = exceptions.map((e) => ({
      id: e.id,
      run_id: runId,
      type: e.type,
      severity: e.severity,
      account: e.account,
      asset: e.asset ?? null,
      amount: e.amount ?? null,
      description: e.description,
      refs: this.sql.json(e.refs as never),
      status: e.status,
      created_at: new Date(e.createdAt),
    }));
    // Keep status/note of an existing exception so operator work survives re-runs.
    await this.sql`
      insert into reconciliation_exceptions ${this.sql(rows)}
      on conflict (id) do update set run_id = excluded.run_id, description = excluded.description, severity = excluded.severity`;
  }

  async listExceptions(filter: ExceptionFilter): Promise<Page<StoredException>> {
    const where = this.sql`where true
      ${filter.runId ? this.sql`and run_id = ${filter.runId}` : this.sql``}
      ${filter.status ? this.sql`and status = ${filter.status}` : this.sql``}
      ${filter.severity ? this.sql`and severity = ${filter.severity}` : this.sql``}`;
    const [countRow] = await this.sql<
      { count: string }[]
    >`select count(*)::text as count from reconciliation_exceptions ${where}`;
    const rows = await this.sql<ExceptionRow[]>`
      select * from reconciliation_exceptions ${where}
      order by created_at desc, id limit ${filter.pageSize} offset ${(filter.page - 1) * filter.pageSize}`;
    return {
      items: rows.map(rowToException),
      total: Number(countRow?.count ?? 0),
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async updateException(
    id: string,
    status: ExceptionStatus,
    note?: string,
  ): Promise<StoredException | undefined> {
    const rows = await this.sql<ExceptionRow[]>`
      update reconciliation_exceptions set status = ${status}, note = coalesce(${note ?? null}, note), updated_at = now()
      where id = ${id} returning *`;
    return rows[0] ? rowToException(rows[0]) : undefined;
  }

  async ping(): Promise<void> {
    await this.sql`select 1`;
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }
}
