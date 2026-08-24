import {
  EDITORIAL_PLAN_VALIDATION_CODES,
  EditorialPlanValidationError,
  shouldRepairEditorialPlan,
} from "./editorial-plan-validation.mjs";

export const EDITORIAL_FORMATS = Object.freeze([
  "WHY_NOW",
  "KEYWORD_PRIMER",
  "PERSON_WORK_RELATION",
  "EVENT_KEYWORD_MAP",
  "CONTEXT_TIMELINE",
  "WEEKLY_BUNDLE",
]);

const NARRATION_SCENE_IDS = Object.freeze(["hook", "overview", "reasons", "evidence", "cta"]);
const TOPIC_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EVENT_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?::[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
const DEFAULT_REPAIR_DELAY_MS = 3_500;
const EDITORIAL_HOOK_TARGET_CHARACTERS = 40;
const EDITORIAL_HOOK_MAX_CHARACTERS = 48;
const SOURCE_REQUIRED_CLAIMS = Object.freeze([
  { label: "차트", pattern: /차트/iu },
  { label: "역주행", pattern: /역주행/iu },
  { label: "SNS", pattern: /(?:\bSNS\b|소셜\s*미디어)/iu },
  { label: "챌린지", pattern: /챌린지/iu },
  { label: "전 세대", pattern: /(?:전\s*세대|모든\s*세대)/iu },
  { label: "열풍", pattern: /열풍/iu },
  {
    label: "세대별 추억·향수",
    pattern:
      /(?:(?:10|20|30|40)대|3040|세대).{0,20}(?:추억|향수)|(?:추억|향수).{0,20}(?:(?:10|20|30|40)대|3040|세대)/iu,
  },
]);
const OVERSTATED_TONE_PATTERNS = Object.freeze([
  { label: "난리", pattern: /난리/iu },
  { label: "점령", pattern: /점령/iu },
  { label: "폭발적", pattern: /폭발적/iu },
  { label: "완벽하게 저격", pattern: /완벽(?:하게|히)?[^.!?\n]{0,16}저격/iu },
  { label: "역대급", pattern: /역대급/iu },
  { label: "필수 시청·관람", pattern: /필수\s*(?:시청|관람|확인)/iu },
]);
const TREND_CONTEXT_PATTERN =
  "(?:관심|화제|유행|인기|주목|검색|확산|반응|순위|트렌드|소비|열광)";

function createGenerationClaimPattern(generationPattern) {
  return new RegExp(
    `(?:(?:${generationPattern}).{0,32}${TREND_CONTEXT_PATTERN}|${TREND_CONTEXT_PATTERN}.{0,32}(?:${generationPattern}))`,
    "iu",
  );
}

const GENERATION_CLAIM_DEFINITIONS = Object.freeze([
  {
    label: "10대",
    generation: "TEEN",
    pattern: createGenerationClaimPattern("(?:10\\s*대|십\\s*대)"),
  },
  {
    label: "20대",
    generation: "TWENTY",
    pattern: createGenerationClaimPattern("20\\s*대"),
  },
  {
    label: "30대",
    generation: null,
    pattern: createGenerationClaimPattern("30\\s*대"),
  },
  {
    label: "40대",
    generation: null,
    pattern: createGenerationClaimPattern("40\\s*대"),
  },
  {
    label: "2030 세대",
    generation: null,
    pattern: createGenerationClaimPattern("2030\\s*(?:세대|층)?"),
  },
  {
    label: "3040 세대",
    generation: null,
    pattern: createGenerationClaimPattern("3040\\s*(?:세대|층)?"),
  },
  {
    label: "전 세대",
    generation: null,
    pattern: createGenerationClaimPattern("(?:전|모든)\\s*세대"),
  },
]);

const EDITORIAL_PLAN_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "primaryKeywordId",
    "editorialFormat",
    "topicKey",
    "eventKey",
    "audienceAngle",
    "selectionReason",
    "title",
    "relatedKeywordIds",
    "hook",
    "summary",
    "reasons",
    "narration",
    "evidenceVideoIds",
  ],
  properties: {
    primaryKeywordId: { type: "integer" },
    editorialFormat: { type: "string", enum: EDITORIAL_FORMATS },
    topicKey: { type: "string" },
    eventKey: { type: "string" },
    audienceAngle: {
      type: "string",
      description:
        "입력 근거에 확인되는 사실만 사용한 30~40대 대상 설명 관점. 30~40대는 설명 대상이며 트렌드 관측 세대가 아니다.",
    },
    selectionReason: {
      type: "string",
      description: "후보 explain과 관련 영상 메타데이터에서 확인되는 선정 이유.",
    },
    title: {
      type: "string",
      description: "과장·선동 표현을 피한 중립적인 정보형 제목.",
    },
    relatedKeywordIds: {
      type: "array",
      maxItems: 10,
      items: { type: "integer" },
    },
    hook: {
      type: "string",
      description: `영상 첫 화면에 표시할 중립적인 한국어 훅. 공백 포함 ${EDITORIAL_HOOK_TARGET_CHARACTERS}자 이하를 목표로 하고 ${EDITORIAL_HOOK_MAX_CHARACTERS}자를 초과하지 않는다.`,
    },
    summary: { type: "string" },
    reasons: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { type: "string" },
    },
    narration: {
      type: "object",
      additionalProperties: false,
      required: NARRATION_SCENE_IDS,
      properties: Object.fromEntries(NARRATION_SCENE_IDS.map((sceneId) => [sceneId, { type: "string" }])),
    },
    evidenceVideoIds: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" },
      description: "선택한 사건을 직접 뒷받침하는 최소한의 관련 영상 ID. 일반적인 인물 출연 영상은 제외한다.",
    },
  },
});

