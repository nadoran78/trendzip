import assert from "node:assert/strict";
import test from "node:test";

import { createEvidenceFactCards } from "./editorial-fact-card.mjs";
import { EDITORIAL_PLAN_VALIDATION_CODES } from "./editorial-plan-validation.mjs";

const candidate = {
  relatedVideos: [
    {
      videoId: "video-1",
      title: "메이드 인 코리아 메인 예고편",
      channelName: "Disney Plus Korea",
      publishedAt: "2026-08-20T12:00:00",
    },
    {
      videoId: "video-2",
      title: "메이드 인 코리아 제작 발표",
      channelName: "콘텐츠 채널",
      publishedAt: "2026-08-21T12:00:00",
    },
  ],
};

test("fact cards preserve selection order and remove duplicate videos", () => {
  const result = createEvidenceFactCards(candidate, [
    { evidenceVideoId: "video-2", sourceExcerpt: "제작 발표" },
    { evidenceVideoId: "video-1", sourceExcerpt: "메인 예고편" },
    { evidenceVideoId: "video-2", sourceExcerpt: "콘텐츠 채널" },
  ]);

  assert.deepEqual(result, [
    {
      videoId: "video-2",
      channelName: "콘텐츠 채널",
      title: "메이드 인 코리아 제작 발표",
      sourceExcerpt: "제작 발표",
      publishedAt: "2026-08-21T12:00:00",
    },
    {
      videoId: "video-1",
      channelName: "Disney Plus Korea",
      title: "메이드 인 코리아 메인 예고편",
      sourceExcerpt: "메인 예고편",
      publishedAt: "2026-08-20T12:00:00",
    },
  ]);
});

test("fact cards reject an unknown video ID", () => {
  assert.throws(
    () =>
      createEvidenceFactCards(candidate, [
        { evidenceVideoId: "unknown", sourceExcerpt: "예고편" },
      ]),
    (error) => error.code === EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_EVIDENCE_VIDEO_ID,
  );
});

test("fact cards reject an excerpt absent from title and channel", () => {
  assert.throws(
    () =>
      createEvidenceFactCards(candidate, [
        { evidenceVideoId: "video-1", sourceExcerpt: "흥행 돌풍" },
      ]),
    (error) => error.code === EDITORIAL_PLAN_VALIDATION_CODES.INVALID_EVIDENCE_EXCERPT,
  );
});
