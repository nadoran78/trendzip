import { readFileSync } from "node:fs";

import { NARRATION_SCENE_IDS } from "./scenes.mjs";

const REQUIRED_UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];
const GENERATION_LABELS = new Map([
  ["TEEN", "10대"],
  ["TWENTY", "20대"],
]);
const RANK_TRENDS = new Set(["NEW", "UP", "DOWN", "SAME"]);
const CTA_HOSTNAME = "trendzip.nadoran.com";

function requireString(value, name, maxLength) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  if (value.length > maxLength) {
    throw new Error(`${name} must be at most ${maxLength} characters.`);
  }
}

function requireHttpsUrl(value, name) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS.`);
  }
  return parsed;
}

export function validateRecordedAt(recordedAt) {
  requireString(recordedAt, "recordedAt", 10);

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(recordedAt)) {
    throw new Error("recordedAt must use the YYYY-MM-DD format.");
  }
  const date = new Date(recordedAt);
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== recordedAt) {
    throw new Error("recordedAt must be a valid calendar date.");
  }
}

export function validateNarration(narration) {
  if (typeof narration !== "object" || narration === null || Array.isArray(narration)) {
    throw new Error("narration must be an object keyed by scene ID.");
  }

  const keys = Object.keys(narration).sort();
  const expectedKeys = [...NARRATION_SCENE_IDS].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`narration must contain exactly: ${NARRATION_SCENE_IDS.join(", ")}.`);
  }

  for (const sceneId of NARRATION_SCENE_IDS) {
    requireString(narration[sceneId], `narration.${sceneId}`, 320);
  }
}

export function loadFixture(path) {
  const fixture = JSON.parse(readFileSync(path, "utf8"));

  if (fixture.isSample !== true) {
    throw new Error("The spike only accepts fixtures explicitly marked as samples.");
  }

  requireString(fixture.sampleLabel, "sampleLabel", 30);
  if (!fixture.sampleLabel.toUpperCase().includes("SAMPLE")) {
    throw new Error("sampleLabel must visibly identify the output as a SAMPLE.");
  }
  requireString(fixture.keyword, "keyword", 24);
  if (!GENERATION_LABELS.has(fixture.generation)) {
    throw new Error("generation must be either TEEN or TWENTY.");
  }
  requireString(fixture.generationLabel, "generationLabel", 12);
  if (fixture.generationLabel !== GENERATION_LABELS.get(fixture.generation)) {
    throw new Error("generationLabel must match generation.");
  }
  if (!RANK_TRENDS.has(fixture.rankTrend)) {
    throw new Error("rankTrend must be one of NEW, UP, DOWN, or SAME.");
  }
  requireString(fixture.category, "category", 18);
  requireString(fixture.hook, "hook", 48);
  requireString(fixture.summary, "summary", 100);
  validateRecordedAt(fixture.recordedAt);

  if (!Number.isInteger(fixture.rank) || fixture.rank < 1 || fixture.rank > 100) {
    throw new Error("rank must be an integer between 1 and 100.");
  }
  if (fixture.durationSeconds !== 36) {
    throw new Error("The first spike template requires durationSeconds to be exactly 36.");
  }
  if (!Array.isArray(fixture.reasons) || fixture.reasons.length !== 2) {
    throw new Error("reasons must contain exactly two items for the spike template.");
  }
  fixture.reasons.forEach((reason, index) => requireString(reason, `reasons[${index}]`, 100));
  validateNarration(fixture.narration);

  if (!Array.isArray(fixture.evidence) || fixture.evidence.length < 1 || fixture.evidence.length > 3) {
    throw new Error("evidence must contain between one and three sources.");
  }
  fixture.evidence.forEach((item, index) => {
    requireString(item.publisher, `evidence[${index}].publisher`, 30);
    requireString(item.title, `evidence[${index}].title`, 70);
    requireHttpsUrl(item.url, `evidence[${index}].url`);
  });

  const ctaUrl = requireHttpsUrl(fixture.ctaUrl, "ctaUrl");
  if (ctaUrl.hostname !== CTA_HOSTNAME) {
    throw new Error(`ctaUrl must use the ${CTA_HOSTNAME} host.`);
  }
  for (const key of REQUIRED_UTM_KEYS) {
    if (!ctaUrl.searchParams.get(key)) {
      throw new Error(`ctaUrl must include ${key}.`);
    }
  }

  return fixture;
}
