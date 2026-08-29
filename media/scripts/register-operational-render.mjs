import { resolve } from "node:path";

import { loadMediaOperationsConfig } from "./operations-config.mjs";
import { registerOperationalRender } from "./operational-review-gate.mjs";
import { createTrendzipApiClient } from "./trendzip-api.mjs";

const runDirectory = process.argv[2];
if (!runDirectory) {
  throw new Error("Usage: npm run draft:register -- <run-directory>");
}

const config = loadMediaOperationsConfig();
const apiClient = createTrendzipApiClient({
  baseUrl: config.apiBaseUrl,
  mediaOperationsApiKey: config.mediaOperationsApiKey,
  cloudflareAccess: config.cloudflareAccess,
  timeoutMs: config.requestTimeoutMs,
});
const runDir = resolve(runDirectory);
const result = await registerOperationalRender({ runDir, apiClient });

process.stdout.write(`Registered artifact ${result.manifest.artifactHash}\n`);
process.stdout.write(`Content status: ${result.response.content.status}\n`);
process.stdout.write(`Review video: ${resolve(runDir, result.manifest.files.video)}\n`);
for (const still of result.manifest.files.stills) {
  process.stdout.write(`Review still: ${resolve(runDir, still)}\n`);
}
process.stdout.write("Run draft:review only after completing the full review checklist.\n");
