export const DEFAULT_PCM_FORMAT = Object.freeze({
  channels: 1,
  sampleRateHz: 24_000,
  sampleWidthBytes: 2,
});

function requirePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

export function calculatePcmDurationMs(pcmData, format = DEFAULT_PCM_FORMAT) {
  if (!Buffer.isBuffer(pcmData) || pcmData.length === 0) {
    throw new Error("pcmData must be a non-empty Buffer.");
  }

  const { channels, sampleRateHz, sampleWidthBytes } = format;
  requirePositiveInteger(channels, "channels");
  requirePositiveInteger(sampleRateHz, "sampleRateHz");
  requirePositiveInteger(sampleWidthBytes, "sampleWidthBytes");

  const bytesPerFrame = channels * sampleWidthBytes;
  if (pcmData.length % bytesPerFrame !== 0) {
    throw new Error("pcmData length must align with the configured PCM frame size.");
  }

  return (pcmData.length / bytesPerFrame / sampleRateHz) * 1_000;
}

export function encodePcmAsWav(pcmData, format = DEFAULT_PCM_FORMAT) {
  calculatePcmDurationMs(pcmData, format);

  const { channels, sampleRateHz, sampleWidthBytes } = format;
  const header = Buffer.alloc(44);
  const blockAlign = channels * sampleWidthBytes;
  const byteRate = sampleRateHz * blockAlign;
  const bitDepth = sampleWidthBytes * 8;

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRateHz, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}
