import { resolve } from "node:path";

import { loadMediaOperationsConfig } from "./operations-config.mjs";
import { reviewOperationalRender } from "./operational-review-gate.mjs";
import { createTrendzipApiClient } from "./trendzip-api.mjs";

function readOption(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const runDirectory = process.argv[2];
if (!runDirectory) {
  throw new Error(
    "Usage: npm run draft:review -- <run-directory> --decision=... --reviewer=... --reason=...",
  );
}

const config = loadMediaOperationsConfig();
const apiClient = createTrendzipApiClient({
  baseUrl: config.apiBaseUrl,
  mediaOperationsApiKey: config.mediaOperationsApiKey,
  cloudflareAccess: config.cloudflareAccess,
  timeoutMs: config.requestTimeoutMs,
});
const result = await reviewOperationalRender({
  runDir: resolve(runDirectory),
  decision: readOption("decision"),
  reviewer: readOption("reviewer"),
  reason: readOption("reason"),
  apiClient,
});

process.stdout.write(`Recorded ${result.response.review.decision} review decision.\n`);
process.stdout.write(`Content status: ${result.response.content.status}\n`);
process.stdout.write(`Artifact hash: ${result.response.review.artifactHash}\n`);
