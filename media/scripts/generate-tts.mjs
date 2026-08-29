import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadFixture } from "./fixture.mjs";
import {
  createGeminiTtsClient,
  DEFAULT_GEMINI_TTS_MODEL,
  DEFAULT_GEMINI_TTS_VOICE,
} from "./gemini-tts.mjs";
import { generateTtsAudio } from "./tts-generator.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const mediaDir = resolve(scriptsDir, "..");
const fixturePath = resolve(mediaDir, process.argv[2] ?? "fixtures/made-in-korea.sample.json");
const outputDir = resolve(mediaDir, process.argv[3] ?? "out/tts");

async function main() {
  const requestIntervalMs = Number(process.env.GEMINI_TTS_REQUEST_INTERVAL_MS ?? "3500");
  if (!Number.isInteger(requestIntervalMs) || requestIntervalMs < 0) {
    throw new Error("GEMINI_TTS_REQUEST_INTERVAL_MS must be a non-negative integer.");
  }

  const fixture = loadFixture(fixturePath);
  const client = createGeminiTtsClient({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_TTS_MODEL ?? DEFAULT_GEMINI_TTS_MODEL,
    voice: process.env.GEMINI_TTS_VOICE ?? DEFAULT_GEMINI_TTS_VOICE,
  });
  const styleInstruction = process.env.GEMINI_TTS_STYLE ??
    "한국어 정보형 숏폼 내레이션처럼 따뜻하고 또렷하게, 보통 속도로 읽어주세요.";

  await generateTtsAudio({
    fixture,
    client,
    outputDir,
    requestIntervalMs,
    styleInstruction,
    onSceneStart: (sceneId) => process.stdout.write(`Generating ${sceneId} narration...\n`),
  });
  process.stdout.write(`Generated TTS audio in ${outputDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
