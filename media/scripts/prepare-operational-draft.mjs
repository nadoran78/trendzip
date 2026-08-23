import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateDuplicatePolicy } from "./duplicate-policy.mjs";
import { writeOperationalDraftManifest } from "./draft-manifest-writer.mjs";
import { createGeminiEditorialPlanner } from "./gemini-editorial-planner.mjs";
import { prepareOperationalDraft } from "./operational-draft-runner.mjs";
import { loadOperationalDraftConfig } from "./operations-config.mjs";
import { createTrendzipApiClient } from "./trendzip-api.mjs";

const scriptsDirectory = fileURLToPath(new URL(".", import.meta.url));
const mediaDirectory = resolve(scriptsDirectory, "..");
const outputDirectory = resolve(mediaDirectory, process.argv[2] ?? "out/operational-drafts");
const config = loadOperationalDraftConfig();
const apiClient = createTrendzipApiClient({
  baseUrl: config.apiBaseUrl,
  mediaOperationsApiKey: config.mediaOperationsApiKey,
  cloudflareAccess: config.cloudflareAccess,
  timeoutMs: config.requestTimeoutMs,
});
const editorialPlanner = createGeminiEditorialPlanner({
  apiKey: config.geminiApiKey,
  baseUrl: config.geminiBaseUrl,
  model: config.geminiModel,
  timeoutMs: config.requestTimeoutMs,
  repairDelayMs: config.geminiRepairDelayMs,
});

const result = await prepareOperationalDraft({
  config,
  apiClient,
  editorialPlanner,
  duplicatePolicy: evaluateDuplicatePolicy,
});

if (!result.manifest) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = 2;
} else {
  const outputPath = await writeOperationalDraftManifest({
    manifest: result.manifest,
    outputDirectory,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        shortformContentId: result.reservation.id,
        generationAttemptCount: result.generationAttemptCount,
        duplicateDecision: result.duplicateDecision,
        outputPath,
      },
      null,
      2,
    )}\n`,
  );
}
