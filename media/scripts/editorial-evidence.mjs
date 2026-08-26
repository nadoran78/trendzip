export function deriveEvidenceVideoIds(evidenceClaims) {
  if (!Array.isArray(evidenceClaims)) {
    throw new Error("evidenceClaims must be an array.");
  }

  return [
    ...new Set(
      evidenceClaims.map((claim, index) => {
        if (
          typeof claim !== "object" ||
          claim === null ||
          typeof claim.evidenceVideoId !== "string" ||
          claim.evidenceVideoId.trim().length === 0
        ) {
          throw new Error(`evidenceClaims[${index}].evidenceVideoId must be a non-empty string.`);
        }
        return claim.evidenceVideoId;
      }),
    ),
  ];
}
