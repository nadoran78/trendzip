import { composeEditorialDraft } from "./editorial-draft-composer.mjs";
import {
  EDITORIAL_EVENT_TYPES,
  EDITORIAL_FORMATS,
  EVIDENCE_ROLES,
  EVIDENCE_SOURCE_FIELDS,
} from "./editorial-contract.mjs";
import { createEvidenceFactCards } from "./editorial-fact-card.mjs";
import {
  EDITORIAL_PLAN_VALIDATION_CODES,
  EditorialPlanValidationError,
  shouldRepairEditorialPlan,
} from "./editorial-plan-validation.mjs";
import { OPERATIONAL_DRAFT_FAILURE_STAGES } from "./operational-draft-failure.mjs";
import { createSourceReviewWarnings } from "./source-review-warnings.mjs";

export {
  EDITORIAL_EVENT_TYPES,
  EDITORIAL_FORMATS,
  EVIDENCE_ROLES,
  EVIDENCE_SOURCE_FIELDS,
} from "./editorial-contract.mjs";

const DEFAULT_REPAIR_DELAY_MS = 3_500;
const EDITORIAL_SELECTION_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "primaryKeywordId",
    "editorialFormat",
    "eventType",
    "relatedKeywordIds",
    "evidenceSelections",
  ],
  properties: {
    primaryKeywordId: { type: "integer" },
    editorialFormat: { type: "string", enum: EDITORIAL_FORMATS },
    eventType: { type: "string", enum: EDITORIAL_EVENT_TYPES },
    relatedKeywordIds: {
      type: "array",
      maxItems: 10,
      items: { type: "integer" },
    },
    evidenceSelections: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["evidenceVideoId", "sourceField", "sourceExcerpt", "evidenceRole"],
        properties: {
          evidenceVideoId: { type: "string" },
          sourceField: { type: "string", enum: EVIDENCE_SOURCE_FIELDS },
          sourceExcerpt: { type: "string" },
          evidenceRole: { type: "string", enum: EVIDENCE_ROLES },
        },
      },
    },
  },
});

function compactPromptText(value, maximumLength) {
  if (typeof value !== "string") return null;
  const compacted = value.replace(/\s+/gu, " ").trim();
  if (compacted.length === 0) return null;
  return compacted.length <= maximumLength
    ? compacted
    : compacted.slice(0, maximumLength).trimEnd();
}

