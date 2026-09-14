import { writeFileSync } from "node:fs";
import { buildApp } from "../backend/src/app.js";
import { loadConfig } from "../backend/src/config.js";
import { InMemoryRepository } from "../backend/src/repository/memory.js";

const app = await buildApp(loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" }), {
  repo: new InMemoryRepository(),
});
await app.ready();
writeFileSync("docs/api/openapi.json", JSON.stringify(app.swagger(), null, 2) + "\n");
await app.close();
console.warn("wrote docs/api/openapi.json");
