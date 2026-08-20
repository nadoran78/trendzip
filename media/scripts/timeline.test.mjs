import assert from "node:assert/strict";
import test from "node:test";

import { calculateSceneTimeline } from "./timeline.mjs";
import { NARRATION_SCENE_IDS } from "./scenes.mjs";

const audioManifest = {
  scenes: NARRATION_SCENE_IDS.map((id, index) => ({
    id,
    durationMs: (index + 1) * 1_000,
  })),
};
const options = {
  fps: 30,
  leadInFrames: 6,
  leadOutFrames: 12,
  minimumSceneFrames: Object.fromEntries(
    NARRATION_SCENE_IDS.map((sceneId) => [sceneId, 60]),
  ),
};

test("timeline uses audio duration, padding, and minimum scene frames", () => {
  const timeline = calculateSceneTimeline(audioManifest, options);

  assert.deepEqual(timeline.scenes, [
    { id: "hook", from: 0, audioFrom: 6, durationInFrames: 60 },
    { id: "overview", from: 60, audioFrom: 66, durationInFrames: 78 },
    { id: "reasons", from: 138, audioFrom: 144, durationInFrames: 108 },
    { id: "evidence", from: 246, audioFrom: 252, durationInFrames: 138 },
    { id: "cta", from: 384, audioFrom: 390, durationInFrames: 168 },
  ]);
  assert.equal(timeline.durationInFrames, 552);
  assert.equal(timeline.durationSeconds, 18.4);
});

test("timeline rounds fractional audio frames up so narration is not clipped", () => {
  const fractionalManifest = {
    scenes: NARRATION_SCENE_IDS.map((id) => ({ id, durationMs: 1_001 })),
  };
  const minimalOptions = {
    ...options,
    leadInFrames: 0,
    leadOutFrames: 0,
    minimumSceneFrames: Object.fromEntries(
      NARRATION_SCENE_IDS.map((sceneId) => [sceneId, 1]),
    ),
  };

  const timeline = calculateSceneTimeline(fractionalManifest, minimalOptions);

  assert.equal(timeline.scenes[0].durationInFrames, 31);
  assert.equal(timeline.scenes[1].from, 31);
  assert.equal(timeline.durationInFrames, 155);
});

test("timeline rejects scenes in a different order", () => {
  const reversedManifest = { scenes: [...audioManifest.scenes].reverse() };

  assert.throws(
    () => calculateSceneTimeline(reversedManifest, options),
    /audioManifest scene 0 must be hook/,
  );
});

test("timeline rejects invalid frame options", () => {
  assert.throws(
    () => calculateSceneTimeline(audioManifest, { ...options, fps: 0 }),
    /options.fps must be an integer greater than or equal to 1/,
  );
});
