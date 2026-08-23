import assert from "node:assert/strict";
import test from "node:test";

import { DUPLICATE_POLICY_ACTIONS, DUPLICATE_POLICY_REASONS } from "./duplicate-policy.mjs";
import { prepareOperationalDraft } from "./operational-draft-runner.mjs";

const detail = {
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

const plan = {
  primaryKeywordId: 101,
  editorialFormat: "WHY_NOW",
  topicKey: "made-in-korea",
  eventKey: "made-in-korea:official-release",
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

const config = {
  candidateLimitPerGeneration: 10,
  maximumCandidateAgeHours: 72,
  historyWindowDays: 30,
};

function createApiClient() {
  const calls = { historyFrom: null, reservedDraft: null };
  return {
    calls,
    async getKeywordList(generation) {
      return {
        generation,
        keywords: generation === "TEEN" ? [{ id: 101, rank: 1 }] : [],
      };
    },
    async getKeywordDetail() {
      return detail;
    },
    async getRecentShortformContents(from) {
      calls.historyFrom = from;
      return [];
    },
    async reserveDraft(draft) {
      calls.reservedDraft = draft;
      return { id: 77, status: "DRAFT", selectedAt: "2026-08-21T12:00:00" };
    },
  };
}

test("operational runner reserves an allowed draft and returns a review manifest", async () => {
  const apiClient = createApiClient();
  const editorialPlanner = {
    async createPlan(input) {
      assert.equal(input.generatedAt, "2026-08-21T12:00:00");
      assert.equal(input.candidates.length, 1);
      return { plan, selectedCandidate: input.candidates[0], generationAttemptCount: 2 };
    },
  };

  const result = await prepareOperationalDraft({
    config,
    apiClient,
    editorialPlanner,
    duplicatePolicy: () => ({
      action: DUPLICATE_POLICY_ACTIONS.ALLOW,
      reason: DUPLICATE_POLICY_REASONS.NO_DUPLICATE,
      conflictingContentId: null,
    }),
    now: new Date("2026-08-21T03:00:00.000Z"),
  });

  assert.equal(apiClient.calls.historyFrom, "2026-07-22T12:00:00");
  assert.equal(apiClient.calls.reservedDraft.eventKey, plan.eventKey);
  assert.equal(result.reservation.id, 77);
  assert.equal(result.manifest.reservation.shortformContentId, 77);
  assert.equal(result.manifest.source.keywordId, 101);
  assert.equal(result.generationAttemptCount, 2);
});

test("operational runner does not reserve or expose a manifest when policy holds the draft", async () => {
  const apiClient = createApiClient();
  const result = await prepareOperationalDraft({
    config,
    apiClient,
    editorialPlanner: {
      async createPlan(input) {
        return { plan, selectedCandidate: input.candidates[0] };
      },
    },
    duplicatePolicy: () => ({
      action: DUPLICATE_POLICY_ACTIONS.HOLD,
      reason: DUPLICATE_POLICY_REASONS.RECENT_TOPIC,
      conflictingContentId: 10,
    }),
    now: new Date("2026-08-21T03:00:00.000Z"),
  });

  assert.equal(apiClient.calls.reservedDraft, null);
  assert.equal(result.reservation, null);
  assert.equal(result.manifest, null);
  assert.equal(result.duplicateDecision.action, DUPLICATE_POLICY_ACTIONS.HOLD);
});

test("operational runner rejects an unknown duplicate policy action", async () => {
  const apiClient = createApiClient();

  await assert.rejects(
    () =>
      prepareOperationalDraft({
        config,
        apiClient,
        editorialPlanner: {
          async createPlan(input) {
            return { plan, selectedCandidate: input.candidates[0] };
          },
        },
        duplicatePolicy: () => ({ action: "ADOPT" }),
        now: new Date("2026-08-21T03:00:00.000Z"),
      }),
    /unsupported action/,
  );
  assert.equal(apiClient.calls.reservedDraft, null);
});
