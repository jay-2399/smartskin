import { m, CAT, CATS, q, mean, r1, pct, sf, tableau } from "./lib.mjs";
const R = m.CONFIG.RUBRIQUES;
const maxTheo = (cat) => R[cat].merites.reduce((a, l) => a + (l.plafond ?? l.pts), 0);
const lignes = [], detail = [];
const parCat = {};
for (const p of CAT) { const f = sf(p); (parCat[p.category] ||= []).push({ p, f }); }
let tous = [];
for (const c of [...CATS]) {
  const L = parCat[c] || []; const s = L.map((x) => x.f.score); tous.push(...s);
  const merite = L.map((x) => x.f.details.filter((d) => d.type === "merite").reduce((a, d) => a + d.pts, 0));
  const manque = L.map((x) => x.f.details.filter((d) => d.type === "manque").reduce((a, d) => a + d.pts, 0));
  const faute = L.map((x) => x.f.details.filter((d) => d.type === "faute").reduce((a, d) => a + d.pts, 0));
  const risque = L.map((x) => x.f.details.filter((d) => d.type === "risque").reduce((a, d) => a + d.pts, 0));
  const parfum = L.map((x) => x.f.details.filter((d) => d.type === "complexe-parfumant").reduce((a, d) => a + d.pts, 0));
  const alcool = L.map((x) => x.f.details.filter((d) => d.type === "alcool").reduce((a, d) => a + d.pts, 0));
  const uv = L.map((x) => x.f.details.filter((d) => d.type === "filtres-uv").reduce((a, d) => a + d.pts, 0));
  const partiel = L.filter((x) => x.f.analysePartielle).length;
  lignes.push([c, L.length, r1(mean(s)), q(s, .5), q(s, .1), q(s, .25), q(s, .75), q(s, .9), Math.min(...s), Math.max(...s),
    pct(s.filter((v) => v >= 75).length, s.length), pct(s.filter((v) => v >= 45 && v < 75).length, s.length), pct(s.filter((v) => v < 45).length, s.length), pct(partiel, L.length)]);
  detail.push([c, maxTheo(c), r1(42 / maxTheo(c)), r1(mean(merite)), r1(Math.max(...merite)), pct(manque.filter((v) => v < 0).length, L.length), r1(mean(manque)), r1(mean(faute)), r1(mean(risque)), r1(mean(parfum)), pct(parfum.filter((v) => v < 0).length, L.length), r1(mean(alcool)), r1(mean(uv)), r1(q(s, .5) - 50)]);
}
console.log("## Distribution FORMULE par catégorie (catalogue, hors-perimetre exclu, INCI présent)\n");
console.log(tableau(lignes, ["cat", "n", "moy", "méd", "p10", "p25", "p75", "p90", "min", "max", "%vert", "%orange", "%rouge", "%partiel"]));
console.log("\nTOUS :", CAT.length, "moy", r1(mean(tous)), "méd", q(tous, .5), "p10", q(tous, .1), "p90", q(tous, .9), "min", Math.min(...tous), "max", Math.max(...tous),
  "%vert", pct(tous.filter((v) => v >= 75).length, tous.length), "%orange", pct(tous.filter((v) => v >= 45 && v < 75).length, tous.length), "%rouge", pct(tous.filter((v) => v < 45).length, tous.length));
console.log("\n## Décomposition moyenne par catégorie (points)\n");
console.log(tableau(detail, ["cat", "maxGrille", "facteur42/max", "mérite moy", "mérite max", "%prérequis manquant", "manque moy", "faute moy", "risque moy", "parfum moy", "%parfumés", "alcool moy", "uv moy", "méd-50"]));
// histogramme global par tranche de 5
const h = {}; for (const v of tous) { const k = Math.floor(v / 5) * 5; h[k] = (h[k] || 0) + 1; }
console.log("\n## Histogramme global (tranche de 5)\n");
for (const k of Object.keys(h).map(Number).sort((a, b) => a - b)) console.log(String(k).padStart(3), String(h[k]).padStart(5), "#".repeat(Math.round(h[k] / 10)));
// même produit noté sur la grille indetermine
const dInd = CAT.map((p) => sf(p, "indetermine").score - sf(p).score);
const sInd = CAT.map((p) => sf(p, "indetermine").score);
console.log("\n## Grille « indetermine » sur tout le catalogue");
console.log("score indéterminé : moy", r1(mean(sInd)), "méd", q(sInd, .5), "min", Math.min(...sInd), "max", Math.max(...sInd), "%vert", pct(sInd.filter((v) => v >= 75).length, sInd.length), "%rouge", pct(sInd.filter((v) => v < 45).length, sInd.length));
console.log("écart (indeterminé − vraie catégorie) : moy", r1(mean(dInd)), "méd", q(dInd, .5), "p10", q(dInd, .1), "p90", q(dInd, .9), "min", Math.min(...dInd), "max", Math.max(...dInd), "|écart|≥10 :", pct(dInd.filter((v) => Math.abs(v) >= 10).length, dInd.length), "% ; changement de bande :", pct(CAT.filter((p) => m.bande(sf(p, "indetermine").score) !== sf(p).bande).length, CAT.length), "%");
const byCat = {}; CAT.forEach((p, i) => (byCat[p.category] ||= []).push(dInd[i]));
console.log(tableau(Object.entries(byCat).map(([c, a]) => [c, r1(mean(a)), q(a, .5), Math.min(...a), Math.max(...a)]), ["cat", "écart moy", "méd", "min", "max"]));
// max théorique atteignable par catégorie
console.log("\n## Plafond mécanique : base 50 + budget 42 = 92 ; +8 filtres UV hors solaire → 100");
for (const c of CATS) { const L = parCat[c]; const top = L.filter((x) => x.f.score >= 92).length; const cent = L.filter((x) => x.f.score >= 100).length; console.log(c.padEnd(15), "≥92:", top, " =100:", cent, " dont avec filtresUV :", L.filter((x) => x.f.score >= 92 && x.p.filtresUV).length); }
// caps grav 3
const caps = CAT.filter((p) => sf(p).details.some((d) => d.type === "risque" && d.grav >= 3));
console.log("\nproduits touchés par un risque gravité 3 (cap 49/69) :", caps.length, caps.slice(0, 6).map((p) => p.name + " → " + sf(p).score));
// couverture
const couv = CAT.map((p) => sf(p).couverture);
console.log("couverture top10 : moy", r1(mean(couv)), "p10", r1(q(couv, .1)), "% <0.7 :", pct(couv.filter((v) => v < .7).length, couv.length));
// barre 1 %
let barreTot = 0, barreTop6 = 0, actifsApres = 0;
for (const p of CAT) { const l = m.parseInci(p.inci); const b = l.find((it) => m.CONFIG.marqueurs1pct.includes(it.name)); if (b) { barreTot++; if (b.pos <= 6) barreTop6++; } }
console.log("barre 1 % détectée :", pct(barreTot, CAT.length), "% des produits ; barre ≤ pos 6 :", pct(barreTop6, CAT.length), "%");
