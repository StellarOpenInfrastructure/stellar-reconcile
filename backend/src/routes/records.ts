import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Repository } from "../repository/types.js";
import { accountId, internalRecordSchema, isoDate } from "../schemas.js";

export async function recordRoutes(app: FastifyInstance, repo: Repository): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/records",
    {
      schema: {
        tags: ["records"],
        summary: "Import internal records (upsert by account + id)",
        body: z.object({ records: z.array(internalRecordSchema).min(1).max(5000) }),
        response: { 200: z.object({ upserted: z.number().int() }) },
      },
    },
    async (req) => ({ upserted: await repo.upsertRecords(req.body.records) }),
  );

  r.get(
    "/records",
    {
      schema: {
        tags: ["records"],
        summary: "List internal records for an account and time range",
        querystring: z.object({ account: accountId, from: isoDate, to: isoDate }),
        response: { 200: z.object({ items: z.array(internalRecordSchema) }) },
      },
    },
    async (req) => ({
      items: await repo.listRecords(req.query.account, req.query.from, req.query.to),
    }),
  );
}
