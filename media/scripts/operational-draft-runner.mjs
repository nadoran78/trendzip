import { collectOperationalCandidates } from "./candidate-collector.mjs";
import { DUPLICATE_POLICY_ACTIONS } from "./duplicate-policy.mjs";
import { createOperationalDraft } from "./operational-draft.mjs";
import { calculateHistoryFrom, formatSeoulLocalDateTime } from "./operations-time.mjs";

export async function prepareOperationalDraft({
  config,
  apiClient,
  editorialPlanner,
  duplicatePolicy,
  now = new Date(),
}) {
  const generatedAt = formatSeoulLocalDateTime(now);
  const historyFrom = calculateHistoryFrom(now, config.historyWindowDays);

  const [candidates, recentContents] = await Promise.all([
    collectOperationalCandidates({
      apiClient,
      limitPerGeneration: config.candidateLimitPerGeneration,
      now,
      maximumAgeHours: config.maximumCandidateAgeHours,
    }),
    apiClient.getRecentShortformContents(historyFrom),
  ]);
  if (candidates.length === 0) {
    throw new Error("No fresh operational keyword candidate with evidence is available.");
  }

  const { plan, selectedCandidate } = await editorialPlanner.createPlan({
    candidates,
    recentContents,
    generatedAt,
  });
  const draft = createOperationalDraft({
    candidates,
    selectedCandidate,
    plan,
    generatedAt,
  });
  const duplicateDecision = duplicatePolicy({
    draft: draft.reservation,
    recentContents,
  });
  if (!Object.values(DUPLICATE_POLICY_ACTIONS).includes(duplicateDecision?.action)) {
    throw new Error("Duplicate policy returned an unsupported action.");
  }

  if (duplicateDecision.action !== DUPLICATE_POLICY_ACTIONS.ALLOW) {
    return {
      generatedAt,
      historyFrom,
      candidateCount: candidates.length,
      duplicateDecision,
      reservation: null,
      manifest: null,
    };
  }

  const reservedContent = await apiClient.reserveDraft(draft.reservation);
  return {
    generatedAt,
    historyFrom,
    candidateCount: candidates.length,
    duplicateDecision,
    reservation: reservedContent,
    manifest: {
      ...draft.manifest,
      duplicateDecision,
      reservation: {
        shortformContentId: reservedContent.id,
        status: reservedContent.status,
        selectedAt: reservedContent.selectedAt,
      },
    },
  };
}
