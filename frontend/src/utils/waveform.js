/**
 * Generates a pseudo-random waveform bar-height array.
 * @param {number} seed  – deterministic seed (use post.id hash or Math.random())
 * @param {number} bars  – number of bars (default 40)
 * @returns {number[]}   – values in [0, 1]
 */
export function generateWave(seed = Math.random(), bars = 40) {
    return Array.from({ length: bars }, (_, i) => {
      const v =
        0.15 +
        Math.abs(Math.sin(i * 0.6 + seed * 10)) * 0.7 +
        Math.random() * 0.15;
      return Math.min(v, 1);
    });
  }
  
  /**
   * Converts a Float32Array audio buffer into normalised bar heights.
   * Used when we have real recorded audio data.
   * @param {Float32Array} buffer
   * @param {number} bars
   * @returns {number[]}
   */
  export function bufferToWave(buffer, bars = 40) {
    const chunk = Math.floor(buffer.length / bars);
    return Array.from({ length: bars }, (_, i) => {
      let sum = 0;
      for (let j = 0; j < chunk; j++) sum += Math.abs(buffer[i * chunk + j] || 0);
      return Math.min(sum / chunk / 0.5, 1); // normalise
    });
  }

const waveCache = new Map();

async function decodeToWave(arrayBuffer, bars = 40) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error("AudioContext unsupported");
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = audioBuffer.getChannelData(0);
    return bufferToWave(channel, bars);
  } finally {
    await ctx.close();
  }
}

export async function loadWaveFromBlob(blob, bars = 40) {
  const key = `blob:${blob.size}:${blob.type}:${bars}`;
  if (waveCache.has(key)) return waveCache.get(key);
  const promise = blob.arrayBuffer().then((buffer) => decodeToWave(buffer, bars));
  waveCache.set(key, promise);
  try {
    return await promise;
  } catch (err) {
    waveCache.delete(key);
    throw err;
  }
}

export async function loadWaveFromUrl(url, bars = 40) {
  const key = `url:${url}:${bars}`;
  if (waveCache.has(key)) return waveCache.get(key);
  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch audio");
      return res.arrayBuffer();
    })
    .then((buffer) => decodeToWave(buffer, bars));
  waveCache.set(key, promise);
  try {
    return await promise;
  } catch (err) {
    waveCache.delete(key);
    throw err;
  }
}
