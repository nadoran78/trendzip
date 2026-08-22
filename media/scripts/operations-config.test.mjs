import assert from "node:assert/strict";
import test from "node:test";

import { loadOperationalDraftConfig } from "./operations-config.mjs";

const requiredEnv = {
  TRENDZIP_API_BASE_URL: "https://api-trendzip.nadoran.com/",
  MEDIA_OPERATIONS_API_KEY: "operations-key",
  GEMINI_API_KEY: "gemini-key",
};

test("operational draft config applies safe defaults and normalizes the API URL", () => {
  const config = loadOperationalDraftConfig(requiredEnv);

  assert.equal(config.apiBaseUrl, "https://api-trendzip.nadoran.com");
  assert.equal(config.geminiModel, "gemini-3.1-flash-lite");
  assert.equal(config.requestTimeoutMs, 15_000);
  assert.equal(config.candidateLimitPerGeneration, 10);
  assert.equal(config.dryRunCount, 1);
  assert.equal(config.dryRunIntervalMs, 3_500);
  assert.equal(config.historyWindowDays, 30);
  assert.equal(config.maximumCandidateAgeHours, 72);
  assert.equal(config.cloudflareAccess, null);
});

test("operational draft config requires both Cloudflare service token values", () => {
  assert.throws(
    () =>
      loadOperationalDraftConfig({
        ...requiredEnv,
        CLOUDFLARE_ACCESS_CLIENT_ID: "client-id",
      }),
    /must be configured together/,
  );
});

test("operational draft config rejects an excessive candidate limit", () => {
  assert.throws(
    () =>
      loadOperationalDraftConfig({
        ...requiredEnv,
        MEDIA_CANDIDATE_LIMIT_PER_GENERATION: "21",
      }),
    /must be an integer between 1 and 20/,
  );
});

test("operational draft config accepts repeated dry runs without a wait", () => {
  const config = loadOperationalDraftConfig({
    ...requiredEnv,
    MEDIA_DRY_RUN_COUNT: "3",
    MEDIA_DRY_RUN_INTERVAL_MS: "0",
  });

  assert.equal(config.dryRunCount, 3);
  assert.equal(config.dryRunIntervalMs, 0);
});