function requireString(value, name, maxLength) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  const characterCount = Array.from(value).length;
  if (characterCount > maxLength) {
    throw new Error(
      `${name} must be at most ${maxLength} characters (received ${characterCount}).`,
    );
  }
}

function requireEditorialHook(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("editorialPlan.hook must be a non-empty string.");
  }

  const characterCount = Array.from(value).length;
  if (characterCount > EDITORIAL_HOOK_MAX_CHARACTERS) {
    throw new EditorialPlanValidationError(
      EDITORIAL_PLAN_VALIDATION_CODES.HOOK_TOO_LONG,
      `editorialPlan.hook must be at most ${EDITORIAL_HOOK_MAX_CHARACTERS} characters (received ${characterCount}).`,
      {
        field: "hook",
        targetCharacters: EDITORIAL_HOOK_TARGET_CHARACTERS,
        maximumCharacters: EDITORIAL_HOOK_MAX_CHARACTERS,
        receivedCharacters: characterCount,
      },
    );
  }
}

function requireUniqueArray(value, name, { minimum = 0, maximum }) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new Error(`${name} must contain between ${minimum} and ${maximum} items.`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`${name} must not contain duplicates.`);
  }
}

function toPromptCandidate(candidate) {
  return {
    keywordId: candidate.keywordId,
    keyword: candidate.keyword,
    generation: candidate.generation,
    category: candidate.category,
    rank: candidate.rank,
    trendScore: candidate.trendScore,
    rankTrend: candidate.rankTrend,
    rankDelta: candidate.rankDelta,
    explain: candidate.explain,
    sourceCrawlRunId: candidate.sourceCrawlRunId,
    snapshotAt: candidate.snapshotAt,
    relatedKeywords: candidate.relatedKeywords.map(({ id, word, rank, category }) => ({
      id,
      word,
      rank,
      category,
    })),
    relatedVideos: candidate.relatedVideos.map(
      ({ videoId, title, channelName, viewCount, publishedAt }) => ({
        videoId,
        title,
        channelName,
        viewCount,
        publishedAt,
      }),
    ),
  };
}

