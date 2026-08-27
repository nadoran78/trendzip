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
  evidenceClaims: [
    {
      reasonIndex: 0,
      statement: "공식 예고편이 공개됐습니다.",
      evidenceVideoId: "video-101",
      sourceExcerpt: "메인 예고편",
    },
    {
      reasonIndex: 1,
      statement: "출연진 정보가 확산했습니다.",
      evidenceVideoId: "video-101",
      sourceExcerpt: "Disney Plus Korea",
    },
  ],
};

const selection = {
  primaryKeywordId: 101,
  editorialFormat: "WHY_NOW",
  eventType: "TRAILER_RELEASE",
  relatedKeywordIds: [],
  evidenceSelections: [
    {
      evidenceVideoId: "video-101",
      sourceField: "TITLE",
      sourceExcerpt: "메인 예고편",
      evidenceRole: "EVENT_TRIGGER",
    },
  ],
};

const factCards = [
  {
    factId: "fact-1",
    videoId: "video-101",
    channelId: "disney-plus-korea",
    channelName: "Disney Plus Korea",
    title: "메이드 인 코리아 메인 예고편",
    sourceField: "TITLE",
    sourceExcerpt: "메인 예고편",
    evidenceRole: "EVENT_TRIGGER",
    publishedAt: "2026-08-20T12:00:00",
  },
];

function planResult(input, overrides = {}) {
  return {
    plan,
    selection,
    factCards,
    reviewWarnings: [],
    selectedCandidate: input.candidates[0],
    ...overrides,
  };
}

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
      return planResult(input, {
        generationAttemptCount: 2,
        repairDiagnostics: {
          code: "HOOK_TOO_LONG",
          message: "hook was repaired",
          details: { field: "hook" },
        },
      });
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
  assert.equal(apiClient.calls.reservedDraft.eventKey, "made-in-korea:why-now:crawl-501");
  assert.equal(result.reservation.id, 77);
  assert.equal(result.manifest.reservation.shortformContentId, 77);
  assert.equal(result.manifest.source.keywordId, 101);
  assert.deepEqual(result.manifest.selection, selection);
  assert.deepEqual(result.manifest.factCards, factCards);
  assert.equal(result.generationAttemptCount, 2);
  assert.equal(result.repairDiagnostics.code, "HOOK_TOO_LONG");
  assert.deepEqual(result.manifest.generationDiagnostics, {
    selection: {
      attemptCount: 2,
      repair: {
        code: "HOOK_TOO_LONG",
        message: "hook was repaired",
        details: { field: "hook" },
      },
    },
    writing: {
      attemptCount: 0,
      repair: null,
      fallbackUsed: true,
      failure: null,
    },
  });
});

test("operational runner removes related keywords absent from selected evidence", async () => {
  const apiClient = createApiClient();
  apiClient.getKeywordDetail = async () => ({
    ...detail,
    relatedKeywords: [{ id: 102, word: "스캔들", category: "드라마" }],
  });
  const relatedSelection = { ...selection, relatedKeywordIds: [102] };
  const relatedPlan = { ...plan, relatedKeywordIds: [102] };

  const result = await prepareOperationalDraft({
    config,
    apiClient,
    editorialPlanner: {
      async createPlan(input) {
        return planResult(input, { plan: relatedPlan, selection: relatedSelection });
      },
    },
    duplicatePolicy: () => ({
      action: DUPLICATE_POLICY_ACTIONS.ALLOW,
      reason: DUPLICATE_POLICY_REASONS.NO_DUPLICATE,
      conflictingContentId: null,
    }),
    now: new Date("2026-08-21T03:00:00.000Z"),
  });

  assert.deepEqual(result.manifest.selection.relatedKeywordIds, []);
  assert.deepEqual(apiClient.calls.reservedDraft.relatedKeywords, []);
  assert.equal(result.manifest.reviewWarnings[0].code, "UNSUPPORTED_RELATED_KEYWORD_DROPPED");
  assert.equal(result.manifest.reviewWarnings[0].keywordWord, "스캔들");
});

