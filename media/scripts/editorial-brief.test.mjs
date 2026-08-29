import assert from "node:assert/strict";
import test from "node:test";

import { createEditorialBrief } from "./editorial-brief.mjs";

const candidate = {
  keywordId: 101,
  keyword: "메이드 인 코리아",
  generation: "TEEN",
  category: "시리즈",
  relatedKeywords: [{ id: 102, word: "현빈", category: "인물" }],
};
const selection = {
  primaryKeywordId: 101,
  editorialFormat: "WHY_NOW",
  eventType: "TRAILER_RELEASE",
  relatedKeywordIds: [102],
};
const factCards = [
  {
    factId: "fact-1",
    videoId: "video-101",
    channelId: "official-channel",
    channelName: "공식 채널",
    title: "메이드 인 코리아 메인 예고편",
    sourceField: "TITLE",
    sourceExcerpt: "현빈 출연 메인 예고편",
    evidenceRole: "EVENT_TRIGGER",
    publishedAt: "2026-08-20T12:00:00",
  },
];

test("editorial brief contains only verified facts and allowed entities", () => {
  let eligibilityInput;
  const brief = createEditorialBrief({
    candidate,
    selection,
    factCards,
    generatedAt: "2026-08-26T15:00:00",
    formatEligibilityResolver(input) {
      eligibilityInput = input;
      return { eligible: true, resolvedFormat: "WHY_NOW", reason: null };
    },
  });

  assert.equal(brief.editorialFormat, "WHY_NOW");
  assert.equal(brief.eventType, "TRAILER_RELEASE");
  assert.equal(brief.facts[0].channelId, "official-channel");
  assert.deepEqual(brief.relatedKeywords, [
    { keywordId: 102, keywordWord: "현빈", category: "인물" },
  ]);
  assert.deepEqual(
    brief.allowedEntities.map((entity) => entity.name),
    ["메이드 인 코리아", "현빈"],
  );
  assert.equal(brief.prohibitedClaims.length, 5);
  assert.equal(eligibilityInput.factCards[0].factId, "fact-1");
  assert.deepEqual(brief.reviewWarnings, []);
});

test("editorial brief records a format fallback for human review", () => {
  const brief = createEditorialBrief({
    candidate,
    selection,
    factCards,
    generatedAt: "2026-08-26T15:00:00",
    formatEligibilityResolver() {
      return {
        eligible: false,
        resolvedFormat: "KEYWORD_PRIMER",
        reason: "WHY_NOW_REQUIRES_RECENT_EVENT",
      };
    },
  });

  assert.equal(brief.editorialFormat, "KEYWORD_PRIMER");
  assert.equal(brief.reviewWarnings[0].code, "EDITORIAL_FORMAT_FALLBACK");
  assert.equal(brief.reviewWarnings[0].reason, "WHY_NOW_REQUIRES_RECENT_EVENT");
});

test("editorial brief keeps only related keywords mentioned by selected evidence", () => {
  const brief = createEditorialBrief({
    candidate: {
      ...candidate,
      relatedKeywords: [
        { id: 201, word: "재혼 황후", category: "드라마" },
        { id: 202, word: "스캔들", category: "드라마" },
      ],
    },
    selection: {
      ...selection,
      relatedKeywordIds: [201, 202],
    },
    factCards: [
      {
        ...factCards[0],
        sourceExcerpt: "재혼황후 티저 예고편",
      },
    ],
    generatedAt: "2026-08-26T15:00:00",
    formatEligibilityResolver() {
      return { eligible: true, resolvedFormat: "WHY_NOW", reason: null };
    },
  });

  assert.deepEqual(brief.relatedKeywords, [
    { keywordId: 201, keywordWord: "재혼 황후", category: "드라마" },
  ]);
  assert.deepEqual(brief.reviewWarnings, [
    {
      code: "UNSUPPORTED_RELATED_KEYWORD_DROPPED",
      message: "Related keyword was removed because selected evidence did not mention it.",
      keywordId: 202,
      keywordWord: "스캔들",
    },
  ]);
});
