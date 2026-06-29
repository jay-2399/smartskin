/** Luminance Rec.601 par pixel, stats sur une image RGBA carrée déjà réduite (ex. 64×64). */
export function luminanceStats(rgba: Uint8ClampedArray, size: number) {
  const lum = (i: number) =>
    0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];

  let sum = 0, sumSq = 0, sumLeft = 0, sumRight = 0;
  const half = size / 2;
  // Grille 3×3 sur le visage : moyenne de luminance par case → l'écart entre la case
  // la plus sombre et la plus claire (`shadowRange`) mesure une ombre dans N'IMPORTE
  // quelle direction (haut/bas/diagonale), là où `lateralDelta` ne voit que gauche/droite.
  const cellSum = new Float64Array(9);
  const cellCnt = new Int32Array(9);
  const cellOf = (v: number) => Math.min(2, Math.floor((v * 3) / size));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = lum((y * size + x) * 4);
      sum += l; sumSq += l * l;
      if (x < half) sumLeft += l; else sumRight += l;
      const cell = cellOf(y) * 3 + cellOf(x);
      cellSum[cell] += l; cellCnt[cell]++;
    }
  }
  const n = size * size;
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  const meanLeft = sumLeft / (n / 2);
  const meanRight = sumRight / (n / 2);

  let cellMin = Infinity, cellMax = -Infinity;
  for (let c = 0; c < 9; c++) {
    if (cellCnt[c] === 0) continue;
    const m = cellSum[c] / cellCnt[c];
    if (m < cellMin) cellMin = m;
    if (m > cellMax) cellMax = m;
  }

  return {
    mean,
    stddev: Math.sqrt(variance),
    lateralDelta: Math.abs(meanLeft - meanRight),
    shadowRange: cellMax - cellMin,
  };
}
