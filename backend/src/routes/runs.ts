import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  deriveExceptions,
  exceptionsToCsv,
  reconcile,
  summarize,
  type Collector,
  type OpeningBalance,
  type SeverityThresholds,
} from "@stellar-reconcile/core";
import { HttpError } from "../errors.js";
import type { Repository } from "../repository/types.js";
import {
  accountId,
  amount,
  exceptionSchema,
  exceptionStatus,
  isoDate,
  pageOf,
  pagination,
  runSchema,
  severity,
} from "../schemas.js";

export interface RunDeps {
  repo: Repository;
  collector: Collector;
  thresholds: SeverityThresholds;
}

export async function runRoutes(app: FastifyInstance, deps: RunDeps): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/runs",
    {
      schema: {
        tags: ["runs"],
        summary: "Run a reconciliation for an account over a time range",
        body: z.object({
          account: accountId,
          from: isoDate,
          to: isoDate,
          openingBalances: z.array(z.object({ asset: z.string(), balance: amount })).optional(),
          expectedFees: amount.optional(),
          matchWindowSeconds: z
            .number()
            .int()
            .min(0)
            .max(30 * 86_400)
            .optional(),
        }),
        response: { 201: runSchema },
      },
    },
    async (req, reply) => {
      const { account, from, to } = req.body;
      if (Date.parse(from) >= Date.parse(to))
        throw new HttpError(400, "INVALID_RANGE", "from must be before to");
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      try {
        const [collected, records, balances] = await Promise.all([
          deps.collector.collectEntries(account, { from, to }),
          deps.repo.listRecords(account, from, to),
          req.body.openingBalances
            ? deps.collector.collectBalances(account)
            : Promise.resolve(undefined),
        ]);
        const openingBalances: OpeningBalance[] | undefined = req.body.openingBalances?.map(
          (b) => ({ account, ...b }),
        );
        const result = reconcile({
          account,
          entries: collected.entries,
          records,
          ...(balances ? { balances } : {}),
          ...(openingBalances ? { openingBalances } : {}),
          ...(req.body.expectedFees ? { expectedFees: req.body.expectedFees } : {}),
          options: {
            ...(req.body.matchWindowSeconds !== undefined
              ? { matchWindowSeconds: req.body.matchWindowSeconds }
              : {}),
          },
        });
        const exceptions = deriveExceptions(result, { thresholds: deps.thresholds });
        const summary = summarize(result, exceptions);
        const run = { id, account, from, to, status: "completed" as const, summary, createdAt };
        await deps.repo.createRun(run);
        await deps.repo.saveExceptions(id, exceptions);
        return reply.status(201).send(run);
      } catch (err) {
        const run = {
          id,
          account,
          from,
          to,
          status: "failed" as const,
          error: err instanceof Error ? err.message : "unknown error",
          createdAt,
        };
        await deps.repo.createRun(run);
        throw err;
      }
    },
  );

  r.get(
    "/runs",
    {
      schema: {
        tags: ["runs"],
        summary: "List runs",
        querystring: pagination,
        response: { 200: pageOf(runSchema) },
      },
    },
    async (req) => deps.repo.listRuns(req.query.page, req.query.pageSize),
  );

  r.get(
    "/runs/:id",
    {
      schema: {
        tags: ["runs"],
        summary: "Get a run",
        params: z.object({ id: z.string().uuid() }),
        response: { 200: runSchema },
      },
    },
    async (req) => {
      const run = await deps.repo.getRun(req.params.id);
      if (!run) throw new HttpError(404, "RUN_NOT_FOUND", `run ${req.params.id} not found`);
      return run;
    },
  );

  r.get(
    "/runs/:id/exceptions",
    {
      schema: {
        tags: ["exceptions"],
        summary: "List exceptions for a run",
        params: z.object({ id: z.string().uuid() }),
        querystring: pagination.extend({
          status: exceptionStatus.optional(),
          severity: severity.optional(),
        }),
        response: { 200: pageOf(exceptionSchema) },
      },
    },
    async (req) => {
      if (!(await deps.repo.getRun(req.params.id)))
        throw new HttpError(404, "RUN_NOT_FOUND", `run ${req.params.id} not found`);
      const { page, pageSize, status, severity: sev } = req.query;
      return deps.repo.listExceptions({
        runId: req.params.id,
        page,
        pageSize,
        ...(status ? { status } : {}),
        ...(sev ? { severity: sev } : {}),
      });
    },
  );

  r.get(
    "/runs/:id/export.csv",
    {
      schema: {
        tags: ["exceptions"],
        summary: "Export a run's exceptions as CSV",
        params: z.object({ id: z.string().uuid() }),
        produces: ["text/csv"],
      },
    },
    async (req, reply) => {
      if (!(await deps.repo.getRun(req.params.id)))
        throw new HttpError(404, "RUN_NOT_FOUND", `run ${req.params.id} not found`);
      const items: Parameters<typeof exceptionsToCsv>[0] = [];
      let page = 1;
      for (;;) {
        const p = await deps.repo.listExceptions({ runId: req.params.id, page, pageSize: 200 });
        items.push(...p.items);
        if (p.items.length < 200) break;
        page += 1;
      }
      return reply
        .header("content-type", "text/csv; charset=utf-8")
        .header("content-disposition", `attachment; filename="exceptions-${req.params.id}.csv"`)
        .send(exceptionsToCsv(items));
    },
  );

  r.patch(
    "/exceptions/:id",
    {
      schema: {
        tags: ["exceptions"],
        summary: "Update an exception's status",
        params: z.object({ id: z.string().min(1) }),
        body: z.object({ status: exceptionStatus, note: z.string().max(2000).optional() }),
        response: { 200: exceptionSchema },
      },
    },
    async (req) => {
      const updated = await deps.repo.updateException(
        req.params.id,
        req.body.status,
        req.body.note,
      );
      if (!updated)
        throw new HttpError(404, "EXCEPTION_NOT_FOUND", `exception ${req.params.id} not found`);
      return updated;
    },
  );
}
