import { collectOperationalCandidates } from "./candidate-collector.mjs";
import { DUPLICATE_POLICY_ACTIONS } from "./duplicate-policy.mjs";
import { createEditorialBrief } from "./editorial-brief.mjs";
import { composeEditorialDraft } from "./editorial-draft-composer.mjs";
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
  editorialWriter = null,
  duplicatePolicy,
}) {
  const { generatedAt, candidates, recentContents } = context;
  const planResult = await editorialPlanner.createPlan({
    candidates,
    recentContents,
    generatedAt,
  });
  const {
    plan: plannerFallbackPlan,
    selection,
    factCards,
    reviewWarnings: sourceReviewWarnings,
    selectedCandidate,
  } = planResult;
  const generationAttemptCount = planResult.generationAttemptCount ?? 1;
  const repairDiagnostics = planResult.repairDiagnostics ?? null;
  let editorialBrief;
  try {
    editorialBrief = createEditorialBrief({
      candidate: selectedCandidate,
      selection,
      factCards,
      generatedAt,
    });
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    normalizedError.failureStage = OPERATIONAL_DRAFT_FAILURE_STAGES.BRIEF_ASSEMBLY;
    throw normalizedError;
  }

  const resolvedSelection = {
    ...selection,
    editorialFormat: editorialBrief.editorialFormat,
    relatedKeywordIds: editorialBrief.relatedKeywords.map((keyword) => keyword.keywordId),
  };
  let fallbackDraft;
  try {
    const plannerRelatedKeywordIds = plannerFallbackPlan?.relatedKeywordIds ?? [];
    const canReusePlannerFallback =
      plannerFallbackPlan?.editorialFormat === editorialBrief.editorialFormat &&
      plannerRelatedKeywordIds.length === resolvedSelection.relatedKeywordIds.length &&
      plannerRelatedKeywordIds.every(
        (keywordId, index) => keywordId === resolvedSelection.relatedKeywordIds[index],
      );
    fallbackDraft =
      canReusePlannerFallback
        ? plannerFallbackPlan
        : composeEditorialDraft({
            candidate: selectedCandidate,
            selection: resolvedSelection,
            factCards,
          });
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    normalizedError.failureStage = OPERATIONAL_DRAFT_FAILURE_STAGES.COMPOSITION;
    throw normalizedError;
  }

  let plan = fallbackDraft;
  let writerDraft = null;
  let writerDiagnostics = {
    attemptCount: 0,
    repair: null,
    fallbackUsed: true,
    failure: null,
  };
  const reviewWarnings = [
    ...(Array.isArray(sourceReviewWarnings) ? sourceReviewWarnings : []),
    ...editorialBrief.reviewWarnings,
  ];
  if (editorialWriter) {
    try {
      const writerResult = await editorialWriter.createDraft({ editorialBrief });
      plan = writerResult.plan;
      writerDraft = writerResult.writerDraft;
      writerDiagnostics = {
        attemptCount: writerResult.attemptCount,
        repair: writerResult.repairDiagnostics,
        fallbackUsed: false,
        failure: null,
      };
    } catch (error) {
      const diagnostics = error?.writerDiagnostics ?? {};
      writerDraft = diagnostics.finalDraft ?? diagnostics.initialDraft ?? null;
      writerDiagnostics = {
        attemptCount: diagnostics.attemptCount ?? 1,
        repair: diagnostics.repair ?? null,
        fallbackUsed: true,
        failure: {
          stage: error?.failureStage ?? OPERATIONAL_DRAFT_FAILURE_STAGES.WRITING,
          name: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : String(error),
          ...(typeof error?.code === "string" ? { code: error.code } : {}),
          ...(error?.details && typeof error.details === "object"
            ? { details: error.details }
            : {}),
        },
      };
      reviewWarnings.push({
        code: "EDITORIAL_WRITER_FALLBACK",
        message: "Gemini writer output was replaced with the deterministic fallback draft.",
        reason: writerDiagnostics.failure.code ?? writerDiagnostics.failure.stage,
      });
    }
  }
  let draft;
  try {
    draft = createOperationalDraft({
      candidates,
      selectedCandidate,
      selection: resolvedSelection,
      factCards,
      reviewWarnings,
      plan,
      editorialBrief,
      writerDraft,
      fallbackDraft,
      writerDiagnostics,
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
    editorialBrief,
    writerDraft,
    fallbackDraft,
    writerDiagnostics,
    selection: resolvedSelection,
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
  editorialWriter = null,
  duplicatePolicy,
  now = new Date(),
}) {
  const context = await loadOperationalDraftContext({ config, apiClient, now });
  const evaluation = await evaluateOperationalDraft({
    context,
    editorialPlanner,
    editorialWriter,
    duplicatePolicy,
  });
  const { generatedAt, historyFrom, candidates } = context;
  const {
    draft,
    reviewWarnings,
    duplicateDecision,
    generationAttemptCount,
    repairDiagnostics,
    writerDiagnostics,
  } = evaluation;

  if (duplicateDecision.action !== DUPLICATE_POLICY_ACTIONS.ALLOW) {
    return {
      generatedAt,
      historyFrom,
      candidateCount: candidates.length,
      generationAttemptCount,
      repairDiagnostics,
      writerDiagnostics,
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
    writerDiagnostics,
    duplicateDecision,
    reservation: reservedContent,
    manifest: {
      ...draft.manifest,
      generationDiagnostics: {
        selection: {
          attemptCount: generationAttemptCount,
          repair: repairDiagnostics,
        },
        writing: writerDiagnostics,
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
