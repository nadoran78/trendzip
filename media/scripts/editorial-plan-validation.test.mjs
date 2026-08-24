import assert from "node:assert/strict";
import test from "node:test";

import {
  EDITORIAL_PLAN_VALIDATION_CODES,
  EditorialPlanValidationError,
  shouldRepairEditorialPlan,
} from "./editorial-plan-validation.mjs";

const repairableCodes = [
  EDITORIAL_PLAN_VALIDATION_CODES.HOOK_TOO_LONG,
  EDITORIAL_PLAN_VALIDATION_CODES.UNSUPPORTED_CLAIM,
  EDITORIAL_PLAN_VALIDATION_CODES.OVERSTATED_TONE,
  EDITORIAL_PLAN_VALIDATION_CODES.UNSUPPORTED_GENERATION_CLAIM,
  EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_RELATED_KEYWORD_ID,
  EDITORIAL_PLAN_VALIDATION_CODES.UNKNOWN_EVIDENCE_VIDEO_ID,
];

test("repair policy accepts only repairable editorial plan violations", () => {
  repairableCodes.forEach((code) => {
    const error = new EditorialPlanValidationError(code, `invalid editorial plan: ${code}`);

    assert.equal(shouldRepairEditorialPlan(error), true, `${code} should be repairable`);
  });
});

test("repair policy rejects ordinary transport and parsing errors", () => {
  assert.equal(shouldRepairEditorialPlan(new Error("Gemini request failed with HTTP 429")), false);
  assert.equal(shouldRepairEditorialPlan(new SyntaxError("invalid JSON")), false);
  assert.equal(shouldRepairEditorialPlan(null), false);
  assert.equal(shouldRepairEditorialPlan(undefined), false);
  assert.equal(shouldRepairEditorialPlan({ code: "HOOK_TOO_LONG" }), false);
});

test("repair policy rejects unknown editorial validation codes", () => {
  const error = new EditorialPlanValidationError("UNKNOWN_REFERENCE", "unknown video ID");

  assert.equal(shouldRepairEditorialPlan(error), false);
});
