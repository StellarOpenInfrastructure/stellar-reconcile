import pino from "pino";

/**
 * Structured JSON logger. Sensitive fields are redacted at the logger level so
 * no route can accidentally leak them.
 */
export function createLogger(level: string, pretty = false) {
  return pino({
    level,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "headers.authorization",
        "*.apiKey",
        "*.secret",
        "*.secretKey",
        "*.privateKey",
        "*.token",
      ],
      censor: "[REDACTED]",
    },
    ...(pretty ? { transport: { target: "pino-pretty", options: { colorize: true } } } : {}),
  });
}
