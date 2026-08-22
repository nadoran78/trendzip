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
    audienceAngle: { type: "string" },
    selectionReason: { type: "string" },
    title: { type: "string" },
    relatedKeywordIds: {
      type: "array",
      maxItems: 10,
      items: { type: "integer" },
    },
    hook: { type: "string" },
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
    },
  },
});

function requireString(value, name, maxLength) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  if (value.length > maxLength) {
    throw new Error(`${name} must be at most ${maxLength} characters.`);
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

export function buildEditorialPlanPrompt({ candidates, recentContents, generatedAt }) {
  return [
    "너는 Trendzip의 한국 트렌드 숏폼 편집자다.",
    "주어진 운영 키워드 후보 중 하나를 골라 30~40대가 이해하기 쉬운 정보형 숏폼 초안을 설계한다.",
    "입력에 없는 사실, 키워드 ID, 영상 ID를 만들지 않는다.",
    "게임·리뷰·플랫폼명처럼 범용적인 표현보다 작품명, 인물, 그룹, 이벤트처럼 구체적인 주제를 우선한다.",
    "최근 제작 이력과 같은 eventKey는 피하고, 같은 topicKey는 새로운 사건이 명확할 때만 선택한다.",
    "topicKey는 영문 소문자 kebab-case, eventKey는 topicKey:event-slug 형식으로 작성한다.",
    "relatedKeywordIds는 선택한 후보의 relatedKeywords에 포함된 ID만 사용한다.",
    "evidenceVideoIds는 선택한 후보의 relatedVideos에 포함된 ID만 사용한다.",
    "narration은 hook, overview, reasons, evidence, cta 장면을 모두 작성하고 과장된 단정을 피한다.",
    "CTA는 Trendzip 프로필 링크에서 더 확인하라는 의미로 작성한다.",
    "응답은 지정된 JSON 구조만 반환한다.",
    "",
    `생성 기준 시각: ${generatedAt}`,
    `운영 후보: ${JSON.stringify(candidates.map(toPromptCandidate))}`,
    `최근 제작 이력: ${JSON.stringify(recentContents.map(toPromptHistory))}`,
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
  requireString(plan.hook, "editorialPlan.hook", 48);
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
    throw new Error("editorialPlan.relatedKeywordIds contains an unknown keyword ID.");
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
    throw new Error("editorialPlan.evidenceVideoIds contains an unknown video ID.");
  }

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

export function createGeminiEditorialPlanner({
  apiKey,
  baseUrl,
  model,
  timeoutMs = 15_000,
  fetchImpl = globalThis.fetch,
}) {
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("GEMINI_API_KEY is required to create an editorial plan.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  return Object.freeze({
    async createPlan({ candidates, recentContents, generatedAt }) {
      if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new Error("At least one operational candidate is required.");
      }

      const response = await fetchImpl(`${baseUrl}/models/${model}:generateContent`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildEditorialPlanPrompt({ candidates, recentContents, generatedAt }) }],
            },
          ],
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
      let plan;
      try {
        plan = JSON.parse(text);
      } catch {
        throw new Error("Gemini editorial response text is not valid JSON.");
      }
      return validateEditorialPlan(plan, candidates);
    },
  });
}
