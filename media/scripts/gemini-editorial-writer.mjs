import { EDITORIAL_TEXT_LIMITS } from "./editorial-draft-composer.mjs";
import {
  EDITORIAL_WRITER_VALIDATION_CODES,
  EditorialWriterValidationError,
  shouldRepairEditorialWriterDraft,
  validateEditorialWriterDraft,
} from "./editorial-writer-validation.mjs";
import { OPERATIONAL_DRAFT_FAILURE_STAGES } from "./operational-draft-failure.mjs";

const DEFAULT_REPAIR_DELAY_MS = 3_500;
const referencedTextSchema = (maximumLength) => ({
  type: "object",
  additionalProperties: false,
  required: ["text", "factIds"],
  properties: {
    text: { type: "string", maxLength: maximumLength },
    factIds: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" },
    },
  },
});

export const EDITORIAL_WRITER_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "audienceAngle",
    "selectionReason",
    "title",
    "hook",
    "summary",
    "reasons",
    "narration",
  ],
  properties: {
    audienceAngle: { type: "string", maxLength: 500 },
    selectionReason: { type: "string", maxLength: 2_000 },
    title: { type: "string", maxLength: EDITORIAL_TEXT_LIMITS.title },
    hook: { type: "string", maxLength: EDITORIAL_TEXT_LIMITS.hook },
    summary: { type: "string", maxLength: EDITORIAL_TEXT_LIMITS.summary },
    reasons: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: referencedTextSchema(EDITORIAL_TEXT_LIMITS.reason),
    },
    narration: {
      type: "object",
      additionalProperties: false,
      required: ["hook", "overview", "reasons", "evidence"],
      properties: {
        hook: referencedTextSchema(EDITORIAL_TEXT_LIMITS.narration),
        overview: referencedTextSchema(EDITORIAL_TEXT_LIMITS.narration),
        reasons: referencedTextSchema(EDITORIAL_TEXT_LIMITS.narration),
        evidence: referencedTextSchema(EDITORIAL_TEXT_LIMITS.narration),
      },
    },
  },
});

export function buildEditorialWriterPrompt(editorialBrief) {
  return [
    "너는 Trendzip의 검증 근거 전용 한국어 숏폼 작가다.",
    "아래 Editorial Brief만 사용해 30~40대가 낯선 키워드를 이해할 수 있는 초안을 작성한다.",
    "Brief 밖의 후보, 기존 설명, 상식이나 기억을 사실처럼 추가하지 않는다.",
    "facts의 sourceExcerpt가 직접 뒷받침하는 범위보다 주장을 확대하지 않는다.",
    "각 reason과 narration 구간에는 실제 사용한 facts의 factId를 반드시 연결한다.",
    "관련 키워드와 고유명사는 allowedEntities 또는 facts에 등장하는 표현만 사용한다.",
    "내부 rank, trendScore, rankDelta, 검색 순위, 검색량, 조회수는 언급하지 않는다.",
    "세대 값은 수집 구간일 뿐 세대 전체의 인기나 반응을 단정하는 근거가 아니다.",
    "30~40대는 설명 대상이지 트렌드 관측 대상이 아니다.",
    "인기 영상 포함은 관심이나 화제의 근거로만 사용하고 긍정적·부정적 반응, 호평, 혹평을 단정하지 않는다.",
    "같은 템플릿 문장을 반복하지 말고 편집 형식과 확인된 근거에 맞춰 자연스럽게 쓴다.",
    "reasons는 2~3개로 작성하고 title 100자, hook 48자, summary와 reason 각 100자 이내로 쓴다.",
    "숫자는 facts, allowedEntities 또는 generatedAt에 실제로 있는 값만 사용한다.",
    "CTA는 시스템이 고정 문구로 추가하므로 응답에 쓰지 않는다.",
    "응답은 지정된 JSON 구조만 반환한다.",
    "",
    `Editorial Brief: ${JSON.stringify(editorialBrief)}`,
  ].join("\n");
}

export function buildEditorialWriterRepairPrompt(error) {
  return [
    "직전 초안이 Trendzip 작성 계약 검증을 통과하지 못했다.",
    `검증 오류 코드: ${error.code}`,
    `검증 오류 메시지: ${error.message}`,
    `검증 오류 상세: ${JSON.stringify(error.details)}`,
    "Editorial Brief의 factId와 문구 제한만 사용해 위반 부분을 고친 전체 JSON을 반환한다.",
    "새 사실, 새 고유명사, 새 수치를 추가하지 않는다.",
  ].join("\n");
}

