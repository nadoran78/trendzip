import { DUPLICATE_POLICY_ACTIONS } from "./duplicate-policy.mjs";
import { createEvidenceDiagnostics } from "./evidence-diagnostics.mjs";
import {
  evaluateOperationalDraft,
  loadOperationalDraftContext,
} from "./operational-draft-runner.mjs";

function uniqueValues(iterations, selectValue) {
  return [...new Set(iterations.map(selectValue))];
}

function generationAttemptCountOf(iteration) {
  return iteration.status === "SUCCESS"
    ? iteration.generationAttemptCount
    : iteration.error.generationAttemptCount;
}

export function resolveStabilityMetric(successfulCount, uniqueValueCount) {
  if (successfulCount < 2) {
    return null;
  }
  return uniqueValueCount === 1;
}

export function summarizeDryRunStability(iterations) {
  if (!Array.isArray(iterations) || iterations.length === 0) {
    throw new Error("At least one dry-run iteration is required.");
  }

  const successfulIterations = iterations.filter((iteration) => iteration.status === "SUCCESS");
  const primaryKeywordIds = uniqueValues(
    successfulIterations,
    (iteration) => iteration.reservationRequest.primaryKeywordId,
  );
  const topicKeys = uniqueValues(
    successfulIterations,
    (iteration) => iteration.reservationRequest.topicKey,
  );
  const eventKeys = uniqueValues(
    successfulIterations,
    (iteration) => iteration.reservationRequest.eventKey,
  );
  const contentHashes = uniqueValues(
    successfulIterations,
    (iteration) => iteration.reservationRequest.contentHash,
  );
  const successfulCount = successfulIterations.length;
  const generationAttemptCounts = iterations.map(generationAttemptCountOf);

  return {
    attemptedCount: iterations.length,
    successfulCount,
    failedCount: iterations.length - successfulCount,
    repairedCount: generationAttemptCounts.filter((count) => count > 1).length,
    comparisonEligible: successfulCount >= 2,
    fullySuccessful: successfulCount === iterations.length,
    stablePrimaryKeyword: resolveStabilityMetric(successfulCount, primaryKeywordIds.length),
    stableTopicKey: resolveStabilityMetric(successfulCount, topicKeys.length),
    stableEventKey: resolveStabilityMetric(successfulCount, eventKeys.length),
    stableContent: resolveStabilityMetric(successfulCount, contentHashes.length),
    primaryKeywordIds,
    topicKeys,
    eventKeys,
    contentHashes,
    generationAttemptCounts,
  };
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function toDryRunError(error) {
  return {
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
    generationAttemptCount: Number.isInteger(error?.generationAttemptCount)
      ? error.generationAttemptCount
      : 1,
    ...(typeof error?.code === "string" ? { code: error.code } : {}),
    ...(error?.details && typeof error.details === "object" ? { details: error.details } : {}),
    ...(error?.generationDiagnostics && typeof error.generationDiagnostics === "object"
      ? { generationDiagnostics: error.generationDiagnostics }
      : {}),
    failureStage: error?.failureStage ?? "SELECTION",
  };
}

export async function runOperationalDraftDryRun({
  config,
  apiClient,
  editorialPlanner,
  duplicatePolicy,
  now = new Date(),
  sleepImpl = defaultSleep,
}) {
  const context = await loadOperationalDraftContext({ config, apiClient, now });
  const iterations = [];

  for (let index = 0; index < config.dryRunCount; index += 1) {
    try {
      const evaluation = await evaluateOperationalDraft({
        context,
        editorialPlanner,
        duplicatePolicy,
      });
      const {
        selection,
        factCards,
        reviewWarnings,
        plan,
        draft,
        duplicateDecision,
        generationAttemptCount,
        repairDiagnostics,
      } = evaluation;
      const evidenceDiagnostics = createEvidenceDiagnostics({
        editorialFormat: draft.manifest.editorial.format,
        generatedAt: context.generatedAt,
        evidence: draft.manifest.evidence,
      });

      iterations.push({
        iteration: index + 1,
        status: "SUCCESS",
        generationAttemptCount,
        repairDiagnostics,
        selection,
        factCards,
        systemDraft: plan,
        reviewWarnings,
        wouldReserve: duplicateDecision.action === DUPLICATE_POLICY_ACTIONS.ALLOW,
        duplicateDecision,
        evidenceDiagnostics,
        reservationRequest: draft.reservation,
        manifestPreview: {
          ...draft.manifest,
          status: "DRY_RUN",
          generationDiagnostics: {
            attemptCount: generationAttemptCount,
            repair: repairDiagnostics,
          },
          duplicateDecision,
        },
      });
    } catch (error) {
      iterations.push({
        iteration: index + 1,
        status: "FAILED",
        error: toDryRunError(error),
      });
    }

    if (index < config.dryRunCount - 1 && config.dryRunIntervalMs > 0) {
      await sleepImpl(config.dryRunIntervalMs);
    }
  }

  return {
    schemaVersion: 3,
    mode: "DRY_RUN",
    generatedAt: context.generatedAt,
    historyFrom: context.historyFrom,
    candidateCount: context.candidates.length,
    recentContentCount: context.recentContents.length,
    stability: summarizeDryRunStability(iterations),
    iterations,
  };
}
