const SEOUL_TIME_ZONE = "Asia/Seoul";

function requireValidDate(value, name) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be a valid Date.`);
  }
}

export function formatSeoulLocalDateTime(value) {
  requireValidDate(value, "value");

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(value)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

export function parseSeoulLocalDateTime(value) {
  if (typeof value !== "string") {
    throw new Error("value must be a Seoul local date time string.");
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?$/);
  if (!match) {
    throw new Error("value must use ISO local date time format.");
  }

  const milliseconds = (match[2] ?? "").padEnd(3, "0").slice(0, 3);
  const parsed = new Date(`${match[1]}.${milliseconds}+09:00`);
  requireValidDate(parsed, "value");
  return parsed;
}

export function isRecentSeoulLocalDateTime(value, now, maximumAgeHours) {
  requireValidDate(now, "now");
  if (!Number.isInteger(maximumAgeHours) || maximumAgeHours < 1) {
    throw new Error("maximumAgeHours must be a positive integer.");
  }

  const ageMilliseconds = now.getTime() - parseSeoulLocalDateTime(value).getTime();
  return ageMilliseconds >= 0 && ageMilliseconds <= maximumAgeHours * 60 * 60 * 1_000;
}

export function calculateHistoryFrom(now, historyWindowDays) {
  requireValidDate(now, "now");
  if (!Number.isInteger(historyWindowDays) || historyWindowDays < 1) {
    throw new Error("historyWindowDays must be a positive integer.");
  }

  const from = new Date(now.getTime() - historyWindowDays * 24 * 60 * 60 * 1_000);
  return formatSeoulLocalDateTime(from);
}
