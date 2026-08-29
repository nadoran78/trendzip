import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { validateAudioManifest } from "./audio-manifest.mjs";
import {
  createOperationalRenderProps,
  validateOperationalRenderManifest,
} from "./operational-render-input.mjs";
import {
  OPERATIONAL_PUBLIC_CANDIDATE_PLAYBACK_RATE,
  OPERATIONAL_RENDER_PROFILE,
} from "./operational-render-profile.mjs";

const RENDER_MANIFEST_SCHEMA_VERSION = 3;
export { OPERATIONAL_RENDER_PROFILE };
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function hashObject(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function resolveRunFile(runDir, relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    isAbsolute(relativePath) ||
    relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`Render artifact path must be a safe relative path: ${relativePath}`);
  }
  return resolve(runDir, relativePath);
}

function requireHash(value, name) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${name} must be a lowercase SHA-256 hash.`);
  }
}

function createArtifactIdentity(manifest) {
  return {
    renderProfile: manifest.renderProfile,
    shortformContentId: manifest.shortformContentId,
    contentHash: manifest.contentHash,
    playbackRate: manifest.playbackRate,
    hashes: manifest.hashes,
    tts: manifest.tts,
    video: manifest.video,
  };
}

function assertRenderPropsMatchSource(sourceManifest, renderProps) {
  if (renderProps.isSample !== false) {
    throw new Error("operational render props must not be a sample.");
  }
  if (renderProps.sampleLabel !== null) {
    throw new Error("public candidate render props must set sampleLabel to null.");
  }

  const expectedProps = createOperationalRenderProps(sourceManifest);
  for (const [key, expectedValue] of Object.entries(expectedProps)) {
    if (JSON.stringify(renderProps[key]) !== JSON.stringify(expectedValue)) {
      throw new Error(`render props ${key} does not match the source manifest.`);
    }
  }
  if (!renderProps.timeline || !renderProps.narrationAudio) {
    throw new Error("render props must contain a narration timeline and audio paths.");
  }
  if (renderProps.timeline.playbackRate !== OPERATIONAL_PUBLIC_CANDIDATE_PLAYBACK_RATE) {
    throw new Error(
      `public candidate render props must use ${OPERATIONAL_PUBLIC_CANDIDATE_PLAYBACK_RATE}x playback.`,
    );
  }
}

function assertFileHash(runDir, relativePath, expectedHash, name) {
  requireHash(expectedHash, name);
  const absolutePath = resolveRunFile(runDir, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Render artifact file is missing: ${relativePath}`);
  }
  if (sha256File(absolutePath) !== expectedHash) {
    throw new Error(`Render artifact file hash does not match: ${relativePath}`);
  }
}

function collectAudioFileHashes(runDir, audioManifest) {
  return Object.fromEntries(
    audioManifest.scenes.map((scene) => {
      const relativePath = `tts/${scene.file}`;
      return [relativePath, sha256File(resolveRunFile(runDir, relativePath))];
    }),
  );
}

function collectStillHashes(runDir, stillFiles) {
  return Object.fromEntries(
    stillFiles.map((relativePath) => [
      relativePath,
      sha256File(resolveRunFile(runDir, relativePath)),
    ]),
  );
}

export function createOperationalRenderManifest({
  runDir,
  videoMetadata,
  stillFiles,
  createdAt = new Date().toISOString(),
}) {
  const files = {
    sourceManifest: "source-manifest.json",
    audioManifest: "tts/audio-manifest.json",
    renderProps: "render-props.json",
    video: "video.mp4",
    stills: [...stillFiles],
  };
  const sourceManifest = validateOperationalRenderManifest(
    readJson(resolveRunFile(runDir, files.sourceManifest)),
  );
  const audioManifest = readJson(resolveRunFile(runDir, files.audioManifest));
  const renderProps = readJson(resolveRunFile(runDir, files.renderProps));
  validateAudioManifest(audioManifest, renderProps);
  assertRenderPropsMatchSource(sourceManifest, renderProps);

  const manifest = {
    schemaVersion: RENDER_MANIFEST_SCHEMA_VERSION,
    status: "LOCAL_RENDERED",
    renderProfile: OPERATIONAL_RENDER_PROFILE,
    createdAt,
    shortformContentId: sourceManifest.reservation.shortformContentId,
    contentHash: sourceManifest.contentHash,
    playbackRate: renderProps.timeline.playbackRate,
    artifactHash: null,
    files,
    hashes: {
      sourceManifest: sha256File(resolveRunFile(runDir, files.sourceManifest)),
      audioManifest: sha256File(resolveRunFile(runDir, files.audioManifest)),
      audioFiles: collectAudioFileHashes(runDir, audioManifest),
      renderProps: sha256File(resolveRunFile(runDir, files.renderProps)),
      video: sha256File(resolveRunFile(runDir, files.video)),
      stills: collectStillHashes(runDir, stillFiles),
    },
    tts: {
      provider: audioManifest.provider,
      model: audioManifest.model,
      voice: audioManifest.voice,
      scriptHash: audioManifest.scriptHash,
    },
    video: { ...videoMetadata },
    sourceReviewWarnings: sourceManifest.reviewWarnings ?? [],
    reviewChecklist: [
      "TTS 발음, 속도와 음량을 전체 재생으로 확인한다.",
      "장면 전환, 자막 싱크와 화면 겹침을 확인한다.",
      "두 이유와 근거 출처가 원본 manifest와 같은지 확인한다.",
      "CTA와 AI 제작 보조 공개 여부를 확인한다.",
    ],
    registration: null,
    review: null,
  };
  manifest.artifactHash = hashObject(createArtifactIdentity(manifest));
  return manifest;
}

