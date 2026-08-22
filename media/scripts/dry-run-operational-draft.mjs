import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateDuplicatePolicy } from "./duplicate-policy.mjs";
import { writeOperationalDryRunReport } from "./draft-manifest-writer.mjs";
import { createGeminiEditorialPlanner } from "./gemini-editorial-planner.mjs";
import { runOperationalDraftDryRun } from "./operational-dry-run.mjs";
import { loadOperationalDraftConfig } from "./operations-config.mjs";
import { createTrendzipApiClient } from "./trendzip-api.mjs";

const scriptsDirectory = fileURLToPath(new URL(".", import.meta.url));
const mediaDirectory = resolve(scriptsDirectory, "..");
const outputDirectory = resolve(mediaDirectory, process.argv[2] ?? "out/operational-dry-runs");
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
});

const report = await runOperationalDraftDryRun({
  config,
  apiClient,
  editorialPlanner,
  duplicatePolicy: evaluateDuplicatePolicy,
});
const outputPath = await writeOperationalDryRunReport({ report, outputDirectory });

process.stdout.write(
  `${JSON.stringify(
    {
      mode: report.mode,
      generatedAt: report.generatedAt,
      candidateCount: report.candidateCount,
      recentContentCount: report.recentContentCount,
      stability: report.stability,
      iterations: report.iterations.map((iteration) =>
        iteration.status === "FAILED"
          ? {
              iteration: iteration.iteration,
              status: iteration.status,
              error: iteration.error,
            }
          : {
              iteration: iteration.iteration,
              status: iteration.status,
              primaryKeywordId: iteration.reservationRequest.primaryKeywordId,
              primaryKeywordWord: iteration.reservationRequest.primaryKeywordWord,
              topicKey: iteration.reservationRequest.topicKey,
              eventKey: iteration.reservationRequest.eventKey,
              wouldReserve: iteration.wouldReserve,
              duplicateDecision: iteration.duplicateDecision,
            },
      ),
      outputPath,
    },
    null,
    2,
  )}\n`,
);

if (report.stability.successfulCount === 0) {
  process.exitCode = 1;
}
