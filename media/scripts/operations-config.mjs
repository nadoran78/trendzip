const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_CANDIDATE_LIMIT_PER_GENERATION = 10;
const MAXIMUM_CANDIDATE_AGE_HOURS = 72;

function requireString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function requireUrl(value, name) {
  const normalized = requireString(value, name).replace(/\/+$/, "");
  const parsed = new URL(normalized);
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
    throw new Error(`${name} must use HTTP or HTTPS.`);
  }
  return normalized;
}

function parsePositiveInteger(value, name, defaultValue, maximum) {
  if (value === undefined || value === "") return defaultValue;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}.`);
  }
  return parsed;
}

function loadCloudflareAccessCredentials(env) {
  const clientId = env.CLOUDFLARE_ACCESS_CLIENT_ID?.trim();
  const clientSecret = env.CLOUDFLARE_ACCESS_CLIENT_SECRET?.trim();

  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error(
      "CLOUDFLARE_ACCESS_CLIENT_ID and CLOUDFLARE_ACCESS_CLIENT_SECRET must be configured together.",
    );
  }

  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function loadOperationalDraftConfig(env = process.env) {
  return Object.freeze({
    apiBaseUrl: requireUrl(env.TRENDZIP_API_BASE_URL, "TRENDZIP_API_BASE_URL"),
    mediaOperationsApiKey: requireString(
      env.MEDIA_OPERATIONS_API_KEY,
      "MEDIA_OPERATIONS_API_KEY",
    ),
    cloudflareAccess: loadCloudflareAccessCredentials(env),
    geminiApiKey: requireString(env.GEMINI_API_KEY, "GEMINI_API_KEY"),
    geminiBaseUrl: requireUrl(
      env.GEMINI_BASE_URL ?? DEFAULT_GEMINI_BASE_URL,
      "GEMINI_BASE_URL",
    ),
    geminiModel: requireString(
      env.GEMINI_EDITORIAL_MODEL ?? DEFAULT_GEMINI_MODEL,
      "GEMINI_EDITORIAL_MODEL",
    ),
    requestTimeoutMs: parsePositiveInteger(
      env.MEDIA_REQUEST_TIMEOUT_MS,
      "MEDIA_REQUEST_TIMEOUT_MS",
      DEFAULT_REQUEST_TIMEOUT_MS,
      120_000,
    ),
    candidateLimitPerGeneration: parsePositiveInteger(
      env.MEDIA_CANDIDATE_LIMIT_PER_GENERATION,
      "MEDIA_CANDIDATE_LIMIT_PER_GENERATION",
      DEFAULT_CANDIDATE_LIMIT_PER_GENERATION,
      20,
    ),
    historyWindowDays: 30,
    maximumCandidateAgeHours: MAXIMUM_CANDIDATE_AGE_HOURS,
  });
}
