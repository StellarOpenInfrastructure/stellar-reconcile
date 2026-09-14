import type {
  InternalRecord,
  ReconciliationException,
  ReconciliationSummary,
  ExceptionStatus,
} from "@stellar-reconcile/core";

export interface ReconciliationRun {
  id: string;
  account: string;
  from: string;
  to: string;
  status: "completed" | "failed";
  summary?: ReconciliationSummary;
  error?: string;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExceptionFilter {
  runId?: string;
  status?: ExceptionStatus;
  severity?: ReconciliationException["severity"];
  page: number;
  pageSize: number;
}

/** Persistence boundary. Implemented in memory (tests/dev) and with PostgreSQL. */
export interface Repository {
  /** Insert or replace records by id for an account. Returns count upserted. */
  upsertRecords(records: InternalRecord[]): Promise<number>;
  listRecords(account: string, from: string, to: string): Promise<InternalRecord[]>;
  createRun(run: ReconciliationRun): Promise<void>;
  getRun(id: string): Promise<ReconciliationRun | undefined>;
  listRuns(page: number, pageSize: number): Promise<Page<ReconciliationRun>>;
  /** Insert exceptions for a run; existing ids keep their status (idempotent re-runs). */
  saveExceptions(runId: string, exceptions: ReconciliationException[]): Promise<void>;
  listExceptions(
    filter: ExceptionFilter,
  ): Promise<Page<ReconciliationException & { runId: string }>>;
  updateException(
    id: string,
    status: ExceptionStatus,
    note?: string,
  ): Promise<(ReconciliationException & { runId: string }) | undefined>;
  ping(): Promise<void>;
  close(): Promise<void>;
}
