import {
  EDITORIAL_TEXT_LIMITS,
  createCanonicalTopicKey,
} from "./editorial-draft-composer.mjs";

export const EDITORIAL_WRITER_VALIDATION_CODES = Object.freeze({
  CONTRACT_VIOLATION: "EDITORIAL_WRITER_CONTRACT_VIOLATION",
  UNKNOWN_FACT_ID: "EDITORIAL_WRITER_UNKNOWN_FACT_ID",
  FORBIDDEN_CLAIM: "EDITORIAL_WRITER_FORBIDDEN_CLAIM",
  UNSUPPORTED_SENTIMENT: "EDITORIAL_WRITER_UNSUPPORTED_SENTIMENT",
  UNSUPPORTED_NUMBER: "EDITORIAL_WRITER_UNSUPPORTED_NUMBER",
  REPAIR_NO_EFFECT: "EDITORIAL_WRITER_REPAIR_NO_EFFECT",
});

const NARRATION_FIELDS = Object.freeze(["hook", "overview", "reasons", "evidence"]);
const FIXED_CTA = "더 자세한 내용은 트렌드집 프로필 링크에서 확인해 보세요.";
const FORBIDDEN_CLAIM_PATTERN =
  /(?:trendScore|rankDelta|\brank\b|트렌드\s*점수|내부\s*순위|검색\s*순위|검색량|조회수)/iu;
const UNSUPPORTED_GENERATION_REACTION_PATTERN =
  /(?:10대|20대|1020|10\s*[~～-]\s*20대)(?:가|는|에게|들이|사이에서)[^.!?\n]{0,30}(?:인기|열광|주목|반응|관심|화제)/u;
const UNSUPPORTED_SENTIMENT_PATTERN =
  /(?:(?:긍정적|부정적|좋은|나쁜)(?:인)?\s*반응|호평|혹평|극찬|찬사)/u;
const STATIC_ALLOWED_NUMBERS = new Set(["30", "40"]);

export class EditorialWriterValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "EditorialWriterValidationError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function requireObject(value, field) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new EditorialWriterValidationError(
      EDITORIAL_WRITER_VALIDATION_CODES.CONTRACT_VIOLATION,
      `${field} must be an object.`,
      { field },
    );
  }
}

function requireBoundedString(value, field, maximumCharacters) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new EditorialWriterValidationError(
      EDITORIAL_WRITER_VALIDATION_CODES.CONTRACT_VIOLATION,
      `${field} must be a non-empty string.`,
      { field },
    );
  }
  const length = Array.from(value.trim()).length;
  if (length > maximumCharacters) {
    throw new EditorialWriterValidationError(
      EDITORIAL_WRITER_VALIDATION_CODES.CONTRACT_VIOLATION,
      `${field} must be at most ${maximumCharacters} characters.`,
      { field, maximumCharacters, actualCharacters: length },
    );
  }
  return value.trim();
}

function requireFactIds(factIds, field, allowedFactIds) {
  if (!Array.isArray(factIds) || factIds.length === 0) {
    throw new EditorialWriterValidationError(
      EDITORIAL_WRITER_VALIDATION_CODES.CONTRACT_VIOLATION,
      `${field} must contain at least one fact ID.`,
      { field },
    );
  }
  const normalized = [...new Set(factIds)];
  const invalidValues = normalized.filter(
    (factId) => typeof factId !== "string" || !allowedFactIds.has(factId),
  );
  if (invalidValues.length > 0) {
    throw new EditorialWriterValidationError(
      EDITORIAL_WRITER_VALIDATION_CODES.UNKNOWN_FACT_ID,
      `${field} contains an unknown fact ID.`,
      { field, invalidValues, allowedValues: [...allowedFactIds] },
    );
  }
  return normalized;
}

function textEntries(writerDraft) {
  return [
    ["audienceAngle", writerDraft.audienceAngle],
    ["selectionReason", writerDraft.selectionReason],
    ["title", writerDraft.title],
    ["hook", writerDraft.hook],
    ["summary", writerDraft.summary],
    ...writerDraft.reasons.map((reason, index) => [`reasons[${index}].text`, reason.text]),
    ...NARRATION_FIELDS.map((field) => [
      `narration.${field}.text`,
      writerDraft.narration[field].text,
    ]),
  ];
}

function extractNumbers(value) {
  return (value.match(/\d+(?:[.,]\d+)*/gu) ?? []).map((number) => {
    const parsed = Number(number.replaceAll(",", ""));
    return Number.isFinite(parsed) ? String(parsed) : number;
  });
}