function extractResponseText(payload) {
  const candidate = payload?.candidates?.[0];
  if (!candidate) throw new Error("Gemini editorial writer response did not contain a candidate.");
  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(
      `Gemini editorial writer response was not completed. finishReason=${candidate.finishReason}`,
    );
  }
  const text = candidate.content?.parts
    ?.map((part) => part?.text?.trim())
    .filter(Boolean)
    .join("\n");
  if (!text) throw new Error("Gemini editorial writer response did not contain text.");
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
    `Gemini editorial writer request failed with HTTP ${response.status}${message ? `: ${message}` : "."}`,
  );
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function toErrorDiagnostics(error) {
  return {
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
    ...(typeof error?.code === "string" ? { code: error.code } : {}),
    ...(error?.details && typeof error.details === "object" ? { details: error.details } : {}),
  };
}

function withWriterDiagnostics(error, diagnostics) {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  normalizedError.failureStage ??= OPERATIONAL_DRAFT_FAILURE_STAGES.WRITER_VALIDATION;
  normalizedError.writerDiagnostics = diagnostics;
  return normalizedError;
}

export function createGeminiEditorialWriter({
  apiKey,
  baseUrl,
  model,
  timeoutMs = 15_000,
  repairDelayMs = DEFAULT_REPAIR_DELAY_MS,
  fetchImpl = globalThis.fetch,
  sleepImpl = defaultSleep,
}) {
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("GEMINI_API_KEY is required to create an editorial draft.");
  }
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  if (!Number.isInteger(repairDelayMs) || repairDelayMs < 0) {
    throw new Error("repairDelayMs must be a non-negative integer.");
  }
  if (typeof sleepImpl !== "function") throw new Error("A sleep implementation is required.");

  async function requestDraft(contents) {
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
          temperature: 0.35,
          maxOutputTokens: 2_048,
          thinkingConfig: { thinkingLevel: "MINIMAL" },
          responseMimeType: "application/json",
          responseJsonSchema: EDITORIAL_WRITER_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw await createHttpError(response);

    const text = extractResponseText(await response.json());
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Gemini editorial writer response text is not valid JSON.");
    }
  }

  return Object.freeze({
    async createDraft({ editorialBrief }) {
      const prompt = buildEditorialWriterPrompt(editorialBrief);
      let initialDraft;
      try {
        initialDraft = await requestDraft([{ role: "user", parts: [{ text: prompt }] }]);
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        normalizedError.failureStage = OPERATIONAL_DRAFT_FAILURE_STAGES.WRITING;
        throw withWriterDiagnostics(normalizedError, {
          attemptCount: 1,
          repair: null,
          initialDraft: null,
          finalDraft: null,
        });
      }

      let initialError;
      try {
        return {
          plan: validateEditorialWriterDraft(initialDraft, editorialBrief),
          writerDraft: initialDraft,
          attemptCount: 1,
          repairDiagnostics: null,
        };
      } catch (error) {
        if (!shouldRepairEditorialWriterDraft(error)) {
          throw withWriterDiagnostics(error, {
            attemptCount: 1,
            repair: null,
            initialDraft,
            finalDraft: initialDraft,
          });
        }
        initialError = error;
      }

      if (repairDelayMs > 0) await sleepImpl(repairDelayMs);

      let repairedDraft;
      try {
        repairedDraft = await requestDraft([
          { role: "user", parts: [{ text: prompt }] },
          { role: "model", parts: [{ text: JSON.stringify(initialDraft) }] },
          { role: "user", parts: [{ text: buildEditorialWriterRepairPrompt(initialError) }] },
        ]);
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        normalizedError.failureStage = OPERATIONAL_DRAFT_FAILURE_STAGES.WRITING;
        throw withWriterDiagnostics(normalizedError, {
          attemptCount: 2,
          repair: toErrorDiagnostics(initialError),
          initialDraft,
          finalDraft: null,
        });
      }

      if (JSON.stringify(repairedDraft) === JSON.stringify(initialDraft)) {
        const error = new EditorialWriterValidationError(
          EDITORIAL_WRITER_VALIDATION_CODES.REPAIR_NO_EFFECT,
          "Gemini returned the same invalid editorial draft after repair.",
          { initialValidationCode: initialError.code },
        );
        throw withWriterDiagnostics(error, {
          attemptCount: 2,
          repair: toErrorDiagnostics(initialError),
          initialDraft,
          finalDraft: repairedDraft,
        });
      }

      try {
        return {
          plan: validateEditorialWriterDraft(repairedDraft, editorialBrief),
          writerDraft: repairedDraft,
          attemptCount: 2,
          repairDiagnostics: toErrorDiagnostics(initialError),
        };
      } catch (error) {
        throw withWriterDiagnostics(error, {
          attemptCount: 2,
          repair: toErrorDiagnostics(initialError),
          initialDraft,
          finalDraft: repairedDraft,
          finalValidation: toErrorDiagnostics(error),
        });
      }
    },
  });
}
