import { NARRATION_SCENE_IDS } from "./scenes.mjs";

export const DEFAULT_TIMELINE_OPTIONS = Object.freeze({
  fps: 30,
  leadInFrames: 6,
  leadOutFrames: 12,
  minimumSceneFrames: Object.freeze({
    hook: 120,
    overview: 150,
    reasons: 240,
    evidence: 180,
    cta: 120,
  }),
});

function requirePositiveInteger(value, name, { allowZero = false } = {}) {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}.`);
  }
}

function validateTimelineInput(audioManifest, options) {
  if (!Array.isArray(audioManifest?.scenes)) {
    throw new Error("audioManifest.scenes must be an array.");
  }
  if (audioManifest.scenes.length !== NARRATION_SCENE_IDS.length) {
    throw new Error("audioManifest.scenes must contain every narration scene.");
  }

  requirePositiveInteger(options.fps, "options.fps");
  requirePositiveInteger(options.leadInFrames, "options.leadInFrames", { allowZero: true });
  requirePositiveInteger(options.leadOutFrames, "options.leadOutFrames", { allowZero: true });

  audioManifest.scenes.forEach((scene, index) => {
    const expectedId = NARRATION_SCENE_IDS[index];
    if (scene.id !== expectedId) {
      throw new Error(`audioManifest scene ${index} must be ${expectedId}.`);
    }
    if (!Number.isFinite(scene.durationMs) || scene.durationMs <= 0) {
      throw new Error(`${expectedId} durationMs must be a positive number.`);
    }
    requirePositiveInteger(
      options.minimumSceneFrames[expectedId],
      `options.minimumSceneFrames.${expectedId}`,
    );
  });
}

export function calculateSceneTimeline(
  audioManifest,
  options = DEFAULT_TIMELINE_OPTIONS,
) {
  validateTimelineInput(audioManifest, options);

  const scenes = [];
  let currentFrame = 0;

  audioManifest.scenes.forEach((scene) => {
    const narrationFrames = Math.ceil((scene.durationMs / 1_000) * options.fps);
    const totalNarrationFrames = options.leadInFrames + narrationFrames + options.leadOutFrames;
    const durationInFrames = Math.max(options.minimumSceneFrames[scene.id], totalNarrationFrames);

    scenes.push({
      id: scene.id,
      from: currentFrame,
      audioFrom: currentFrame + options.leadInFrames,
      durationInFrames,
    });

    currentFrame += durationInFrames;
  });

  return {
    scenes,
    durationInFrames: currentFrame,
    durationSeconds: currentFrame / options.fps,
  };
}