function validateClaims(writerDraft, brief) {
  const supportedNumbers = new Set([
    ...STATIC_ALLOWED_NUMBERS,
    ...extractNumbers(JSON.stringify({
      facts: brief.facts,
      allowedEntities: brief.allowedEntities,
      generatedAt: brief.generatedAt,
    })),
  ]);

  for (const [field, value] of textEntries(writerDraft)) {
    if (FORBIDDEN_CLAIM_PATTERN.test(value) || UNSUPPORTED_GENERATION_REACTION_PATTERN.test(value)) {
      throw new EditorialWriterValidationError(
        EDITORIAL_WRITER_VALIDATION_CODES.FORBIDDEN_CLAIM,
        `${field} contains a prohibited or unsupported claim.`,
        { field, value },
      );
    }
    if (UNSUPPORTED_SENTIMENT_PATTERN.test(value)) {
      throw new EditorialWriterValidationError(
        EDITORIAL_WRITER_VALIDATION_CODES.UNSUPPORTED_SENTIMENT,
        `${field} contains an unsupported sentiment claim.`,
        { field, value },
      );
    }
    const unsupportedNumbers = extractNumbers(value).filter(
      (number) => !supportedNumbers.has(number),
    );
    if (unsupportedNumbers.length > 0) {
      throw new EditorialWriterValidationError(
        EDITORIAL_WRITER_VALIDATION_CODES.UNSUPPORTED_NUMBER,
        `${field} contains a number absent from the verified brief.`,
        { field, invalidValues: [...new Set(unsupportedNumbers)], allowedValues: [...supportedNumbers] },
      );
    }
  }
}

function evidenceClaimsFrom(reasons, factsById) {
  return reasons.flatMap((reason, reasonIndex) =>
    reason.factIds.map((factId) => {
      const fact = factsById.get(factId);
      return {
        reasonIndex,
        statement: reason.text,
        factId,
        evidenceVideoId: fact.videoId,
        sourceExcerpt: fact.sourceExcerpt,
      };
    }),
  );
}

export function validateEditorialWriterDraft(writerDraft, brief) {
  requireObject(writerDraft, "editorialWriterDraft");
  requireObject(brief, "editorialBrief");
  const factsById = new Map(brief.facts.map((fact) => [fact.factId, fact]));
  const allowedFactIds = new Set(factsById.keys());

  const audienceAngle = requireBoundedString(writerDraft.audienceAngle, "audienceAngle", 500);
  const selectionReason = requireBoundedString(
    writerDraft.selectionReason,
    "selectionReason",
    2_000,
  );
  const title = requireBoundedString(writerDraft.title, "title", EDITORIAL_TEXT_LIMITS.title);
  const hook = requireBoundedString(writerDraft.hook, "hook", EDITORIAL_TEXT_LIMITS.hook);
  const summary = requireBoundedString(
    writerDraft.summary,
    "summary",
    EDITORIAL_TEXT_LIMITS.summary,
  );

  if (!Array.isArray(writerDraft.reasons) || writerDraft.reasons.length < 2 || writerDraft.reasons.length > 3) {
    throw new EditorialWriterValidationError(
      EDITORIAL_WRITER_VALIDATION_CODES.CONTRACT_VIOLATION,
      "reasons must contain between 2 and 3 items.",
      { field: "reasons" },
    );
  }
  const reasons = writerDraft.reasons.map((reason, index) => {
    requireObject(reason, `reasons[${index}]`);
    return {
      text: requireBoundedString(
        reason.text,
        `reasons[${index}].text`,
        EDITORIAL_TEXT_LIMITS.reason,
      ),
      factIds: requireFactIds(reason.factIds, `reasons[${index}].factIds`, allowedFactIds),
    };
  });

  requireObject(writerDraft.narration, "narration");
  const narration = Object.fromEntries(
    NARRATION_FIELDS.map((field) => {
      const section = writerDraft.narration[field];
      requireObject(section, `narration.${field}`);
      return [
        field,
        {
          text: requireBoundedString(
            section.text,
            `narration.${field}.text`,
            EDITORIAL_TEXT_LIMITS.narration,
          ),
          factIds: requireFactIds(
            section.factIds,
            `narration.${field}.factIds`,
            allowedFactIds,
          ),
        },
      ];
    }),
  );

  const normalizedDraft = {
    audienceAngle,
    selectionReason,
    title,
    hook,
    summary,
    reasons,
    narration,
  };
  validateClaims(normalizedDraft, brief);

  return Object.freeze({
    primaryKeywordId: brief.keywordId,
    editorialFormat: brief.editorialFormat,
    topicKey: createCanonicalTopicKey(brief.keyword),
    audienceAngle,
    selectionReason,
    title,
    relatedKeywordIds: brief.relatedKeywords.map((keyword) => keyword.keywordId),
    hook,
    summary,
    reasons: reasons.map((reason) => reason.text),
    narration: {
      hook: narration.hook.text,
      overview: narration.overview.text,
      reasons: narration.reasons.text,
      evidence: narration.evidence.text,
      cta: FIXED_CTA,
    },
    evidenceClaims: evidenceClaimsFrom(reasons, factsById),
  });
}

export function shouldRepairEditorialWriterDraft(error) {
  return (
    error instanceof EditorialWriterValidationError &&
    error.code !== EDITORIAL_WRITER_VALIDATION_CODES.REPAIR_NO_EFFECT
  );
}
