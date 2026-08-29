import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEditorialWriterPrompt,
  createGeminiEditorialWriter,
} from "./gemini-editorial-writer.mjs";

const editorialBrief = {
  keywordId: 101,
  keyword: "메이드 인 코리아",
  generation: "TEEN",
  editorialFormat: "WHY_NOW",
  generatedAt: "2026-08-26T15:00:00",
  relatedKeywords: [],
  allowedEntities: [{ name: "메이드 인 코리아", type: "시리즈" }],
  facts: [
    {
      factId: "fact-1",
      videoId: "video-101",
      sourceExcerpt: "메인 예고편",
      title: "메이드 인 코리아 메인 예고편",
      publishedAt: "2026-08-20T12:00:00",
    },
  ],
  prohibitedClaims: ["근거 밖 사실을 추가하지 않는다."],
};

function validDraft(overrides = {}) {
  const reference = (text) => ({ text, factIds: ["fact-1"] });
  return {
    audienceAngle: "30~40대가 작품 공개 맥락을 이해하도록 설명합니다.",
    selectionReason: "메인 예고편이라는 공개 근거를 확인했습니다.",
    title: "메이드 인 코리아, 예고편으로 보는 맥락",
    hook: "메인 예고편에서 먼저 볼 부분",
    summary: "작품명과 메인 예고편의 연결 맥락을 정리합니다.",
    reasons: [reference("영상 제목에서 메인 예고편을 확인했습니다."), reference("작품명이 영상 제목에 함께 나옵니다.")],
    narration: {
      hook: reference("메이드 인 코리아, 메인 예고편부터 살펴봅니다."),
      overview: reference("영상 제목에서 작품명과 메인 예고편을 함께 확인할 수 있습니다."),
      reasons: reference("확인 가능한 표현을 중심으로 작품의 공개 맥락을 짚습니다."),
      evidence: reference("근거는 메인 예고편이라는 제목 표현입니다."),
    },
    ...overrides,
  };
}

function geminiResponse(draft) {
  return new Response(
    JSON.stringify({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(draft) }] } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function createWriter(fetchImpl) {
  return createGeminiEditorialWriter({
    apiKey: "test-key",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-test",
    repairDelayMs: 0,
    fetchImpl,
    sleepImpl: async () => {},
  });
}

test("writer prompt contains only the verified editorial brief contract", () => {
  const prompt = buildEditorialWriterPrompt(editorialBrief);

  assert.match(prompt, /Editorial Brief:/);
  assert.match(prompt, /"factId":"fact-1"/);
  assert.match(prompt, /30~40대는 설명 대상/);
  assert.match(prompt, /긍정적·부정적 반응/);
  assert.doesNotMatch(prompt, /운영 후보:/);
  assert.doesNotMatch(prompt, /최근 제작 이력:/);
});

test("writer returns a plan whose claims reference verified facts", async () => {
  let requestBody;
  const writer = createWriter(async (url, init) => {
    requestBody = JSON.parse(init.body);
    return geminiResponse(validDraft());
  });

  const result = await writer.createDraft({ editorialBrief });

  assert.equal(requestBody.generationConfig.temperature, 0.35);
  assert.equal(result.attemptCount, 1);
  assert.equal(result.plan.evidenceClaims[0].factId, "fact-1");
  assert.deepEqual(result.writerDraft, validDraft());
});

test("writer repairs an unknown fact reference once", async () => {
  const responses = [
    validDraft({
      reasons: [
        { text: "확인한 근거입니다.", factIds: ["fact-999"] },
        { text: "작품명이 영상 제목에 함께 나옵니다.", factIds: ["fact-1"] },
      ],
    }),
    validDraft(),
  ];
  const requests = [];
  const writer = createWriter(async (url, init) => {
    requests.push(JSON.parse(init.body));
    return geminiResponse(responses.shift());
  });

  const result = await writer.createDraft({ editorialBrief });

  assert.equal(requests.length, 2);
  assert.equal(result.attemptCount, 2);
  assert.equal(result.repairDiagnostics.code, "EDITORIAL_WRITER_UNKNOWN_FACT_ID");
  assert.match(requests[1].contents[2].parts[0].text, /factId/);
});

test("writer repairs an unsupported sentiment claim once", async () => {
  const responses = [
    validDraft({ summary: "메인 예고편 공개 후 긍정적인 반응이 이어지고 있습니다." }),
    validDraft({ summary: "메인 예고편 공개 후 관심이 이어지고 있습니다." }),
  ];
  const requests = [];
  const writer = createWriter(async (url, init) => {
    requests.push(JSON.parse(init.body));
    return geminiResponse(responses.shift());
  });

  const result = await writer.createDraft({ editorialBrief });

  assert.equal(result.attemptCount, 2);
  assert.equal(result.repairDiagnostics.code, "EDITORIAL_WRITER_UNSUPPORTED_SENTIMENT");
  assert.match(requests[1].contents[2].parts[0].text, /unsupported sentiment/);
  assert.match(result.plan.summary, /관심/);
});

test("writer exposes diagnostics when one repair still violates the brief", async () => {
  const invalidDraft = validDraft({
    reasons: [
      { text: "확인한 근거입니다.", factIds: ["fact-999"] },
      { text: "두 번째 근거입니다.", factIds: ["fact-999"] },
    ],
  });
  const writer = createWriter(async () => geminiResponse(invalidDraft));

  await assert.rejects(
    () => writer.createDraft({ editorialBrief }),
    (error) => {
      assert.equal(error.code, "EDITORIAL_WRITER_REPAIR_NO_EFFECT");
      assert.equal(error.writerDiagnostics.attemptCount, 2);
      assert.equal(error.failureStage, "WRITER_VALIDATION");
      return true;
    },
  );
});