function toPromptHistory(content) {
  return {
    id: content.id,
    status: content.status,
    primaryKeywordWord: content.primaryKeywordWord,
    editorialFormat: content.editorialFormat,
    topicKey: content.topicKey,
    eventKey: content.eventKey,
    audienceAngle: content.audienceAngle,
    title: content.title,
    selectedAt: content.selectedAt,
    publishedAt: content.publishedAt,
  };
}

function collectPlanText(plan) {
  return [
    plan.audienceAngle,
    plan.selectionReason,
    plan.title,
    plan.hook,
    plan.summary,
    ...plan.reasons,
    ...NARRATION_SCENE_IDS.map((sceneId) => plan.narration[sceneId]),
  ].join("\n");
}

function collectCandidateSourceText(candidate) {
  return [
    candidate.keyword,
    candidate.explain,
    ...candidate.relatedKeywords.map((keyword) => keyword.word),
    ...candidate.relatedVideos.flatMap((video) => [video.title, video.channelName]),
  ]
    .filter((value) => typeof value === "string")
    .join("\n");
}

function normalizeKeywordWord(word) {
  return word.trim().toLocaleLowerCase("ko-KR");
}

function collectObservedGenerations(candidates, selectedCandidate) {
  const selectedWord = normalizeKeywordWord(selectedCandidate.keyword);
  return new Set(
    candidates
      .filter((candidate) => normalizeKeywordWord(candidate.keyword) === selectedWord)
      .map((candidate) => candidate.generation),
  );
}

function validateObservedGenerationClaims(plan, candidates, selectedCandidate) {
  const planText = collectPlanText(plan);
  const observedGenerations = collectObservedGenerations(candidates, selectedCandidate);
  const unsupportedClaims = GENERATION_CLAIM_DEFINITIONS.filter(
    ({ generation, pattern }) =>
      pattern.test(planText) && (generation === null || !observedGenerations.has(generation)),
  ).map(({ label }) => label);

  if (unsupportedClaims.length > 0) {
    throw new EditorialPlanValidationError(
      EDITORIAL_PLAN_VALIDATION_CODES.UNSUPPORTED_GENERATION_CLAIM,
      `editorialPlan contains generation claims outside the observed candidates: ${unsupportedClaims.join(", ")}.`,
      {
        claims: unsupportedClaims,
        observedGenerations: [...observedGenerations],
      },
    );
  }
}

function validateGroundedLanguage(plan, selectedCandidate) {
  const planText = collectPlanText(plan);
  const sourceText = collectCandidateSourceText(selectedCandidate);
  const unsupportedClaims = SOURCE_REQUIRED_CLAIMS.filter(
    ({ pattern }) => pattern.test(planText) && !pattern.test(sourceText),
  ).map(({ label }) => label);
  if (unsupportedClaims.length > 0) {
    throw new EditorialPlanValidationError(
      EDITORIAL_PLAN_VALIDATION_CODES.UNSUPPORTED_CLAIM,
      `editorialPlan contains claims that are not present in the candidate evidence: ${unsupportedClaims.join(", ")}.`,
      { claims: unsupportedClaims },
    );
  }

  const overstatedTerms = OVERSTATED_TONE_PATTERNS.filter(({ pattern }) => pattern.test(planText)).map(
    ({ label }) => label,
  );
  if (overstatedTerms.length > 0) {
    throw new EditorialPlanValidationError(
      EDITORIAL_PLAN_VALIDATION_CODES.OVERSTATED_TONE,
      `editorialPlan contains overstated language: ${overstatedTerms.join(", ")}.`,
      { terms: overstatedTerms },
    );
  }
}

