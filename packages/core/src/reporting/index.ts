import type { ReconciliationException } from "../exception-engine/index.js";
import type { ReconciliationResult } from "../reconciliation-engine/types.js";

export interface ReconciliationSummary {
  account: string;
  generatedAt: string;
  stats: ReconciliationResult["stats"];
  exceptions: { total: number; bySeverity: Record<string, number>; byType: Record<string, number> };
  assets: ReconciliationResult["assets"];
  fees: ReconciliationResult["fees"];
}

export function summarize(
  result: ReconciliationResult,
  exceptions: ReconciliationException[],
  now = new Date(),
): ReconciliationSummary {
  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const e of exceptions) {
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  }
  return {
    account: result.account,
    generatedAt: now.toISOString(),
    stats: result.stats,
    exceptions: { total: exceptions.length, bySeverity, byType },
    assets: result.assets,
    fees: result.fees,
  };
}

/** RFC 4180 CSV escaping. */
export function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  let s: string;
  if (typeof value === "string") s = value;
  else if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
    s = value.toString();
  else if (Array.isArray(value)) s = value.map((v) => csvEscape(v)).join(";");
  else s = JSON.stringify(value) ?? "";
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T & string)[],
): string {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvEscape(row[c])).join(","));
  return lines.join("\r\n") + "\r\n";
}

export const EXCEPTION_COLUMNS = [
  "id",
  "type",
  "severity",
  "account",
  "asset",
  "amount",
  "status",
  "description",
  "createdAt",
] as const;

export function exceptionsToCsv(exceptions: ReconciliationException[]): string {
  return toCsv(
    exceptions.map((e) => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      account: e.account,
      asset: e.asset ?? "",
      amount: e.amount ?? "",
      status: e.status,
      description: e.description,
      createdAt: e.createdAt,
    })),
    [...EXCEPTION_COLUMNS],
  );
}

export function matchesToCsv(result: ReconciliationResult): string {
  return toCsv(
    result.matches.map((m) => ({
      internalId: m.internalId,
      entryId: m.entryId,
      method: m.method,
      confidence: m.confidence,
    })),
    ["internalId", "entryId", "method", "confidence"],
  );
}
