import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { validateNarration, validateRecordedAt } from "./fixture.mjs";

const OPERATIONAL_MANIFEST_SCHEMA_VERSION = 4;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GENERATION_LABELS = new Map([
  ["TEEN", "10대"],
  ["TWENTY", "20대"],
]);
const RANK_TRENDS = new Set(["NEW", "UP", "DOWN", "SAME"]);
const CTA_HOSTNAME = "trendzip.nadoran.com";
const REQUIRED_UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];

function requireObject(value, name) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object.`);
  }
  return value;
}

function requireString(value, name, maxLength) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  if (Array.from(value).length > maxLength) {
    throw new Error(`${name} must be at most ${maxLength} characters.`);
  }
  return value;
}

function requirePositiveInteger(value, name, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}.`);
  }
  return value;
}

function requireSha256(value, name) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${name} must be a lowercase SHA-256 hash.`);
  }
  return value;
}

function requireTimestamp(value, name) {
  requireString(value, name, 40);
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${name} must be a valid date-time.`);
  }
  return value;
}

function requireCtaUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.hostname !== CTA_HOSTNAME) {
    throw new Error(`ctaUrl must use HTTPS and the ${CTA_HOSTNAME} host.`);
  }
  for (const key of REQUIRED_UTM_KEYS) {
    if (!parsed.searchParams.get(key)) {
      throw new Error(`ctaUrl must include ${key}.`);
    }
  }
  return value;
}

function fitDisplayText(value, maxLength) {
  const characters = Array.from(value);
  if (characters.length <= maxLength) return value;
  return `${characters.slice(0, maxLength - 1).join("")}…`;
}

export function validateOperationalRenderManifest(manifest) {
  requireObject(manifest, "manifest");
  if (manifest.schemaVersion !== OPERATIONAL_MANIFEST_SCHEMA_VERSION) {
    throw new Error(
      `operational manifest schemaVersion must be ${OPERATIONAL_MANIFEST_SCHEMA_VERSION}.`,
    );
  }
  if (manifest.status !== "DRAFT") {
    throw new Error("operational manifest status must be DRAFT.");
  }
  requireTimestamp(manifest.generatedAt, "generatedAt");
  requireSha256(manifest.contentHash, "contentHash");

  const reservation = requireObject(manifest.reservation, "reservation");
  requirePositiveInteger(reservation.shortformContentId, "reservation.shortformContentId");
  if (reservation.status !== "DRAFT") {
    throw new Error("reservation.status must be DRAFT.");
  }
  requireTimestamp(reservation.selectedAt, "reservation.selectedAt");

  const source = requireObject(manifest.source, "source");
  requirePositiveInteger(source.keywordId, "source.keywordId");
  requireString(source.keyword, "source.keyword", 24);
  if (!GENERATION_LABELS.has(source.generation)) {
    throw new Error("source.generation must be either TEEN or TWENTY.");
  }
  requireString(source.category, "source.category", 18);
  requirePositiveInteger(source.rank, "source.rank", 100);
  if (!RANK_TRENDS.has(source.rankTrend)) {
    throw new Error("source.rankTrend must be one of NEW, UP, DOWN, or SAME.");
  }

  const editorial = requireObject(manifest.editorial, "editorial");
  requireString(editorial.hook, "editorial.hook", 48);
  requireString(editorial.summary, "editorial.summary", 100);
  if (!Array.isArray(editorial.reasons) || editorial.reasons.length !== 2) {
    throw new Error("editorial.reasons must contain exactly two items.");
  }
  editorial.reasons.forEach((reason, index) =>
    requireString(reason, `editorial.reasons[${index}]`, 100));
  validateNarration(editorial.narration);

  if (!Array.isArray(manifest.evidence) || manifest.evidence.length < 1 || manifest.evidence.length > 3) {
    throw new Error("evidence must contain between one and three sources.");
  }
  manifest.evidence.forEach((evidence, index) => {
    requireObject(evidence, `evidence[${index}]`);
    requireString(evidence.publisher, `evidence[${index}].publisher`, 100);
    requireString(evidence.title, `evidence[${index}].title`, 300);
    const url = new URL(evidence.url);
    if (url.protocol !== "https:") {
      throw new Error(`evidence[${index}].url must use HTTPS.`);
    }
  });
  requireCtaUrl(manifest.ctaUrl);

  return manifest;
}

export function createOperationalRenderProps(manifest) {
  validateOperationalRenderManifest(manifest);

  const recordedAt = manifest.generatedAt.slice(0, 10);
  validateRecordedAt(recordedAt);

  return {
    isSample: false,
    sampleLabel: "운영 검수본",
    keyword: manifest.source.keyword,
    generation: manifest.source.generation,
    generationLabel: GENERATION_LABELS.get(manifest.source.generation),
    rank: manifest.source.rank,
    rankTrend: manifest.source.rankTrend,
    category: manifest.source.category,
    hook: manifest.editorial.hook,
    summary: manifest.editorial.summary,
    reasons: [...manifest.editorial.reasons],
    narration: { ...manifest.editorial.narration },
    evidence: manifest.evidence.map((evidence) => ({
      publisher: fitDisplayText(evidence.publisher, 30),
      title: fitDisplayText(evidence.title, 70),
      url: evidence.url,
    })),
    ctaUrl: manifest.ctaUrl,
    recordedAt,
    durationSeconds: 36,
  };
}

export function loadOperationalRenderInput(manifestPath) {
  const resolvedPath = resolve(manifestPath);
  const manifest = validateOperationalRenderManifest(
    JSON.parse(readFileSync(resolvedPath, "utf8")),
  );
  const expectedFilename = `${manifest.contentHash}.json`;
  if (basename(resolvedPath) !== expectedFilename) {
    throw new Error(`operational manifest filename must be ${expectedFilename}.`);
  }

  return {
    manifest,
    manifestPath: resolvedPath,
    renderProps: createOperationalRenderProps(manifest),
  };
}
