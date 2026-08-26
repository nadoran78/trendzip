import assert from "node:assert/strict";
import test from "node:test";

import {
  createCanonicalEventKey,
  createOperationalDraft,
  hashDraftContent,
} from "./operational-draft.mjs";

const selectedCandidate = {
  keywordId: 101,
  keyword: "메이드 인 코리아",
  generation: "TEEN",
  category: "시리즈",
  rank: 2,
  rankTrend: "NEW",
  trendScore: 1000,
  explain: "작품 공개로 관심을 받고 있습니다.",
  sourceCrawlRunId: 501,
  snapshotAt: "2026-08-21T03:00:00",
  explainedAt: "2026-08-21T03:05:00",
  relatedKeywords: [{ id: 102, word: "현빈" }],
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

const plan = {
  primaryKeywordId: 101,
  editorialFormat: "WHY_NOW",
  topicKey: "made-in-korea",
  audienceAngle: "작품 공개로 관심이 높아진 배경",
  selectionReason: "공식 예고편이 함께 확인됐습니다.",
  title: "메이드 인 코리아가 지금 주목받는 이유",
  relatedKeywordIds: [102],
  hook: "작품명 전체가 포인트입니다",
  summary: "공식 예고편 공개로 작품과 출연진이 관심을 받고 있습니다.",
  reasons: ["공식 예고편이 공개됐습니다.", "출연 배우가 함께 언급되고 있습니다."],
  narration: {
    hook: "오늘의 키워드는 메이드 인 코리아입니다.",
    overview: "새 작품의 공개 소식이 관심을 모았습니다.",
    reasons: "공식 예고편과 출연진 정보가 함께 확산했습니다.",
    evidence: "관련 영상 제목과 채널에서 작품명을 확인했습니다.",
    cta: "더 자세한 내용은 트렌드집 프로필 링크에서 확인해 보세요.",
  },
  evidenceClaims: [
    {
      reasonIndex: 0,
      statement: "공식 예고편이 공개됐습니다.",
      evidenceVideoId: "video-101",
      sourceExcerpt: "메인 예고편",
    },
    {
      reasonIndex: 1,
      statement: "출연 배우가 함께 언급되고 있습니다.",
      evidenceVideoId: "video-101",
      sourceExcerpt: "Disney Plus Korea",
    },
  ],
};

const selection = {
  primaryKeywordId: 101,
  editorialFormat: "WHY_NOW",
  relatedKeywordIds: [102],
  evidenceSelections: [
    { evidenceVideoId: "video-101", sourceExcerpt: "메인 예고편" },
  ],
};

const factCards = [
  {
    videoId: "video-101",
    channelName: "Disney Plus Korea",
    title: "메이드 인 코리아 메인 예고편",
    sourceExcerpt: "메인 예고편",
    publishedAt: "2026-08-20T12:00:00",
  },
];

test("operational draft maps the editorial plan to reservation and review manifest", () => {
  const counterpart = { ...selectedCandidate, keywordId: 201, generation: "TWENTY" };

  const draft = createOperationalDraft({
    candidates: [selectedCandidate, counterpart],
    selectedCandidate,
    selection,
    factCards,
    reviewWarnings: [],
    plan,
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(draft.reservation.sourceGeneration, "BOTH");
  assert.equal(draft.reservation.eventKey, "made-in-korea:why-now:crawl-501");
  assert.deepEqual(draft.reservation.relatedKeywords, [
    { keywordId: 102, keywordWord: "현빈" },
  ]);
  assert.match(draft.reservation.contentHash, /^[0-9a-f]{64}$/);
  assert.equal(draft.manifest.contentHash, draft.reservation.contentHash);
  assert.equal(draft.manifest.schemaVersion, 3);
  assert.deepEqual(
    draft.manifest.source.generationObservations.map(({ generation, keywordId }) => ({
      generation,
      keywordId,
    })),
    [
      { generation: "TEEN", keywordId: 101 },
      { generation: "TWENTY", keywordId: 201 },
    ],
  );
  assert.deepEqual(draft.manifest.editorial.evidenceClaims, plan.evidenceClaims);
  assert.deepEqual(draft.manifest.selection, selection);
  assert.deepEqual(draft.manifest.factCards, factCards);
  assert.deepEqual(draft.manifest.reviewWarnings, []);
  assert.equal(draft.manifest.evidence[0].url, "https://www.youtube.com/watch?v=video-101");
  assert.equal(
    draft.manifest.ctaUrl,
    "https://trendzip.nadoran.com/keyword/101?utm_source=youtube&utm_medium=shorts&utm_campaign=trend_keyword&utm_content=made-in-korea",
  );
});

test("canonical event key is stable and changes with its system identity", () => {
  const identity = {
    topicKey: plan.topicKey,
    editorialFormat: plan.editorialFormat,
    sourceCrawlRunId: selectedCandidate.sourceCrawlRunId,
  };

  assert.equal(createCanonicalEventKey(identity), "made-in-korea:why-now:crawl-501");
  assert.equal(createCanonicalEventKey(identity), createCanonicalEventKey({ ...identity }));
  assert.notEqual(
    createCanonicalEventKey({ ...identity, sourceCrawlRunId: 502 }),
    createCanonicalEventKey(identity),
  );
});

test("generated prose changes content hash without changing the system event key", () => {
  const originalDraft = createOperationalDraft({
    candidates: [selectedCandidate],
    selectedCandidate,
    selection,
    factCards,
    reviewWarnings: [],
    plan,
    generatedAt: "2026-08-21T12:00:00",
  });
  const revisedDraft = createOperationalDraft({
    candidates: [selectedCandidate],
    selectedCandidate,
    selection,
    factCards,
    reviewWarnings: [],
    plan: { ...plan, hook: "같은 사건을 다른 문장으로 설명합니다" },
    generatedAt: "2026-08-21T12:00:00",
  });

  assert.equal(revisedDraft.reservation.eventKey, originalDraft.reservation.eventKey);
  assert.notEqual(revisedDraft.reservation.contentHash, originalDraft.reservation.contentHash);
});

test("draft content hash is stable and changes when the canonical event identity changes", () => {
  const eventKey = createCanonicalEventKey({
    topicKey: plan.topicKey,
    editorialFormat: plan.editorialFormat,
    sourceCrawlRunId: selectedCandidate.sourceCrawlRunId,
  });
  const input = {
    selectedCandidate,
    plan,
    selection,
    factCards,
    sourceGeneration: "TEEN",
    eventKey,
  };
  const originalHash = hashDraftContent(input);

  assert.equal(hashDraftContent(input), originalHash);
  assert.notEqual(
    hashDraftContent({
      ...input,
      eventKey: createCanonicalEventKey({
        topicKey: plan.topicKey,
        editorialFormat: plan.editorialFormat,
        sourceCrawlRunId: 502,
      }),
    }),
    originalHash,
  );
});
