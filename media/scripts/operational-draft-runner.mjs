import { collectOperationalCandidates } from "./candidate-collector.mjs";
import { DUPLICATE_POLICY_ACTIONS } from "./duplicate-policy.mjs";
import { OPERATIONAL_DRAFT_FAILURE_STAGES } from "./operational-draft-failure.mjs";
import { createOperationalDraft } from "./operational-draft.mjs";
import { calculateHistoryFrom, formatSeoulLocalDateTime } from "./operations-time.mjs";

export async function loadOperationalDraftContext({
  config,
  apiClient,
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

  return {
    generatedAt,
    historyFrom,
    candidates,
    recentContents,
  };
}

export async function evaluateOperationalDraft({
  context,
  editorialPlanner,
  duplicatePolicy,
}) {
  const { generatedAt, candidates, recentContents } = context;
  const planResult = await editorialPlanner.createPlan({
    candidates,
    recentContents,
    generatedAt,
  });
  const { plan, selection, factCards, reviewWarnings, selectedCandidate } = planResult;
  const generationAttemptCount = planResult.generationAttemptCount ?? 1;
  const repairDiagnostics = planResult.repairDiagnostics ?? null;
  let draft;
  try {
    draft = createOperationalDraft({
      candidates,
      selectedCandidate,
      selection,
      factCards,
      reviewWarnings,
      plan,
      generatedAt,
    });
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    normalizedError.failureStage ??= OPERATIONAL_DRAFT_FAILURE_STAGES.COMPOSITION;
    throw normalizedError;
  }
  let duplicateDecision;
  try {
    duplicateDecision = duplicatePolicy({
      draft: draft.reservation,
      recentContents,
    });
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    normalizedError.failureStage = OPERATIONAL_DRAFT_FAILURE_STAGES.DUPLICATE_POLICY;
    throw normalizedError;
  }
  if (!Object.values(DUPLICATE_POLICY_ACTIONS).includes(duplicateDecision?.action)) {
    const error = new Error("Duplicate policy returned an unsupported action.");
    error.failureStage = OPERATIONAL_DRAFT_FAILURE_STAGES.DUPLICATE_POLICY;
    throw error;
  }

  return {
    plan,
    selection,
    factCards,
    reviewWarnings,
    selectedCandidate,
    draft,
    duplicateDecision,
    generationAttemptCount,
    repairDiagnostics,
  };
}

export async function prepareOperationalDraft({
  config,
  apiClient,
  editorialPlanner,
  duplicatePolicy,
  now = new Date(),
}) {
  const context = await loadOperationalDraftContext({ config, apiClient, now });
  const evaluation = await evaluateOperationalDraft({
    context,
    editorialPlanner,
    duplicatePolicy,
  });
  const { generatedAt, historyFrom, candidates } = context;
  const {
    draft,
    reviewWarnings,
    duplicateDecision,
    generationAttemptCount,
    repairDiagnostics,
  } = evaluation;

  if (duplicateDecision.action !== DUPLICATE_POLICY_ACTIONS.ALLOW) {
    return {
      generatedAt,
      historyFrom,
      candidateCount: candidates.length,
      generationAttemptCount,
      repairDiagnostics,
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
    generationAttemptCount,
    repairDiagnostics,
    duplicateDecision,
    reservation: reservedContent,
    manifest: {
      ...draft.manifest,
      generationDiagnostics: {
        attemptCount: generationAttemptCount,
        repair: repairDiagnostics,
      },
      reviewWarnings,
      duplicateDecision,
      reservation: {
        shortformContentId: reservedContent.id,
        status: reservedContent.status,
        selectedAt: reservedContent.selectedAt,
      },
    },
  };
}