function toPromptCandidate(candidate) {
  return {
    keywordId: candidate.keywordId,
    keyword: candidate.keyword,
    generation: candidate.generation,
    category: candidate.category,
    contextSummary: candidate.explain,
    sourceCrawlRunId: candidate.sourceCrawlRunId,
    snapshotAt: candidate.snapshotAt,
    relatedKeywords: candidate.relatedKeywords.map(({ id, word, category }) => ({
      id,
      word,
      category,
    })),
    relatedVideos: candidate.relatedVideos.map(
      ({ videoId, title, channelId, channelName, description, tags, publishedAt }) => ({
        videoId,
        title,
        channelId,
        channelName,
        description: compactPromptText(description, 1_200),
        tags: Array.isArray(tags) ? tags.slice(0, 20) : [],
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
    selectedAt: content.selectedAt,
    publishedAt: content.publishedAt,
  };
}

export function buildEditorialPlanPrompt({ candidates, recentContents, generatedAt }) {
  return [
    "너는 Trendzip의 한국 트렌드 숏폼 주제 선정자다.",
    "운영 후보 중 하나와 편집 형식, 사건 유형, 관련 키워드, 직접 확인할 영상 근거만 선택한다.",
    "제목, 훅, 요약, 이유와 내레이션은 후속 작성 단계가 만들고 topicKey와 eventKey는 시스템이 생성하므로 응답에 쓰지 않는다.",
    "후보 contextSummary는 주제 선택 참고 문맥이며 사실 근거가 아니다.",
    "영상 근거는 relatedVideos의 title, description, tags, channelName에 실제로 존재하는 원문만 사용한다.",
    "sourceField는 원문을 복사한 위치에 맞춰 TITLE, DESCRIPTION, TAG, CHANNEL_NAME 중 하나를 고른다.",
    "sourceExcerpt는 선택한 sourceField에서 연속된 문자열을 그대로 복사하고 TAG는 태그 하나 전체를 사용한다.",
    "evidenceRole은 EVENT_TRIGGER, DEFINITION, PERSON_WORK_LINK, CONTEXT, RELATED_TOPIC 중 근거의 역할 하나를 고른다.",
    "게임, 리뷰, 플랫폼명 같은 범용 표현보다 작품명, 인물, 그룹, 이벤트처럼 구체적인 주제를 우선한다.",
    "최근 제작 이력과 같은 키워드는 새로운 근거 영상이 명확한 경우에만 다시 선택한다.",
    "편집 형식 정의: WHY_NOW는 최근 공개·발표 계기, KEYWORD_PRIMER는 낯선 용어 설명, PERSON_WORK_RELATION은 인물과 작품 관계, EVENT_KEYWORD_MAP은 사건과 연결 표현, CONTEXT_TIMELINE은 여러 시점의 흐름, WEEKLY_BUNDLE은 여러 관련 주제 묶음이다.",
    "사건 유형 정의: TRAILER_RELEASE는 예고편 공개, MUSIC_RELEASE는 음원·뮤직비디오 공개, CAST_ANNOUNCEMENT는 출연진 발표, PERFORMANCE_RELEASE는 무대·퍼포먼스 공개, TOURNAMENT_RESULT는 경기 결과, PRODUCT_LAUNCH는 제품 출시, CREATOR_CONTENT는 크리에이터 콘텐츠 공개, GENERAL_CONTEXT는 특정 공개 사건이 확인되지 않는 일반 맥락이다.",
    "primaryKeywordId는 운영 후보에 있는 ID만 사용한다.",
    "relatedKeywordIds는 선택 후보의 relatedKeywords에 있는 ID만 사용한다.",
    "evidenceVideoId는 선택 후보의 relatedVideos에 있는 ID만 사용한다.",
    "같은 영상은 evidenceSelections에서 한 번만 선택한다.",
    "응답은 지정된 JSON 구조만 반환한다.",
    "",
    `생성 기준 시각: ${generatedAt}`,
    `운영 후보: ${JSON.stringify(candidates.map(toPromptCandidate))}`,
    `최근 제작 이력: ${JSON.stringify(recentContents.map(toPromptHistory))}`,
  ].join("\n");
}

function requireSelectionStructure(selection) {
  if (typeof selection !== "object" || selection === null || Array.isArray(selection)) {
    throw new Error("Gemini editorial selection must be an object.");
  }
  if (!Number.isInteger(selection.primaryKeywordId)) {
    throw new Error("editorialSelection.primaryKeywordId must be an integer.");
  }
  if (!EDITORIAL_FORMATS.includes(selection.editorialFormat)) {
    throw new Error("editorialSelection.editorialFormat is not supported.");
  }
  if (!EDITORIAL_EVENT_TYPES.includes(selection.eventType)) {
    throw new Error("editorialSelection.eventType is not supported.");
  }
  if (!Array.isArray(selection.relatedKeywordIds) || selection.relatedKeywordIds.length > 10) {
    throw new Error("editorialSelection.relatedKeywordIds must contain at most 10 items.");
  }
  if (new Set(selection.relatedKeywordIds).size !== selection.relatedKeywordIds.length) {
    throw new Error("editorialSelection.relatedKeywordIds must not contain duplicates.");
  }
  if (
    !Array.isArray(selection.evidenceSelections) ||
    selection.evidenceSelections.length < 1 ||
    selection.evidenceSelections.length > 3
  ) {
    throw new Error("editorialSelection.evidenceSelections must contain between 1 and 3 items.");
  }
}

function validateRelatedKeywordIds(selection, selectedCandidate) {
  const allowedValues = selectedCandidate.relatedKeywords.map((keyword) => keyword.id);
  const allowedIds = new Set(allowedValues);
  const invalidValues = selection.relatedKeywordIds.filter(
    (keywordId) => !Number.isInteger(keywordId) || !allowedIds.has(keywordId),
  );
  if (invalidValues.length > 0) {
    throw new EditorialPlanValidationError(
      EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_RELATED_KEYWORD_ID,
      "editorialSelection.relatedKeywordIds contains an unknown keyword ID.",
      { field: "relatedKeywordIds", invalidValues, allowedValues },
    );
  }
}

function validateEditorialSelection(selection, candidates) {
  requireSelectionStructure(selection);
  const selectedCandidate = candidates.find(
    (candidate) => candidate.keywordId === selection.primaryKeywordId,
  );
  if (!selectedCandidate) {
    throw new EditorialPlanValidationError(
      EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_PRIMARY_KEYWORD_ID,
      "editorialSelection.primaryKeywordId is not an operational candidate.",
      {
        field: "primaryKeywordId",
        invalidValue: selection.primaryKeywordId,
        allowedValues: candidates.map((candidate) => candidate.keywordId),
      },
    );
  }

  validateRelatedKeywordIds(selection, selectedCandidate);
  const factCards = createEvidenceFactCards(selectedCandidate, selection.evidenceSelections);
  return { selectedCandidate, factCards };
}

export function buildEditorialPlanRepairPrompt(error) {
  return [
    "직전 JSON 선택 결과가 Trendzip의 참조 계약을 위반했다.",
    `검증 오류 코드: ${error.code}`,
    `검증 오류 메시지: ${error.message}`,
    `검증 오류 상세: ${JSON.stringify(error.details)}`,
    "오류 상세의 allowedValues와 allowedSourceText만 사용해 잘못된 ID 또는 sourceExcerpt를 수정한다.",
    "자유 문안을 추가하지 말고 수정한 전체 선택 결과를 같은 JSON 구조로 반환한다.",
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

function withFailureStage(error, failureStage) {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  normalizedError.failureStage ??= failureStage;
  return normalizedError;
}

function withGenerationAttemptCount(error, generationAttemptCount) {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  normalizedError.generationAttemptCount = generationAttemptCount;
  return normalizedError;
}

function toErrorDiagnostics(error) {
  return {
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
    ...(typeof error?.code === "string" ? { code: error.code } : {}),
    ...(error?.details && typeof error.details === "object" ? { details: error.details } : {}),
  };
}

function withFailedRepairDiagnostics(error, { initialSelection, initialError, finalSelection }) {
  const normalizedError = withGenerationAttemptCount(error, 2);
  normalizedError.generationDiagnostics = {
    attemptCount: 2,
    initial: {
      selection: initialSelection,
      validation: toErrorDiagnostics(initialError),
    },
    final: {
      selection: finalSelection,
      validation: toErrorDiagnostics(normalizedError),
    },
  };
  return normalizedError;
}

function createPlannerResult({
  selection,
  candidates,
  generatedAt,
  generationAttemptCount,
  repairDiagnostics,
}) {
  let selectedCandidate;
  let factCards;
  try {
    ({ selectedCandidate, factCards } = validateEditorialSelection(selection, candidates));
  } catch (error) {
    const stage =
      error?.code === EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_EVIDENCE_VIDEO_ID ||
      error?.code === EDITORIAL_PLAN_VALIDATION_CODES.INVALID_EVIDENCE_EXCERPT
        ? OPERATIONAL_DRAFT_FAILURE_STAGES.FACT_ASSEMBLY
        : OPERATIONAL_DRAFT_FAILURE_STAGES.SELECTION;
    throw withFailureStage(error, stage);
  }

  let plan;
  try {
    plan = composeEditorialDraft({ candidate: selectedCandidate, selection, factCards });
  } catch (error) {
    throw withFailureStage(error, OPERATIONAL_DRAFT_FAILURE_STAGES.COMPOSITION);
  }
  let reviewWarnings;
  try {
    reviewWarnings = createSourceReviewWarnings({
      candidate: selectedCandidate,
      selection,
      factCards,
      generatedAt,
    });
  } catch (error) {
    throw withFailureStage(error, OPERATIONAL_DRAFT_FAILURE_STAGES.FACT_ASSEMBLY);
  }

  return {
    selection,
    factCards,
    reviewWarnings,
    plan,
    selectedCandidate,
    generationAttemptCount,
    repairDiagnostics,
  };
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
    throw new Error("GEMINI_API_KEY is required to create an editorial selection.");
  }
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  if (!Number.isInteger(repairDelayMs) || repairDelayMs < 0) {
    throw new Error("repairDelayMs must be a non-negative integer.");
  }
  if (typeof sleepImpl !== "function") throw new Error("A sleep implementation is required.");

  async function requestSelection(contents) {
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
          temperature: 0.1,
          maxOutputTokens: 1_024,
          thinkingConfig: { thinkingLevel: "MINIMAL" },
          responseMimeType: "application/json",
          responseJsonSchema: EDITORIAL_SELECTION_SCHEMA,
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
      let selection;
      try {
        selection = await requestSelection([{ role: "user", parts: [{ text: prompt }] }]);
      } catch (error) {
        throw withFailureStage(
          withGenerationAttemptCount(error, 1),
          OPERATIONAL_DRAFT_FAILURE_STAGES.SELECTION,
        );
      }

      let repairableError;
      try {
        return createPlannerResult({
          selection,
          candidates,
          generatedAt,
          generationAttemptCount: 1,
          repairDiagnostics: null,
        });
      } catch (error) {
        if (!shouldRepairEditorialPlan(error)) {
          throw withGenerationAttemptCount(error, 1);
        }
        repairableError = error;
      }

      if (repairDelayMs > 0) await sleepImpl(repairDelayMs);

      let repairedSelection;
      try {
        repairedSelection = await requestSelection([
          { role: "user", parts: [{ text: prompt }] },
          { role: "model", parts: [{ text: JSON.stringify(selection) }] },
          { role: "user", parts: [{ text: buildEditorialPlanRepairPrompt(repairableError) }] },
        ]);
      } catch (error) {
        throw withFailedRepairDiagnostics(
          withFailureStage(error, OPERATIONAL_DRAFT_FAILURE_STAGES.SELECTION),
          { initialSelection: selection, initialError: repairableError, finalSelection: null },
        );
      }

      if (JSON.stringify(repairedSelection) === JSON.stringify(selection)) {
        const noEffectError = new EditorialPlanValidationError(
          EDITORIAL_PLAN_VALIDATION_CODES.REPAIR_NO_EFFECT,
          "Gemini returned the same invalid editorial selection after repair.",
          { initialValidationCode: repairableError.code },
        );
        throw withFailedRepairDiagnostics(
          withFailureStage(
            noEffectError,
            repairableError.failureStage ?? OPERATIONAL_DRAFT_FAILURE_STAGES.SELECTION,
          ),
          {
            initialSelection: selection,
            initialError: repairableError,
            finalSelection: repairedSelection,
          },
        );
      }

      try {
        return createPlannerResult({
          selection: repairedSelection,
          candidates,
          generatedAt,
          generationAttemptCount: 2,
          repairDiagnostics: toErrorDiagnostics(repairableError),
        });
      } catch (error) {
        throw withFailedRepairDiagnostics(error, {
          initialSelection: selection,
          initialError: repairableError,
          finalSelection: repairedSelection,
        });
      }
    },
  });
}
