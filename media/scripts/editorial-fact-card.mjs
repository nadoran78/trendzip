import {
  EDITORIAL_PLAN_VALIDATION_CODES,
  EditorialPlanValidationError,
} from "./editorial-plan-validation.mjs";

function normalizeEvidenceText(value) {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim().toLocaleLowerCase("ko-KR");
}

function requireEvidenceSelection(selection, index) {
  if (typeof selection !== "object" || selection === null || Array.isArray(selection)) {
    throw new Error(`evidenceSelections[${index}] must be an object.`);
  }
  if (
    typeof selection.evidenceVideoId !== "string" ||
    selection.evidenceVideoId.trim().length === 0
  ) {
    throw new Error(`evidenceSelections[${index}].evidenceVideoId must be a non-empty string.`);
  }
  if (typeof selection.sourceExcerpt !== "string" || selection.sourceExcerpt.trim().length === 0) {
    throw new Error(`evidenceSelections[${index}].sourceExcerpt must be a non-empty string.`);
  }
}

export function createEvidenceFactCards(candidate, evidenceSelections) {
  if (!candidate || !Array.isArray(candidate.relatedVideos)) {
    throw new Error("candidate.relatedVideos must be an array.");
  }
  if (!Array.isArray(evidenceSelections) || evidenceSelections.length === 0) {
    throw new Error("evidenceSelections must contain at least one item.");
  }

  const videosById = new Map(candidate.relatedVideos.map((video) => [video.videoId, video]));
  const selectedVideoIds = new Set();
  const factCards = [];

  evidenceSelections.forEach((selection, index) => {
    requireEvidenceSelection(selection, index);

    const video = videosById.get(selection.evidenceVideoId);
    if (!video) {
      throw new EditorialPlanValidationError(
        EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_EVIDENCE_VIDEO_ID,
        `evidenceSelections[${index}] references an unknown video ID.`,
        {
          field: `evidenceSelections[${index}].evidenceVideoId`,
          invalidValue: selection.evidenceVideoId,
          allowedValues: [...videosById.keys()],
        },
      );
    }

    const normalizedSource = normalizeEvidenceText(`${video.title}\n${video.channelName}`);
    const normalizedExcerpt = normalizeEvidenceText(selection.sourceExcerpt);
    if (!normalizedSource.includes(normalizedExcerpt)) {
      throw new EditorialPlanValidationError(
        EDITORIAL_PLAN_VALIDATION_CODES.INVALID_EVIDENCE_EXCERPT,
        `evidenceSelections[${index}].sourceExcerpt is absent from the selected video metadata.`,
        {
          field: `evidenceSelections[${index}].sourceExcerpt`,
          evidenceVideoId: selection.evidenceVideoId,
          sourceExcerpt: selection.sourceExcerpt,
          allowedSourceText: [video.title, video.channelName],
        },
      );
    }

    if (selectedVideoIds.has(video.videoId)) return;
    selectedVideoIds.add(video.videoId);
    factCards.push({
      videoId: video.videoId,
      channelName: video.channelName,
      title: video.title,
      sourceExcerpt: selection.sourceExcerpt.trim(),
      publishedAt: video.publishedAt,
    });
  });

  return factCards;
}
