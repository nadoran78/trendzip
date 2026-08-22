import { DUPLICATE_POLICY_ACTIONS } from "./duplicate-policy.mjs";
import {
  evaluateOperationalDraft,
  loadOperationalDraftContext,
} from "./operational-draft-runner.mjs";

function uniqueValues(iterations, selectValue) {
  return [...new Set(iterations.map(selectValue))];
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
  const hasSuccessfulIteration = successfulIterations.length > 0;

  return {
    attemptedCount: iterations.length,
    successfulCount: successfulIterations.length,
    failedCount: iterations.length - successfulIterations.length,
    stablePrimaryKeyword: hasSuccessfulIteration && primaryKeywordIds.length === 1,
    stableTopicKey: hasSuccessfulIteration && topicKeys.length === 1,
    stableEventKey: hasSuccessfulIteration && eventKeys.length === 1,
    stableContent: hasSuccessfulIteration && contentHashes.length === 1,
    primaryKeywordIds,
    topicKeys,
    eventKeys,
    contentHashes,
  };
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function toDryRunError(error) {
  return {
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
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
      const { draft, duplicateDecision } = evaluation;

      iterations.push({
        iteration: index + 1,
        status: "SUCCESS",
        wouldReserve: duplicateDecision.action === DUPLICATE_POLICY_ACTIONS.ALLOW,
        duplicateDecision,
        reservationRequest: draft.reservation,
        manifestPreview: {
          ...draft.manifest,
          status: "DRY_RUN",
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
    schemaVersion: 1,
    mode: "DRY_RUN",
    generatedAt: context.generatedAt,
    historyFrom: context.historyFrom,
    candidateCount: context.candidates.length,
    recentContentCount: context.recentContents.length,
    stability: summarizeDryRunStability(iterations),
    iterations,
  };
}
