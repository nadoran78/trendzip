import assert from "node:assert/strict";
import test from "node:test";

import { DUPLICATE_POLICY_ACTIONS, DUPLICATE_POLICY_REASONS } from "./duplicate-policy.mjs";
import { runOperationalDraftDryRun } from "./operational-dry-run.mjs";

const candidate = {
  keywordId: 101,
  keyword: "메이드 인 코리아",
  generation: "TEEN",
  category: "시리즈",
  rank: 1,
  trendScore: 1000,
  rankTrend: "NEW",
  rankDelta: null,
  explain: "작품 공개로 관심을 받고 있습니다.",
  sourceCrawlRunId: 501,
  snapshotAt: "2026-08-21T03:00:00",
  explainedAt: "2026-08-21T03:05:00",
  relatedKeywords: [],
  relatedVideos: [
    {
      videoId: "video-101",
      title: "메이드 인 코리아 메인 예고편",
      channelName: "Disney Plus Korea",
      viewCount: 100_000,
      publishedAt: "2026-08-20T12:00:00",
    },
  ],
};

function editorialPlan(topicKey) {
  return {
    primaryKeywordId: 101,
    editorialFormat: "WHY_NOW",
    topicKey,
    eventKey: `${topicKey}:official-release`,
    audienceAngle: "작품 공개 배경",
    selectionReason: "공식 예고편이 확인됐습니다.",
    title: "메이드 인 코리아가 주목받는 이유",
    relatedKeywordIds: [],
    hook: "작품명이 검색되는 이유",
    summary: "공식 예고편 공개로 관심을 받고 있습니다.",
    reasons: ["공식 예고편이 공개됐습니다.", "출연진 정보가 확산했습니다."],
    narration: {
      hook: "오늘의 키워드는 메이드 인 코리아입니다.",
      overview: "새 작품 공개 소식이 관심을 모았습니다.",
      reasons: "공식 예고편과 출연진 정보가 함께 확산했습니다.",
      evidence: "관련 영상에서 작품명을 확인했습니다.",
      cta: "자세한 내용은 트렌드집 프로필 링크에서 확인해 보세요.",
    },
    evidenceVideoIds: ["video-101"],
  };
}

test("dry run reuses one API context, compares repeated plans, and never reserves a draft", async () => {
  const calls = { keywordLists: 0, keywordDetails: 0, histories: 0, reservations: 0 };
  const apiClient = {
    async getKeywordList(generation) {
      calls.keywordLists += 1;
      return { generation, keywords: generation === "TEEN" ? [{ id: 101 }] : [] };
    },
    async getKeywordDetail() {
      calls.keywordDetails += 1;
      return candidate;
    },
    async getRecentShortformContents() {
      calls.histories += 1;
      return [{ id: 10, status: "REJECTED", topicKey: "old-topic" }];
    },
    async reserveDraft() {
      calls.reservations += 1;
      throw new Error("Dry run must not reserve a draft.");
    },
  };
  let planCallCount = 0;
  const editorialPlanner = {
    async createPlan(input) {
      planCallCount += 1;
      const topicKey = planCallCount === 2 ? "made-in-korea-series" : "made-in-korea";
      return {
        plan: editorialPlan(topicKey),
        selectedCandidate: input.candidates[0],
        generationAttemptCount: planCallCount === 3 ? 2 : 1,
      };
    },
  };
  const sleepCalls = [];

  const report = await runOperationalDraftDryRun({
    config: {
      candidateLimitPerGeneration: 10,
      maximumCandidateAgeHours: 72,
      historyWindowDays: 30,
      dryRunCount: 3,
      dryRunIntervalMs: 3_500,
    },
    apiClient,
    editorialPlanner,
    duplicatePolicy: () => ({
      action: DUPLICATE_POLICY_ACTIONS.ALLOW,
      reason: DUPLICATE_POLICY_REASONS.NO_DUPLICATE,
      conflictingContentId: null,
    }),
    now: new Date("2026-08-21T03:00:00.000Z"),
    sleepImpl: async (milliseconds) => sleepCalls.push(milliseconds),
  });

  assert.deepEqual(calls, {
    keywordLists: 2,
    keywordDetails: 1,
    histories: 1,
    reservations: 0,
  });
  assert.equal(report.mode, "DRY_RUN");
  assert.equal(report.iterations.length, 3);
  assert.equal(report.iterations.every((iteration) => iteration.status === "SUCCESS"), true);
  assert.equal(report.iterations[0].manifestPreview.status, "DRY_RUN");
  assert.equal(report.iterations.every((iteration) => iteration.wouldReserve), true);
  assert.deepEqual(sleepCalls, [3_500, 3_500]);
  assert.equal(report.stability.stablePrimaryKeyword, true);
  assert.equal(report.stability.attemptedCount, 3);
  assert.equal(report.stability.successfulCount, 3);
  assert.equal(report.stability.failedCount, 0);
  assert.equal(report.stability.repairedCount, 1);
  assert.deepEqual(report.stability.generationAttemptCounts, [1, 1, 2]);
  assert.equal(report.stability.stableTopicKey, false);
  assert.equal(report.stability.stableEventKey, false);
  assert.deepEqual(report.stability.topicKeys, ["made-in-korea", "made-in-korea-series"]);
});

