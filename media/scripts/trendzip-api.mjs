const OPERATIONS_API_KEY_HEADER = "X-Media-Operations-Key";

export class TrendzipApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "TrendzipApiError";
    this.status = status;
    this.code = code;
  }
}

async function readJson(response) {
  const text = await response.text();
  if (text.length === 0) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new TrendzipApiError(`Trendzip API response is not valid JSON. status=${response.status}`, {
      status: response.status,
    });
  }
}

function appendQuery(url, query) {
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
}

export function createTrendzipApiClient({
  baseUrl,
  mediaOperationsApiKey,
  cloudflareAccess = null,
  timeoutMs = 15_000,
  fetchImpl = globalThis.fetch,
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  async function request(path, { method = "GET", query, body, operations = false } = {}) {
    const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    appendQuery(url, query);

    const headers = new Headers({ Accept: "application/json" });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (cloudflareAccess) {
      headers.set("CF-Access-Client-Id", cloudflareAccess.clientId);
      headers.set("CF-Access-Client-Secret", cloudflareAccess.clientSecret);
    }
    if (operations) headers.set(OPERATIONS_API_KEY_HEADER, mediaOperationsApiKey);

    const response = await fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await readJson(response);

    if (!response.ok || payload?.success !== true || payload.data === null || payload.data === undefined) {
      throw new TrendzipApiError(
        payload?.error?.message ?? `Trendzip API request failed. status=${response.status}`,
        { status: response.status, code: payload?.error?.code },
      );
    }

    return payload.data;
  }

  return Object.freeze({
    async getKeywordList(generation) {
      const data = await request("/api/keywords", { query: { generation } });
      if (data.generation !== generation || !Array.isArray(data.keywords)) {
        throw new TrendzipApiError("Trendzip keyword list response has an invalid shape.");
      }
      return data;
    },
    async getKeywordDetail(keywordId) {
      const data = await request(`/api/ops/media/keywords/${keywordId}`, { operations: true });
      if (data.keywordId !== keywordId || typeof data.keyword !== "string") {
        throw new TrendzipApiError("Trendzip keyword detail response has an invalid shape.");
      }
      return data;
    },
    async getRecentShortformContents(from) {
      const data = await request("/api/ops/media/contents", {
        query: { from },
        operations: true,
      });
      if (!Array.isArray(data.contents)) {
        throw new TrendzipApiError("Trendzip shortform history response has an invalid shape.");
      }
      return data.contents;
    },
    async reserveDraft(draft) {
      const data = await request("/api/ops/media/contents", {
        method: "POST",
        body: draft,
        operations: true,
      });
      if (!Number.isInteger(data.id) || data.id < 1 || data.status !== "DRAFT") {
        throw new TrendzipApiError("Trendzip draft reservation response has an invalid shape.");
      }
      return data;
    },
    async registerRenderArtifact(shortformContentId, artifact) {
      const data = await request(
        `/api/ops/media/contents/${shortformContentId}/render-artifacts`,
        {
          method: "POST",
          body: artifact,
          operations: true,
        },
      );
      if (
        data?.content?.id !== shortformContentId ||
        data.content.status !== "REVIEW_REQUIRED" ||
        data?.artifact?.artifactHash !== artifact.artifactHash
      ) {
        throw new TrendzipApiError("Trendzip render artifact response has an invalid shape.");
      }
      return data;
    },
    async reviewRenderArtifact(shortformContentId, review) {
      const data = await request(`/api/ops/media/contents/${shortformContentId}/reviews`, {
        method: "POST",
        body: review,
        operations: true,
      });
      if (
        data?.content?.id !== shortformContentId ||
        data?.review?.artifactHash !== review.artifactHash ||
        data.review.decision !== review.decision
      ) {
        throw new TrendzipApiError("Trendzip render review response has an invalid shape.");
      }
      return data;
    },
  });
}
