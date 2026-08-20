const GEMINI_INTERACTIONS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

export const DEFAULT_GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";
export const DEFAULT_GEMINI_TTS_VOICE = "Kore";

export function buildGeminiTtsPrompt(text, styleInstruction) {
  const style = styleInstruction.trim();
  return `${style}\n\n다음 문장을 빠뜨리거나 덧붙이지 말고 그대로 읽어주세요.\n${text}`;
}

function getModelOutputContent(payload) {
  if (!Array.isArray(payload?.steps)) {
    return [];
  }

  return payload.steps.flatMap((step) =>
    step?.type === "model_output" && Array.isArray(step.content) ? step.content : [],
  );
}

function describeResponse(payload, content) {
  const status = typeof payload?.status === "string" ? payload.status : "unknown";
  const contentTypes = [...new Set(content.map((item) => item?.type).filter(Boolean))];
  return `status=${status}, contentTypes=${contentTypes.join(",") || "none"}`;
}

export function extractGeminiAudioData(payload) {
  const content = getModelOutputContent(payload);
  const audioBlocks = content.filter((item) => item?.type === "audio");
  const inlineAudio = audioBlocks.findLast(
    (item) => typeof item.data === "string" && item.data.length > 0,
  );

  if (inlineAudio) {
    return inlineAudio.data;
  }

  const responseDescription = describeResponse(payload, content);
  if (audioBlocks.some((item) => typeof item?.uri === "string" && item.uri.length > 0)) {
    throw new Error(
      `Gemini TTS returned URI audio, but this client requires inline audio. ${responseDescription}`,
    );
  }
  if (audioBlocks.length > 0) {
    throw new Error(`Gemini TTS response contained empty audio data. ${responseDescription}`);
  }

  throw new Error(`Gemini TTS response did not contain audio data. ${responseDescription}`);
}

async function createHttpError(response) {
  let detail;
  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === "string" && payload.error.message.length > 0) {
      detail = payload.error.message;
    }
  } catch {
    // Keep the HTTP status as the only diagnostic when the body is not JSON.
  }

  const suffix = detail ? `: ${detail}` : ".";
  return new Error(`Gemini TTS request failed with HTTP ${response.status}${suffix}`);
}

export function createGeminiTtsClient({
  apiKey,
  model = DEFAULT_GEMINI_TTS_MODEL,
  voice = DEFAULT_GEMINI_TTS_VOICE,
  fetchImpl = globalThis.fetch,
}) {
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("GEMINI_API_KEY is required to generate TTS audio.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  return {
    model,
    voice,
    async synthesize({ text, styleInstruction }) {
      const response = await fetchImpl(GEMINI_INTERACTIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          input: buildGeminiTtsPrompt(text, styleInstruction),
          response_format: { type: "audio" },
          generation_config: {
            speech_config: [{ voice }],
          },
        }),
      });

      if (!response.ok) {
        throw await createHttpError(response);
      }

      const payload = await response.json();
      const encodedAudio = extractGeminiAudioData(payload);

      const pcmData = Buffer.from(encodedAudio, "base64");
      if (pcmData.length === 0) {
        throw new Error("Gemini TTS response contained empty audio data.");
      }
      return pcmData;
    },
  };
}
