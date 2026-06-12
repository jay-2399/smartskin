/** Variance du Laplacien (noyau 4-voisins) sur une image RGBA carrée en niveaux de gris.
 *  Mesure standard de netteté : faible = flou, élevé = net. */
export function laplacianVariance(rgba: Uint8ClampedArray, size: number): number {
  const g = (x: number, y: number) => rgba[(y * size + x) * 4]; // canal R (gris)
  const vals: number[] = [];
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const lap = g(x - 1, y) + g(x + 1, y) + g(x, y - 1) + g(x, y + 1) - 4 * g(x, y);
      vals.push(lap);
    }
  }
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  return variance;
}
