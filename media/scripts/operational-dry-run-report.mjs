import { DUPLICATE_POLICY_ACTIONS } from "./duplicate-policy.mjs";

function compactWriterDiagnostics(writerDiagnostics) {
  return {
    attemptCount: writerDiagnostics.attemptCount,
    fallbackUsed: writerDiagnostics.fallbackUsed,
    ...(writerDiagnostics.repair ? { repair: writerDiagnostics.repair } : {}),
    ...(writerDiagnostics.failure ? { failure: writerDiagnostics.failure } : {}),
  };
}

export function createDryRunSuccessIteration({
  iteration,
  evaluation,
  evidenceDiagnostics,
}) {
  const {
    selection,
    plan,
    writerDiagnostics,
    reviewWarnings,
    draft,
    duplicateDecision,
    generationAttemptCount,
    repairDiagnostics,
  } = evaluation;
  const reservation = draft.reservation;

  return {
    iteration,
    status: "SUCCESS",
    generationAttemptCount,
    ...(repairDiagnostics ? { repairDiagnostics } : {}),
    writerDiagnostics: compactWriterDiagnostics(writerDiagnostics),
    selection: {
      primaryKeywordId: reservation.primaryKeywordId,
      primaryKeywordWord: reservation.primaryKeywordWord,
      sourceGeneration: reservation.sourceGeneration,
      sourceCrawlRunId: reservation.sourceCrawlRunId,
      editorialFormat: reservation.editorialFormat,
      eventType: selection.eventType,
      topicKey: reservation.topicKey,
      eventKey: reservation.eventKey,
      relatedKeywordIds: selection.relatedKeywordIds,
      evidenceSelections: selection.evidenceSelections,
    },
    finalDraft: plan,
    reviewWarnings,
    wouldReserve: duplicateDecision.action === DUPLICATE_POLICY_ACTIONS.ALLOW,
    duplicateDecision,
    evidenceDiagnostics,
    contentHash: reservation.contentHash,
  };
}
