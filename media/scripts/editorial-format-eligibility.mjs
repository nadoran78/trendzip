import {
  EDITORIAL_EVENT_TYPES,
  EDITORIAL_FORMATS,
} from "./editorial-contract.mjs";
import { parseSeoulLocalDateTime } from "./operations-time.mjs";

const FALLBACK_FORMAT = "KEYWORD_PRIMER";
const RECENT_EVENT_WINDOW_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

export const EDITORIAL_FORMAT_ELIGIBILITY_REASONS = Object.freeze({
  WHY_NOW_REQUIRES_RECENT_EVENT: "WHY_NOW_REQUIRES_RECENT_EVENT",
  PERSON_WORK_RELATION_REQUIRES_LINK: "PERSON_WORK_RELATION_REQUIRES_LINK",
  EVENT_KEYWORD_MAP_REQUIRES_EVENT_AND_RELATED_KEYWORD:
    "EVENT_KEYWORD_MAP_REQUIRES_EVENT_AND_RELATED_KEYWORD",
  CONTEXT_TIMELINE_REQUIRES_DISTINCT_DATES: "CONTEXT_TIMELINE_REQUIRES_DISTINCT_DATES",
  WEEKLY_BUNDLE_REQUIRES_MULTIPLE_TOPICS: "WEEKLY_BUNDLE_REQUIRES_MULTIPLE_TOPICS",
});

function eligible(requestedFormat) {
  return Object.freeze({ eligible: true, resolvedFormat: requestedFormat, reason: null });
}

function fallback(reason) {
  return Object.freeze({ eligible: false, resolvedFormat: FALLBACK_FORMAT, reason });
}

function hasRecentEventTrigger(factCards, generatedAt) {
  let generatedAtDate;
  try {
    generatedAtDate = parseSeoulLocalDateTime(generatedAt);
  } catch {
    return false;
  }

  return factCards.some((factCard) => {
    if (factCard?.evidenceRole !== "EVENT_TRIGGER") return false;
    let publishedAt;
    try {
      publishedAt = parseSeoulLocalDateTime(factCard.publishedAt);
    } catch {
      return false;
    }
    const ageMilliseconds = generatedAtDate.getTime() - publishedAt.getTime();
    return (
      ageMilliseconds >= 0 &&
      ageMilliseconds <= RECENT_EVENT_WINDOW_DAYS * MILLISECONDS_PER_DAY
    );
  });
}

function hasEventTrigger(factCards) {
  return factCards.some((factCard) => factCard?.evidenceRole === "EVENT_TRIGGER");
}

function hasConcreteEvent(eventType) {
  return EDITORIAL_EVENT_TYPES.includes(eventType) && eventType !== "GENERAL_CONTEXT";
}

function hasPersonWorkLink(factCards) {
  return factCards.some((factCard) => factCard?.evidenceRole === "PERSON_WORK_LINK");
}

function countDistinctPublishedDates(factCards) {
  return new Set(
    factCards
      .map((factCard) =>
        typeof factCard?.publishedAt === "string" ? factCard.publishedAt.slice(0, 10) : null,
      )
      .filter(Boolean),
  ).size;
}

export function validateEditorialFormatEligibility({
  requestedFormat,
  eventType,
  factCards,
  relatedKeywords,
  generatedAt,
}) {
  if (!EDITORIAL_FORMATS.includes(requestedFormat)) {
    throw new Error(`Unsupported editorial format: ${requestedFormat}`);
  }
  const facts = Array.isArray(factCards) ? factCards : [];
  const related = Array.isArray(relatedKeywords) ? relatedKeywords : [];

  switch (requestedFormat) {
    case "KEYWORD_PRIMER":
      return eligible(requestedFormat);
    case "WHY_NOW":
      return hasConcreteEvent(eventType) && hasRecentEventTrigger(facts, generatedAt)
        ? eligible(requestedFormat)
        : fallback(EDITORIAL_FORMAT_ELIGIBILITY_REASONS.WHY_NOW_REQUIRES_RECENT_EVENT);
    case "PERSON_WORK_RELATION":
      return hasPersonWorkLink(facts) && related.length > 0
        ? eligible(requestedFormat)
        : fallback(EDITORIAL_FORMAT_ELIGIBILITY_REASONS.PERSON_WORK_RELATION_REQUIRES_LINK);
    case "EVENT_KEYWORD_MAP":
      return hasConcreteEvent(eventType) && hasEventTrigger(facts) && related.length > 0
        ? eligible(requestedFormat)
        : fallback(
            EDITORIAL_FORMAT_ELIGIBILITY_REASONS.EVENT_KEYWORD_MAP_REQUIRES_EVENT_AND_RELATED_KEYWORD,
          );
    case "CONTEXT_TIMELINE":
      return countDistinctPublishedDates(facts) >= 2
        ? eligible(requestedFormat)
        : fallback(EDITORIAL_FORMAT_ELIGIBILITY_REASONS.CONTEXT_TIMELINE_REQUIRES_DISTINCT_DATES);
    case "WEEKLY_BUNDLE":
      return facts.length >= 2 && related.length >= 2
        ? eligible(requestedFormat)
        : fallback(EDITORIAL_FORMAT_ELIGIBILITY_REASONS.WEEKLY_BUNDLE_REQUIRES_MULTIPLE_TOPICS);
    default:
      throw new Error(`Unsupported editorial format: ${requestedFormat}`);
  }
}