export function buildEditorialPlanPrompt({ candidates, recentContents, generatedAt }) {
  return [
    "너는 Trendzip의 한국 트렌드 숏폼 편집자다.",
    "주어진 운영 키워드 후보 중 하나를 골라 30~40대가 이해하기 쉬운 정보형 숏폼 초안을 설계한다.",
    "입력에 없는 사실, 키워드 ID, 영상 ID를 만들지 않는다.",
    "후보 explain과 관련 영상의 제목·채널·조회수·게시 시각에 명시된 사실만 사용한다.",
    "30~40대는 설명을 읽는 대상일 뿐 트렌드 관측 세대가 아니다.",
    "관심·화제·인기·순위의 주체는 선택 키워드가 실제 후보로 존재하는 TEEN 또는 TWENTY 세대만 사용한다.",
    "차트, 역주행, SNS, 챌린지, 전 세대 반응, 특정 세대의 추억·향수는 입력 근거에 같은 내용이 있을 때만 사용한다.",
    "난리, 점령, 폭발적, 완벽하게 저격, 역대급, 필수 시청 같은 과장·선동 표현을 사용하지 않는다.",
    "게임·리뷰·플랫폼명처럼 범용적인 표현보다 작품명, 인물, 그룹, 이벤트처럼 구체적인 주제를 우선한다.",
    "최근 제작 이력과 같은 eventKey는 피하고, 같은 topicKey는 새로운 사건이 명확할 때만 선택한다.",
    "topicKey는 영문 소문자 kebab-case, eventKey는 topicKey:event-slug 형식으로 작성한다.",
    "relatedKeywordIds는 선택한 후보의 relatedKeywords에 포함된 ID만 사용한다.",
    "evidenceVideoIds는 선택한 사건을 직접 뒷받침하는 최소한의 relatedVideos ID만 사용하고, 단순 인물 출연 영상은 제외한다.",
    `hook은 영상 첫 화면에 표시할 한 문장으로 공백 포함 ${EDITORIAL_HOOK_TARGET_CHARACTERS}자 이하를 목표로 하며, ${EDITORIAL_HOOK_MAX_CHARACTERS}자를 절대 초과하지 않는다.`,
    "narration은 hook, overview, reasons, evidence, cta 장면을 모두 작성하고 과장된 단정을 피한다.",
    "CTA는 Trendzip 프로필 링크에서 더 확인하라는 의미로 작성한다.",
    "응답은 지정된 JSON 구조만 반환한다.",
    "",
    `생성 기준 시각: ${generatedAt}`,
    `운영 후보: ${JSON.stringify(candidates.map(toPromptCandidate))}`,
    `최근 제작 이력: ${JSON.stringify(recentContents.map(toPromptHistory))}`,
  ].join("\n");
}

export function buildEditorialPlanRepairPrompt(error) {
  const mutableReferenceField =
    error.code === EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_RELATED_KEYWORD_ID
      ? "relatedKeywordIds"
      : error.code === EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_EVIDENCE_VIDEO_ID
        ? "evidenceVideoIds"
        : null;
  const immutableFields = [
    "primaryKeywordId",
    "editorialFormat",
    "topicKey",
    "eventKey",
    "relatedKeywordIds",
    "evidenceVideoIds",
  ].filter((field) => field !== mutableReferenceField);

  return [
    "직전 JSON 편집 계획이 Trendzip 편집 계약을 위반했다.",
    `검증 오류 코드: ${error.code}`,
    `검증 오류 메시지: ${error.message}`,
    `검증 오류 상세: ${JSON.stringify(error.details)}`,
    `${immutableFields.join(", ")}는 변경하지 않는다.`,
    ...(mutableReferenceField
      ? [
          `${mutableReferenceField}만 검증 오류 상세의 allowedValues 안에서 다시 선택한다.`,
        ]
      : []),
    "입력 근거와 검증 오류를 다시 확인하고 문제가 된 필드만 최소한으로 수정한다.",
    "수정한 전체 편집 계획을 지정된 JSON 구조로 다시 반환한다.",
  ].join("\n");
}

