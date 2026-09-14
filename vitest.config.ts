import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@stellar-reconcile/core": path.resolve(__dirname, "packages/core/src/index.ts"),
    },
  },
  test: {
    include: ["packages/*/src/**/*.test.ts", "backend/src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "frontend/**"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["packages/*/src/**", "backend/src/**"],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
});
