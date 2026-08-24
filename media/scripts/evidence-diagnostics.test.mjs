import assert from "node:assert/strict";
import test from "node:test";

import {
  EVIDENCE_DIAGNOSTIC_CODES,
  createEvidenceDiagnostics,
} from "./evidence-diagnostics.mjs";

const generatedAt = "2026-08-23T13:10:11";

test("WHY_NOW reports recent evidence without a warning", () => {
  const diagnostics = createEvidenceDiagnostics({
    editorialFormat: "WHY_NOW",
    generatedAt,
    evidence: [
      { videoId: "recent-video", publishedAt: "2026-08-22T13:10:11" },
      { videoId: "old-video", publishedAt: "2026-07-01T13:10:11" },
    ],
  });

  assert.equal(diagnostics.requiresRecentEvidence, true);
  assert.equal(diagnostics.hasRecentEvidence, true);
  assert.equal(diagnostics.latestEvidencePublishedAt, "2026-08-22T13:10:11");
  assert.deepEqual(
    diagnostics.evidence.map(({ videoId, ageDays, isRecent }) => ({
      videoId,
      ageDays,
      isRecent,
    })),
    [
      { videoId: "recent-video", ageDays: 1, isRecent: true },
      { videoId: "old-video", ageDays: 53, isRecent: false },
    ],
  );
  assert.deepEqual(diagnostics.warnings, []);
});

test("WHY_NOW warns when every evidence video is older than the recent window", () => {
  const diagnostics = createEvidenceDiagnostics({
    editorialFormat: "WHY_NOW",
    generatedAt,
    evidence: [{ videoId: "old-video", publishedAt: "2026-07-01T13:10:11" }],
  });

  assert.equal(diagnostics.hasRecentEvidence, false);
  assert.deepEqual(diagnostics.warnings, [
    {
      code: EVIDENCE_DIAGNOSTIC_CODES.WHY_NOW_WITHOUT_RECENT_EVIDENCE,
      message: "WHY_NOW has no evidence video published within 30 days.",
    },
  ]);
});

test("KEYWORD_PRIMER allows representative evidence outside the recent window", () => {
  const diagnostics = createEvidenceDiagnostics({
    editorialFormat: "KEYWORD_PRIMER",
    generatedAt,
    evidence: [{ videoId: "old-video", publishedAt: "2025-08-23T13:10:11" }],
  });

  assert.equal(diagnostics.requiresRecentEvidence, false);
  assert.equal(diagnostics.hasRecentEvidence, false);
  assert.deepEqual(diagnostics.warnings, []);
});