test("dry run records a failed plan and continues the remaining iterations", async () => {
  let planCallCount = 0;
  const editorialPlanner = {
    async createPlan(input) {
      planCallCount += 1;
      if (planCallCount === 2) {
        const error = new Error("editorialPlan.hook must be at most 48 characters (received 52).");
        error.generationAttemptCount = 2;
        throw error;
      }
      return { plan: editorialPlan("made-in-korea"), selectedCandidate: input.candidates[0] };
    },
  };
  const apiClient = {
    async getKeywordList(generation) {
      return { generation, keywords: generation === "TEEN" ? [{ id: 101 }] : [] };
    },
    async getKeywordDetail() {
      return candidate;
    },
    async getRecentShortformContents() {
      return [];
    },
  };

  const report = await runOperationalDraftDryRun({
    config: {
      candidateLimitPerGeneration: 10,
      maximumCandidateAgeHours: 72,
      historyWindowDays: 30,
      dryRunCount: 3,
      dryRunIntervalMs: 0,
    },
    apiClient,
    editorialPlanner,
    duplicatePolicy: () => ({
      action: DUPLICATE_POLICY_ACTIONS.ALLOW,
      reason: DUPLICATE_POLICY_REASONS.NO_DUPLICATE,
      conflictingContentId: null,
    }),
    now: new Date("2026-08-21T03:00:00.000Z"),
  });

  assert.equal(planCallCount, 3);
  assert.deepEqual(
    report.iterations.map(({ status }) => status),
    ["SUCCESS", "FAILED", "SUCCESS"],
  );
  assert.deepEqual(report.iterations[1].error, {
    name: "Error",
    message: "editorialPlan.hook must be at most 48 characters (received 52).",
    generationAttemptCount: 2,
  });
  assert.equal(report.stability.successfulCount, 2);
  assert.equal(report.stability.failedCount, 1);
  assert.equal(report.stability.repairedCount, 1);
  assert.equal(report.stability.stableContent, true);
});

test("dry run reports unstable false when every plan fails validation", async () => {
  const apiClient = {
    async getKeywordList(generation) {
      return { generation, keywords: generation === "TEEN" ? [{ id: 101 }] : [] };
    },
    async getKeywordDetail() {
      return candidate;
    },
    async getRecentShortformContents() {
      return [];
    },
  };

  const report = await runOperationalDraftDryRun({
    config: {
      candidateLimitPerGeneration: 10,
      maximumCandidateAgeHours: 72,
      historyWindowDays: 30,
      dryRunCount: 2,
      dryRunIntervalMs: 0,
    },
    apiClient,
    editorialPlanner: {
      async createPlan() {
        throw new Error("invalid Gemini response");
      },
    },
    duplicatePolicy: () => {
      throw new Error("Duplicate policy must not run for an invalid plan.");
    },
    now: new Date("2026-08-21T03:00:00.000Z"),
  });

  assert.equal(report.stability.successfulCount, 0);
  assert.equal(report.stability.failedCount, 2);
  assert.equal(report.stability.repairedCount, 0);
  assert.deepEqual(report.stability.generationAttemptCounts, [1, 1]);
  assert.equal(report.stability.stablePrimaryKeyword, false);
  assert.equal(report.stability.stableTopicKey, false);
  assert.equal(report.stability.stableEventKey, false);
  assert.equal(report.stability.stableContent, false);
});
