import assert from "node:assert/strict";
import test from "node:test";

import { validateNarration, validateRecordedAt } from "./fixture.mjs";

const validNarration = {
  hook: "훅",
  overview: "개요",
  reasons: "이유",
  evidence: "근거",
  cta: "행동 유도",
};

test("recordedAt accepts a valid YYYY-MM-DD date", () => {
  assert.doesNotThrow(() => validateRecordedAt("2026-08-18"));
});

test("recordedAt rejects a value with a different format", () => {
  assert.throws(
    () => validateRecordedAt("2026/08/18"),
    /recordedAt must use the YYYY-MM-DD format/,
  );
});

test("recordedAt rejects a date that does not exist", () => {
  assert.throws(
    () => validateRecordedAt("2026-02-31"),
    /recordedAt must be a valid calendar date/,
  );
});

test("narration accepts every supported scene", () => {
  assert.doesNotThrow(() => validateNarration(validNarration));
});

test("narration rejects missing scenes", () => {
  const { cta: _, ...missingCta } = validNarration;

  assert.throws(
    () => validateNarration(missingCta),
    /narration must contain exactly/,
  );
});

test("narration rejects unknown scenes", () => {
  assert.throws(
    () => validateNarration({ ...validNarration, outro: "지원하지 않는 장면" }),
    /narration must contain exactly/,
  );
});
