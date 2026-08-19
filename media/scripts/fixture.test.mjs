import assert from "node:assert/strict";
import test from "node:test";

import { validateRecordedAt } from "./fixture.mjs";

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