export function validateOperationalRenderManifestFile(runDir, { verifyFiles = true } = {}) {
  const manifestPath = resolve(runDir, "render-manifest.json");
  const manifest = readJson(manifestPath);
  if (manifest.schemaVersion !== RENDER_MANIFEST_SCHEMA_VERSION) {
    throw new Error(`render manifest schemaVersion must be ${RENDER_MANIFEST_SCHEMA_VERSION}.`);
  }
  if (manifest.status !== "LOCAL_RENDERED") {
    throw new Error("render manifest status must be LOCAL_RENDERED.");
  }
  if (manifest.renderProfile !== OPERATIONAL_RENDER_PROFILE) {
    throw new Error(`render manifest renderProfile must be ${OPERATIONAL_RENDER_PROFILE}.`);
  }
  if (manifest.playbackRate !== OPERATIONAL_PUBLIC_CANDIDATE_PLAYBACK_RATE) {
    throw new Error(
      `render manifest playbackRate must be ${OPERATIONAL_PUBLIC_CANDIDATE_PLAYBACK_RATE}.`,
    );
  }
  if (!Number.isInteger(manifest.shortformContentId) || manifest.shortformContentId < 1) {
    throw new Error("render manifest shortformContentId must be a positive integer.");
  }
  requireHash(manifest.contentHash, "render manifest contentHash");
  requireHash(manifest.artifactHash, "render manifest artifactHash");

  const sourceManifest = validateOperationalRenderManifest(
    readJson(resolveRunFile(runDir, manifest.files.sourceManifest)),
  );
  if (
    sourceManifest.reservation.shortformContentId !== manifest.shortformContentId ||
    sourceManifest.contentHash !== manifest.contentHash
  ) {
    throw new Error("render manifest identity does not match the source manifest.");
  }
  const audioManifest = readJson(resolveRunFile(runDir, manifest.files.audioManifest));
  const renderProps = readJson(resolveRunFile(runDir, manifest.files.renderProps));
  validateAudioManifest(audioManifest, renderProps);
  assertRenderPropsMatchSource(sourceManifest, renderProps);

  if (hashObject(createArtifactIdentity(manifest)) !== manifest.artifactHash) {
    throw new Error("render manifest artifactHash does not match its identity.");
  }

  if (verifyFiles) {
    assertFileHash(
      runDir,
      manifest.files.sourceManifest,
      manifest.hashes.sourceManifest,
      "hashes.sourceManifest",
    );
    assertFileHash(
      runDir,
      manifest.files.audioManifest,
      manifest.hashes.audioManifest,
      "hashes.audioManifest",
    );
    assertFileHash(
      runDir,
      manifest.files.renderProps,
      manifest.hashes.renderProps,
      "hashes.renderProps",
    );
    assertFileHash(runDir, manifest.files.video, manifest.hashes.video, "hashes.video");
    for (const [relativePath, hash] of Object.entries(manifest.hashes.audioFiles)) {
      assertFileHash(runDir, relativePath, hash, `hashes.audioFiles.${relativePath}`);
    }
    for (const [relativePath, hash] of Object.entries(manifest.hashes.stills)) {
      assertFileHash(runDir, relativePath, hash, `hashes.stills.${relativePath}`);
    }
  }

  return { manifest, manifestPath, sourceManifest, audioManifest, renderProps };
}

export function writeOperationalRenderManifest(manifestPath, manifest) {
  const temporaryPath = `${manifestPath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, manifestPath);
}
