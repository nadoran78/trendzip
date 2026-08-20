import {
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createAudioManifest, validateAudioManifest } from "./audio-manifest.mjs";
import { loadFixture } from "./fixture.mjs";
import {
  createGeminiTtsClient,
  DEFAULT_GEMINI_TTS_MODEL,
  DEFAULT_GEMINI_TTS_VOICE,
} from "./gemini-tts.mjs";
import { NARRATION_SCENE_IDS } from "./scenes.mjs";
import { calculatePcmDurationMs, encodePcmAsWav } from "./wav.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const mediaDir = resolve(scriptsDir, "..");
const fixturePath = resolve(mediaDir, process.argv[2] ?? "fixtures/made-in-korea.sample.json");
const outputDir = resolve(mediaDir, process.argv[3] ?? "out/tts");
const stagingDir = resolve(dirname(outputDir), `.tts-${process.pid}.tmp`);

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function generate({ fixture, client, requestIntervalMs, styleInstruction }) {
  rmSync(stagingDir, { recursive: true, force: true });
  mkdirSync(stagingDir, { recursive: true });

  const sceneAudio = {};
  try {
    for (const [index, sceneId] of NARRATION_SCENE_IDS.entries()) {
      if (index > 0 && requestIntervalMs > 0) {
        await wait(requestIntervalMs);
      }

      process.stdout.write(`Generating ${sceneId} narration...\n`);
      const pcmData = await client.synthesize({
        text: fixture.narration[sceneId],
        styleInstruction,
      });
      const wavData = encodePcmAsWav(pcmData);
      writeFileSync(resolve(stagingDir, `${sceneId}.wav`), wavData);
      sceneAudio[sceneId] = {
        durationMs: calculatePcmDurationMs(pcmData),
        byteLength: wavData.length,
      };
    }

    const manifest = createAudioManifest({ fixture, client, sceneAudio });
    validateAudioManifest(manifest, fixture);
    writeFileSync(
      resolve(stagingDir, "audio-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    rmSync(outputDir, { recursive: true, force: true });
    renameSync(stagingDir, outputDir);
    process.stdout.write(`Generated TTS audio in ${outputDir}\n`);
  } catch (error) {
    rmSync(stagingDir, { recursive: true, force: true });
    throw error;
  }
}

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

  await generate({ fixture, client, requestIntervalMs, styleInstruction });
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
