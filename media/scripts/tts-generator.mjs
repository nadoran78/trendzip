import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";

import { createAudioManifest, validateAudioManifest } from "./audio-manifest.mjs";
import { validateNarration } from "./fixture.mjs";
import { NARRATION_SCENE_IDS } from "./scenes.mjs";
import { calculatePcmDurationMs, encodePcmAsWav } from "./wav.mjs";

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

export async function generateTtsAudio({
  fixture,
  client,
  outputDir,
  requestIntervalMs,
  styleInstruction,
  onSceneStart = () => {},
}) {
  validateNarration(fixture?.narration);
  if (!Number.isInteger(requestIntervalMs) || requestIntervalMs < 0) {
    throw new Error("requestIntervalMs must be a non-negative integer.");
  }
  if (typeof styleInstruction !== "string" || styleInstruction.trim().length === 0) {
    throw new Error("styleInstruction must be a non-empty string.");
  }

  const resolvedOutputDir = resolve(outputDir);
  mkdirSync(dirname(resolvedOutputDir), { recursive: true });
  const stagingDir = resolve(
    dirname(resolvedOutputDir),
    `.${basename(resolvedOutputDir)}-${process.pid}-${randomUUID()}.tmp`,
  );
  mkdirSync(stagingDir, { recursive: true });

  const sceneAudio = {};
  try {
    for (const [index, sceneId] of NARRATION_SCENE_IDS.entries()) {
      if (index > 0 && requestIntervalMs > 0) {
        await wait(requestIntervalMs);
      }

      onSceneStart(sceneId);
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

    rmSync(resolvedOutputDir, { recursive: true, force: true });
    renameSync(stagingDir, resolvedOutputDir);
    return { manifest, outputDir: resolvedOutputDir };
  } catch (error) {
    rmSync(stagingDir, { recursive: true, force: true });
    throw error;
  }
}