function extractResponseText(payload) {
  const candidate = payload?.candidates?.[0];
  if (!candidate) throw new Error("Gemini editorial response did not contain a candidate.");
  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Gemini editorial response was not completed. finishReason=${candidate.finishReason}`);
  }

  const text = candidate.content?.parts
    ?.map((part) => part?.text?.trim())
    .filter(Boolean)
    .join("\n");
  if (!text) throw new Error("Gemini editorial response did not contain text.");
  return text;
}

function validateEditorialPlan(plan, candidates) {
  if (typeof plan !== "object" || plan === null || Array.isArray(plan)) {
    throw new Error("Gemini editorial plan must be an object.");
  }

  const selectedCandidate = candidates.find(
    (candidate) => candidate.keywordId === plan.primaryKeywordId,
  );
  if (!selectedCandidate) {
    throw new Error("Gemini editorial plan primaryKeywordId is not an operational candidate.");
  }
  if (!EDITORIAL_FORMATS.includes(plan.editorialFormat)) {
    throw new Error("Gemini editorial plan editorialFormat is not supported.");
  }
  requireString(plan.topicKey, "editorialPlan.topicKey", 200);
  requireString(plan.eventKey, "editorialPlan.eventKey", 200);
  if (!TOPIC_KEY_PATTERN.test(plan.topicKey)) {
    throw new Error("editorialPlan.topicKey must use lowercase kebab-case.");
  }
  if (!EVENT_KEY_PATTERN.test(plan.eventKey) || !plan.eventKey.startsWith(`${plan.topicKey}:`)) {
    throw new Error("editorialPlan.eventKey must start with topicKey and use colon-separated slugs.");
  }
  requireString(plan.audienceAngle, "editorialPlan.audienceAngle", 500);
  requireString(plan.selectionReason, "editorialPlan.selectionReason", 2_000);
  requireString(plan.title, "editorialPlan.title", 100);
  requireEditorialHook(plan.hook);
  requireString(plan.summary, "editorialPlan.summary", 100);

  requireUniqueArray(plan.relatedKeywordIds, "editorialPlan.relatedKeywordIds", { maximum: 10 });
  const allowedRelatedKeywordIds = new Set(
    selectedCandidate.relatedKeywords.map((keyword) => keyword.id),
  );
  if (
    plan.relatedKeywordIds.some(
      (keywordId) => !Number.isInteger(keywordId) || !allowedRelatedKeywordIds.has(keywordId),
    )
  ) {
    const invalidValues = plan.relatedKeywordIds.filter(
      (keywordId) => !Number.isInteger(keywordId) || !allowedRelatedKeywordIds.has(keywordId),
    );
    throw new EditorialPlanValidationError(
      EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_RELATED_KEYWORD_ID,
      "editorialPlan.relatedKeywordIds contains an unknown keyword ID.",
      {
        field: "relatedKeywordIds",
        primaryKeywordId: selectedCandidate.keywordId,
        invalidValues,
        allowedValues: [...allowedRelatedKeywordIds],
      },
    );
  }

  requireUniqueArray(plan.reasons, "editorialPlan.reasons", { minimum: 2, maximum: 2 });
  plan.reasons.forEach((reason, index) =>
    requireString(reason, `editorialPlan.reasons[${index}]`, 100),
  );
  if (typeof plan.narration !== "object" || plan.narration === null) {
    throw new Error("editorialPlan.narration must be an object.");
  }
  const narrationKeys = Object.keys(plan.narration).sort();
  const expectedNarrationKeys = [...NARRATION_SCENE_IDS].sort();
  if (
    narrationKeys.length !== expectedNarrationKeys.length ||
    narrationKeys.some((key, index) => key !== expectedNarrationKeys[index])
  ) {
    throw new Error(`editorialPlan.narration must contain exactly: ${NARRATION_SCENE_IDS.join(", ")}.`);
  }
  NARRATION_SCENE_IDS.forEach((sceneId) =>
    requireString(plan.narration[sceneId], `editorialPlan.narration.${sceneId}`, 320),
  );

  requireUniqueArray(plan.evidenceVideoIds, "editorialPlan.evidenceVideoIds", {
    minimum: 1,
    maximum: 3,
  });
  const allowedVideoIds = new Set(selectedCandidate.relatedVideos.map((video) => video.videoId));
  if (plan.evidenceVideoIds.some((videoId) => !allowedVideoIds.has(videoId))) {
    const invalidValues = plan.evidenceVideoIds.filter((videoId) => !allowedVideoIds.has(videoId));
    throw new EditorialPlanValidationError(
      EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_EVIDENCE_VIDEO_ID,
      "editorialPlan.evidenceVideoIds contains an unknown video ID.",
      {
        field: "evidenceVideoIds",
        primaryKeywordId: selectedCandidate.keywordId,
        invalidValues,
        allowedValues: [...allowedVideoIds],
      },
    );
  }

  validateObservedGenerationClaims(plan, candidates, selectedCandidate);
  validateGroundedLanguage(plan, selectedCandidate);

  return { plan, selectedCandidate };
}

async function createHttpError(response) {
  let message;
  try {
    const payload = await response.json();
    message = payload?.error?.message;
  } catch {
    // Preserve the status-only diagnostic when Gemini does not return JSON.
  }
  return new Error(
    `Gemini editorial request failed with HTTP ${response.status}${message ? `: ${message}` : "."}`,
  );
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function withGenerationAttemptCount(error, generationAttemptCount) {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  normalizedError.generationAttemptCount = generationAttemptCount;
  return normalizedError;
}

export function createGeminiEditorialPlanner({
  apiKey,
  baseUrl,
  model,
  timeoutMs = 15_000,
  repairDelayMs = DEFAULT_REPAIR_DELAY_MS,
  fetchImpl = globalThis.fetch,
  sleepImpl = defaultSleep,
}) {
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("GEMINI_API_KEY is required to create an editorial plan.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }
  if (!Number.isInteger(repairDelayMs) || repairDelayMs < 0) {
    throw new Error("repairDelayMs must be a non-negative integer.");
  }
  if (typeof sleepImpl !== "function") {
    throw new Error("A sleep implementation is required.");
  }

  async function requestPlan(contents) {
    const response = await fetchImpl(`${baseUrl}/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2_048,
          thinkingConfig: { thinkingLevel: "MINIMAL" },
          responseMimeType: "application/json",
          responseJsonSchema: EDITORIAL_PLAN_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) throw await createHttpError(response);

    const text = extractResponseText(await response.json());
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Gemini editorial response text is not valid JSON.");
    }
  }

  return Object.freeze({
    async createPlan({ candidates, recentContents, generatedAt }) {
      if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new Error("At least one operational candidate is required.");
      }

      const prompt = buildEditorialPlanPrompt({ candidates, recentContents, generatedAt });
      let plan;
      try {
        plan = await requestPlan([{ role: "user", parts: [{ text: prompt }] }]);
      } catch (error) {
        throw withGenerationAttemptCount(error, 1);
      }

      let repairableError;
      try {
        return { ...validateEditorialPlan(plan, candidates), generationAttemptCount: 1 };
      } catch (error) {
        if (!shouldRepairEditorialPlan(error)) {
          throw withGenerationAttemptCount(error, 1);
        }
        repairableError = error;
      }

      if (repairDelayMs > 0) {
        await sleepImpl(repairDelayMs);
      }

      let repairedPlan;
      try {
        repairedPlan = await requestPlan([
          { role: "user", parts: [{ text: prompt }] },
          { role: "model", parts: [{ text: JSON.stringify(plan) }] },
          {
            role: "user",
            parts: [{ text: buildEditorialPlanRepairPrompt(repairableError) }],
          },
        ]);
      } catch (error) {
        throw withGenerationAttemptCount(error, 2);
      }

      try {
        return { ...validateEditorialPlan(repairedPlan, candidates), generationAttemptCount: 2 };
      } catch (error) {
        throw withGenerationAttemptCount(error, 2);
      }
    },
  });
}
