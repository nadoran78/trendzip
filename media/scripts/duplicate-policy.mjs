export const DUPLICATE_POLICY_ACTIONS = Object.freeze({
  ALLOW: "ALLOW",
  HOLD: "HOLD",
  BLOCK: "BLOCK",
});

export const DUPLICATE_POLICY_REASONS = Object.freeze({
  NO_DUPLICATE: "NO_DUPLICATE",
  EXACT_CONTENT: "EXACT_CONTENT",
  ACTIVE_EVENT: "ACTIVE_EVENT",
  RECENT_TOPIC: "RECENT_TOPIC",
});

export const DUPLICATE_BLOCKING_STATUSES = Object.freeze([
  "DRAFT",
  "RENDERED",
  "REVIEW_REQUIRED",
  "APPROVED",
  "UPLOADED_PRIVATE",
  "SCHEDULED",
  "PUBLISHED",
  "HOLD",
  "NEEDS_REVISION",
]);

export function evaluateDuplicatePolicy({ draft, recentContents }) {
  if (!draft || typeof draft !== "object") {
    throw new Error("draft is required for duplicate policy evaluation.");
  }
  if (!Array.isArray(recentContents)) {
    throw new Error("recentContents must be an array.");
  }

  const exactContent = recentContents.find((content) => content.contentHash === draft.contentHash);
  if (exactContent) {
    return {
      action: DUPLICATE_POLICY_ACTIONS.BLOCK,
      reason: DUPLICATE_POLICY_REASONS.EXACT_CONTENT,
      conflictingContentId: exactContent.id,
    };
  }

  const sameEventContent = recentContents.find((content) =>
    DUPLICATE_BLOCKING_STATUSES.includes(content.status) && content.eventKey === draft.eventKey,
  );
  if (sameEventContent) {
    return {
      action: DUPLICATE_POLICY_ACTIONS.BLOCK,
      reason: DUPLICATE_POLICY_REASONS.ACTIVE_EVENT,
      conflictingContentId: sameEventContent.id,
    };
  }

  const activeTopicContent = recentContents.find((content) =>
    DUPLICATE_BLOCKING_STATUSES.includes(content.status) && content.topicKey === draft.topicKey,
  );
  if (activeTopicContent) {
    return {
      action: DUPLICATE_POLICY_ACTIONS.HOLD,
      reason: DUPLICATE_POLICY_REASONS.RECENT_TOPIC,
      conflictingContentId: activeTopicContent.id,
    };
  }

  return {
    action: DUPLICATE_POLICY_ACTIONS.ALLOW,
    reason: DUPLICATE_POLICY_REASONS.NO_DUPLICATE,
    conflictingContentId: null,
  };
}
