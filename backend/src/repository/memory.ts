import type {
  InternalRecord,
  ReconciliationException,
  ExceptionStatus,
} from "@stellar-reconcile/core";
import type { ExceptionFilter, Page, ReconciliationRun, Repository } from "./types.js";

type StoredException = ReconciliationException & { runId: string; note?: string };

export class InMemoryRepository implements Repository {
  private readonly records = new Map<string, InternalRecord>();
  private readonly runs = new Map<string, ReconciliationRun>();
  private readonly exceptions = new Map<string, StoredException>();

  async upsertRecords(records: InternalRecord[]): Promise<number> {
    for (const r of records) this.records.set(`${r.account}|${r.id}`, r);
    return records.length;
  }

  async listRecords(account: string, from: string, to: string): Promise<InternalRecord[]> {
    const f = Date.parse(from);
    const t = Date.parse(to);
    return [...this.records.values()].filter((r) => {
      const ts = Date.parse(r.timestamp);
      return r.account === account && ts >= f && ts < t;
    });
  }

  async createRun(run: ReconciliationRun): Promise<void> {
    this.runs.set(run.id, run);
  }

  async getRun(id: string): Promise<ReconciliationRun | undefined> {
    return this.runs.get(id);
  }

  async listRuns(page: number, pageSize: number): Promise<Page<ReconciliationRun>> {
    const all = [...this.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      items: all.slice((page - 1) * pageSize, page * pageSize),
      total: all.length,
      page,
      pageSize,
    };
  }

  async saveExceptions(runId: string, exceptions: ReconciliationException[]): Promise<void> {
    for (const e of exceptions) {
      const existing = this.exceptions.get(e.id);
      this.exceptions.set(
        e.id,
        existing
          ? {
              ...e,
              runId,
              status: existing.status,
              ...(existing.note ? { note: existing.note } : {}),
            }
          : { ...e, runId },
      );
    }
  }

  async listExceptions(filter: ExceptionFilter): Promise<Page<StoredException>> {
    const all = [...this.exceptions.values()].filter(
      (e) =>
        (!filter.runId || e.runId === filter.runId) &&
        (!filter.status || e.status === filter.status) &&
        (!filter.severity || e.severity === filter.severity),
    );
    return {
      items: all.slice((filter.page - 1) * filter.pageSize, filter.page * filter.pageSize),
      total: all.length,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async updateException(
    id: string,
    status: ExceptionStatus,
    note?: string,
  ): Promise<StoredException | undefined> {
    const e = this.exceptions.get(id);
    if (!e) return undefined;
    const updated = { ...e, status, ...(note !== undefined ? { note } : {}) };
    this.exceptions.set(id, updated);
    return updated;
  }

  async ping(): Promise<void> {}
  async close(): Promise<void> {}
}
