import { resolve } from "node:path";

import { probeOperationalVideo } from "./operational-renderer.mjs";
import {
  validateOperationalRenderManifestFile,
  writeOperationalRenderManifest,
} from "./operational-render-manifest.mjs";

const REVIEW_DECISIONS = new Set(["APPROVED", "NEEDS_REVISION", "REJECTED"]);

function assertVideoMetadata(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Current MP4 metadata does not match the render manifest.");
  }
}

export function createRenderArtifactRegistrationPayload(manifest) {
  return {
    contentHash: manifest.contentHash,
    artifactHash: manifest.artifactHash,
    sourceManifestHash: manifest.hashes.sourceManifest,
    audioManifestHash: manifest.hashes.audioManifest,
    renderPropsHash: manifest.hashes.renderProps,
    videoHash: manifest.hashes.video,
    ttsModel: manifest.tts.model,
    ttsVoice: manifest.tts.voice,
    durationMillis: manifest.video.durationMillis,
    width: manifest.video.width,
    height: manifest.video.height,
    fps: manifest.video.fps,
    videoCodec: manifest.video.videoCodec,
    audioCodec: manifest.video.audioCodec,
  };
}

export async function registerOperationalRender({
  runDir,
  apiClient,
  probeVideo = probeOperationalVideo,
}) {
  const validated = validateOperationalRenderManifestFile(runDir);
  if (validated.manifest.registration) {
    throw new Error("This render artifact is already registered.");
  }

  const currentVideoMetadata = probeVideo(
    resolve(runDir, validated.manifest.files.video),
    validated.renderProps.timeline.durationSeconds,
  );
  assertVideoMetadata(currentVideoMetadata, validated.manifest.video);

  const response = await apiClient.registerRenderArtifact(
    validated.manifest.shortformContentId,
    createRenderArtifactRegistrationPayload(validated.manifest),
  );
  const updatedManifest = {
    ...validated.manifest,
    registration: {
      artifactId: response.artifact.id,
      artifactHash: response.artifact.artifactHash,
      registeredAt: response.artifact.createdAt,
      contentStatus: response.content.status,
    },
  };
  writeOperationalRenderManifest(validated.manifestPath, updatedManifest);
  return { manifest: updatedManifest, response };
}

export async function reviewOperationalRender({
  runDir,
  decision,
  reviewer,
  reason,
  apiClient,
  probeVideo = probeOperationalVideo,
}) {
  if (!REVIEW_DECISIONS.has(decision)) {
    throw new Error("decision must be APPROVED, NEEDS_REVISION, or REJECTED.");
  }
  if (typeof reviewer !== "string" || reviewer.trim().length === 0 || reviewer.length > 100) {
    throw new Error("reviewer must be a non-empty string of at most 100 characters.");
  }
  if (typeof reason !== "string" || reason.trim().length === 0 || reason.length > 2_000) {
    throw new Error("reason must be a non-empty string of at most 2000 characters.");
  }

  const validated = validateOperationalRenderManifestFile(runDir);
  if (!validated.manifest.registration) {
    throw new Error("The render artifact must be registered before review.");
  }
  if (validated.manifest.review) {
    throw new Error("This render artifact already has a review decision.");
  }
  if (validated.manifest.registration.artifactHash !== validated.manifest.artifactHash) {
    throw new Error("The registered artifact hash does not match the local render.");
  }

  const currentVideoMetadata = probeVideo(
    resolve(runDir, validated.manifest.files.video),
    validated.renderProps.timeline.durationSeconds,
  );
  assertVideoMetadata(currentVideoMetadata, validated.manifest.video);

  const response = await apiClient.reviewRenderArtifact(
    validated.manifest.shortformContentId,
    {
      artifactHash: validated.manifest.artifactHash,
      decision,
      reviewer: reviewer.trim(),
      reason: reason.trim(),
    },
  );
  const updatedManifest = {
    ...validated.manifest,
    review: {
      decisionId: response.review.id,
      artifactHash: response.review.artifactHash,
      decision: response.review.decision,
      reviewer: response.review.reviewer,
      reason: response.review.reason,
      reviewedAt: response.review.createdAt,
      contentStatus: response.content.status,
    },
  };
  writeOperationalRenderManifest(validated.manifestPath, updatedManifest);
  return { manifest: updatedManifest, response };
}
