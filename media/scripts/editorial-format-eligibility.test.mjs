import assert from "node:assert/strict";
import test from "node:test";

import {
  EDITORIAL_FORMAT_ELIGIBILITY_REASONS,
  validateEditorialFormatEligibility,
} from "./editorial-format-eligibility.mjs";

const generatedAt = "2026-08-26T15:00:00";
const recentEventFact = {
  factId: "fact-1",
  evidenceRole: "EVENT_TRIGGER",
  publishedAt: "2026-08-20T12:00:00",
};

function validate(overrides) {
  return validateEditorialFormatEligibility({
    requestedFormat: "KEYWORD_PRIMER",
    eventType: "GENERAL_CONTEXT",
    factCards: [],
    relatedKeywords: [],
    generatedAt,
    ...overrides,
  });
}

test("KEYWORD_PRIMER is eligible without an event", () => {
  assert.deepEqual(validate({}), {
    eligible: true,
    resolvedFormat: "KEYWORD_PRIMER",
    reason: null,
  });
});

test("WHY_NOW requires a recent event trigger", () => {
  assert.deepEqual(
    validate({
      requestedFormat: "WHY_NOW",
      eventType: "TRAILER_RELEASE",
      factCards: [recentEventFact],
    }),
    { eligible: true, resolvedFormat: "WHY_NOW", reason: null },
  );
  assert.deepEqual(
    validate({
      requestedFormat: "WHY_NOW",
      eventType: "GENERAL_CONTEXT",
      factCards: [{ ...recentEventFact, publishedAt: "2026-07-01T12:00:00" }],
    }),
    {
      eligible: false,
      resolvedFormat: "KEYWORD_PRIMER",
      reason: EDITORIAL_FORMAT_ELIGIBILITY_REASONS.WHY_NOW_REQUIRES_RECENT_EVENT,
    },
  );
});

test("PERSON_WORK_RELATION requires a linked fact and related keyword", () => {
  assert.equal(
    validate({
      requestedFormat: "PERSON_WORK_RELATION",
      factCards: [{ ...recentEventFact, evidenceRole: "PERSON_WORK_LINK" }],
      relatedKeywords: [{ keywordId: 2, keywordWord: "배우" }],
    }).eligible,
    true,
  );
  assert.equal(
    validate({ requestedFormat: "PERSON_WORK_RELATION" }).reason,
    EDITORIAL_FORMAT_ELIGIBILITY_REASONS.PERSON_WORK_RELATION_REQUIRES_LINK,
  );
});

test("EVENT_KEYWORD_MAP requires a concrete event and related keyword", () => {
  assert.equal(
    validate({
      requestedFormat: "EVENT_KEYWORD_MAP",
      eventType: "TRAILER_RELEASE",
      factCards: [recentEventFact],
      relatedKeywords: [{ keywordId: 2, keywordWord: "출연 배우" }],
    }).eligible,
    true,
  );
  assert.equal(
    validate({ requestedFormat: "EVENT_KEYWORD_MAP" }).reason,
    EDITORIAL_FORMAT_ELIGIBILITY_REASONS.EVENT_KEYWORD_MAP_REQUIRES_EVENT_AND_RELATED_KEYWORD,
  );
});

test("CONTEXT_TIMELINE requires facts from two distinct dates", () => {
  assert.equal(
    validate({
      requestedFormat: "CONTEXT_TIMELINE",
      factCards: [
        recentEventFact,
        { ...recentEventFact, factId: "fact-2", publishedAt: "2026-08-21T12:00:00" },
      ],
    }).eligible,
    true,
  );
  assert.equal(
    validate({ requestedFormat: "CONTEXT_TIMELINE", factCards: [recentEventFact] }).reason,
    EDITORIAL_FORMAT_ELIGIBILITY_REASONS.CONTEXT_TIMELINE_REQUIRES_DISTINCT_DATES,
  );
});

test("WEEKLY_BUNDLE requires multiple facts and related topics", () => {
  assert.equal(
    validate({
      requestedFormat: "WEEKLY_BUNDLE",
      factCards: [recentEventFact, { ...recentEventFact, factId: "fact-2" }],
      relatedKeywords: [
        { keywordId: 2, keywordWord: "주제 A" },
        { keywordId: 3, keywordWord: "주제 B" },
      ],
    }).eligible,
    true,
  );
  assert.equal(
    validate({ requestedFormat: "WEEKLY_BUNDLE", factCards: [recentEventFact] }).reason,
    EDITORIAL_FORMAT_ELIGIBILITY_REASONS.WEEKLY_BUNDLE_REQUIRES_MULTIPLE_TOPICS,
  );
});
