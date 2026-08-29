import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

import { validateAudioManifest } from "./audio-manifest.mjs";
import { loadFixture } from "./fixture.mjs";
import { calculateSceneTimeline } from "./timeline.mjs";

function validateAudioPublicPath(audioPublicPath) {
  if (
    typeof audioPublicPath !== "string" ||
    audioPublicPath.length === 0 ||
    audioPublicPath.startsWith("/") ||
    audioPublicPath
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error("audioPublicPath must be a safe relative public path.");
  }
}

function validateAudioFiles(manifest, audioDir) {
  for (const scene of manifest.scenes) {
    const audioPath = resolve(audioDir, scene.file);
    if (!existsSync(audioPath)) {
      throw new Error(`Narration audio file is missing: ${scene.file}`);
    }
    const audioFile = statSync(audioPath);
    if (!audioFile.isFile()) {
      throw new Error(`Narration audio file is missing: ${scene.file}`);
    }
    if (audioFile.size !== scene.byteLength) {
      throw new Error(`Narration audio file size does not match the manifest: ${scene.file}`);
    }
  }
}

export function createNarratedRenderProps({
  fixture,
  manifest,
  audioDir,
  audioPublicPath,
  timelineOptions,
}) {
  validateAudioManifest(manifest, fixture);
  validateAudioPublicPath(audioPublicPath);
  validateAudioFiles(manifest, audioDir);

  const timeline = calculateSceneTimeline(manifest, timelineOptions);
  const narrationAudio = Object.fromEntries(
    manifest.scenes.map((scene) => [scene.id, `${audioPublicPath}/${scene.file}`]),
  );

  return {
    ...fixture,
    timeline,
    narrationAudio,
  };
}

export function loadNarratedRenderInput({ fixturePath, manifestPath }) {
  const fixture = loadFixture(fixturePath);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const audioDir = dirname(manifestPath);
  const publicDir = dirname(audioDir);
  const renderProps = createNarratedRenderProps({
    fixture,
    manifest,
    audioDir,
    audioPublicPath: basename(audioDir),
  });

  return { fixture, publicDir, renderProps };
}
