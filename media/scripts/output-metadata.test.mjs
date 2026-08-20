import assert from "node:assert/strict";
import test from "node:test";

import { validateOutputMetadata } from "./output-metadata.mjs";

function createMetadata({ audio = false } = {}) {
  return {
    streams: [
      {
        codec_type: "video",
        codec_name: "h264",
        width: 1080,
        height: 1920,
        avg_frame_rate: "30/1",
        pix_fmt: "yuv420p",
      },
      ...(audio ? [{ codec_type: "audio", codec_name: "aac" }] : []),
    ],
    format: { duration: "18.4" },
  };
}

test("output metadata accepts one AAC stream for a narrated render", () => {
  const messages = validateOutputMetadata(createMetadata({ audio: true }), {
    expectedDurationSeconds: 18.4,
    expectAudio: true,
  });

  assert.equal(messages.includes("audio streams 1"), true);
  assert.equal(messages.includes("audio codec aac"), true);
});

test("output metadata rejects a narrated render without an audio stream", () => {
  assert.throws(
    () => validateOutputMetadata(createMetadata(), {
      expectedDurationSeconds: 18.4,
      expectAudio: true,
    }),
    /Output validation failed: audio streams 0/,
  );
});
