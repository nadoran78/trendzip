import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";

import { validateOperationalRenderManifest } from "./operational-render-input.mjs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertUnregisteredSourceRun(sourceRunDir) {
  const renderManifestPath = resolve(sourceRunDir, "render-manifest.json");
  if (!existsSync(renderManifestPath)) return;

  const renderManifest = readJson(renderManifestPath);
  if (renderManifest.registration || renderManifest.review) {
    throw new Error("Only an unregistered and unreviewed render can be recreated as a public candidate.");
  }
}

export function preparePublicCandidateRerender({ sourceRunDir, outputRunDir }) {
  const resolvedSourceRunDir = resolve(sourceRunDir);
  const resolvedOutputRunDir = resolve(outputRunDir);
  if (resolvedSourceRunDir === resolvedOutputRunDir) {
    throw new Error("Public candidate output directory must differ from the source run directory.");
  }
  if (existsSync(resolvedOutputRunDir)) {
    throw new Error(`Public candidate output directory already exists: ${resolvedOutputRunDir}`);
  }

  const sourceManifestPath = resolve(resolvedSourceRunDir, "source-manifest.json");
  const sourceManifest = validateOperationalRenderManifest(readJson(sourceManifestPath));
  const sourceAudioDirectory = resolve(resolvedSourceRunDir, "tts");
  if (!existsSync(resolve(sourceAudioDirectory, "audio-manifest.json"))) {
    throw new Error("Source run TTS audio manifest is missing.");
  }
  assertUnregisteredSourceRun(resolvedSourceRunDir);

  mkdirSync(dirname(resolvedOutputRunDir), { recursive: true });
  const stagingDirectory = resolve(
    dirname(resolvedOutputRunDir),
    `.${basename(resolvedOutputRunDir)}-${process.pid}-${randomUUID()}.tmp`,
  );
  mkdirSync(stagingDirectory, { recursive: true });

  try {
    // Preserve the original artifact and copy only immutable inputs for a new public candidate.
    copyFileSync(sourceManifestPath, resolve(stagingDirectory, "source-manifest.json"));
    cpSync(sourceAudioDirectory, resolve(stagingDirectory, "tts"), { recursive: true });
    renameSync(stagingDirectory, resolvedOutputRunDir);
    return {
      outputRunDir: resolvedOutputRunDir,
      shortformContentId: sourceManifest.reservation.shortformContentId,
    };
  } catch (error) {
    rmSync(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}
