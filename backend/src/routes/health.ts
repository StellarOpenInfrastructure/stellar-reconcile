import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Repository } from "../repository/types.js";

export async function healthRoutes(
  app: FastifyInstance,
  deps: { repo: Repository; version: string; storage: string },
): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();
  r.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "Liveness",
        response: { 200: z.object({ status: z.literal("ok"), version: z.string() }) },
      },
    },
    async () => ({
      status: "ok" as const,
      version: deps.version,
    }),
  );
  r.get(
    "/ready",
    {
      schema: {
        tags: ["system"],
        summary: "Readiness (checks the database)",
        response: {
          200: z.object({ status: z.literal("ready"), checks: z.record(z.string(), z.string()) }),
          503: z.object({
            status: z.literal("not_ready"),
            checks: z.record(z.string(), z.string()),
          }),
        },
      },
    },
    async (_req, reply) => {
      try {
        await deps.repo.ping();
        return { status: "ready" as const, checks: { storage: deps.storage } };
      } catch (err) {
        return reply.status(503).send({
          status: "not_ready" as const,
          checks: { storage: err instanceof Error ? err.message : "unavailable" },
        });
      }
    },
  );
}
