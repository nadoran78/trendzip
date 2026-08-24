import { parseSeoulLocalDateTime } from "./operations-time.mjs";

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;

export const DEFAULT_RECENT_EVIDENCE_WINDOW_DAYS = 30;

export const EVIDENCE_DIAGNOSTIC_CODES = Object.freeze({
  WHY_NOW_WITHOUT_RECENT_EVIDENCE: "WHY_NOW_WITHOUT_RECENT_EVIDENCE",
});

function roundAgeDays(ageMilliseconds) {
  return Math.round((ageMilliseconds / DAY_MILLISECONDS) * 100) / 100;
}

export function createEvidenceDiagnostics({
  editorialFormat,
  generatedAt,
  evidence,
  recentEvidenceWindowDays = DEFAULT_RECENT_EVIDENCE_WINDOW_DAYS,
}) {
  if (typeof editorialFormat !== "string" || editorialFormat.length === 0) {
    throw new Error("editorialFormat must be a non-empty string.");
  }
  if (!Array.isArray(evidence) || evidence.length === 0) {
    throw new Error("evidence must contain at least one video.");
  }
  if (!Number.isInteger(recentEvidenceWindowDays) || recentEvidenceWindowDays < 1) {
    throw new Error("recentEvidenceWindowDays must be a positive integer.");
  }

  const generatedDate = parseSeoulLocalDateTime(generatedAt);
  const recentWindowMilliseconds = recentEvidenceWindowDays * DAY_MILLISECONDS;
  const timingDetails = evidence.map(({ videoId, publishedAt }) => {
    const publishedDate = parseSeoulLocalDateTime(publishedAt);
    const ageMilliseconds = generatedDate.getTime() - publishedDate.getTime();
    return {
      videoId,
      publishedAt,
      ageMilliseconds,
      ageDays: roundAgeDays(ageMilliseconds),
      isRecent: ageMilliseconds >= 0 && ageMilliseconds <= recentWindowMilliseconds,
    };
  });
  const latestEvidence = [...timingDetails].sort(
    (left, right) => left.ageMilliseconds - right.ageMilliseconds,
  )[0];
  const requiresRecentEvidence = editorialFormat === "WHY_NOW";
  const hasRecentEvidence = timingDetails.some(({ isRecent }) => isRecent);
  const warnings =
    requiresRecentEvidence && !hasRecentEvidence
      ? [
          {
            code: EVIDENCE_DIAGNOSTIC_CODES.WHY_NOW_WITHOUT_RECENT_EVIDENCE,
            message: `WHY_NOW has no evidence video published within ${recentEvidenceWindowDays} days.`,
          },
        ]
      : [];

  return {
    requiresRecentEvidence,
    recentEvidenceWindowDays,
    hasRecentEvidence,
    latestEvidencePublishedAt: latestEvidence.publishedAt,
    evidence: timingDetails.map(({ videoId, publishedAt, ageDays, isRecent }) => ({
      videoId,
      publishedAt,
      ageDays,
      isRecent,
    })),
    warnings,
  };
}
