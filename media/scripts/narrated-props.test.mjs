import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { createAudioManifest } from "./audio-manifest.mjs";
import { createNarratedRenderProps } from "./narrated-props.mjs";
import { NARRATION_SCENE_IDS } from "./scenes.mjs";

const fixture = {
  keyword: "메이드 인 코리아",
  narration: Object.fromEntries(
    NARRATION_SCENE_IDS.map((sceneId) => [sceneId, `${sceneId} narration`]),
  ),
};
const sceneAudio = Object.fromEntries(
  NARRATION_SCENE_IDS.map((sceneId, index) => [
    sceneId,
    { durationMs: 1_000 + index * 100, byteLength: 1_000 + index },
  ]),
);
const manifest = createAudioManifest({
  fixture,
  client: { model: "test-model", voice: "test-voice" },
  sceneAudio,
});

function createAudioDirectory() {
  const audioDir = mkdtempSync(join(tmpdir(), "trendzip-narration-"));
  for (const scene of manifest.scenes) {
    writeFileSync(resolve(audioDir, scene.file), Buffer.alloc(scene.byteLength));
  }
  return audioDir;
}

test("narrated props combine validated audio paths with the calculated timeline", () => {
  const audioDir = createAudioDirectory();
  try {
    const props = createNarratedRenderProps({
      fixture,
      manifest,
      audioDir,
      audioPublicPath: "tts",
    });

    assert.equal(props.keyword, "메이드 인 코리아");
    assert.equal(props.timeline.scenes[0].id, "hook");
    assert.equal(props.timeline.durationInFrames > 0, true);
    assert.deepEqual(props.narrationAudio, {
      hook: "tts/hook.wav",
      overview: "tts/overview.wav",
      reasons: "tts/reasons.wav",
      evidence: "tts/evidence.wav",
      cta: "tts/cta.wav",
    });
  } finally {
    rmSync(audioDir, { recursive: true, force: true });
  }
});

test("narrated props reject a missing WAV before rendering", () => {
  const audioDir = createAudioDirectory();
  try {
    rmSync(resolve(audioDir, "hook.wav"));

    assert.throws(
      () => createNarratedRenderProps({
        fixture,
        manifest,
        audioDir,
        audioPublicPath: "tts",
      }),
      /Narration audio file is missing: hook.wav/,
    );
  } finally {
    rmSync(audioDir, { recursive: true, force: true });
  }
});
