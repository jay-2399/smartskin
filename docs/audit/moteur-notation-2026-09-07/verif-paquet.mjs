// VÉRIFICATION DU MOTEUR RÉEL CONTRE L'ORACLE DU PAQUET v2.
// L'oracle (oracle-v2.json, produit par `sim3.mjs ORACLE`) contient les notes que le paquet v2
// DOIT donner. Ce script fait tourner le vrai moteur (src/lib/scan/scoring.mjs) et compare.
//
//   node docs/audit/moteur-notation-2026-09-07/verif-paquet.mjs --oracle   écarts produit par produit, par cause
//   node docs/audit/moteur-notation-2026-09-07/verif-paquet.mjs --stats    tableau F (distribution, perso, monotonie)
//   node docs/audit/moteur-notation-2026-09-07/verif-paquet.mjs --grilles  B11.1 : ce qu'une grille demande vs ce qu'un produit peut atteindre
//
// À lancer depuis la racine du dépôt (le moteur lit data/scan/ depuis process.cwd()).
import fs from "node:fs";
import path from "node:path";

const RACINE = path.resolve(import.meta.dirname, "..", "..", "..");
process.chdir(RACINE);
const m = await import(path.join(RACINE, "src", "lib", "scan", "scoring.mjs"));
const ICI = import.meta.dirname;

