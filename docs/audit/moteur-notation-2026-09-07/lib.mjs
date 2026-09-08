import fs from "node:fs";
process.chdir("/Users/jayenbellili/dev/smartskin.app");
export const m = await import("/Users/jayenbellili/dev/smartskin.app/src/lib/scan/scoring.mjs");
export const DICT = JSON.parse(fs.readFileSync("data/scan/dictionnaire.json", "utf8"));
const raw = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8"));
export const CAT = raw.filter((p) => p.category !== "hors-perimetre" && p.inci && p.inci.length > 20);
export const CATS = ["cleanser","makeup-remover","toner","exfoliant","serum","treatment","moisturizer","eye-cream","sunscreen","mask"];
export const q = (arr, p) => { const a = [...arr].sort((x, y) => x - y); if (!a.length) return NaN; const i = (a.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
export const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
export const r1 = (x) => Math.round(x * 10) / 10;
export const pct = (n, d) => Math.round(1000 * n / (d || 1)) / 10;
export const sf = (p, cat = p.category) => m.scoreFormule(p.inci, cat, p.filtresUV);
export const sp = (p, prof, f, cat = p.category) => m.scorePerso(p.inci, prof, cat, f, p.filtresUV);
export const profil = (o = {}) => ({ skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {}, ...o });
export const PROFILS = {
  grasseAcne: profil({ skinType: "oily", sensitivity: 0, concerns: { blemishes: 3, oiliness: 2 }, strengthCeiling: 3, besoinSolaire: 2 }),
  secheReactive: profil({ skinType: "dry", sensitivity: 3, concerns: { dehydration: 3, redness: 2, barrier: 2 }, strengthCeiling: 0, besoinSolaire: 0 }),
  normaleAge: profil({ skinType: "normal", sensitivity: 1, concerns: { aging: 3, spots: 2 }, strengthCeiling: 2, besoinSolaire: 1 }),
  neutre: profil(),
};
export function tableau(lignes, cols) {
  const w = cols.map((c, i) => Math.max(c.length, ...lignes.map((l) => String(l[i]).length)));
  const fmt = (l) => "| " + l.map((v, i) => String(v).padEnd(w[i])).join(" | ") + " |";
  return [fmt(cols), "|" + w.map((x) => "-".repeat(x + 2)).join("|") + "|", ...lignes.map(fmt)].join("\n");
}
