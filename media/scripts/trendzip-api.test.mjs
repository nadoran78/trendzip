import assert from "node:assert/strict";
import test from "node:test";

import { createTrendzipApiClient, TrendzipApiError } from "./trendzip-api.mjs";

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createClient(fetchImpl) {
  return createTrendzipApiClient({
    baseUrl: "https://api.example.com",
    mediaOperationsApiKey: "operations-key",
    cloudflareAccess: { clientId: "access-id", clientSecret: "access-secret" },
    fetchImpl,
  });
}

test("keyword list request uses the generation query and Cloudflare service token", async () => {
  let captured;
  const client = createClient(async (url, init) => {
    captured = { url, init };
    return jsonResponse({
      success: true,
      data: { generation: "TEEN", keywords: [] },
      error: null,
    });
  });

  await client.getKeywordList("TEEN");

  assert.equal(captured.url.toString(), "https://api.example.com/api/keywords?generation=TEEN");
  assert.equal(captured.init.headers.get("CF-Access-Client-Id"), "access-id");
  assert.equal(captured.init.headers.get("CF-Access-Client-Secret"), "access-secret");
  assert.equal(captured.init.headers.has("X-Media-Operations-Key"), false);
});

test("shortform history request includes the operations API key", async () => {
  let captured;
  const client = createClient(async (url, init) => {
    captured = { url, init };
    return jsonResponse({ success: true, data: { contents: [] }, error: null });
  });

  await client.getRecentShortformContents("2026-07-22T12:00:00");

  assert.equal(
    captured.url.toString(),
    "https://api.example.com/api/ops/media/contents?from=2026-07-22T12%3A00%3A00",
  );
  assert.equal(captured.init.headers.get("X-Media-Operations-Key"), "operations-key");
});

test("media keyword detail request uses the protected operations endpoint", async () => {
  let captured;
  const client = createClient(async (url, init) => {
    captured = { url, init };
    return jsonResponse({
      success: true,
      data: { keywordId: 101, keyword: "메이드 인 코리아" },
      error: null,
    });
  });

  await client.getKeywordDetail(101);

  assert.equal(captured.url.toString(), "https://api.example.com/api/ops/media/keywords/101");
  assert.equal(captured.init.headers.get("X-Media-Operations-Key"), "operations-key");
});

test("reserve draft serializes the request body", async () => {
  let captured;
  const client = createClient(async (url, init) => {
    captured = { url, init };
    return jsonResponse({ success: true, data: { id: 1, status: "DRAFT" }, error: null });
  });

  await client.reserveDraft({ eventKey: "made-in-korea:release" });

  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.get("Content-Type"), "application/json");
  assert.deepEqual(JSON.parse(captured.init.body), { eventKey: "made-in-korea:release" });
});

test("reserve draft rejects a response without a persisted draft ID", async () => {
  const client = createClient(async () =>
    jsonResponse({ success: true, data: { id: null, status: "DRAFT" }, error: null }),
  );

  await assert.rejects(
    () => client.reserveDraft({ eventKey: "made-in-korea:release" }),
    /reservation response has an invalid shape/,
  );
});

test("render artifact registration uses the protected content endpoint", async () => {
  let captured;
  const client = createClient(async (url, init) => {
    captured = { url, init };
    return jsonResponse({
      success: true,
      data: {
        content: { id: 1, status: "REVIEW_REQUIRED" },
        artifact: { artifactHash: "a".repeat(64) },
      },
      error: null,
    });
  });

  await client.registerRenderArtifact(1, { artifactHash: "a".repeat(64) });

  assert.equal(
    captured.url.toString(),
    "https://api.example.com/api/ops/media/contents/1/render-artifacts",
  );
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.get("X-Media-Operations-Key"), "operations-key");
});

test("render review sends an explicit human decision", async () => {
  let captured;
  const client = createClient(async (url, init) => {
    captured = { url, init };
    return jsonResponse({
      success: true,
      data: {
        content: { id: 1, status: "APPROVED" },
        review: { artifactHash: "a".repeat(64), decision: "APPROVED" },
      },
      error: null,
    });
  });
  const review = {
    artifactHash: "a".repeat(64),
    decision: "APPROVED",
    reviewer: "operator",
    reason: "전체 영상을 확인했습니다.",
  };

  await client.reviewRenderArtifact(1, review);

  assert.equal(captured.url.toString(), "https://api.example.com/api/ops/media/contents/1/reviews");
  assert.deepEqual(JSON.parse(captured.init.body), review);
});

test("API wrapper failure is exposed with status and error code", async () => {
  const client = createClient(async () =>
    jsonResponse(
      {
        success: false,
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication is required." },
      },
      { status: 401 },
    ),
  );

  await assert.rejects(
    () => client.getRecentShortformContents("2026-07-22T12:00:00"),
    (error) =>
      error instanceof TrendzipApiError &&
      error.status === 401 &&
      error.code === "UNAUTHORIZED",
  );
});
