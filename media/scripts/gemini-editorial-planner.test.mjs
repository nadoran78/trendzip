import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEditorialPlanPrompt,
  createGeminiEditorialPlanner,
} from "./gemini-editorial-planner.mjs";

const candidate = {
  keywordId: 101,
  keyword: "메이드 인 코리아",
  generation: "TWENTY",
  category: "시리즈",
  rank: 3,
  trendScore: 1000,
  rankTrend: "NEW",
  rankDelta: null,
  explain: "작품 공개로 관심을 받고 있습니다.",
  sourceCrawlRunId: 501,
  snapshotAt: "2026-08-21T03:00:00",
  relatedKeywords: [{ id: 102, word: "현빈", rank: 4, category: "인물" }],
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

const validPlan = {
  primaryKeywordId: 101,
  editorialFormat: "WHY_NOW",
  topicKey: "made-in-korea",
  eventKey: "made-in-korea:official-release",
  audienceAngle: "작품 공개로 관심이 높아진 배경",
  selectionReason: "최신 후보에 작품명과 공식 예고편이 함께 확인되었습니다.",
  title: "메이드 인 코리아가 지금 주목받는 이유",
  relatedKeywordIds: [102],
  hook: "작품명 전체가 포인트입니다",
  summary: "공식 예고편 공개로 작품과 출연진이 함께 관심을 받고 있습니다.",
  reasons: ["공식 예고편이 공개됐습니다.", "출연 배우가 함께 언급되고 있습니다."],
  narration: {
    hook: "오늘의 키워드는 메이드 인 코리아입니다.",
    overview: "새 작품의 공개 소식이 관심을 모았습니다.",
    reasons: "공식 예고편과 출연진 정보가 함께 확산했습니다.",
    evidence: "관련 영상 제목과 채널에서 작품명을 확인했습니다.",
    cta: "더 자세한 내용은 트렌드집 프로필 링크에서 확인해 보세요.",
  },
  evidenceVideoIds: ["video-101"],
};

function geminiResponse(plan) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(plan) }] },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function createPlanner(fetchImpl) {
  return createGeminiEditorialPlanner({
    apiKey: "gemini-key",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-3.1-flash-lite",
    fetchImpl,
  });
}

test("editorial planner requests structured JSON and validates referenced IDs", async () => {
  let captured;
  const planner = createPlanner(async (url, init) => {
    captured = { url, init };
    return geminiResponse(validPlan);
  });

  const result = await planner.createPlan({
    candidates: [candidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });
  const request = JSON.parse(captured.init.body);

  assert.equal(
    captured.url,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
  );
  assert.equal(captured.init.headers["x-goog-api-key"], "gemini-key");
  assert.equal(request.generationConfig.responseMimeType, "application/json");
  assert.equal(request.generationConfig.responseJsonSchema.type, "object");
  assert.equal(result.selectedCandidate.keywordId, 101);
  assert.deepEqual(result.plan, validPlan);
});

test("editorial planner rejects a primary keyword outside the candidate set", async () => {
  const planner = createPlanner(async () => geminiResponse({ ...validPlan, primaryKeywordId: 999 }));

  await assert.rejects(
    () =>
      planner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    /primaryKeywordId is not an operational candidate/,
  );
});

test("editorial planner rejects evidence from another keyword", async () => {
  const planner = createPlanner(async () =>
    geminiResponse({ ...validPlan, evidenceVideoIds: ["unknown-video"] }),
  );

  await assert.rejects(
    () =>
      planner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    /evidenceVideoIds contains an unknown video ID/,
  );
});

test("editorial prompt includes recent identity keys without full stored content", () => {
  const prompt = buildEditorialPlanPrompt({
    candidates: [candidate],
    recentContents: [
      {
        id: 77,
        status: "PUBLISHED",
        primaryKeywordWord: "메이드 인 코리아",
        editorialFormat: "WHY_NOW",
        topicKey: "made-in-korea",
        eventKey: "made-in-korea:teaser-release",
        audienceAngle: "예고편 공개",
        title: "이전 제목",
        selectedAt: "2026-08-10T12:00:00",
        publishedAt: "2026-08-11T12:00:00",
        contentHash: "should-not-be-in-prompt",
      },
    ],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.match(prompt, /made-in-korea:teaser-release/);
  assert.doesNotMatch(prompt, /should-not-be-in-prompt/);
});
