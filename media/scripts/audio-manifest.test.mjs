import assert from "node:assert/strict";
import test from "node:test";

import {
  createAudioManifest,
  validateAudioManifest,
} from "./audio-manifest.mjs";
import { NARRATION_SCENE_IDS } from "./scenes.mjs";

const fixture = {
  narration: Object.fromEntries(
    NARRATION_SCENE_IDS.map((sceneId) => [sceneId, `${sceneId} narration`]),
  ),
};
const client = { model: "test-model", voice: "test-voice" };
const sceneAudio = Object.fromEntries(
  NARRATION_SCENE_IDS.map((sceneId, index) => [
    sceneId,
    { durationMs: 1_000 + index * 100, byteLength: 48_044 + index },
  ]),
);

test("audio manifest records ordered scenes and matching narration hashes", () => {
  const manifest = createAudioManifest({ fixture, client, sceneAudio });

  assert.deepEqual(manifest.scenes.map((scene) => scene.id), NARRATION_SCENE_IDS);
  assert.equal(manifest.model, "test-model");
  assert.equal(manifest.voice, "test-voice");
  assert.doesNotThrow(() => validateAudioManifest(manifest, fixture));
});

test("audio manifest rejects narration changed after TTS generation", () => {
  const manifest = createAudioManifest({ fixture, client, sceneAudio });
  const changedFixture = {
    narration: { ...fixture.narration, hook: "changed narration" },
  };

  assert.throws(
    () => validateAudioManifest(manifest, changedFixture),
    /does not match the current narration script/,
  );
});

test("audio manifest rejects invalid scene duration", () => {
  const manifest = createAudioManifest({ fixture, client, sceneAudio });
  manifest.scenes[0].durationMs = 0;

  assert.throws(
    () => validateAudioManifest(manifest, fixture),
    /hook durationMs must be positive/,
  );
});

test("audio manifest rejects an incompatible PCM format", () => {
  const manifest = createAudioManifest({ fixture, client, sceneAudio });
  manifest.format = { ...manifest.format, sampleRateHz: 48_000 };

  assert.throws(
    () => validateAudioManifest(manifest, fixture),
    /PCM format is not supported/,
  );
});
