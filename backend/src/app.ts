import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { HorizonCollector, type Collector } from "@stellar-reconcile/core";
import type { AppConfig } from "./config.js";
import { errorHandler } from "./errors.js";
import { createLogger } from "./logger.js";
import { InMemoryRepository, PostgresRepository, type Repository } from "./repository/index.js";
import { healthRoutes } from "./routes/health.js";
import { recordRoutes } from "./routes/records.js";
import { runRoutes } from "./routes/runs.js";

export const APP_VERSION = "0.1.0";

export interface AppDeps {
  repo?: Repository;
  collector?: Collector;
}

export type App = Awaited<ReturnType<typeof buildApp>>;

export async function buildApp(config: AppConfig, deps: AppDeps = {}) {
  const app = Fastify({
    loggerInstance: createLogger(config.LOG_LEVEL, config.NODE_ENV === "development"),
    genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
    requestIdHeader: "x-request-id",
    bodyLimit: 5 * 1024 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);
  app.addHook("onSend", async (req, reply) => {
    reply.header("x-request-id", req.id);
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin:
      config.CORS_ORIGINS === "*" ? true : config.CORS_ORIGINS.split(",").map((s) => s.trim()),
  });
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "stellar-reconcile API",
        description:
          "Accounting-grade reconciliation infrastructure for Stellar assets and transactions.",
        version: APP_VERSION,
      },
      tags: [
        { name: "system" },
        { name: "records", description: "Internal (business-side) records" },
        { name: "runs", description: "Reconciliation runs" },
        { name: "exceptions", description: "Exceptions produced by runs" },
      ],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  const repo =
    deps.repo ??
    (config.DATABASE_URL ? new PostgresRepository(config.DATABASE_URL) : new InMemoryRepository());
  const storage = deps.repo ? "injected" : config.DATABASE_URL ? "postgres" : "memory";
  if (storage === "memory" && config.NODE_ENV === "production") {
    app.log.warn("DATABASE_URL is not set: using in-memory storage in production is not supported");
  }
  const collector =
    deps.collector ??
    new HorizonCollector({
      horizonUrl: config.horizonUrl,
      allowHttp: config.NODE_ENV !== "production",
    });
  const thresholds = {
    medium: config.SEVERITY_MEDIUM,
    high: config.SEVERITY_HIGH,
    critical: config.SEVERITY_CRITICAL,
  };

  app.addHook("onClose", async () => {
    if (!deps.repo) await repo.close();
  });

  await app.register(async (i) => healthRoutes(i, { repo, version: APP_VERSION, storage }));
  await app.register(
    async (i) => {
      await recordRoutes(i, repo);
      await runRoutes(i, { repo, collector, thresholds });
      i.get("/openapi.json", { schema: { hide: true } }, async () => app.swagger());
    },
    { prefix: "/api/v1" },
  );
  return app;
}
