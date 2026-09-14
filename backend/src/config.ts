import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4020),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  /** PostgreSQL connection string. When unset, an in-memory repository is used (development only). */
  DATABASE_URL: z.string().optional(),
  STELLAR_NETWORK: z.enum(["testnet", "mainnet", "custom"]).default("testnet"),
  STELLAR_HORIZON_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().default("*"),
  /** Severity thresholds in asset units. */
  SEVERITY_MEDIUM: z.string().default("100"),
  SEVERITY_HIGH: z.string().default("1000"),
  SEVERITY_CRITICAL: z.string().default("10000"),
});

export type Env = z.infer<typeof envSchema>;
export interface AppConfig extends Env {
  horizonUrl: string;
}

const HORIZON = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org",
} as const;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `invalid configuration for: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  }
  const env = parsed.data;
  const horizonUrl =
    env.STELLAR_HORIZON_URL ??
    (env.STELLAR_NETWORK === "custom" ? undefined : HORIZON[env.STELLAR_NETWORK]);
  if (!horizonUrl) throw new Error("STELLAR_HORIZON_URL is required when STELLAR_NETWORK=custom");
  return { ...env, horizonUrl };
}
