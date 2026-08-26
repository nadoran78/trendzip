import { createHash } from "node:crypto";

import { deriveEvidenceVideoIds } from "./editorial-evidence.mjs";

const MANIFEST_SCHEMA_VERSION = 3;
const CAMPAIGN_BASE_URL = "https://trendzip.nadoran.com";

function normalizeKeywordWord(word) {
  return word.trim().toLocaleLowerCase("ko-KR");
}

function collectGenerationObservations(candidates, selectedCandidate) {
  const selectedWord = normalizeKeywordWord(selectedCandidate.keyword);
  return candidates
    .filter((candidate) => normalizeKeywordWord(candidate.keyword) === selectedWord)
    .map((candidate) => ({
      generation: candidate.generation,
      keywordId: candidate.keywordId,
      rank: candidate.rank,
      trendScore: candidate.trendScore,
      rankTrend: candidate.rankTrend,
      rankDelta: candidate.rankDelta,
      sourceCrawlRunId: candidate.sourceCrawlRunId,
      snapshotAt: candidate.snapshotAt,
    }))
    .sort((left, right) => left.generation.localeCompare(right.generation));
}

function determineSourceGeneration(generationObservations) {
  const generations = new Set(generationObservations.map((observation) => observation.generation));
  return generations.has("TEEN") && generations.has("TWENTY")
    ? "BOTH"
    : generationObservations[0].generation;
}

export function createCanonicalEventKey({ topicKey, editorialFormat, sourceCrawlRunId }) {
  if (typeof topicKey !== "string" || topicKey.length === 0) {
    throw new Error("topicKey is required to create an event key.");
  }
  if (typeof editorialFormat !== "string" || editorialFormat.length === 0) {
    throw new Error("editorialFormat is required to create an event key.");
  }
  if (!Number.isInteger(sourceCrawlRunId) || sourceCrawlRunId < 1) {
    throw new Error("sourceCrawlRunId must be a positive integer to create an event key.");
  }

  const formatSlug = editorialFormat.toLowerCase().replaceAll("_", "-");
  return `${topicKey}:${formatSlug}:crawl-${sourceCrawlRunId}`;
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

export function hashDraftContent({ selectedCandidate, plan, selection, factCards, sourceGeneration, eventKey }) {
  if (typeof eventKey !== "string" || eventKey.length === 0) {
    throw new Error("eventKey is required to hash draft content.");
  }
  const evidenceVideoIds = deriveEvidenceVideoIds(plan.evidenceClaims);
  const identity = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    platform: "YOUTUBE",
    primaryKeywordId: selectedCandidate.keywordId,
    primaryKeywordWord: selectedCandidate.keyword,
    sourceGeneration,
    sourceCrawlRunId: selectedCandidate.sourceCrawlRunId,
    editorialFormat: plan.editorialFormat,
    topicKey: plan.topicKey,
    eventKey,
    audienceAngle: plan.audienceAngle,
    title: plan.title,
    relatedKeywordIds: plan.relatedKeywordIds,
    hook: plan.hook,
    summary: plan.summary,
    reasons: plan.reasons,
    evidenceClaims: plan.evidenceClaims,
    narration: plan.narration,
    evidenceVideoIds,
    selection,
    factCards,
  };
  return createHash("sha256").update(JSON.stringify(identity), "utf8").digest("hex");
}

export function createOperationalDraft({
  candidates,
  selectedCandidate,
  selection,
  factCards,
  reviewWarnings,
  plan,
  generatedAt,
}) {
  if (selectedCandidate.keywordId !== plan.primaryKeywordId) {
    throw new Error("Selected candidate does not match the editorial plan primary keyword.");
  }

  const generationObservations = collectGenerationObservations(candidates, selectedCandidate);
  if (generationObservations.length === 0) {
    throw new Error("Selected candidate is not included in the operational candidate set.");
  }
  const sourceGeneration = determineSourceGeneration(generationObservations);
  const eventKey = createCanonicalEventKey({
    topicKey: plan.topicKey,
    editorialFormat: plan.editorialFormat,
    sourceCrawlRunId: selectedCandidate.sourceCrawlRunId,
  });
  const relatedKeywords = resolveRelatedKeywords(selectedCandidate, plan.relatedKeywordIds);
  const evidenceVideoIds = deriveEvidenceVideoIds(plan.evidenceClaims);
  const evidence = resolveEvidence(selectedCandidate, evidenceVideoIds);
  const contentHash = hashDraftContent({
    selectedCandidate,
    plan,
    selection,
    factCards,
    sourceGeneration,
    eventKey,
  });
  const reservation = {
    platform: "YOUTUBE",
    primaryKeywordId: selectedCandidate.keywordId,
    primaryKeywordWord: selectedCandidate.keyword,
    sourceGeneration,
    editorialFormat: plan.editorialFormat,
    topicKey: plan.topicKey,
    eventKey,
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
        generationObservations,
        category: selectedCandidate.category,
        rank: selectedCandidate.rank,
        rankTrend: selectedCandidate.rankTrend,
        trendScore: selectedCandidate.trendScore,
        contextSummary: selectedCandidate.explain,
        crawlRunId: selectedCandidate.sourceCrawlRunId,
        snapshotAt: selectedCandidate.snapshotAt,
        explainedAt: selectedCandidate.explainedAt,
      },
      editorial: {
        format: plan.editorialFormat,
        topicKey: plan.topicKey,
        eventKey,
        audienceAngle: plan.audienceAngle,
        selectionReason: plan.selectionReason,
        title: plan.title,
        hook: plan.hook,
        summary: plan.summary,
        reasons: plan.reasons,
        evidenceClaims: plan.evidenceClaims,
        narration: plan.narration,
      },
      selection,
      factCards,
      reviewWarnings,
      relatedKeywords,
      evidence,
      ctaUrl: createCampaignUrl(selectedCandidate.keywordId, plan.topicKey),
      contentHash,
    },
  };
}
