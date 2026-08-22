import assert from "node:assert/strict";
import test from "node:test";

import {
  DUPLICATE_POLICY_ACTIONS,
  DUPLICATE_POLICY_REASONS,
  evaluateDuplicatePolicy,
} from "./duplicate-policy.mjs";

const draft = {
  platform: "YOUTUBE",
  topicKey: "made-in-korea",
  eventKey: "made-in-korea:official-release",
  contentHash: "a".repeat(64),
};

function history(overrides = {}) {
  return {
    id: 10,
    platform: "YOUTUBE",
    status: "PUBLISHED",
    topicKey: "another-topic",
    eventKey: "another-topic:release",
    contentHash: "b".repeat(64),
    ...overrides,
  };
}

test("duplicate policy blocks an identical content hash before other checks", () => {
  const result = evaluateDuplicatePolicy({
    draft,
    recentContents: [
      history({
        status: "RETIRED",
        topicKey: draft.topicKey,
        eventKey: draft.eventKey,
        contentHash: draft.contentHash,
      }),
    ],
  });

  assert.deepEqual(result, {
    action: DUPLICATE_POLICY_ACTIONS.BLOCK,
    reason: DUPLICATE_POLICY_REASONS.EXACT_CONTENT,
    conflictingContentId: 10,
  });
});

test("duplicate policy blocks the same event when an active record exists", () => {
  const result = evaluateDuplicatePolicy({
    draft,
    recentContents: [history({ status: "DRAFT", eventKey: draft.eventKey })],
  });

  assert.deepEqual(result, {
    action: DUPLICATE_POLICY_ACTIONS.BLOCK,
    reason: DUPLICATE_POLICY_REASONS.ACTIVE_EVENT,
    conflictingContentId: 10,
  });
});

test("duplicate policy holds a new event under a recently active topic", () => {
  const result = evaluateDuplicatePolicy({
    draft,
    recentContents: [
      history({
        status: "PUBLISHED",
        topicKey: draft.topicKey,
        eventKey: "made-in-korea:teaser-release",
      }),
    ],
  });

  assert.deepEqual(result, {
    action: DUPLICATE_POLICY_ACTIONS.HOLD,
    reason: DUPLICATE_POLICY_REASONS.RECENT_TOPIC,
    conflictingContentId: 10,
  });
});

test("duplicate policy allows a distinct topic and ignores rejected history", () => {
  const result = evaluateDuplicatePolicy({
    draft,
    recentContents: [
      history({
        status: "REJECTED",
        topicKey: draft.topicKey,
        eventKey: draft.eventKey,
      }),
      history(),
    ],
  });

  assert.deepEqual(result, {
    action: DUPLICATE_POLICY_ACTIONS.ALLOW,
    reason: DUPLICATE_POLICY_REASONS.NO_DUPLICATE,
    conflictingContentId: null,
  });
});

test("duplicate policy prioritizes an exact hash over an earlier topic conflict", () => {
  const result = evaluateDuplicatePolicy({
    draft,
    recentContents: [
      history({ id: 10, topicKey: draft.topicKey }),
      history({ id: 20, contentHash: draft.contentHash }),
    ],
  });

  assert.deepEqual(result, {
    action: DUPLICATE_POLICY_ACTIONS.BLOCK,
    reason: DUPLICATE_POLICY_REASONS.EXACT_CONTENT,
    conflictingContentId: 20,
  });
});
