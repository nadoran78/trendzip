import { parseSeoulLocalDateTime } from "./operations-time.mjs";

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;
const CLICKBAIT_PATTERNS = Object.freeze([/ㄷㄷ/iu, /와\.{2,}/iu, /역대급/iu, /🔥/u, /충격/iu, /실화/iu]);

export const SOURCE_REVIEW_WARNING_CODES = Object.freeze({
  CLICKBAIT_LIKE_TITLE: "CLICKBAIT_LIKE_TITLE",
  STALE_EVIDENCE: "STALE_EVIDENCE",
  TOPIC_MISMATCH: "TOPIC_MISMATCH",
});

function normalizeTopicText(value) {
  return value.normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("ko-KR");
}

export function createSourceReviewWarnings({
  candidate,
  selection,
  factCards,
  generatedAt,
  staleAfterDays = 30,
}) {
  const generatedDate = parseSeoulLocalDateTime(generatedAt);
  const selectedRelatedWords = new Set(selection.relatedKeywordIds);
  const topicWords = [
    candidate.keyword,
    ...candidate.relatedKeywords
      .filter((keyword) => selectedRelatedWords.has(keyword.id))
      .map((keyword) => keyword.word),
  ]
    .map(normalizeTopicText)
    .filter((word) => word.length > 0);

  return factCards.flatMap((card) => {
    const warnings = [];
    if (CLICKBAIT_PATTERNS.some((pattern) => pattern.test(card.title))) {
      warnings.push({
        code: SOURCE_REVIEW_WARNING_CODES.CLICKBAIT_LIKE_TITLE,
        videoId: card.videoId,
        message: "Selected evidence title contains a clickbait-like expression.",
      });
    }

    const publishedDate = parseSeoulLocalDateTime(card.publishedAt);
    const ageDays = (generatedDate.getTime() - publishedDate.getTime()) / DAY_MILLISECONDS;
    if (ageDays > staleAfterDays) {
      warnings.push({
        code: SOURCE_REVIEW_WARNING_CODES.STALE_EVIDENCE,
        videoId: card.videoId,
        message: `Selected evidence is older than ${staleAfterDays} days.`,
      });
    }

    const sourceText = normalizeTopicText(`${card.title} ${card.channelName}`);
    if (!topicWords.some((word) => sourceText.includes(word))) {
      warnings.push({
        code: SOURCE_REVIEW_WARNING_CODES.TOPIC_MISMATCH,
        videoId: card.videoId,
        message: "Selected evidence metadata does not contain the primary or selected related keyword.",
      });
    }
    return warnings;
  });
}
