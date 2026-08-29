import assert from "node:assert/strict";
import test from "node:test";

import {
  EDITORIAL_PLAN_VALIDATION_CODES,
  EditorialPlanValidationError,
  shouldRepairEditorialPlan,
} from "./editorial-plan-validation.mjs";

const repairableCodes = [
  EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_PRIMARY_KEYWORD_ID,
  EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_RELATED_KEYWORD_ID,
  EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_EVIDENCE_VIDEO_ID,
  EDITORIAL_PLAN_VALIDATION_CODES.INVALID_EVIDENCE_EXCERPT,
  EDITORIAL_PLAN_VALIDATION_CODES.EDITORIAL_SELECTION_CONTRACT_VIOLATIONS,
];

test("repair policy accepts only reference selection violations", () => {
  repairableCodes.forEach((code) => {
    assert.equal(
      shouldRepairEditorialPlan(new EditorialPlanValidationError(code, code)),
      true,
      `${code} should be repairable`,
    );
  });
});

test("repair policy rejects prose, transport, parsing, and no-effect failures", () => {
  assert.equal(shouldRepairEditorialPlan(new Error("summary too long")), false);
  assert.equal(shouldRepairEditorialPlan(new Error("Gemini request failed with HTTP 429")), false);
  assert.equal(shouldRepairEditorialPlan(new SyntaxError("invalid JSON")), false);
  assert.equal(
    shouldRepairEditorialPlan(
      new EditorialPlanValidationError(
        EDITORIAL_PLAN_VALIDATION_CODES.REPAIR_NO_EFFECT,
        "same selection",
      ),
    ),
    false,
  );
});
