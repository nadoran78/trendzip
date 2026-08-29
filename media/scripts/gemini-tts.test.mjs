import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGeminiTtsPrompt,
  createGeminiTtsClient,
  DEFAULT_GEMINI_TTS_MODEL,
  DEFAULT_GEMINI_TTS_VOICE,
  extractGeminiAudioData,
} from "./gemini-tts.mjs";

function createAudioResponse(data, overrides = {}) {
  return {
    id: "interaction-1",
    status: "completed",
    steps: [
      {
        type: "model_output",
        content: [{ type: "audio", data, mime_type: "audio/l16", sample_rate: 24000 }],
      },
    ],
    ...overrides,
  };
}

test("Gemini TTS prompt keeps the narration and style instruction", () => {
  const prompt = buildGeminiTtsPrompt("메이드 인 코리아입니다.", "차분하게 읽어주세요.");

  assert.match(prompt, /^차분하게 읽어주세요\./);
  assert.match(prompt, /메이드 인 코리아입니다\.$/);
});

test("Gemini TTS client sends the selected model and voice", async () => {
  const pcmData = Buffer.from([0, 1, 2, 3]);
  let capturedRequest;
  const client = createGeminiTtsClient({
    apiKey: "test-api-key",
    fetchImpl: async (url, init) => {
      capturedRequest = { url, init };
      return {
        ok: true,
        status: 200,
        async json() {
          return createAudioResponse(pcmData.toString("base64"));
        },
      };
    },
  });

  const result = await client.synthesize({
    text: "테스트 내레이션",
    styleInstruction: "또렷하게 읽어주세요.",
  });

  assert.deepEqual(result, pcmData);
  assert.equal(capturedRequest.init.headers["x-goog-api-key"], "test-api-key");
  const requestBody = JSON.parse(capturedRequest.init.body);
  assert.equal(requestBody.model, DEFAULT_GEMINI_TTS_MODEL);
  assert.equal(requestBody.generation_config.speech_config[0].voice, DEFAULT_GEMINI_TTS_VOICE);
  assert.deepEqual(requestBody.response_format, { type: "audio" });
  assert.match(requestBody.input, /테스트 내레이션/);
});

test("Gemini TTS response parser uses the last inline audio block", () => {
  const firstAudio = Buffer.from([0, 1]).toString("base64");
  const lastAudio = Buffer.from([2, 3]).toString("base64");
  const payload = {
    status: "completed",
    steps: [
      {
        type: "model_output",
        content: [{ type: "audio", data: firstAudio }],
      },
      {
        type: "model_output",
        content: [
          { type: "text", text: "ignored" },
          { type: "audio", data: lastAudio },
        ],
      },
    ],
  };

  assert.equal(extractGeminiAudioData(payload), lastAudio);
});

test("Gemini TTS response parser reports responses without audio", () => {
  const payload = {
    status: "completed",
    steps: [
      {
        type: "model_output",
        content: [{ type: "text", text: "unexpected text" }],
      },
    ],
  };

  assert.throws(
    () => extractGeminiAudioData(payload),
    /did not contain audio data\. status=completed, contentTypes=text/,
  );
});

test("Gemini TTS response parser reports empty inline audio", () => {
  assert.throws(
    () => extractGeminiAudioData(createAudioResponse("")),
    /contained empty audio data\. status=completed, contentTypes=audio/,
  );
});

test("Gemini TTS response parser rejects URI audio", () => {
  const payload = createAudioResponse(undefined, {
    steps: [
      {
        type: "model_output",
        content: [{ type: "audio", uri: "https://example.com/audio.wav" }],
      },
    ],
  });

  assert.throws(
    () => extractGeminiAudioData(payload),
    /returned URI audio, but this client requires inline audio/,
  );
});

test("Gemini TTS client reports HTTP failures without exposing credentials", async () => {
  const client = createGeminiTtsClient({
    apiKey: "secret-value",
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      async json() {
        return { error: { message: "Quota exceeded." } };
      },
    }),
  });

  await assert.rejects(
    () => client.synthesize({ text: "테스트", styleInstruction: "또렷하게" }),
    (error) => {
      assert.match(error.message, /HTTP 429/);
      assert.match(error.message, /Quota exceeded/);
      assert.doesNotMatch(error.message, /secret-value/);
      return true;
    },
  );
});
