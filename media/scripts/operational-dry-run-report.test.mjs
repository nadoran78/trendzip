import assert from "node:assert/strict";
import test from "node:test";

import { DUPLICATE_POLICY_ACTIONS, DUPLICATE_POLICY_REASONS } from "./duplicate-policy.mjs";
import { createDryRunSuccessIteration } from "./operational-dry-run-report.mjs";

function evaluation(overrides = {}) {
  return {
    selection: {
      primaryKeywordId: 101,
      editorialFormat: "WHY_NOW",
      eventType: "TRAILER_RELEASE",
      relatedKeywordIds: [],
      evidenceSelections: [{ evidenceVideoId: "video-101", sourceExcerpt: "메인 예고편" }],
    },
    plan: { primaryKeywordId: 101, title: "메이드 인 코리아 공개 맥락" },
    writerDiagnostics: {
      attemptCount: 1,
      repair: null,
      fallbackUsed: false,
      failure: null,
    },
    reviewWarnings: [],
    draft: {
      reservation: {
        primaryKeywordId: 101,
        primaryKeywordWord: "메이드 인 코리아",
        sourceGeneration: "TEEN",
        sourceCrawlRunId: 501,
        editorialFormat: "WHY_NOW",
        topicKey: "made-in-korea",
        eventKey: "made-in-korea:why-now:crawl-501",
        contentHash: "content-hash",
      },
    },
    duplicateDecision: {
      action: DUPLICATE_POLICY_ACTIONS.ALLOW,
      reason: DUPLICATE_POLICY_REASONS.NO_DUPLICATE,
      conflictingContentId: null,
    },
    generationAttemptCount: 1,
    repairDiagnostics: null,
    ...overrides,
  };
}

const evidenceDiagnostics = {
  requiresRecentEvidence: true,
  hasRecentEvidence: true,
  warnings: [],
};

test("dry-run success report keeps only the operational review fields", () => {
  const iteration = createDryRunSuccessIteration({
    iteration: 1,
    evaluation: evaluation(),
    evidenceDiagnostics,
  });

  assert.equal(iteration.status, "SUCCESS");
  assert.equal(iteration.selection.primaryKeywordWord, "메이드 인 코리아");
  assert.equal(iteration.finalDraft.title, "메이드 인 코리아 공개 맥락");
  assert.equal(iteration.contentHash, "content-hash");
  assert.deepEqual(iteration.writerDiagnostics, { attemptCount: 1, fallbackUsed: false });
  assert.equal(Object.hasOwn(iteration, "repairDiagnostics"), false);
  assert.equal(Object.hasOwn(iteration, "manifestPreview"), false);
  assert.equal(Object.hasOwn(iteration, "editorialBrief"), false);
});

test("dry-run success report adds repair and fallback diagnostics only when present", () => {
  const repairDiagnostics = { code: "UNKNOWN_EVIDENCE_VIDEO_ID" };
  const writerDiagnostics = {
    attemptCount: 2,
    repair: { code: "EDITORIAL_WRITER_UNSUPPORTED_SENTIMENT" },
    fallbackUsed: true,
    failure: { stage: "WRITER_VALIDATION", message: "writer validation failed" },
  };
  const iteration = createDryRunSuccessIteration({
    iteration: 2,
    evaluation: evaluation({ repairDiagnostics, writerDiagnostics }),
    evidenceDiagnostics,
  });

  assert.deepEqual(iteration.repairDiagnostics, repairDiagnostics);
  assert.deepEqual(iteration.writerDiagnostics, writerDiagnostics);
});
