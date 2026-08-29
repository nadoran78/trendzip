import assert from "node:assert/strict";
import test from "node:test";

import { createEvidenceFactCards } from "./editorial-fact-card.mjs";
import { EDITORIAL_PLAN_VALIDATION_CODES } from "./editorial-plan-validation.mjs";

const candidate = {
  relatedVideos: [
    {
      videoId: "video-1",
      title: "메이드 인 코리아 메인 예고편",
      channelId: "disney-plus-korea",
      channelName: "Disney Plus Korea",
      description: "메이드 인 코리아 공개일을 확인하세요.",
      tags: ["메이드 인 코리아", "현빈"],
      publishedAt: "2026-08-20T12:00:00",
    },
    {
      videoId: "video-2",
      title: "메이드 인 코리아 제작 발표",
      channelId: "content-channel",
      channelName: "콘텐츠 채널",
      description: "현빈이 새 작품에 참여합니다.",
      tags: ["현빈", "제작 발표"],
      publishedAt: "2026-08-21T12:00:00",
    },
  ],
};

test("fact cards preserve selection order and remove duplicate videos", () => {
  const result = createEvidenceFactCards(candidate, [
    {
      evidenceVideoId: "video-2",
      sourceField: "DESCRIPTION",
      sourceExcerpt: "현빈이 새 작품에 참여",
      evidenceRole: "PERSON_WORK_LINK",
    },
    {
      evidenceVideoId: "video-1",
      sourceField: "TAG",
      sourceExcerpt: "메이드 인 코리아",
      evidenceRole: "EVENT_TRIGGER",
    },
    {
      evidenceVideoId: "video-2",
      sourceField: "CHANNEL_NAME",
      sourceExcerpt: "콘텐츠 채널",
      evidenceRole: "CONTEXT",
    },
  ]);

  assert.deepEqual(result, [
    {
      factId: "fact-1",
      videoId: "video-2",
      channelId: "content-channel",
      channelName: "콘텐츠 채널",
      title: "메이드 인 코리아 제작 발표",
      sourceField: "DESCRIPTION",
      sourceExcerpt: "현빈이 새 작품에 참여",
      evidenceRole: "PERSON_WORK_LINK",
      publishedAt: "2026-08-21T12:00:00",
    },
    {
      factId: "fact-2",
      videoId: "video-1",
      channelId: "disney-plus-korea",
      channelName: "Disney Plus Korea",
      title: "메이드 인 코리아 메인 예고편",
      sourceField: "TAG",
      sourceExcerpt: "메이드 인 코리아",
      evidenceRole: "EVENT_TRIGGER",
      publishedAt: "2026-08-20T12:00:00",
    },
  ]);
});

test("fact cards reject an unknown video ID", () => {
  assert.throws(
    () =>
      createEvidenceFactCards(candidate, [
        {
          evidenceVideoId: "unknown",
          sourceField: "TITLE",
          sourceExcerpt: "예고편",
          evidenceRole: "EVENT_TRIGGER",
        },
      ]),
    (error) => error.code === EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_EVIDENCE_VIDEO_ID,
  );
});

test("fact cards reject an excerpt absent from title and channel", () => {
  assert.throws(
    () =>
      createEvidenceFactCards(candidate, [
        {
          evidenceVideoId: "video-1",
          sourceField: "TITLE",
          sourceExcerpt: "흥행 돌풍",
          evidenceRole: "EVENT_TRIGGER",
        },
      ]),
    (error) => error.code === EDITORIAL_PLAN_VALIDATION_CODES.INVALID_EVIDENCE_EXCERPT,
  );
});

test("fact cards require a complete tag instead of a partial tag excerpt", () => {
  assert.throws(
    () =>
      createEvidenceFactCards(candidate, [
        {
          evidenceVideoId: "video-1",
          sourceField: "TAG",
          sourceExcerpt: "메이드",
          evidenceRole: "EVENT_TRIGGER",
        },
      ]),
    (error) => error.code === EDITORIAL_PLAN_VALIDATION_CODES.INVALID_EVIDENCE_EXCERPT,
  );
});
