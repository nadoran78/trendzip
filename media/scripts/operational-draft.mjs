import { createHash } from "node:crypto";

const MANIFEST_SCHEMA_VERSION = 1;
const CAMPAIGN_BASE_URL = "https://trendzip.nadoran.com";

function normalizeKeywordWord(word) {
  return word.trim().toLocaleLowerCase("ko-KR");
}

function determineSourceGeneration(candidates, selectedCandidate) {
  const selectedWord = normalizeKeywordWord(selectedCandidate.keyword);
  const generations = new Set(
    candidates
      .filter((candidate) => normalizeKeywordWord(candidate.keyword) === selectedWord)
      .map((candidate) => candidate.generation),
  );
  return generations.has("TEEN") && generations.has("TWENTY")
    ? "BOTH"
    : selectedCandidate.generation;
}

function resolveRelatedKeywords(selectedCandidate, relatedKeywordIds) {
  const relatedKeywordsById = new Map(
    selectedCandidate.relatedKeywords.map((keyword) => [keyword.id, keyword]),
  );
  return relatedKeywordIds.map((keywordId) => {
    const keyword = relatedKeywordsById.get(keywordId);
    if (!keyword) throw new Error(`Related keyword ${keywordId} is not available on the candidate.`);
    return { keywordId: keyword.id, keywordWord: keyword.word };
  });
}

function resolveEvidence(selectedCandidate, evidenceVideoIds) {
  const videosById = new Map(
    selectedCandidate.relatedVideos.map((video) => [video.videoId, video]),
  );
  return evidenceVideoIds.map((videoId) => {
    const video = videosById.get(videoId);
    if (!video) throw new Error(`Evidence video ${videoId} is not available on the candidate.`);
    return {
      videoId,
      publisher: video.channelName,
      title: video.title,
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      viewCount: video.viewCount,
      publishedAt: video.publishedAt,
    };
  });
}

function createCampaignUrl(primaryKeywordId, topicKey) {
  const url = new URL(`/keyword/${primaryKeywordId}`, CAMPAIGN_BASE_URL);
  url.searchParams.set("utm_source", "youtube");
  url.searchParams.set("utm_medium", "shorts");
  url.searchParams.set("utm_campaign", "trend_keyword");
  url.searchParams.set("utm_content", topicKey);
  return url.toString();
}

export function hashDraftContent({ selectedCandidate, plan, sourceGeneration }) {
  const identity = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    platform: "YOUTUBE",
    primaryKeywordId: selectedCandidate.keywordId,
    primaryKeywordWord: selectedCandidate.keyword,
    sourceGeneration,
    sourceCrawlRunId: selectedCandidate.sourceCrawlRunId,
    editorialFormat: plan.editorialFormat,
    topicKey: plan.topicKey,
    eventKey: plan.eventKey,
    audienceAngle: plan.audienceAngle,
    title: plan.title,
    relatedKeywordIds: plan.relatedKeywordIds,
    hook: plan.hook,
    summary: plan.summary,
    reasons: plan.reasons,
    narration: plan.narration,
    evidenceVideoIds: plan.evidenceVideoIds,
  };
  return createHash("sha256").update(JSON.stringify(identity), "utf8").digest("hex");
}

export function createOperationalDraft({
  candidates,
  selectedCandidate,
  plan,
  generatedAt,
}) {
  if (selectedCandidate.keywordId !== plan.primaryKeywordId) {
    throw new Error("Selected candidate does not match the editorial plan primary keyword.");
  }

  const sourceGeneration = determineSourceGeneration(candidates, selectedCandidate);
  const relatedKeywords = resolveRelatedKeywords(selectedCandidate, plan.relatedKeywordIds);
  const evidence = resolveEvidence(selectedCandidate, plan.evidenceVideoIds);
  const contentHash = hashDraftContent({ selectedCandidate, plan, sourceGeneration });
  const reservation = {
    platform: "YOUTUBE",
    primaryKeywordId: selectedCandidate.keywordId,
    primaryKeywordWord: selectedCandidate.keyword,
    sourceGeneration,
    editorialFormat: plan.editorialFormat,
    topicKey: plan.topicKey,
    eventKey: plan.eventKey,
    audienceAngle: plan.audienceAngle,
    selectionReason: plan.selectionReason,
    title: plan.title,
    contentHash,
    sourceCrawlRunId: selectedCandidate.sourceCrawlRunId,
    relatedKeywords,
  };

  return {
    reservation,
    manifest: {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      status: "DRAFT",
      generatedAt,
      source: {
        keywordId: selectedCandidate.keywordId,
        keyword: selectedCandidate.keyword,
        generation: selectedCandidate.generation,
        sourceGeneration,
        category: selectedCandidate.category,
        rank: selectedCandidate.rank,
        rankTrend: selectedCandidate.rankTrend,
        trendScore: selectedCandidate.trendScore,
        explain: selectedCandidate.explain,
        crawlRunId: selectedCandidate.sourceCrawlRunId,
        snapshotAt: selectedCandidate.snapshotAt,
        explainedAt: selectedCandidate.explainedAt,
      },
      editorial: {
        format: plan.editorialFormat,
        topicKey: plan.topicKey,
        eventKey: plan.eventKey,
        audienceAngle: plan.audienceAngle,
        selectionReason: plan.selectionReason,
        title: plan.title,
        hook: plan.hook,
        summary: plan.summary,
        reasons: plan.reasons,
        narration: plan.narration,
      },
      relatedKeywords,
      evidence,
      ctaUrl: createCampaignUrl(selectedCandidate.keywordId, plan.topicKey),
      contentHash,
    },
  };
}
