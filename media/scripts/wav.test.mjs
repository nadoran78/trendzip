import assert from "node:assert/strict";
import test from "node:test";

import { calculatePcmDurationMs, encodePcmAsWav } from "./wav.mjs";

test("PCM duration uses the configured 24kHz mono 16-bit format", () => {
  const oneSecond = Buffer.alloc(24_000 * 2);

  assert.equal(calculatePcmDurationMs(oneSecond), 1_000);
});

test("WAV encoding writes a valid PCM header", () => {
  const pcm = Buffer.alloc(4_800);
  const wav = encodePcmAsWav(pcm);

  assert.equal(wav.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(wav.subarray(8, 12).toString("ascii"), "WAVE");
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt32LE(24), 24_000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), pcm.length);
  assert.deepEqual(wav.subarray(44), pcm);
});

test("PCM duration rejects data that is not frame aligned", () => {
  assert.throws(
    () => calculatePcmDurationMs(Buffer.alloc(3)),
    /must align with the configured PCM frame size/,
  );
});
