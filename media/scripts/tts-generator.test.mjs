import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { generateTtsAudio } from "./tts-generator.mjs";

const fixture = {
  narration: {
    hook: "후크",
    overview: "개요",
    reasons: "이유",
    evidence: "근거",
    cta: "CTA",
  },
};

test("TTS generator creates every WAV and manifest with a fake client", async () => {
  const directory = mkdtempSync(join(tmpdir(), "trendzip-tts-generator-"));
  const outputDir = resolve(directory, "tts");
  const calls = [];
  const client = {
    model: "test-model",
    voice: "test-voice",
    async synthesize(request) {
      calls.push(request);
      return Buffer.alloc(4_800);
    },
  };

  try {
    const result = await generateTtsAudio({
      fixture,
      client,
      outputDir,
      requestIntervalMs: 0,
      styleInstruction: "또렷하게 읽어주세요.",
    });

    assert.equal(calls.length, 5);
    assert.equal(result.manifest.model, "test-model");
    assert.equal(existsSync(resolve(outputDir, "hook.wav")), true);
    assert.equal(JSON.parse(readFileSync(resolve(outputDir, "audio-manifest.json"))).voice, "test-voice");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("TTS generator keeps an earlier completed output when generation fails", async () => {
  const directory = mkdtempSync(join(tmpdir(), "trendzip-tts-generator-failure-"));
  const outputDir = resolve(directory, "tts");
  mkdirSync(outputDir);
  writeFileSync(resolve(outputDir, "completed"), "earlier output");
  let callCount = 0;
  const client = {
    model: "test-model",
    voice: "test-voice",
    async synthesize() {
      callCount += 1;
      if (callCount === 2) throw new Error("TTS failure");
      return Buffer.alloc(4_800);
    },
  };

  try {
    await assert.rejects(
      () => generateTtsAudio({
        fixture,
        client,
        outputDir,
        requestIntervalMs: 0,
        styleInstruction: "또렷하게 읽어주세요.",
      }),
      /TTS failure/,
    );
    assert.equal(readFileSync(resolve(outputDir, "completed"), "utf8"), "earlier output");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
