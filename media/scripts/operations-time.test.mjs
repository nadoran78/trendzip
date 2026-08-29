import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHistoryFrom,
  formatSeoulLocalDateTime,
  isRecentSeoulLocalDateTime,
  parseSeoulLocalDateTime,
} from "./operations-time.mjs";

test("Seoul local date time is independent of the machine time zone", () => {
  assert.equal(
    formatSeoulLocalDateTime(new Date("2026-08-21T03:34:56.000Z")),
    "2026-08-21T12:34:56",
  );
});

test("history start subtracts whole days before formatting in Seoul time", () => {
  assert.equal(
    calculateHistoryFrom(new Date("2026-08-21T03:00:00.000Z"), 30),
    "2026-07-22T12:00:00",
  );
});

test("Seoul local date time parser preserves fractional seconds", () => {
  assert.equal(
    parseSeoulLocalDateTime("2026-08-21T12:34:56.123456").toISOString(),
    "2026-08-21T03:34:56.123Z",
  );
});

test("recent local date time accepts only values inside the maximum age", () => {
  const now = new Date("2026-08-21T03:00:00.000Z");

  assert.equal(isRecentSeoulLocalDateTime("2026-08-18T12:00:00", now, 72), true);
  assert.equal(isRecentSeoulLocalDateTime("2026-08-18T11:59:59", now, 72), false);
});
