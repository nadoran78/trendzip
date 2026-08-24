import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEditorialPlanPrompt,
  createGeminiEditorialPlanner,
} from "./gemini-editorial-planner.mjs";
import {
  EDITORIAL_PLAN_VALIDATION_CODES,
  EditorialPlanValidationError,
} from "./editorial-plan-validation.mjs";

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

function createPlanner(fetchImpl, options = {}) {
  return createGeminiEditorialPlanner({
    apiKey: "gemini-key",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-3.1-flash-lite",
    repairDelayMs: options.repairDelayMs ?? 0,
    fetchImpl,
    sleepImpl: options.sleepImpl,
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
  assert.match(
    request.generationConfig.responseJsonSchema.properties.hook.description,
    /40자 이하.*48자/,
  );
  assert.match(request.contents[0].parts[0].text, /hook은.*40자 이하.*48자를 절대 초과하지 않는다/);
  assert.match(request.contents[0].parts[0].text, /입력 근거에 같은 내용이 있을 때만 사용/);
  assert.match(request.contents[0].parts[0].text, /과장·선동 표현을 사용하지 않는다/);
  assert.match(request.contents[0].parts[0].text, /단순 인물 출연 영상은 제외/);
  assert.match(request.contents[0].parts[0].text, /30~40대는 설명을 읽는 대상/);
  assert.match(request.contents[0].parts[0].text, /실제 후보로 존재하는 TEEN 또는 TWENTY/);
  assert.equal(result.selectedCandidate.keywordId, 101);
  assert.deepEqual(result.plan, validPlan);
});

test("editorial planner reports the received character count for an oversized hook", async () => {
  let requestCount = 0;
  const planner = createPlanner(async () => {
    requestCount += 1;
    return geminiResponse({ ...validPlan, hook: "가".repeat(49) });
  });

  await assert.rejects(
    () =>
      planner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    (error) => {
      assert.equal(error instanceof EditorialPlanValidationError, true);
      assert.equal(error.code, EDITORIAL_PLAN_VALIDATION_CODES.HOOK_TOO_LONG);
      assert.equal(error.generationAttemptCount, 2);
      assert.match(
        error.message,
        /editorialPlan\.hook must be at most 48 characters \(received 49\)/,
      );
      assert.deepEqual(error.details, {
        field: "hook",
        targetCharacters: 40,
        maximumCharacters: 48,
        receivedCharacters: 49,
      });
      return true;
    },
  );
  assert.equal(requestCount, 2);
});

test("editorial planner repairs a content contract violation once after the configured delay", async () => {
  const invalidPlan = { ...validPlan, hook: "가".repeat(49) };
  const responses = [invalidPlan, validPlan];
  const requests = [];
  const sleepCalls = [];
  const planner = createPlanner(
    async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      return geminiResponse(responses.shift());
    },
    {
      repairDelayMs: 3_500,
      sleepImpl: async (milliseconds) => sleepCalls.push(milliseconds),
    },
  );

  const result = await planner.createPlan({
    candidates: [candidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(result.generationAttemptCount, 2);
  assert.deepEqual(result.plan, validPlan);
  assert.deepEqual(sleepCalls, [3_500]);
  assert.equal(requests.length, 2);
  assert.deepEqual(
    requests[1].body.contents.map(({ role }) => role),
    ["user", "model", "user"],
  );
  assert.deepEqual(JSON.parse(requests[1].body.contents[1].parts[0].text), invalidPlan);
  assert.match(requests[1].body.contents[2].parts[0].text, /HOOK_TOO_LONG/);
  assert.match(requests[1].body.contents[2].parts[0].text, /topicKey.*변경하지 않는다/);
});

test("editorial planner rejects factual claims missing from candidate evidence", async () => {
  const planner = createPlanner(async () =>
    geminiResponse({
      ...validPlan,
      hook: "음원 차트 역주행이 시작된 이유",
      narration: { ...validPlan.narration, evidence: "SNS 챌린지가 확산하고 있습니다." },
    }),
  );

  await assert.rejects(
    () =>
      planner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    (error) => {
      assert.equal(error instanceof EditorialPlanValidationError, true);
      assert.equal(error.code, EDITORIAL_PLAN_VALIDATION_CODES.UNSUPPORTED_CLAIM);
      assert.deepEqual(error.details.claims, ["차트", "역주행", "SNS", "챌린지"]);
      return true;
    },
  );
});

test("editorial planner accepts a factual claim explicitly present in candidate evidence", async () => {
  const supportedCandidate = {
    ...candidate,
    explain: "공식 음원 차트에서 역주행하며 관심을 받고 있습니다.",
  };
  const supportedPlan = {
    ...validPlan,
    hook: "공식 음원 차트에서 역주행한 이유",
  };
  const planner = createPlanner(async () => geminiResponse(supportedPlan));

  const result = await planner.createPlan({
    candidates: [supportedCandidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.deepEqual(result.plan, supportedPlan);
});

test("editorial planner rejects overstated language even when the plan is otherwise valid", async () => {
  const planner = createPlanner(async () =>
    geminiResponse({ ...validPlan, title: "메이드 인 코리아가 지금 난리인 이유" }),
  );

  await assert.rejects(
    () =>
      planner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    (error) => {
      assert.equal(error instanceof EditorialPlanValidationError, true);
      assert.equal(error.code, EDITORIAL_PLAN_VALIDATION_CODES.OVERSTATED_TONE);
      assert.deepEqual(error.details.terms, ["난리"]);
      return true;
    },
  );
});

test("editorial planner repairs a generation claim outside the observed candidates", async () => {
  const invalidPlan = {
    ...validPlan,
    audienceAngle:
      "웹 브라우저로 즐기는 게임으로 최근 2030 세대 사이에서 화제가 된 배경",
  };
  const responses = [invalidPlan, validPlan];
  const planner = createPlanner(async () => geminiResponse(responses.shift()));

  const result = await planner.createPlan({
    candidates: [candidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(result.generationAttemptCount, 2);
  assert.deepEqual(result.plan, validPlan);
});

test("editorial planner reports an unsupported generation after one repair", async () => {
  const invalidPlan = {
    ...validPlan,
    selectionReason: "최근 10대 사이에서 화제가 된 점을 반영했습니다.",
  };
  const planner = createPlanner(async () => geminiResponse(invalidPlan));

  await assert.rejects(
    () =>
      planner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    (error) => {
      assert.equal(error instanceof EditorialPlanValidationError, true);
      assert.equal(error.code, EDITORIAL_PLAN_VALIDATION_CODES.UNSUPPORTED_GENERATION_CLAIM);
      assert.equal(error.generationAttemptCount, 2);
      assert.deepEqual(error.details, {
        claims: ["10대"],
        observedGenerations: ["TWENTY"],
      });
      return true;
    },
  );
});

test("editorial planner allows interest claims for both observed generations", async () => {
  const teenCandidate = {
    ...candidate,
    keywordId: 201,
    generation: "TEEN",
  };
  const bothGenerationPlan = {
    ...validPlan,
    audienceAngle: "최근 10대와 20대 사이에서 화제가 된 배경",
  };
  const planner = createPlanner(async () => geminiResponse(bothGenerationPlan));

  const result = await planner.createPlan({
    candidates: [candidate, teenCandidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(result.generationAttemptCount, 1);
  assert.deepEqual(result.plan, bothGenerationPlan);
});

test("editorial planner allows 30 to 40s as the explanation audience", async () => {
  const audiencePlan = {
    ...validPlan,
    audienceAngle: "30~40대 사용자가 작품을 쉽게 이해할 수 있는 설명 관점",
  };
  const planner = createPlanner(async () => geminiResponse(audiencePlan));

  const result = await planner.createPlan({
    candidates: [candidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(result.generationAttemptCount, 1);
  assert.deepEqual(result.plan, audiencePlan);
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

test("editorial planner repairs an unknown evidence video ID from the selected candidate", async () => {
  const invalidPlan = { ...validPlan, evidenceVideoIds: ["unknown-video"] };
  const responses = [invalidPlan, validPlan];
  const requests = [];
  const planner = createPlanner(async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return geminiResponse(responses.shift());
  });

  const result = await planner.createPlan({
    candidates: [candidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(result.generationAttemptCount, 2);
  assert.deepEqual(result.plan.evidenceVideoIds, ["video-101"]);
  assert.equal(requests.length, 2);
  const repairPrompt = requests[1].body.contents[2].parts[0].text;
  assert.match(repairPrompt, /UNKNOWN_EVIDENCE_VIDEO_ID/);
  assert.match(repairPrompt, /"invalidValues":\["unknown-video"\]/);
  assert.match(repairPrompt, /"allowedValues":\["video-101"\]/);
  assert.match(repairPrompt, /evidenceVideoIds만.*allowedValues 안에서 다시 선택한다/);
  assert.doesNotMatch(repairPrompt, /evidenceVideoIds는 변경하지 않는다/);
});

test("editorial planner repairs an unknown related keyword ID from the selected candidate", async () => {
  const invalidPlan = { ...validPlan, relatedKeywordIds: [999] };
  const responses = [invalidPlan, validPlan];
  const requests = [];
  const planner = createPlanner(async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return geminiResponse(responses.shift());
  });

  const result = await planner.createPlan({
    candidates: [candidate],
    recentContents: [],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(result.generationAttemptCount, 2);
  assert.deepEqual(result.plan.relatedKeywordIds, [102]);
  const repairPrompt = requests[1].body.contents[2].parts[0].text;
  assert.match(repairPrompt, /UNKNOWN_RELATED_KEYWORD_ID/);
  assert.match(repairPrompt, /relatedKeywordIds만.*allowedValues 안에서 다시 선택한다/);
  assert.doesNotMatch(repairPrompt, /relatedKeywordIds는 변경하지 않는다/);
});

test("editorial planner reports an unknown evidence video ID after one repair", async () => {
  let requestCount = 0;
  const planner = createPlanner(async () => {
    requestCount += 1;
    return geminiResponse({ ...validPlan, evidenceVideoIds: ["unknown-video"] });
  });

  await assert.rejects(
    () =>
      planner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    (error) => {
      assert.equal(error instanceof EditorialPlanValidationError, true);
      assert.equal(error.code, EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_EVIDENCE_VIDEO_ID);
      assert.equal(error.generationAttemptCount, 2);
      assert.deepEqual(error.details, {
        field: "evidenceVideoIds",
        primaryKeywordId: 101,
        invalidValues: ["unknown-video"],
        allowedValues: ["video-101"],
      });
      return true;
    },
  );
  assert.equal(requestCount, 2);
});

test("editorial planner does not repair an HTTP failure", async () => {
  let requestCount = 0;
  const planner = createPlanner(async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ error: { message: "quota exceeded" } }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  });

  await assert.rejects(
    () =>
      planner.createPlan({
        candidates: [candidate],
        recentContents: [],
        generatedAt: "2026-08-21T12:00:00",
      }),
    (error) => {
      assert.match(error.message, /HTTP 429: quota exceeded/);
      assert.equal(error.generationAttemptCount, 1);
      return true;
    },
  );
  assert.equal(requestCount, 1);
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
