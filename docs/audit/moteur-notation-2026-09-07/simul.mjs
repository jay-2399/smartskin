import { m, CAT, CATS, q, mean, r1, pct, sf, sp, PROFILS, profil, tableau } from "./lib.mjs";
const V = process.argv[2];
if (V === "V1") { // supprimer la ligne mérite sansParfum (garder le malus fixe seul) — le malus fixe reste 4/5 × severite, plafond 12
  for (const R of Object.values(m.CONFIG.RUBRIQUES)) R.merites = R.merites.filter((l) => l.id !== "sansParfum");
}
if (V === "V1b") { // idem + malus fixe relevé pour conserver une partie du signal
  for (const R of Object.values(m.CONFIG.RUBRIQUES)) R.merites = R.merites.filter((l) => l.id !== "sansParfum");
  m.CONFIG.malusParfumFixe = 8; m.CONFIG.malusHEFixe = 9; m.CONFIG.plafondMalusParfum = 16;
}
if (V === "V2") { m.CONFIG.wPos = [{ maxPos: 3, w: 1 }, { maxPos: 5, w: .9 }, { maxPos: 7, w: .75 }, { maxPos: 10, w: .6 }, { maxPos: 15, w: .45 }, { maxPos: Infinity, w: .3 }]; }
const S = (inci, p) => m.scoreFormule(inci, p.category, p.filtresUV).score;
const toks = (p) => m.decouperInci(p.inci).map((t) => t.trim()).filter(Boolean);
const join = (a) => a.join(", ");
const tous = CAT.map((p) => sf(p).score);
console.log(`\n=== ${V} ===`);
console.log("global : moy", r1(mean(tous)), "méd", q(tous, .5), "p10", q(tous, .1), "p90", q(tous, .9), "max", Math.max(...tous), "%vert", pct(tous.filter((v) => v >= 75).length, tous.length), "%rouge", pct(tous.filter((v) => v < 45).length, tous.length));
if (V.startsWith("V1")) {
  const rows = [];
  for (const c of CATS) { const L = CAT.filter((p) => p.category === c); const a = L.filter((p) => sf(p).details.some((d) => d.type === "complexe-parfumant")).map((p) => sf(p).score), b = L.filter((p) => !sf(p).details.some((d) => d.type === "complexe-parfumant")).map((p) => sf(p).score); rows.push([c, q(b, .5), pct(b.filter((v) => v >= 75).length, b.length), q(a, .5), pct(a.filter((v) => v >= 75).length, a.length), r1(q(b, .5) - q(a, .5)), Math.max(...L.map((p) => sf(p).score))]); }
  console.log(tableau(rows, ["cat", "méd sans parfum", "%vert sans", "méd parfumés", "%vert parfumés", "écart méd", "max"]));
  const sansP = CAT.filter((p) => sf(p).details.every((x) => x.type !== "complexe-parfumant"));
  const d = sansP.map((p) => S(join([...toks(p), "Parfum"]), p) - S(p.inci, p));
  console.log("coût d'UNE trace de parfum en queue : moy", r1(mean(d)), "min", Math.min(...d));
}
if (V === "V2") {
  let d = CAT.map((p) => S(join(["Niacinamide", ...toks(p)]), p) - S(p.inci, p));
  console.log("T1b (niacinamide en pos 1) violations Δ<0 :", d.filter((x) => x < 0).length, "(" + pct(d.filter((x) => x < 0).length, d.length) + "%) min", Math.min(...d));
  d = CAT.map((p) => S(join(["Water", ...toks(p)]), p) - S(p.inci, p));
  console.log("T2 (eau en pos 1) violations Δ>0 :", d.filter((x) => x > 0).length, "(" + pct(d.filter((x) => x > 0).length, d.length) + "%) max", Math.max(...d));
  let seed = 42; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const abs = []; for (const p of CAT) { const t = toks(p); if (t.length < 8) continue; const i = Math.floor(rnd() * 5); [t[i], t[i + 1]] = [t[i + 1], t[i]]; abs.push(Math.abs(S(join(t), p) - S(p.inci, p))); }
  console.log("R4 (voisins inversés) |Δ| moy", r1(mean(abs)), "max", Math.max(...abs));
}
if (V === "V3") { // perso : parfum et HE comptés UNE fois, sensibilisants plafonnés à −12, cap gravité 3 respecté
  const P = PROFILS.secheReactive;
  const rows = [];
  const corr = (p) => { const f = sf(p); const s = sp(p, P, f); let tot = f.score; let frag = 0, he = 0, sens = 0; for (const x of s.facts) { if (!x.points) continue; if (/^Fragrance —/.test(x.label)) frag = Math.min(frag, x.points); else if (/^Essential oils/.test(x.label)) he = Math.min(he, x.points); else if (/contact allergen/.test(x.label)) sens += x.points; else tot += x.points; } tot += frag + he + Math.max(sens, -12); const capG = f.details.some((d) => d.type === "risque" && d.grav >= 3) ? (f.details.find((d) => d.type === "risque" && d.grav >= 3).pos <= 5 ? 49 : 69) : Infinity; return Math.round(Math.min(100, Math.max(5, Math.min(tot, capG)))); };
  const avant = CAT.map((p) => sp(p, P, sf(p)).score), apres = CAT.map(corr), form = CAT.map((p) => sf(p).score);
  for (const [n, a] of [["perso actuel", avant], ["perso corrigé (V3)", apres]]) rows.push([n, r1(mean(a.map((v, i) => v - form[i]))), q(a.map((v, i) => v - form[i]), .1), Math.min(...a.map((v, i) => v - form[i])), pct(a.filter((v) => v >= 75).length, a.length), pct(a.filter((v) => v < 45).length, a.length), pct(a.filter((v) => v <= 5).length, a.length)]);
  console.log("profil sèche réactive (sensibilité 3) :");
  console.log(tableau(rows, ["variante", "Δ moy vs formule", "p10", "min", "%vert", "%rouge", "%=5"]));
  const opaque = { ...CAT[0], category: "serum", inci: "Water, Glycerin, Niacinamide, Parfum" }, transp = { ...CAT[0], category: "serum", inci: "Water, Glycerin, Niacinamide, Parfum, Linalool, Limonene, Citronellol, Geraniol, Coumarin, Benzyl Alcohol, Citral, Eugenol" };
  console.log("étalon opaque/transparente (sérum, sensibilité 3) : actuel", sp(opaque, P, sf(opaque)).score, "/", sp(transp, P, sf(transp)).score, "→ corrigé", corr(opaque), "/", corr(transp));
  const parf = CAT.filter((p) => m.parseInci(p.inci).some((it) => it.fiche?.fragrance));
  console.log("produits parfumés : % rouge actuel", pct(parf.filter((p) => sp(p, P, sf(p)).score < 45).length, parf.length), "→ corrigé", pct(parf.filter((p) => corr(p) < 45).length, parf.length));
}
