export const EDITORIAL_PLAN_VALIDATION_CODES = Object.freeze({
  HOOK_TOO_LONG: "HOOK_TOO_LONG",
  UNSUPPORTED_CLAIM: "UNSUPPORTED_CLAIM",
  OVERSTATED_TONE: "OVERSTATED_TONE",
});

const REPAIRABLE_EDITORIAL_PLAN_VALIDATION_CODES = new Set([
  EDITORIAL_PLAN_VALIDATION_CODES.HOOK_TOO_LONG,
  EDITORIAL_PLAN_VALIDATION_CODES.UNSUPPORTED_CLAIM,
  EDITORIAL_PLAN_VALIDATION_CODES.OVERSTATED_TONE,
]);

export class EditorialPlanValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "EditorialPlanValidationError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export function shouldRepairEditorialPlan(error) {
  if (!(error instanceof EditorialPlanValidationError)) {
    return false;
  }
  return REPAIRABLE_EDITORIAL_PLAN_VALIDATION_CODES.has(error.code);
}
