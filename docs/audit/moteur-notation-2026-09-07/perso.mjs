import { m, CAT, CATS, q, mean, r1, pct, sf, sp, PROFILS, profil, tableau } from "./lib.mjs";
console.log("## P1 — écart perso − formule sur tout le catalogue, 3 profils contrastés\n");
const rows = [];
const cache = new Map(); const F = (p) => { if (!cache.has(p)) cache.set(p, sf(p)); return cache.get(p); };
for (const [nom, P] of Object.entries(PROFILS)) {
  const res = CAT.map((p) => { const f = F(p); const s = sp(p, P, f); return { p, f: f.score, s: s.score, bf: f.bande, bs: s.bande, d: s.score - f.score }; });
  const d = res.map((x) => x.d);
  rows.push([nom, r1(mean(d)), q(d, .5), q(d, .1), q(d, .9), Math.min(...d), Math.max(...d), pct(res.filter((x) => x.d !== 0).length, res.length), pct(res.filter((x) => Math.abs(x.d) >= 10).length, res.length), pct(res.filter((x) => x.bs !== x.bf).length, res.length), pct(res.filter((x) => x.s >= 75).length, res.length), pct(res.filter((x) => x.s < 45).length, res.length), pct(res.filter((x) => x.s >= 100).length, res.length), pct(res.filter((x) => x.s <= 5).length, res.length)]);
}
console.log(tableau(rows, ["profil", "Δ moy", "Δ méd", "p10", "p90", "min", "max", "%≠", "%|Δ|≥10", "%chg bande", "%vert perso", "%rouge perso", "%=100", "%=5"]));
console.log("\n## P2 — cas « absurdes » : formule ROUGE (<45) mais perso VERTE (≥75), et l'inverse");
for (const [nom, P] of Object.entries(PROFILS)) {
  const res = CAT.map((p) => { const f = F(p); const s = sp(p, P, f); return { p, f: f.score, s: s.score, facts: s.facts }; });
  const rv = res.filter((x) => x.f < 45 && x.s >= 75), vr = res.filter((x) => x.f >= 75 && x.s < 45);
  console.log(`  ${nom}: rouge→vert ${rv.length} ; vert→rouge ${vr.length} ; orange→vert ${res.filter((x) => x.f < 75 && x.f >= 45 && x.s >= 75).length} ; vert→orange ${res.filter((x) => x.f >= 75 && x.s < 75 && x.s >= 45).length}`);
  for (const x of rv.slice(0, 2)) console.log("    R→V :", x.p.name, `(${x.p.category})`, x.f, "→", x.s, "|", x.facts.filter((f) => f.points).map((f) => `${f.label.slice(0, 40)} ${f.points > 0 ? "+" : ""}${f.points}`).join(" ; "));
  for (const x of vr.slice(0, 2)) console.log("    V→R :", x.p.name, `(${x.p.category})`, x.f, "→", x.s, "|", x.facts.filter((f) => f.points).map((f) => `${f.label.slice(0, 40)} ${f.points > 0 ? "+" : ""}${f.points}`).join(" ; "));
}
console.log("\n## P3 — le plafond NON COMPENSATOIRE (gravité 3 → cap 49/69) est-il respecté côté perso ?");
const capped = CAT.filter((p) => F(p).details.some((d) => d.type === "risque" && d.grav >= 3));
for (const p of capped) { const f = F(p); const best = Math.max(...Object.values(PROFILS).map((P) => sp(p, P, f).score)); console.log("  ", p.name.slice(0, 55).padEnd(56), p.category.padEnd(12), "formule", f.score, "→ meilleur perso", best, best > 69 ? "  ← dépasse le cap 69" : ""); }
console.log("\n## P4 — PARFUM côté perso : malus −4 × sensibilité PAR ingrédient parfumé, sans plafond (formule : plafond −12 pour tout le complexe)");
const nParf = CAT.map((p) => ({ p, n: m.parseInci(p.inci).filter((it) => it.fiche?.fragrance).length }));
const dist = {}; for (const x of nParf) dist[x.n] = (dist[x.n] || 0) + 1;
console.log("  nb d'ingrédients à drapeau fragrance par produit :", JSON.stringify(dist));
const P3 = PROFILS.secheReactive;
for (const x of nParf.filter((x) => x.n >= 5).sort((a, b) => b.n - a.n).slice(0, 4)) { const f = F(x.p); const s = sp(x.p, P3, f); const parf = s.facts.filter((f) => /Fragrance —/.test(f.label)).reduce((a, f) => a + f.points, 0); console.log("  ", x.p.name.slice(0, 50).padEnd(51), "n parfum=" + x.n, "formule", f.score, "→ perso (sensibilité 3)", s.score, "| somme malus parfum perso :", parf, "| lignes « Fragrance » dans facts :", s.facts.filter((f) => /Fragrance —/.test(f.label)).length); }
const opaque = { ...CAT[0], inci: "Water, Glycerin, Niacinamide, Parfum" }, transp = { ...CAT[0], inci: "Water, Glycerin, Niacinamide, Parfum, Linalool, Limonene, Citronellol, Geraniol, Coumarin, Benzyl Alcohol, Citral, Eugenol" };
console.log("  Étalon : même produit, marque OPAQUE (« Parfum ») vs TRANSPARENTE (Parfum + 8 allergènes déclarés), profil sensibilité 3, catégorie serum :");
for (const [n, p] of [["opaque", opaque], ["transparente", transp]]) { const f = m.scoreFormule(p.inci, "serum"); const s = m.scorePerso(p.inci, P3, "serum", f); console.log("    ", n.padEnd(13), "formule", f.score, "perso", s.score); }
for (const sens of [1, 2, 3]) { const P = profil({ sensitivity: sens }); const d = nParf.filter((x) => x.n >= 1).map((x) => sp(x.p, P, F(x.p)).score - F(x.p).score); console.log(`  sensibilité ${sens} — produits parfumés : Δ perso moy ${r1(mean(d))}, min ${Math.min(...d)}, % qui tombent en rouge : ${pct(nParf.filter((x) => x.n >= 1).filter((x) => sp(x.p, P, F(x.p)).score < 45).length, d.length)}`); }
console.log("\n## P5 — HUILES ESSENTIELLES côté perso : −8 PAR ingrédient (sensibilité ≥2), sans plafond");
const nHE = CAT.map((p) => ({ p, n: m.parseInci(p.inci).filter((it) => it.fiche?.essentialOil).length })).filter((x) => x.n >= 3).sort((a, b) => b.n - a.n);
console.log("  produits avec ≥3 HE :", nHE.length, "; exemples :", nHE.slice(0, 3).map((x) => `${x.p.name.slice(0, 40)} nHE=${x.n} formule ${F(x.p).score} → perso ${sp(x.p, P3, F(x.p)).score}`));
console.log("\n## P6 — FORCE des actifs : double comptage « dépassement (−5/cran) » + « exfoliantFort (−10) » pour une peau sensible");
const forts = CAT.filter((p) => ["exfoliant", "treatment", "toner"].includes(p.category)).map((p) => ({ p, s: sp(p, P3, F(p)) })).filter((x) => x.s.facts.some((f) => /Stronger than/.test(f.label)) && x.s.facts.some((f) => /Strong exfoliating/.test(f.label)));
console.log("  produits cumulant les deux lignes (profil sèche réactive, ceiling 0) :", forts.length, "; ex :", forts.slice(0, 3).map((x) => `${x.p.name.slice(0, 40)} formule ${x.s.scoreFormule} → perso ${x.s.score} (${x.s.facts.filter((f) => /Stronger|Strong exf/.test(f.label)).map((f) => f.points).join(" + ")})`));
console.log("\n## P7 — RICHESSE (natureProduit) : déclenchement par catégorie et effet sur peau grasse");
const Pg = PROFILS.grasseAcne;
const rr = CATS.map((c) => { const L = CAT.filter((p) => p.category === c); const nat = L.map((p) => m.natureProduit(m.parseInci(p.inci))); return [c, L.length, pct(nat.filter((n) => n.riche).length, L.length), pct(nat.filter((n) => n.legere).length, L.length), pct(nat.filter((n) => n.sulfate).length, L.length)]; });
console.log(tableau(rr, ["cat", "n", "%riche (−12 grasse)", "%légère (+5 grasse)", "%sulfate"]));
const cleanRiche = CAT.filter((p) => ["cleanser", "makeup-remover"].includes(p.category) && m.natureProduit(m.parseInci(p.inci)).riche);
console.log("  nettoyants/démaquillants jugés « riches » (huiles/baumes démaquillants) → −12 pour peau grasse :", cleanRiche.length, cleanRiche.slice(0, 3).map((p) => `${p.name.slice(0, 45)} ${F(p).score} → ${sp(p, Pg, F(p)).score}`));
console.log("\n## P8 — sur quoi repose la hausse perso ? (profil grasse acnéique) — répartition des points positifs");
const pos = {}; for (const p of CAT) for (const f of sp(p, Pg, F(p)).facts) if (f.points > 0) { const k = f.adequacy ? (f.label.startsWith("UV") ? "solaire" : "texture") : "match actif"; pos[k] = (pos[k] || 0) + f.points; }
console.log("  ", JSON.stringify(Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, r1(v / CAT.length) + " pt/produit"]))));
console.log("\n## P9 — perso PLAFONNÉE à 100 : combien de produits saturent (perte d'information), par profil");
for (const [nom, P] of Object.entries(PROFILS)) { const raw = CAT.filter((p) => sp(p, P, F(p)).score >= 100).length; console.log("  ", nom.padEnd(14), raw, "produits à 100 (", pct(raw, CAT.length), "%)"); }
console.log("\n## P10 — ALCOOL côté perso (peau sèche) : −6 par occurrence, quelle que soit la position (formule : top 5 seulement)");
const alc = CAT.map((p) => ({ p, n: m.parseInci(p.inci).filter((it) => it.fiche?.dryingAlcohol).length, pos: m.parseInci(p.inci).filter((it) => it.fiche?.dryingAlcohol).map((it) => it.pos) }));
console.log("  produits avec alcool desséchant : ", alc.filter((x) => x.n).length, "; dont uniquement au-delà de la pos 10 :", alc.filter((x) => x.n && x.pos.every((q) => q > 10)).length, "; avec 2 occurrences (ex. Alcohol + Alcohol Denat) :", alc.filter((x) => x.n >= 2).length);
