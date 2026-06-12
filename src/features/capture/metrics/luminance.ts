/** Luminance Rec.601 par pixel, stats sur une image RGBA carrée déjà réduite (ex. 64×64). */
export function luminanceStats(rgba: Uint8ClampedArray, size: number) {
  const lum = (i: number) =>
    0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];

  let sum = 0, sumSq = 0, sumLeft = 0, sumRight = 0;
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = lum((y * size + x) * 4);
      sum += l; sumSq += l * l;
      if (x < half) sumLeft += l; else sumRight += l;
    }
  }
  const n = size * size;
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  const meanLeft = sumLeft / (n / 2);
  const meanRight = sumRight / (n / 2);
  return {
    mean,
    stddev: Math.sqrt(variance),
    lateralDelta: Math.abs(meanLeft - meanRight),
  };
}
