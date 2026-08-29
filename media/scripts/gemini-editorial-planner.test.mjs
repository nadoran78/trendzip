import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEditorialPlanPrompt,
  createGeminiEditorialPlanner,
} from "./gemini-editorial-planner.mjs";
import { EDITORIAL_PLAN_VALIDATION_CODES } from "./editorial-plan-validation.mjs";

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
  relatedKeywords: [{ id: 102, word: "현빈", category: "인물" }],
  relatedVideos: [
    {
      videoId: "video-101",
      title: "메이드 인 코리아 메인 예고편",
      channelId: "disney-plus-korea",
      channelName: "Disney Plus Korea",
      description: "메이드 인 코리아의 공개일과 출연진을 소개합니다.",
      tags: ["메이드 인 코리아", "현빈"],
      viewCount: 100_000,
      publishedAt: "2026-08-20T12:00:00",
    },
  ],
};

const validSelection = {
  primaryKeywordId: 101,
  editorialFormat: "WHY_NOW",
  eventType: "TRAILER_RELEASE",
  relatedKeywordIds: [102],
  evidenceSelections: [
    {
      evidenceVideoId: "video-101",
      sourceField: "TITLE",
      sourceExcerpt: "메인 예고편",
      evidenceRole: "EVENT_TRIGGER",
    },
  ],
};

function geminiResponse(selection) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(selection) }] },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function createPlanner(fetchImpl, options = {}) {
  return createGeminiEditorialPlanner({
    apiKey: "test-api-key",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-test",
    repairDelayMs: options.repairDelayMs ?? 0,
    fetchImpl,
    sleepImpl: options.sleepImpl ?? (async () => {}),
  });
}

test("prompt asks Gemini only for candidate and evidence selection", () => {
  const prompt = buildEditorialPlanPrompt({
    candidates: [candidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.match(prompt, /제목, 훅, 요약, 이유와 내레이션은 후속 작성 단계/);
  assert.match(prompt, /contextSummary는 주제 선택 참고 문맥이며 사실 근거가 아니다/);
  assert.match(prompt, /편집 형식 정의: WHY_NOW는 최근 공개·발표 계기/);
  assert.match(prompt, /사건 유형 정의: TRAILER_RELEASE는 예고편 공개/);
  assert.match(prompt, /sourceField는 원문을 복사한 위치/);
  assert.match(prompt, /"description":"메이드 인 코리아의 공개일과 출연진을 소개합니다."/);
  assert.doesNotMatch(prompt, /"rank":1/);
  assert.doesNotMatch(prompt, /"trendScore":1000/);
});

test("planner composes a deterministic bounded draft from a valid selection", async () => {
  let requestBody;
  const planner = createPlanner(async (url, init) => {
    requestBody = JSON.parse(init.body);
    return geminiResponse(validSelection);
  });

  const result = await planner.createPlan({
    candidates: [candidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(requestBody.generationConfig.responseJsonSchema.properties.title, undefined);
  assert.equal(
    requestBody.generationConfig.responseJsonSchema.properties.evidenceSelections.minItems,
    1,
  );
  assert.deepEqual(result.selection, validSelection);
  assert.equal(result.selectedCandidate.keywordId, 101);
  assert.equal(result.factCards[0].sourceExcerpt, "메인 예고편");
  assert.match(result.plan.topicKey, /^keyword-[a-f0-9]{12}$/);
  assert.ok(Array.from(result.plan.summary).length <= 100);
  assert.deepEqual(result.reviewWarnings, []);
  assert.equal(result.generationAttemptCount, 1);
  assert.equal(result.repairDiagnostics, null);
});

test("planner repairs an unknown related keyword ID once", async () => {
  const requests = [];
  const responses = [
    { ...validSelection, relatedKeywordIds: [999] },
    validSelection,
  ];
  const planner = createPlanner(async (url, init) => {
    requests.push(JSON.parse(init.body));
    return geminiResponse(responses.shift());
  });

  const result = await planner.createPlan({
    candidates: [candidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(requests.length, 2);
  assert.equal(result.generationAttemptCount, 2);
  assert.equal(
    result.repairDiagnostics.code,
    EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_RELATED_KEYWORD_ID,
  );
  assert.match(requests[1].contents[2].parts[0].text, /allowedValues/);
});

test("planner repairs an excerpt absent from selected video metadata", async () => {
  const responses = [
    {
      ...validSelection,
      evidenceSelections: [
        {
          evidenceVideoId: "video-101",
          sourceField: "TITLE",
          sourceExcerpt: "흥행 돌풍",
          evidenceRole: "EVENT_TRIGGER",
        },
      ],
    },
    validSelection,
  ];
  const planner = createPlanner(async () => geminiResponse(responses.shift()));

  const result = await planner.createPlan({
    candidates: [candidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(result.generationAttemptCount, 2);
  assert.equal(
    result.repairDiagnostics.code,
    EDITORIAL_PLAN_VALIDATION_CODES.INVALID_EVIDENCE_EXCERPT,
  );
});

test("planner records REPAIR_NO_EFFECT when Gemini repeats an invalid selection", async () => {
  const invalidSelection = { ...validSelection, relatedKeywordIds: [999] };
  const planner = createPlanner(async () => geminiResponse(invalidSelection));

  await assert.rejects(
    () =>
      planner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    (error) => {
      assert.equal(error.code, EDITORIAL_PLAN_VALIDATION_CODES.REPAIR_NO_EFFECT);
      assert.equal(error.failureStage, "SELECTION");
      assert.equal(error.generationAttemptCount, 2);
      assert.equal(error.generationDiagnostics.initial.selection.relatedKeywordIds[0], 999);
      assert.equal(error.generationDiagnostics.final.validation.code, "REPAIR_NO_EFFECT");
      return true;
    },
  );
});

test("planner does not retry ordinary structural or HTTP failures", async () => {
  let structuralRequestCount = 0;
  const structuralPlanner = createPlanner(async () => {
    structuralRequestCount += 1;
    return geminiResponse({ ...validSelection, evidenceSelections: [] });
  });
  await assert.rejects(
    () =>
      structuralPlanner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    /must contain between 1 and 3 items/,
  );
  assert.equal(structuralRequestCount, 1);

  let httpRequestCount = 0;
  const httpPlanner = createPlanner(async () => {
    httpRequestCount += 1;
    return new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 });
  });
  await assert.rejects(
    () =>
      httpPlanner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    /HTTP 429: quota/,
  );
  assert.equal(httpRequestCount, 1);
});
