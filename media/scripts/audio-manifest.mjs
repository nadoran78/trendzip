import { createHash } from "node:crypto";

import { NARRATION_SCENE_IDS } from "./scenes.mjs";
import { DEFAULT_PCM_FORMAT } from "./wav.mjs";

const MANIFEST_SCHEMA_VERSION = 1;

export function hashNarration(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function hashNarrationScript(narration) {
  const orderedNarration = NARRATION_SCENE_IDS.map((sceneId) => [sceneId, narration[sceneId]]);
  return hashNarration(JSON.stringify(orderedNarration));
}

export function createAudioManifest({ fixture, client, sceneAudio }) {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    provider: "gemini",
    model: client.model,
    voice: client.voice,
    format: DEFAULT_PCM_FORMAT,
    scriptHash: hashNarrationScript(fixture.narration),
    scenes: NARRATION_SCENE_IDS.map((sceneId) => {
      const audio = sceneAudio[sceneId];
      return {
        id: sceneId,
        file: `${sceneId}.wav`,
        durationMs: audio.durationMs,
        byteLength: audio.byteLength,
        narrationHash: hashNarration(fixture.narration[sceneId]),
      };
    }),
  };
}

export function validateAudioManifest(manifest, fixture) {
  if (manifest?.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(`audio manifest schemaVersion must be ${MANIFEST_SCHEMA_VERSION}.`);
  }
  if (manifest.provider !== "gemini") {
    throw new Error("audio manifest provider must be gemini.");
  }
  if (typeof manifest.model !== "string" || manifest.model.length === 0) {
    throw new Error("audio manifest model must be a non-empty string.");
  }
  if (typeof manifest.voice !== "string" || manifest.voice.length === 0) {
    throw new Error("audio manifest voice must be a non-empty string.");
  }
  const format = manifest.format;
  if (
    format?.channels !== DEFAULT_PCM_FORMAT.channels ||
    format?.sampleRateHz !== DEFAULT_PCM_FORMAT.sampleRateHz ||
    format?.sampleWidthBytes !== DEFAULT_PCM_FORMAT.sampleWidthBytes
  ) {
    throw new Error("audio manifest PCM format is not supported.");
  }
  if (manifest.scriptHash !== hashNarrationScript(fixture.narration)) {
    throw new Error("audio manifest does not match the current narration script.");
  }
  if (!Array.isArray(manifest.scenes) || manifest.scenes.length !== NARRATION_SCENE_IDS.length) {
    throw new Error("audio manifest must contain every narration scene.");
  }

  manifest.scenes.forEach((scene, index) => {
    const expectedId = NARRATION_SCENE_IDS[index];
    if (scene.id !== expectedId || scene.file !== `${expectedId}.wav`) {
      throw new Error(`audio manifest scene ${index} must be ${expectedId}.`);
    }
    if (!Number.isFinite(scene.durationMs) || scene.durationMs <= 0) {
      throw new Error(`audio manifest ${expectedId} durationMs must be positive.`);
    }
    if (!Number.isInteger(scene.byteLength) || scene.byteLength <= 44) {
      throw new Error(`audio manifest ${expectedId} byteLength must include WAV audio data.`);
    }
    if (scene.narrationHash !== hashNarration(fixture.narration[expectedId])) {
      throw new Error(`audio manifest ${expectedId} narration hash is stale.`);
    }
  });

  return manifest;
}
