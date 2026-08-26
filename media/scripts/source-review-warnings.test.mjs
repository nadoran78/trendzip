import assert from "node:assert/strict";
import test from "node:test";

import {
  createSourceReviewWarnings,
  SOURCE_REVIEW_WARNING_CODES,
} from "./source-review-warnings.mjs";

test("source review reports clickbait, stale, and topic mismatch without blocking the draft", () => {
  const warnings = createSourceReviewWarnings({
    candidate: {
      keyword: "메이드 인 코리아",
      relatedKeywords: [{ id: 2, word: "현빈" }],
    },
    selection: { relatedKeywordIds: [2] },
    factCards: [
      {
        videoId: "video-1",
        title: "역대급 리뷰 ㄷㄷ",
        channelName: "리뷰 채널",
        sourceExcerpt: "리뷰",
        publishedAt: "2026-06-01T12:00:00",
      },
    ],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.deepEqual(
    new Set(warnings.map(({ code }) => code)),
    new Set([
      SOURCE_REVIEW_WARNING_CODES.CLICKBAIT_LIKE_TITLE,
      SOURCE_REVIEW_WARNING_CODES.STALE_EVIDENCE,
      SOURCE_REVIEW_WARNING_CODES.TOPIC_MISMATCH,
    ]),
  );
});

test("source review does not infer official-source status from a channel name", () => {
  const warnings = createSourceReviewWarnings({
    candidate: { keyword: "메이드 인 코리아", relatedKeywords: [] },
    selection: { relatedKeywordIds: [] },
    factCards: [
      {
        videoId: "video-1",
        title: "메이드 인 코리아 메인 예고편",
        channelName: "Disney Plus Korea",
        sourceExcerpt: "메인 예고편",
        publishedAt: "2026-08-20T12:00:00",
      },
    ],
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.deepEqual(warnings, []);
});
