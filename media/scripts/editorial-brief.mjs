import { validateEditorialFormatEligibility } from "./editorial-format-eligibility.mjs";

const PROHIBITED_CLAIMS = Object.freeze([
  "내부 rank, trendScore, rankDelta를 공인 순위처럼 표현하지 않는다.",
  "근거에 없는 인물, 작품, 날짜, 수치, 성과를 추가하지 않는다.",
  "TEEN 또는 TWENTY 관측을 전체 세대나 30~40대의 반응으로 확대하지 않는다.",
  "채널명이나 영상 제목만으로 공식 발표 또는 공식 계정이라고 추정하지 않는다.",
  "인기 영상 포함만으로 긍정적이거나 부정적인 반응을 단정하지 않는다.",
]);

function normalizeEvidenceText(value) {
  return value.normalize("NFKC").replace(/\s+/gu, "").toLocaleLowerCase("ko-KR");
}

function hasRelatedKeywordEvidence(keywordWord, factCards) {
  const normalizedKeyword = normalizeEvidenceText(keywordWord);
  return factCards.some((factCard) =>
    normalizeEvidenceText(factCard.sourceExcerpt).includes(normalizedKeyword),
  );
}

function resolveRelatedKeywords(candidate, relatedKeywordIds, factCards) {
  const relatedKeywordsById = new Map(
    candidate.relatedKeywords.map((keyword) => [keyword.id, keyword]),
  );
  const requestedKeywords = relatedKeywordIds.map((keywordId) => {
    const keyword = relatedKeywordsById.get(keywordId);
    if (!keyword) throw new Error(`Related keyword ${keywordId} is not available on the candidate.`);
    return {
      keywordId: keyword.id,
      keywordWord: keyword.word,
      category: keyword.category ?? null,
    };
  });
  const relatedKeywords = requestedKeywords.filter((keyword) =>
    hasRelatedKeywordEvidence(keyword.keywordWord, factCards),
  );
  const supportedIds = new Set(relatedKeywords.map((keyword) => keyword.keywordId));
  const droppedKeywords = requestedKeywords.filter(
    (keyword) => !supportedIds.has(keyword.keywordId),
  );

  return { relatedKeywords, droppedKeywords };
}

function createAllowedEntities(candidate, relatedKeywords) {
  return [
    {
      name: candidate.keyword,
      type: candidate.category ?? "KEYWORD",
      source: "PRIMARY_KEYWORD",
    },
    ...relatedKeywords.map((keyword) => ({
      name: keyword.keywordWord,
      type: keyword.category ?? "KEYWORD",
      source: "RELATED_KEYWORD",
    })),
  ];
}

export function createEditorialBrief({
  candidate,
  selection,
  factCards,
  generatedAt,
  formatEligibilityResolver = validateEditorialFormatEligibility,
}) {
  if (!candidate || typeof candidate.keyword !== "string") {
    throw new Error("candidate with a keyword is required to create an editorial brief.");
  }
  if (!selection || selection.primaryKeywordId !== candidate.keywordId) {
    throw new Error("selection must reference the editorial brief candidate.");
  }
  if (!Array.isArray(factCards) || factCards.length === 0) {
    throw new Error("factCards must contain at least one verified fact.");
  }

  const verifiedFacts = factCards.map((factCard) => ({ ...factCard }));
  const { relatedKeywords, droppedKeywords } = resolveRelatedKeywords(
    candidate,
    selection.relatedKeywordIds,
    verifiedFacts,
  );
  const formatEligibility = formatEligibilityResolver({
    requestedFormat: selection.editorialFormat,
    eventType: selection.eventType,
    factCards: verifiedFacts,
    relatedKeywords,
    generatedAt,
  });

  return Object.freeze({
    keywordId: candidate.keywordId,
    keyword: candidate.keyword,
    generation: candidate.generation,
    requestedEditorialFormat: selection.editorialFormat,
    editorialFormat: formatEligibility.resolvedFormat,
    eventType: selection.eventType,
    generatedAt,
    facts: verifiedFacts,
    relatedKeywords,
    allowedEntities: createAllowedEntities(candidate, relatedKeywords),
    prohibitedClaims: [...PROHIBITED_CLAIMS],
    formatEligibility,
    reviewWarnings: [
      ...droppedKeywords.map((keyword) => ({
        code: "UNSUPPORTED_RELATED_KEYWORD_DROPPED",
        message: "Related keyword was removed because selected evidence did not mention it.",
        keywordId: keyword.keywordId,
        keywordWord: keyword.keywordWord,
      })),
      ...(formatEligibility.eligible
        ? []
        : [
            {
              code: "EDITORIAL_FORMAT_FALLBACK",
              message: `Requested format was replaced with ${formatEligibility.resolvedFormat}.`,
              reason: formatEligibility.reason,
            },
          ]),
    ],
  });
}
