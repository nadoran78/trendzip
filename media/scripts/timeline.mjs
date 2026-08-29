import { NARRATION_SCENE_IDS } from "./scenes.mjs";

export const DEFAULT_TIMELINE_OPTIONS = Object.freeze({
  fps: 30,
  playbackRate: 1,
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

function requirePositiveNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite number greater than 0.`);
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
  requirePositiveNumber(options.playbackRate, "options.playbackRate");
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
  const normalizedOptions = {
    ...options,
    playbackRate: options.playbackRate ?? DEFAULT_TIMELINE_OPTIONS.playbackRate,
  };
  validateTimelineInput(audioManifest, normalizedOptions);

  const scenes = [];
  let currentFrame = 0;

  audioManifest.scenes.forEach((scene) => {
    // The visual sequence uses the same compressed clock as the audio playback.
    const narrationFrames = Math.ceil(
      ((scene.durationMs / 1_000) * normalizedOptions.fps) / normalizedOptions.playbackRate,
    );
    const leadInFrames = Math.ceil(
      normalizedOptions.leadInFrames / normalizedOptions.playbackRate,
    );
    const leadOutFrames = Math.ceil(
      normalizedOptions.leadOutFrames / normalizedOptions.playbackRate,
    );
    const minimumSceneFrames = Math.ceil(
      normalizedOptions.minimumSceneFrames[scene.id] / normalizedOptions.playbackRate,
    );
    const totalNarrationFrames = leadInFrames + narrationFrames + leadOutFrames;
    const durationInFrames = Math.max(minimumSceneFrames, totalNarrationFrames);

    scenes.push({
      id: scene.id,
      from: currentFrame,
      audioFrom: currentFrame + leadInFrames,
      durationInFrames,
    });

    currentFrame += durationInFrames;
  });

  return {
    scenes,
    durationInFrames: currentFrame,
    durationSeconds: currentFrame / normalizedOptions.fps,
    playbackRate: normalizedOptions.playbackRate,
  };
}
