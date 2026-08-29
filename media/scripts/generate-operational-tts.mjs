import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createGeminiTtsClient,
  DEFAULT_GEMINI_TTS_MODEL,
  DEFAULT_GEMINI_TTS_VOICE,
} from "./gemini-tts.mjs";
import { loadOperationalRenderInput } from "./operational-render-input.mjs";
import { createOperationalTtsRun } from "./operational-tts.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const mediaDir = resolve(scriptsDir, "..");

function createDefaultRunDirectory(shortformContentId) {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
  return resolve(mediaDir, "out/operational-renders", String(shortformContentId), timestamp);
}

async function main() {
  const manifestArgument = process.argv[2];
  if (!manifestArgument) {
    throw new Error("Usage: npm run tts:operational -- <operational-manifest.json> [run-directory]");
  }

  const input = loadOperationalRenderInput(resolve(mediaDir, manifestArgument));
  const runDir = process.argv[3]
    ? resolve(mediaDir, process.argv[3])
    : createDefaultRunDirectory(input.manifest.reservation.shortformContentId);
  const requestIntervalMs = Number(process.env.GEMINI_TTS_REQUEST_INTERVAL_MS ?? "3500");
  if (!Number.isInteger(requestIntervalMs) || requestIntervalMs < 0) {
    throw new Error("GEMINI_TTS_REQUEST_INTERVAL_MS must be a non-negative integer.");
  }

  const client = createGeminiTtsClient({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_TTS_MODEL ?? DEFAULT_GEMINI_TTS_MODEL,
    voice: process.env.GEMINI_TTS_VOICE ?? DEFAULT_GEMINI_TTS_VOICE,
  });
  const styleInstruction = process.env.GEMINI_TTS_STYLE ??
    "한국어 정보형 숏폼 내레이션처럼 따뜻하고 또렷하게, 보통 속도로 읽어주세요.";

  const completedRunDir = await createOperationalTtsRun({
    input,
    runDir,
    client,
    requestIntervalMs,
    styleInstruction,
    onSceneStart: (sceneId) => process.stdout.write(`Generating ${sceneId} narration...\n`),
  });
  process.stdout.write(`Generated operational TTS run: ${completedRunDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
