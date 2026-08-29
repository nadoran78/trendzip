import assert from "node:assert/strict";
import test from "node:test";

import {
  composeEditorialDraft,
  createCanonicalTopicKey,
} from "./editorial-draft-composer.mjs";
import { EDITORIAL_FORMATS } from "./gemini-editorial-planner.mjs";

const candidate = {
  keywordId: 101,
  keyword: "메이드 인 코리아",
};
const factCards = [
  {
    videoId: "video-1",
    title: "메이드 인 코리아 메인 예고편",
    channelName: "Disney Plus Korea",
    sourceExcerpt: "메인 예고편",
    publishedAt: "2026-08-20T12:00:00",
  },
];

test("topic key is stable for normalized keyword text", () => {
  assert.equal(createCanonicalTopicKey("메이드 인 코리아"), createCanonicalTopicKey("  메이드  인 코리아 "));
  assert.notEqual(createCanonicalTopicKey("메이드 인 코리아"), createCanonicalTopicKey("인턴"));
  assert.match(createCanonicalTopicKey("메이드 인 코리아"), /^keyword-[a-f0-9]{12}$/);
});

test("composer supports every editorial format with bounded prose", () => {
  EDITORIAL_FORMATS.forEach((editorialFormat) => {
    const plan = composeEditorialDraft({
      candidate,
      selection: {
        primaryKeywordId: 101,
        editorialFormat,
        eventType: "GENERAL_CONTEXT",
        relatedKeywordIds: [102],
        evidenceSelections: [],
      },
      factCards,
    });

    assert.equal(plan.primaryKeywordId, 101);
    assert.equal(plan.editorialFormat, editorialFormat);
    assert.deepEqual(plan.relatedKeywordIds, [102]);
    assert.ok(Array.from(plan.title).length <= 100);
    assert.ok(Array.from(plan.hook).length <= 48);
    assert.ok(Array.from(plan.summary).length <= 100);
    assert.equal(plan.reasons.length, 2);
    assert.equal(plan.reasons.every((reason) => Array.from(reason).length <= 100), true);
    assert.equal(
      Object.values(plan.narration).every((value) => Array.from(value).length <= 320),
      true,
    );
    assert.match(plan.audienceAngle, /30~40대 사용자가/);
    assert.doesNotMatch(plan.audienceAngle, /30~40대(?:에서|사이에서).*(?:인기|화제|주목)/);
  });
});

test("composer truncates long metadata instead of failing the draft", () => {
  const plan = composeEditorialDraft({
    candidate: { keywordId: 101, keyword: "가".repeat(120) },
    selection: {
      primaryKeywordId: 101,
      editorialFormat: "WHY_NOW",
      eventType: "TRAILER_RELEASE",
      relatedKeywordIds: [],
      evidenceSelections: [],
    },
    factCards: [
      {
        ...factCards[0],
        title: "긴 영상 제목".repeat(30),
        sourceExcerpt: "긴 영상 제목",
      },
    ],
  });

  assert.ok(Array.from(plan.title).length <= 100);
  assert.ok(Array.from(plan.hook).length <= 48);
  assert.ok(Array.from(plan.summary).length <= 100);
  assert.equal(plan.reasons.every((reason) => Array.from(reason).length <= 100), true);
});
