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