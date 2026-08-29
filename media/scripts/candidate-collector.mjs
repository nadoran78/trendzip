import { isRecentSeoulLocalDateTime } from "./operations-time.mjs";

export const OPERATIONAL_GENERATIONS = Object.freeze(["TEEN", "TWENTY"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isEligibleCandidate(detail, now, maximumAgeHours) {
  return (
    Number.isInteger(detail?.keywordId) &&
    detail.keywordId > 0 &&
    isNonEmptyString(detail.keyword) &&
    OPERATIONAL_GENERATIONS.includes(detail.generation) &&
    Number.isInteger(detail.rank) &&
    detail.rank > 0 &&
    isNonEmptyString(detail.explain) &&
    Number.isInteger(detail.sourceCrawlRunId) &&
    detail.sourceCrawlRunId > 0 &&
    isNonEmptyString(detail.snapshotAt) &&
    isRecentSeoulLocalDateTime(detail.snapshotAt, now, maximumAgeHours) &&
    Array.isArray(detail.relatedVideos) &&
    detail.relatedVideos.length > 0
  );
}

export async function collectOperationalCandidates({
  apiClient,
  limitPerGeneration,
  now,
  maximumAgeHours,
}) {
  if (!Number.isInteger(limitPerGeneration) || limitPerGeneration < 1) {
    throw new Error("limitPerGeneration must be a positive integer.");
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("now must be a valid Date.");
  }
  if (!Number.isInteger(maximumAgeHours) || maximumAgeHours < 1) {
    throw new Error("maximumAgeHours must be a positive integer.");
  }

  const keywordLists = await Promise.all(
    OPERATIONAL_GENERATIONS.map((generation) => apiClient.getKeywordList(generation)),
  );
  const selectedSummaries = keywordLists.flatMap(({ keywords }) =>
    keywords.slice(0, limitPerGeneration),
  );
  const keywordIds = [...new Set(selectedSummaries.map((keyword) => keyword.id))];
  const details = await Promise.all(keywordIds.map((keywordId) => apiClient.getKeywordDetail(keywordId)));

  return details
    .filter((detail) => isEligibleCandidate(detail, now, maximumAgeHours))
    .sort((left, right) => {
      const generationOrder =
        OPERATIONAL_GENERATIONS.indexOf(left.generation) -
        OPERATIONAL_GENERATIONS.indexOf(right.generation);
      return generationOrder || left.rank - right.rank || left.keywordId - right.keywordId;
    });
}
