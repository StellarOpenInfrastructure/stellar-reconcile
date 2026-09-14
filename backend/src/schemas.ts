import { z } from "zod";

export const accountId = z.string().regex(/^G[A-Z2-7]{55}$/, "invalid Stellar account id");
export const amount = z
  .string()
  .regex(/^-?\d+(\.\d{1,7})?$/, "amount must be a signed decimal with ≤ 7 fractional digits");
export const isoDate = z.string().datetime({ offset: true });

export const internalRecordSchema = z.object({
  id: z.string().min(1).max(128),
  externalRef: z.string().max(128).optional(),
  account: accountId,
  counterparty: z.string().max(69).optional(),
  asset: z.string().min(1).max(120),
  amount,
  timestamp: isoDate,
  memo: z.string().max(64).optional(),
  txHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
});

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const exceptionStatus = z.enum(["open", "acknowledged", "resolved", "ignored"]);
export const severity = z.enum(["low", "medium", "high", "critical"]);

export const exceptionSchema = z.object({
  id: z.string(),
  runId: z.string(),
  type: z.string(),
  severity,
  account: z.string(),
  asset: z.string().optional(),
  amount: z.string().optional(),
  description: z.string(),
  refs: z.object({
    internalIds: z.array(z.string()).optional(),
    entryIds: z.array(z.string()).optional(),
    txHashes: z.array(z.string()).optional(),
  }),
  status: exceptionStatus,
  note: z.string().optional(),
  createdAt: z.string(),
});

export const runSchema = z.object({
  id: z.string(),
  account: z.string(),
  from: z.string(),
  to: z.string(),
  status: z.enum(["completed", "failed"]),
  summary: z.unknown().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
});

export function pageOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });
}