test("operational runner uses the verified brief writer output", async () => {
  const apiClient = createApiClient();
  const writerPlan = {
    ...plan,
    title: "검증 브리프로 작성한 메이드 인 코리아 초안",
  };
  const writerDraft = { title: writerPlan.title, reasons: [] };

  const result = await prepareOperationalDraft({
    config,
    apiClient,
    editorialPlanner: { async createPlan(input) { return planResult(input); } },
    editorialWriter: {
      async createDraft({ editorialBrief }) {
        assert.equal(editorialBrief.keyword, "메이드 인 코리아");
        assert.equal(editorialBrief.facts[0].factId, "fact-1");
        return {
          plan: writerPlan,
          writerDraft,
          attemptCount: 2,
          repairDiagnostics: { code: "EDITORIAL_WRITER_UNKNOWN_FACT_ID" },
        };
      },
    },
    duplicatePolicy: () => ({
      action: DUPLICATE_POLICY_ACTIONS.ALLOW,
      reason: DUPLICATE_POLICY_REASONS.NO_DUPLICATE,
      conflictingContentId: null,
    }),
    now: new Date("2026-08-21T03:00:00.000Z"),
  });

  assert.equal(apiClient.calls.reservedDraft.title, writerPlan.title);
  assert.deepEqual(result.manifest.writing.writerDraft, writerDraft);
  assert.equal(result.manifest.writing.fallbackUsed, false);
  assert.equal(result.writerDiagnostics.attemptCount, 2);
});

test("operational runner falls back when the Gemini writer remains invalid", async () => {
  const apiClient = createApiClient();
  const writerError = new Error("writer validation failed");
  writerError.code = "EDITORIAL_WRITER_UNKNOWN_FACT_ID";
  writerError.failureStage = "WRITER_VALIDATION";
  writerError.writerDiagnostics = {
    attemptCount: 2,
    repair: { code: "EDITORIAL_WRITER_UNKNOWN_FACT_ID" },
    initialDraft: { title: "invalid" },
    finalDraft: { title: "still invalid" },
  };

  const result = await prepareOperationalDraft({
    config,
    apiClient,
    editorialPlanner: { async createPlan(input) { return planResult(input); } },
    editorialWriter: { async createDraft() { throw writerError; } },
    duplicatePolicy: () => ({
      action: DUPLICATE_POLICY_ACTIONS.ALLOW,
      reason: DUPLICATE_POLICY_REASONS.NO_DUPLICATE,
      conflictingContentId: null,
    }),
    now: new Date("2026-08-21T03:00:00.000Z"),
  });

  assert.equal(apiClient.calls.reservedDraft.title, plan.title);
  assert.equal(result.writerDiagnostics.fallbackUsed, true);
  assert.equal(result.writerDiagnostics.failure.stage, "WRITER_VALIDATION");
  assert.equal(result.manifest.reviewWarnings.at(-1).code, "EDITORIAL_WRITER_FALLBACK");
});

test("operational runner does not reserve or expose a manifest when policy holds the draft", async () => {
  const apiClient = createApiClient();
  const result = await prepareOperationalDraft({
    config,
    apiClient,
    editorialPlanner: {
      async createPlan(input) {
        return planResult(input);
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
            return planResult(input);
          },
        },
        duplicatePolicy: () => ({ action: "ADOPT" }),
        now: new Date("2026-08-21T03:00:00.000Z"),
      }),
    /unsupported action/,
  );
  assert.equal(apiClient.calls.reservedDraft, null);
});

test("operational runner marks duplicate policy failures with their stage", async () => {
  const apiClient = createApiClient();

  await assert.rejects(
    () =>
      prepareOperationalDraft({
        config,
        apiClient,
        editorialPlanner: { async createPlan(input) { return planResult(input); } },
        duplicatePolicy: () => {
          throw new Error("duplicate lookup failed");
        },
        now: new Date("2026-08-21T03:00:00.000Z"),
      }),
    (error) => error.failureStage === "DUPLICATE_POLICY",
  );
});