const RAW = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8"));
const ORACLE = JSON.parse(fs.readFileSync(path.join(ICI, "oracle-v2.json"), "utf8"));
const META = ORACLE._meta;
const CATS = ["cleanser", "makeup-remover", "toner", "exfoliant", "serum", "treatment", "moisturizer", "eye-cream", "sunscreen", "mask"];
const profil = (o = {}) => ({ skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {}, ...o });
const PR = {
  sens3: profil({ sensitivity: 3, concerns: { redness: 2 }, strengthCeiling: 1 }),
  secheReactive: profil({ skinType: "dry", sensitivity: 3, concerns: { dehydration: 3, redness: 2, barrier: 2 }, strengthCeiling: 0 }),
  grasseAcne: profil({ skinType: "oily", concerns: { blemishes: 3, oiliness: 2 }, strengthCeiling: 3, besoinSolaire: 2 }),
  normaleAge: profil({ sensitivity: 1, concerns: { aging: 3, spots: 2 }, besoinSolaire: 1 }),
  grasseRides: profil({ skinType: "oily", concerns: { aging: 3 }, strengthCeiling: 3 }),
  rougeurs: profil({ sensitivity: 2, concerns: { redness: 3 }, strengthCeiling: 1 }),
};
const q = (arr, p) => { const a = [...arr].sort((x, y) => x - y); if (!a.length) return NaN; const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const r1 = (x) => Math.round(x * 10) / 10;
const pct = (n, d) => Math.round(1000 * n / (d || 1)) / 10;
const tableau = (lignes, cols) => { const w = cols.map((c, i) => Math.max(c.length, ...lignes.map((l) => String(l[i]).length))); const f = (l) => "| " + l.map((v, i) => String(v).padEnd(w[i])).join(" | ") + " |"; return [f(cols), "|" + w.map((x) => "-".repeat(x + 2)).join("|") + "|", ...lignes.map(f)].join("\n"); };

// le produit tel que le moteur le voit : INCI brut du catalogue (le moteur normalise lui-même)
const produits = Object.entries(ORACLE).filter(([k]) => k !== "_meta").map(([k, o]) => {
  const p = /^\d+$/.test(k) ? RAW[Number(k)] : { name: k, category: o.category, inci: o.inci, filtresUV: o.filtresUV, fictif: true };
  return { cle: k, p: { ...p, filtresUV: o.filtresUV }, o };   // filtresUV : valeur post-P9 de l'oracle (le catalogue le portera après le lot 1)
});
const SF = (p) => m.scoreFormule(p.inci, p.category, p.filtresUV);
const SP = (p, P, f) => m.scorePerso(p.inci, P, p.category, f ?? SF(p), p.filtresUV);

// cause présumée d'un écart, d'après l'INCI brut. Le banc a simulé les RÈGLES et une partie des
// données ; les correctifs de données du lot 1 (alias, fiches réparées) lui sont inconnus, donc
// tout écart qu'ils expliquent est attendu — c'est ce que cette attribution sert à montrer.
const ALIAS_LOT1 = /\bAVENE AQUA\b|\bETHANOL\b|\bOCTINOXATE\b|\bOCTISALATE\b|CERAMIDE 3\b|\bVITAMIN E\b|PURE PLANT-DERIVED SQUALANE|ZINC OXIDE \(CI 77947\)/i;
const FICHES_REPAREES = /^Weleda Skin Food (Crème de Jour|Travel Size Clear|Face Care)/i;
function cause(p) {
  const s = String(p.inci || "");
  if (FICHES_REPAREES.test(String(p.name || ""))) return "fiche réparée au lot 1 (Weleda)";
  if (ALIAS_LOT1.test(s)) return "alias ajouté au lot 1";
  if (/\d+(?:[.,]\d+)?\s*%|\bUSP\b/i.test(s)) return "n % / USP (R1)";
  if (/[([]\s*NANO\s*[)\]]/i.test(s)) return "(NANO) (R8)";
  if (/(THERMAL|SPRING|VOLCANIC) WATER|EAU THERMALE/i.test(s)) return "eau thermale (R8)";
  // (les noms botaniques parenthésés ne sont volontairement PAS canonicalisés : voir scoring.mjs)
  return "règle";
}

const mode = process.argv[2] || "--oracle";

if (mode === "--oracle") {
  console.log("oracle :", META.produits, "produits +", META.fictifs, "formules ; référence", META.commitReference, "; cible", META.algoCible);
  const ecarts = [];
  let evalCompare = 0, evalEcarts = 0;
  for (const { cle, p, o } of produits) {
    let f; try { f = SF(p); } catch (e) { ecarts.push({ cle, nom: p.name, d: 999, detail: "EXCEPTION " + e.message, cause: "exception" }); continue; }
    const dF = f.score - o.formule;
    const dP = {}; for (const k of Object.keys(PR)) dP[k] = SP(p, PR[k], f).score - o.perso[k];
    const pire = Math.max(Math.abs(dF), ...Object.values(dP).map(Math.abs));
    if (f.evaluable !== undefined) { evalCompare++; if (!!f.evaluable !== !!o.evaluable) { evalEcarts++; ecarts.push({ cle, nom: p.name, d: 999, detail: "évaluable " + f.evaluable + " ≠ " + o.evaluable, cause: "évaluabilité" }); continue; } }
    if (pire > 0) ecarts.push({ cle, nom: p.name, d: pire, detail: "formule " + o.formule + "→" + f.score + " ; " + Object.entries(dP).filter(([, v]) => v).map(([k, v]) => k + " " + (v > 0 ? "+" : "") + v).join(", "), cause: cause(p) });
  }
  console.log("écarts :", ecarts.length, "sur", produits.length, "; évaluabilité comparée sur", evalCompare, "(écarts", evalEcarts + ")");
  if (!ecarts.length) { console.log("✅ 0 écart : le moteur reproduit le paquet v2."); process.exit(0); }
  const parCause = {}; for (const e of ecarts) parCause[e.cause] = (parCause[e.cause] || 0) + 1;
  console.log("par cause présumée :", Object.entries(parCause).sort((a, b) => b[1] - a[1]).map(([c, n]) => c + " " + n).join(" ; "));
  const abs = ecarts.map((e) => e.d).filter((d) => d < 999);
  if (abs.length) console.log("|Δ| max (formule ou perso) : moyen", r1(mean(abs)), "; p90", q(abs, .9), "; max", Math.max(...abs), "; ≤ 1 :", abs.filter((d) => d <= 1).length);
  console.log("\ntop 25 :");
  for (const e of ecarts.sort((a, b) => b.d - a.d).slice(0, 25)) console.log("  [" + e.cle + "] " + String(e.nom).slice(0, 48).padEnd(48) + " " + e.detail + "  ← " + e.cause);
  process.exit(1);
}

if (mode === "--stats") {
  const EV = produits.filter(({ p }) => !p.fictif).map(({ p }) => p).filter((p) => { const f = SF(p); return f.evaluable === undefined ? true : f.evaluable; });
  const s = EV.map((p) => SF(p).score);
  console.log("## Distribution FORMULE (" + EV.length + " produits évaluables)");
  console.log(tableau([["moteur", r1(mean(s)), q(s, .5), pct(s.filter((v) => v >= 75).length, s.length), pct(s.filter((v) => v < 45).length, s.length), Math.max(...s), ...CATS.map((c) => q(EV.filter((p) => p.category === c).map((p) => SF(p).score), .5))]], ["", "moy", "méd", "%vert", "%rouge", "max", ...CATS]));
  console.log("% vert par famille :", CATS.map((c) => { const L = EV.filter((p) => p.category === c); return c + " " + pct(L.filter((p) => SF(p).score >= 75).length, L.length); }).join(" ; "));
  console.log("% rouge par famille :", CATS.map((c) => { const L = EV.filter((p) => p.category === c); return c + " " + pct(L.filter((p) => SF(p).score < 45).length, L.length); }).join(" ; "));
  console.log("\n## PERSO");
  const rows = []; for (const k of Object.keys(PR)) { const d = EV.map((p) => { const f = SF(p); const sc = SP(p, PR[k], f).score; return { s: sc, d: sc - f.score }; }); rows.push([k, r1(mean(d.map((x) => x.d))), q(d.map((x) => x.d), .1), pct(d.filter((x) => x.s >= 75).length, d.length), pct(d.filter((x) => x.s < 45).length, d.length), pct(d.filter((x) => x.s <= 5).length, d.length)]); }
  console.log(tableau(rows, ["profil", "Δ moy", "p10", "%vert", "%rouge", "%=5"]));
  console.log("\n## Monotonie");
  const toks = (p) => m.decouperInci(p.inci).map((x) => x.trim()).filter(Boolean);
  let d = EV.map((p) => m.scoreFormule([...toks(p), "Niacinamide"].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  niacinamide en queue : baisses", d.filter((x) => x < 0).length, "(attendu 0)");
  d = EV.map((p) => m.scoreFormule([...toks(p), "Parfum"].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  parfum en queue : hausses", d.filter((x) => x > 0).length, "(attendu 0)");
  d = EV.map((p) => m.scoreFormule([...toks(p), ...toks(p).slice(0, 5)].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  doublon top 5 en queue : gains", d.filter((x) => x > 0).length, "(attendu 0)");
  const capped = EV.filter((p) => { const c = SF(p).cap; return c !== undefined && c !== null && c < Infinity; });
  console.log("  plafonnés :", capped.length, "; perso au-dessus du cap :", capped.filter((p) => Math.max(...Object.values(PR).map((P) => SP(p, P).score)) > SF(p).cap).length, "(attendu 0)");
}

if (mode === "--grilles") {
  // B11.1 — POURQUOI CERTAINES FAMILLES NE POUVAIENT PAS ÊTRE VERTES.
  // Chaque grille était normalisée par son maximum THÉORIQUE : la somme des plafonds de ses
  // lignes de mérite. Or ces lignes se disputent les mêmes places : « pondere: true » multiplie
  // les points par le poids de position, et les cinq premières positions d'une liste INCI
  // appartiennent au véhicule (l'eau, le tensioactif, la phase grasse). Une grille dont les
  // plafonds supposent que toutes ses lignes tiennent la tête de liste demande l'impossible.
  // Le moteur normalise depuis B11.2 par `maxAtteignable` ; ce tableau montre l'écart et le
  // confronte au brut réellement ramassé par les produits du catalogue — le juge de paix.
  const parCat = {};
  for (const { p } of produits) {
    if (p.fictif || !CATS.includes(p.category)) continue;
    let f; try { f = SF(p); } catch { continue; }
    if (f.evaluable === false) continue;
    (parCat[p.category] ??= []).push(f);
  }
  const lignes = [];
  for (const c of CATS) {
    const L = parCat[c] || [];
    if (!L.length) continue;
    const R = m.CONFIG.RUBRIQUES[c];
    const bruts = L.map((f) => f.metierBrut);
    const th = R.merites.reduce((a, l) => a + (l.plafond ?? l.pts), 0);
    const at = m.maxAtteignable(R);
    lignes.push([c, th, at, pct(at, th), r1(Math.max(...bruts)), pct(at, Math.max(...bruts)),
                 r1(q(bruts, .5)), r1(q(bruts, .9)),
                 pct(bruts.filter((b) => b >= at - 0.01).length, bruts.length),
                 R.merites.filter((l) => l.pondere).length + "/" + R.merites.length]);
  }
  console.log("## B11.1 — dénominateur des grilles (" + Object.values(parCat).reduce((a, x) => a + x.length, 0) + " produits évaluables)");
  console.log(tableau(lignes, ["famille", "maxThéo", "maxAtteign", "% du théo", "brut max observé", "modèle/observé", "brut méd", "brut p90", "% au plafond", "lignes pondérées"]));
  console.log("\nLecture : « modèle/observé » valide le modèle de places — il doit rester proche");
  console.log("de 100 %. « % au plafond » est la part des produits qui saturent le dénominateur :");
  console.log("elle doit rester faible, sinon la grille ne discrimine plus par le haut.");
}
