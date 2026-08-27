import assert from "node:assert/strict";
import test from "node:test";

import {
  EDITORIAL_WRITER_VALIDATION_CODES,
  validateEditorialWriterDraft,
} from "./editorial-writer-validation.mjs";

const editorialBrief = {
  keywordId: 101,
  keyword: "메이드 인 코리아",
  generation: "TEEN",
  editorialFormat: "WHY_NOW",
  generatedAt: "2026-08-26T15:00:00",
  relatedKeywords: [{ keywordId: 102, keywordWord: "현빈", category: "인물" }],
  allowedEntities: [
    { name: "메이드 인 코리아", type: "시리즈", source: "PRIMARY_KEYWORD" },
    { name: "현빈", type: "인물", source: "RELATED_KEYWORD" },
  ],
  facts: [
    {
      factId: "fact-1",
      videoId: "video-101",
      sourceExcerpt: "메인 예고편",
      title: "메이드 인 코리아 메인 예고편",
      publishedAt: "2026-08-20T12:00:00",
    },
  ],
};

function writerDraft(overrides = {}) {
  const referencedText = (text) => ({ text, factIds: ["fact-1"] });
  return {
    audienceAngle: "30~40대가 작품 공개 맥락을 이해하도록 설명합니다.",
    selectionReason: "메인 예고편이라는 확인 가능한 공개 계기가 있습니다.",
    title: "메이드 인 코리아, 지금 확인할 공개 계기",
    hook: "메인 예고편으로 먼저 보는 새 작품",
    summary: "메인 예고편이 공개된 작품의 핵심 맥락을 짚습니다.",
    reasons: [
      referencedText("영상 제목에서 메인 예고편 공개를 확인할 수 있습니다."),
      referencedText("작품명과 공개 영상의 관계를 먼저 살펴볼 수 있습니다."),
    ],
    narration: {
      hook: referencedText("메이드 인 코리아라는 이름, 메인 예고편에서 먼저 확인해 봅니다."),
      overview: referencedText("이 작품은 메인 예고편이라는 공개 영상으로 소개됐습니다."),
      reasons: referencedText("영상 제목에는 작품명과 메인 예고편이라는 표현이 함께 나옵니다."),
      evidence: referencedText("확인한 근거는 메인 예고편이라는 영상 제목 표현입니다."),
    },
    ...overrides,
  };
}

test("writer validation creates the existing operational plan contract from fact references", () => {
  const plan = validateEditorialWriterDraft(writerDraft(), editorialBrief);

  assert.equal(plan.primaryKeywordId, 101);
  assert.equal(plan.editorialFormat, "WHY_NOW");
  assert.deepEqual(plan.relatedKeywordIds, [102]);
  assert.match(plan.topicKey, /^keyword-[a-f0-9]{12}$/);
  assert.equal(plan.evidenceClaims.length, 2);
  assert.equal(plan.evidenceClaims[0].factId, "fact-1");
  assert.equal(plan.evidenceClaims[0].evidenceVideoId, "video-101");
  assert.match(plan.narration.cta, /프로필 링크/);
});

test("writer validation rejects fact IDs absent from the brief", () => {
  assert.throws(
    () =>
      validateEditorialWriterDraft(
        writerDraft({
          reasons: [
            { text: "확인한 근거입니다.", factIds: ["fact-999"] },
            { text: "두 번째 근거입니다.", factIds: ["fact-1"] },
          ],
        }),
        editorialBrief,
      ),
    (error) => error.code === EDITORIAL_WRITER_VALIDATION_CODES.UNKNOWN_FACT_ID,
  );
});

test("writer validation rejects internal metrics and numbers absent from the brief", () => {
  assert.throws(
    () => validateEditorialWriterDraft(writerDraft({ summary: "검색 순위 1위인 작품입니다." }), editorialBrief),
    (error) => error.code === EDITORIAL_WRITER_VALIDATION_CODES.FORBIDDEN_CLAIM,
  );
  assert.throws(
    () => validateEditorialWriterDraft(writerDraft({ summary: "관심이 99배 늘어난 작품입니다." }), editorialBrief),
    (error) => error.code === EDITORIAL_WRITER_VALIDATION_CODES.UNSUPPORTED_NUMBER,
  );
});

test("writer validation allows neutral attention but rejects unsupported sentiment", () => {
  assert.doesNotThrow(() =>
    validateEditorialWriterDraft(
      writerDraft({ summary: "메인 예고편 공개로 관심을 받고 있는 작품입니다." }),
      editorialBrief,
    ),
  );
  assert.throws(
    () =>
      validateEditorialWriterDraft(
        writerDraft({ summary: "메인 예고편 공개 후 긍정적인 반응이 이어지고 있습니다." }),
        editorialBrief,
      ),
    (error) => error.code === EDITORIAL_WRITER_VALIDATION_CODES.UNSUPPORTED_SENTIMENT,
  );
});
