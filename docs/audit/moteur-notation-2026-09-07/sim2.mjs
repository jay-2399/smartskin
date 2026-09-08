import fs from "node:fs";
process.chdir("/Users/jayenbellili/dev/smartskin.app");
const m = await import("./scoring-sim.mjs");
const CAT = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8")).filter((p) => p.category !== "hors-perimetre" && p.inci && p.inci.length > 20)
  .map((p) => ({ ...p, inci: p.inci.replace(/Adapalene USP 0\.1%/i, "Adapalene") }));   // normalisation P11 appliquée partout (1 produit)
const CATS = ["cleanser", "makeup-remover", "toner", "exfoliant", "serum", "treatment", "moisturizer", "eye-cream", "sunscreen", "mask"];
const q = (arr, p) => { const a = [...arr].sort((x, y) => x - y); if (!a.length) return NaN; const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const r1 = (x) => Math.round(x * 10) / 10;
const pct = (n, d) => Math.round(1000 * n / (d || 1)) / 10;
const tableau = (lignes, cols) => { const w = cols.map((c, i) => Math.max(c.length, ...lignes.map((l) => String(l[i]).length))); const f = (l) => "| " + l.map((v, i) => String(v).padEnd(w[i])).join(" | ") + " |"; return [f(cols), "|" + w.map((x) => "-".repeat(x + 2)).join("|") + "|", ...lignes.map(f)].join("\n"); };
const profil = (o = {}) => ({ skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {}, ...o });
const PR = {
  sens3: profil({ sensitivity: 3, concerns: { redness: 2 } }),
  secheReactive: profil({ skinType: "dry", sensitivity: 3, concerns: { dehydration: 3, redness: 2, barrier: 2 }, strengthCeiling: 0 }),
  grasseAcne: profil({ skinType: "oily", concerns: { blemishes: 3, oiliness: 2 }, strengthCeiling: 3, besoinSolaire: 2 }),
  normaleAge: profil({ sensitivity: 1, concerns: { aging: 3, spots: 2 }, besoinSolaire: 1 }),
};
// ── état de référence et remise à zéro ──
const G0 = structuredClone(m.CONFIG.RUBRIQUES);
const S0 = { malusParfumFixe: m.CONFIG.malusParfumFixe, malusHEFixe: m.CONFIG.malusHEFixe, plafondMalusParfum: m.CONFIG.plafondMalusParfum };
const D = m.dict(); const DB = new Map();
const setFiche = (nom, patch) => { const f = D[nom]; if (!f) return; if (!DB.has(nom)) DB.set(nom, structuredClone(f)); Object.assign(f, patch); if (patch.risks) f.risks = { ...DB.get(nom).risks, ...patch.risks }; };
function reset() { m.resetSim(); m.CONFIG.RUBRIQUES = structuredClone(G0); Object.assign(m.CONFIG, S0); for (const [k, v] of DB) Object.assign(D[k], structuredClone(v)); }
// ── briques ──
const B = {
  V1: () => { for (const R of Object.values(m.CONFIG.RUBRIQUES)) R.merites = R.merites.filter((l) => l.id !== "sansParfum"); },
  D10: () => { for (const R of Object.values(m.CONFIG.RUBRIQUES)) { const l = R.merites.find((x) => x.id === "sansParfum"); if (l && (R.exposition ?? 1) < 1) l.pts = +(l.pts * R.exposition).toFixed(1); } m.SIM.d10 = true; },
  S1: () => { m.SIM.parfumUneFois = true; },
  S5: () => { m.SIM.s5 = true; },
  D8: () => { m.SIM.d8 = true; },
  D4: () => { m.SIM.d4 = true; },
  D7: () => { m.SIM.d7 = true; },
  S3: () => { m.SIM.capPerso = true; },
  S6: () => { m.SIM.dedup = true; },
  ACTW: () => { m.SIM.actifsW = true; },
  MONO: () => { m.SIM.prerequisMono = true; },
  D5: () => { m.SIM.actifTop5LowDose = true; },
  P6D: () => { m.SIM.lowDoseSousBarre = true; },
  D3: () => { for (const n of ["BENZYL ALCOHOL", "PHENETHYL ALCOHOL", "4-T-BUTYLCYCLOHEXANOL", "PHENYLPROPANOL"]) setFiche(n, { fragrance: false, euFragranceAllergen: true }); },
  ZNO: () => { for (const n of Object.keys(D)) if (/^ZINC OXIDE/.test(n) || /^BIS-ETHYLHEXYLOXYPHENOL|^METHYLENE BIS-BENZOTRIAZOLYL|^DROMETRIZOLE TRISILOXANE/.test(n)) setFiche(n, { fonctions: [...new Set([...(D[n].fonctions || []), "filtre-uva", "filtre-uvb"])] }); },
  PG: () => { setFiche("PROPYLENE GLYCOL", { risks: { irritant: 1, sensibilisant: 1 } }); },
  D8B: () => { m.SIM.d8 = true; m.SIM.d8min = 2; },
  P4: () => { m.CONFIG.RUBRIQUES.cleanser.prerequis[0].quoi = ["tensioactif-doux", "emollient", "emulsifiant"]; },
  P5: () => { m.CONFIG.RUBRIQUES["makeup-remover"].prerequis[0].quoi = ["emollient", "occlusif", "tensioactif-doux", "emulsifiant"]; },
  POND: () => { for (const R of Object.values(m.CONFIG.RUBRIQUES)) for (const l of R.merites) if (["antiox", "lipides"].includes(l.id)) l.pondere = true; },
  GRAD: () => { m.SIM.top5Gradue = true; },
  D9: () => { m.SIM.d9 = true; },
  MASK5: () => { m.CONFIG.RUBRIQUES.mask.prerequis[0].pts = 5; },
  BASE: () => {},
};
const apply = (...briques) => { reset(); for (const b of briques) B[b](); };
// ── calcul ──
const SF = (p) => m.scoreFormule(p.inci, p.category, p.filtresUV);
const SP = (p, P, f) => m.scorePerso(p.inci, P, p.category, f ?? SF(p), p.filtresUV);
const find = (re, cat, extra) => CAT.find((p) => re.test(p.name) && (!cat || p.category === cat) && (!extra || extra(p)));
const ET = {
  "CeraVe Hydrating Cleanser": find(/^CeraVe Hydrating Facial Cleanser/, "cleanser"),
  "Toleriane Purifying Foaming": find(/Toleriane Purifying Foaming/, "cleanser"),
  "Toleriane Double Repair": find(/Toleriane Double Repair/, "moisturizer"),
  "Toleriane Dermallergo": find(/Toleriane Dermallergo/, "moisturizer"),
  "Sensibio H2O": find(/Sensibio H2O/, "makeup-remover"),
  "Weleda Skin Food (US, parfum)": find(/Weleda Skin Food/, "moisturizer", (p) => /parfum|fragrance/i.test(p.inci)),
  "Sérum parfumé (Estée Lauder ANR / Génifique)": find(/Advanced Night Repair|Génifique|Genifique/, "serum", (p) => /parfum|fragrance/i.test(p.inci)) || find(/Minéral 89|Mineral 89/, "serum"),
  "TO Niacinamide 10 % + Zinc": find(/Ordinary.*Niacinamide 10/, "serum"),
  "Effaclar Adapalene 0,1 %": find(/Effaclar Adapalene/, "treatment"),
  "VT Cosmetics PDRN": find(/PDRN/, "serum", (p) => m.scoreFormule(p.inci, "serum", p.filtresUV).score >= 90) || find(/VT Cosmetics.*PDRN/, "serum"),
  "COSRX Blue Peptide": find(/COSRX.*Blue Peptide/i, "serum"),
  "Dr. Althea": find(/Dr\. Althea/, "serum"),
  "Paula's Choice Resist (sérum)": find(/Paula's Choice Resist/, "serum"),
  "Sérum rétinol (Dermalogica Dynamic)": find(/Dermalogica Dynamic Skin Retinol/, "serum") || find(/Retinol/, "serum"),
  "Sérum rétinol 2 (Paula's / TO)": find(/Paula's Choice.*Retinol/, "serum") || find(/Ordinary Retinol/, "serum") || find(/Retinol/, "treatment"),
  "Tonique menthol": find(/./, "toner", (p) => /menthol/i.test(p.inci) && /alcohol denat|alcohol,/i.test(p.inci)) || find(/./, "toner", (p) => /menthol/i.test(p.inci)),
  "Effaclar toner astringent (alcool)": find(/Effaclar.*(Toner|Lotion|Astringent)/i, "toner") || find(/./, "toner", (p) => /^alcohol denat/i.test(p.inci.split(",")[1] || "")),
  "TO Caffeine 5 % (yeux)": find(/Ordinary Caffeine/, "eye-cream"),
  "Vanicream Mineral SPF 30": find(/Vanicream.*Mineral/, "sunscreen"),
  "Anthelios UV Hydra": find(/Anthelios UV Hydra/, "sunscreen"),
  "Vanicream Moisturizing Cream": find(/^Vanicream Moisturizing Cream/, "moisturizer"),
};
for (const [k, p] of Object.entries(ET)) if (!p) console.log("  (étalon introuvable :", k + ")");
const etalons = (noms, profils) => Object.entries(ET).filter(([k, p]) => p && noms.some((r) => r.test(k))).map(([k, p]) => { const f = SF(p); return [k, p.category, f.score, ...profils.map((n) => SP(p, PR[n], f).score)]; });
const global = () => { const s = CAT.map((p) => SF(p).score); return { moy: r1(mean(s)), med: q(s, .5), vert: pct(s.filter((v) => v >= 75).length, s.length), rouge: pct(s.filter((v) => v < 45).length, s.length), max: Math.max(...s) }; };
const persoStats = (P) => { const d = CAT.map((p) => { const f = SF(p); const s = SP(p, P, f).score; return { s, d: s - f.score }; }); return { dmoy: r1(mean(d.map((x) => x.d))), p10: q(d.map((x) => x.d), .1), vert: pct(d.filter((x) => x.s >= 75).length, d.length), rouge: pct(d.filter((x) => x.s < 45).length, d.length), cinq: pct(d.filter((x) => x.s <= 5).length, d.length) }; };
const medCat = () => CATS.map((c) => q(CAT.filter((p) => p.category === c).map((p) => SF(p).score), .5));
const section = process.argv[2];

if (section === "F1") {
  console.log("## FRICTION 1 — parfum : S2 (mérite retiré = V1) vs D10 (mérite × exposition)\n");
  const variantes = { "V0 actuel": ["BASE"], "V1 = S2 (mérite sansParfum retiré)": ["V1"], "D10 (mérite × exposition, perso × exposition)": ["D10"], "D10 + S1 (perso une fois)": ["D10", "S1"], "V1 + S1": ["V1", "S1"], "V1 + S1 + D3 (benzyl alcohol ≠ parfum)": ["V1", "S1", "D3"] };
  const rows = [], rowsE = [], rowsC = [];
  for (const [n, b] of Object.entries(variantes)) {
    apply(...b);
    const g = global(); const ps = persoStats(PR.sens3);
    const sansP = CAT.filter((p) => SF(p).details.every((x) => x.type !== "complexe-parfumant"));
    const cout = sansP.map((p) => m.scoreFormule(p.inci + ", Parfum", p.category, p.filtresUV).score - SF(p).score);
    const ec = CATS.map((c) => { const L = CAT.filter((p) => p.category === c); const a = L.filter((p) => SF(p).details.some((d) => d.type === "complexe-parfumant")).map((p) => SF(p).score), s = L.filter((p) => !SF(p).details.some((d) => d.type === "complexe-parfumant")).map((p) => SF(p).score); return r1(q(s, .5) - q(a, .5)); });
    rows.push([n, g.moy, g.med, g.vert, g.rouge, r1(mean(cout)), Math.min(...cout), ps.dmoy, ps.vert, ps.rouge, ps.cinq]);
    rowsC.push([n, ...ec]);
    for (const e of etalons([/CeraVe Hydrating|Toleriane|Sensibio|Weleda|Sérum parfumé|TO Caffeine/], ["sens3", "secheReactive"])) rowsE.push([n.split(" ")[0], ...e]);
  }
  console.log(tableau(rows, ["variante", "moy", "méd", "%vert", "%rouge", "coût 1 trace parfum", "pire", "perso sens3 Δmoy", "%vert perso", "%rouge perso", "%=5"]));
  console.log("\nécart de médiane (sans parfum − parfumé) par famille :");
  console.log(tableau(rowsC, ["variante", ...CATS]));
  console.log("\nétalons (formule | perso sens3 | perso sèche réactive) :");
  console.log(tableau(rowsE, ["variante", "produit", "cat", "formule", "perso sens3", "perso sècheR"]));
}

if (section === "F2") {
  console.log("## FRICTION 2 — S5 (pas de malus irritant sur actif power 3 en formule) + D8 (irritant × réactivité en perso)\n");
  const variantes = { "V0": ["BASE"], "S5 seul": ["S5"], "D8 seul": ["D8"], "S5 + D8": ["S5", "D8"], "S5 + D8 + S1": ["S5", "D8", "S1"] };
  const rows = [], rowsE = [];
  for (const [n, b] of Object.entries(variantes)) {
    apply(...b);
    const ser = CAT.filter((p) => p.category === "serum");
    const dR = ser.map((p) => m.scoreFormule(p.inci + ", Retinol", "serum", p.filtresUV).score - SF(p).score);
    const ps = persoStats(PR.sens3), pd = persoStats(PR.secheReactive);
    rows.push([n, global().moy, global().vert, r1(mean(dR)), pct(dR.filter((x) => x < 0).length, dR.length), ps.dmoy, ps.vert, ps.rouge, ps.cinq, pd.dmoy, pd.rouge, pd.cinq]);
    for (const e of etalons([/Tonique menthol|Effaclar toner|rétinol|TO Niacinamide|Toleriane Purifying|Sensibio|CeraVe Hydrating|Adapalene/], ["sens3", "secheReactive"])) rowsE.push([n, ...e]);
  }
  console.log(tableau(rows, ["variante", "formule moy", "%vert", "+Retinol Δ formule sérums", "% baisses", "sens3 Δmoy", "%vert", "%rouge", "%=5", "sècheR Δmoy", "%rouge", "%=5"]));
  console.log("\nétalons :");
  console.log(tableau(rowsE, ["variante", "produit", "cat", "formule", "perso sens3", "perso sècheR"]));
  apply("S5", "D8");
  for (const k of ["Tonique menthol", "Effaclar toner astringent (alcool)", "Sérum rétinol (Dermalogica Dynamic)"]) { const p = ET[k]; if (!p) continue; const s = SP(p, PR.sens3); console.log(`\n  ${k} — ${p.name.slice(0, 60)} — top8 : ${m.parseInci(p.inci).slice(0, 8).map((i) => i.name).join(", ")}`); console.log("   facts sens3 :", s.facts.filter((f) => f.points).slice(0, 7).map((f) => `${f.label.slice(0, 45)} ${f.points > 0 ? "+" : ""}${f.points}`).join(" ; ")); }
  // D8 : nettoyants doux chez les sensibles
  apply("BASE"); const c0 = CAT.filter((p) => p.category === "cleanser").map((p) => SP(p, PR.sens3).score);
  apply("D8"); const c1 = CAT.filter((p) => p.category === "cleanser").map((p) => SP(p, PR.sens3).score);
  console.log("\n  nettoyants, perso sens3 : médiane V0", q(c0, .5), "→ D8", q(c1, .5), "; % rouge", pct(c0.filter((v) => v < 45).length, c0.length), "→", pct(c1.filter((v) => v < 45).length, c1.length));
  apply("BASE"); const t0 = CAT.filter((p) => p.category === "toner" && /menthol|alcohol denat/i.test(p.inci)).map((p) => SP(p, PR.sens3).score);
  apply("D8"); const t1 = CAT.filter((p) => p.category === "toner" && /menthol|alcohol denat/i.test(p.inci)).map((p) => SP(p, PR.sens3).score);
  console.log("  toniques au menthol/alcool (" + t0.length + "), perso sens3 : médiane V0", q(t0, .5), "→ D8", q(t1, .5));
}

if (section === "F3") {
  console.log("## FRICTION 3 — D4 : comédogène hors gravité (formule)\n");
  apply("BASE"); const f0 = CAT.map((p) => SF(p));
  apply("D4"); const f1 = CAT.map((p) => SF(p));
  const d = f1.map((f, i) => f.score - f0[i].score);
  const touch = d.map((x, i) => ({ x, i })).filter((o) => o.x !== 0);
  console.log("  produits dont la formule change :", touch.length, "(" + pct(touch.length, CAT.length) + "%) ; Δ moy parmi eux", r1(mean(touch.map((o) => o.x))), "; max", Math.max(...d), "; Δ<0 :", touch.filter((o) => o.x < 0).length);
  const dist = {}; for (const o of touch) dist[o.x] = (dist[o.x] || 0) + 1; console.log("  répartition des Δ :", JSON.stringify(dist));
  const byCat = {}; for (const o of touch) byCat[CAT[o.i].category] = (byCat[CAT[o.i].category] || 0) + 1; console.log("  par catégorie :", JSON.stringify(byCat));
  console.log("  plafonnés (grav 3) avant :", f0.filter((f) => f.cap < Infinity).length, "→ après :", f1.filter((f) => f.cap < Infinity).length, " ; libérés du plafond :", CAT.filter((p, i) => f0[i].cap < Infinity && f1[i].cap === Infinity).map((p, k) => p.name.slice(0, 40) + " " + f0[CAT.indexOf(p)].score + "→" + f1[CAT.indexOf(p)].score).join(" ; "));
  console.log("  global : %vert", pct(f0.filter((f) => f.score >= 75).length, CAT.length), "→", pct(f1.filter((f) => f.score >= 75).length, CAT.length), "; moy", r1(mean(f0.map((f) => f.score))), "→", r1(mean(f1.map((f) => f.score))));
  const rowsE = []; for (const [k, p] of Object.entries(ET)) if (p && /Weleda|Vanicream Moist|Toleriane Double|CeraVe|Sensibio/.test(k)) rowsE.push([k, f0[CAT.indexOf(p)].score, f1[CAT.indexOf(p)].score]);
  for (const p of CAT.filter((p) => /ELEMIS Pro-Collagen Naked|Paula's Choice Resist Triple-Action Dark Spot|Kiehl's Ultra Facial Cream$/.test(p.name)).slice(0, 4)) rowsE.push([p.name.slice(0, 45), f0[CAT.indexOf(p)].score, f1[CAT.indexOf(p)].score]);
  console.log(tableau(rowsE, ["étalon", "V0", "D4"]));
  // perso : double comptage comédogène (formule + perso grasse) avant/après
  apply("BASE"); const g0 = CAT.map((p) => SP(p, PR.grasseAcne).score); apply("D4"); const g1 = CAT.map((p) => SP(p, PR.grasseAcne).score);
  console.log("  perso grasseAcne : médiane", q(g0, .5), "→", q(g1, .5), "; %vert", pct(g0.filter((v) => v >= 75).length, g0.length), "→", pct(g1.filter((v) => v >= 75).length, g1.length));
  // plafond résiduel
  const has = (pred) => CAT.filter((p) => m.parseInci(p.inci).some((it) => it.fiche && pred(it.fiche)));
  console.log("  plafond non compensatoire résiduel (irritant 3 seul) :", has((f) => f.risks?.irritant >= 3).length, "produits ; candidats à un plafond étendu (D2) : banniUE", has((f) => f.banniUE).length, ", sensibilisant 3 hors parfum/HE", has((f) => f.risks?.sensibilisant === 3 && !f.fragrance && !f.essentialOil).length, ", libérateur formaldéhyde", has((f) => f.libereFormaldehyde).length);
}

if (section === "F4") {
  console.log("## FRICTION 4 — comptage des actifs : règle unique (P6/D6/S6)\n");
  const variantes = { "V0": ["BASE"], "U1 = w≥0,6|lowDose + dédoublonné (P6a+S6)": ["ACTW", "S6"], "U2 = U1 + prérequis par 1 actif fort top5|lowDose (P6b+D5)": ["ACTW", "S6", "MONO", "D5"], "U3 = U2 + lowDose sous la barre → w 0,6 (P6d)": ["ACTW", "S6", "MONO", "D5", "P6D"], "U2 + S5 (actif fort sans malus irritant)": ["ACTW", "S6", "MONO", "D5", "S5"] };
  const rows = [], rowsE = [];
  const TO = ET["TO Niacinamide 10 % + Zinc"];
  for (const [n, b] of Object.entries(variantes)) {
    apply(...b);
    const st = (c) => { const L = CAT.filter((p) => p.category === c).map((p) => SF(p)); return [q(L.map((f) => f.score), .5), pct(L.filter((f) => f.score >= 75).length, L.length), pct(L.filter((f) => f.details.some((d) => d.type === "manque" && d.id === "actifs")).length, L.length), Math.max(...L.map((f) => f.score))]; };
    rows.push([n, ...st("serum"), ...st("treatment"), global().vert]);
    for (const e of etalons([/TO Niacinamide|Adapalene|VT Cosmetics|COSRX|Althea|Paula's Choice Resist|rétinol/], ["grasseAcne", "normaleAge"])) rowsE.push([n.split(" ")[0], ...e]);
    if (TO) { const t = m.decouperInci(TO.inci).map((x) => x.trim()); const i = t.findIndex((x) => /phenoxyethanol/i.test(x)); const t1 = [...t]; t1.splice(i + 1, 0, "Sodium Hyaluronate", "Panthenol", "Allantoin"); const t2 = [...t, "Retinol"]; const t3 = [...t, ...Array.from({ length: 8 }, (_, k) => ["Camellia Sinensis Leaf Extract", "Centella Asiatica Extract", "Aloe Barbadensis Leaf Juice", "Chamomilla Recutita Flower Extract", "Glycyrrhiza Glabra Root Extract", "Panthenol", "Allantoin", "Sodium Hyaluronate"][k])]; console.log(`  ${n.split(" ")[0]} — triche sur TO Niacinamide : base ${SF(TO).score} ; +3 actifs après le conservateur → ${m.scoreFormule(t1.join(", "), "serum").score} ; +Retinol en queue → ${m.scoreFormule(t2.join(", "), "serum").score} ; +8 extraits traces → ${m.scoreFormule(t3.join(", "), "serum").score}`); }
  }
  console.log(tableau(rows, ["variante", "sérum méd", "%vert", "%prérequis manquant", "max", "traitement méd", "%vert", "%prérequis manquant", "max", "%vert global"]));
  console.log("\nétalons (formule | perso grasseAcne | perso normaleAge) :");
  console.log(tableau(rowsE, ["variante", "produit", "cat", "formule", "perso grasse", "perso âge"]));
  apply("ACTW", "S6", "MONO", "D5");
  for (const k of ["Effaclar Adapalene 0,1 %", "VT Cosmetics PDRN", "TO Niacinamide 10 % + Zinc"]) { const p = ET[k]; if (!p) continue; const f = SF(p); console.log(`\n  U2 — ${k} → ${f.score} : ` + f.details.map((d) => `${d.id || d.type} ${d.pts > 0 ? "+" : ""}${d.pts}${d.n ? " (n=" + d.n + ")" : ""}`).join(" ; ")); }
}

if (section === "PACK") {
  console.log("## PAQUET RETENU (vote C) vs actuel\n");
  const PAQUET = ["S1", "V1", "S6", "ACTW", "MONO", "D5", "P6D", "POND", "S5", "D8B", "D4", "D7", "S3", "D3", "ZNO", "PG", "P4", "P5"];
  const rows = [], rowsE = [], rowsC = [];
  for (const [n, b] of Object.entries({ "V0 actuel": ["BASE"], "PAQUET": PAQUET, "PAQUET sans V1 (mérite parfum gardé)": PAQUET.filter((x) => x !== "V1"), "PAQUET avec D10 au lieu de V1": [...PAQUET.filter((x) => x !== "V1"), "D10"] })) {
    apply(...b);
    const g = global();
    rows.push([n, g.moy, g.med, g.vert, g.rouge, g.max, ...["sens3", "secheReactive", "grasseAcne", "normaleAge"].flatMap((k) => { const s = persoStats(PR[k]); return [s.dmoy, s.vert, s.rouge, s.cinq]; })]);
    rowsC.push([n, ...medCat()]);
    for (const e of etalons([/./], ["sens3", "secheReactive", "grasseAcne", "normaleAge"])) rowsE.push([n.split(" ")[0], ...e]);
  }
  console.log(tableau(rows, ["variante", "moy", "méd", "%vert", "%rouge", "max", "sens3 Δ", "%v", "%r", "%5", "sècheR Δ", "%v", "%r", "%5", "grasse Δ", "%v", "%r", "%5", "âge Δ", "%v", "%r", "%5"]));
  console.log("\nmédiane formule par famille :");
  console.log(tableau(rowsC, ["variante", ...CATS]));
  console.log("\nétalons (formule | perso sens3 | sècheR | grasseAcne | normaleAge) :");
  console.log(tableau(rowsE, ["variante", "produit", "cat", "formule", "sens3", "sècheR", "grasse", "âge"]));
  // monotonie et robustesse re-testées sur le paquet
  apply(...PAQUET);
  const toks = (p) => m.decouperInci(p.inci).map((t) => t.trim()).filter(Boolean);
  let d = CAT.map((p) => m.scoreFormule([...toks(p), "Niacinamide"].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("\n  paquet — T1 niacinamide en queue : violations Δ<0 =", d.filter((x) => x < 0).length);
  d = CAT.map((p) => m.scoreFormule([...toks(p), ...toks(p).slice(0, 5)].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  paquet — T5 doublon top5 en queue : Δ>0 =", d.filter((x) => x > 0).length, "(V0 : 264)");
  d = CAT.map((p) => m.scoreFormule([...toks(p), "Parfum"].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  paquet — T3 parfum en queue : violations Δ>0 =", d.filter((x) => x > 0).length, "; coût moyen", r1(mean(d)));
  d = CAT.map((p) => m.scoreFormule(["Water", ...toks(p)].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  paquet — T2 eau en tête : hausses =", d.filter((x) => x > 0).length, "(V0 : 143)");
  const capped = CAT.filter((p) => SF(p).cap < Infinity); console.log("  paquet — produits plafonnés :", capped.length, "; perso > cap :", capped.filter((p) => Math.max(...Object.values(PR).map((P) => SP(p, P).score)) > SF(p).cap).length);
  const opaque = { category: "serum", inci: "Water, Glycerin, Niacinamide, Parfum" }, transp = { category: "serum", inci: "Water, Glycerin, Niacinamide, Parfum, Linalool, Limonene, Citronellol, Geraniol, Coumarin, Benzyl Alcohol, Citral, Eugenol" };
  console.log("  paquet — étalon opaque/transparente (sérum, sens3) : formule", SF(opaque).score, "/", SF(transp).score, "; perso", SP(opaque, PR.sens3).score, "/", SP(transp, PR.sens3).score);
}

if (section === "F2B") {
  console.log("## F2 bis — D8 restreint aux irritants de niveau 2 (D8B) : nettoyants doux et toniques agressifs, perso sens3\n");
  const rows = [];
  for (const [n, b] of Object.entries({ "V0": ["BASE"], "D8 (irritant >=1)": ["D8"], "D8B (irritant 2 seulement)": ["D8B"], "D8B + S1": ["D8B", "S1"], "D8B + S1 + S5": ["D8B", "S1", "S5"] })) {
    apply(...b);
    const cl = CAT.filter((p) => p.category === "cleanser").map((p) => SP(p, PR.sens3).score);
    const doux = CAT.filter((p) => p.category === "cleanser" && !/sulfate|parfum|fragrance/i.test(p.inci)).map((p) => SP(p, PR.sens3).score);
    const ton = CAT.filter((p) => p.category === "toner" && /menthol|alcohol denat/i.test(p.inci)).map((p) => SP(p, PR.sens3).score);
    const sol = CAT.filter((p) => p.category === "sunscreen").map((p) => SP(p, PR.sens3).score);
    const ps = persoStats(PR.sens3);
    rows.push([n, q(cl, .5), pct(cl.filter((v) => v < 45).length, cl.length), q(doux, .5), q(ton, .5), q(sol, .5), ps.dmoy, ps.rouge, ps.cinq, ...etalons([/CeraVe Hydrating|Toleriane Purifying|Sensibio|Tonique menthol|Effaclar toner/], ["sens3"]).map((e) => e[4])]);
  }
  console.log(tableau(rows, ["variante", "nettoyants med", "%rouge", "nettoyants sans sulfate ni parfum med", "toniques menthol/alcool med", "solaires med", "Dmoy", "%rouge", "%=5", "CeraVe H.", "Tol. Purif.", "Sensibio", "Tonique menthol", "Effaclar astr."]));
}
if (section === "F4B") {
  console.log("## F4 bis — la triche se deplace vers les lignes non ponderees (antiox, lipides) : effet de POND\n");
  const TO = ET["TO Niacinamide 10 % + Zinc"];
  const soups = CAT.filter((p) => p.category === "serum" && m.scoreFormule(p.inci, "serum", p.filtresUV).score >= 90);
  console.log("  serums >= 90 a l'etat actuel :", soups.length, soups.map((p) => p.name.slice(0, 40)).join(" ; "));
  const rows = [];
  for (const [n, b] of Object.entries({ "V0": ["BASE"], "U2": ["ACTW", "S6", "MONO", "D5"], "U2 + POND": ["ACTW", "S6", "MONO", "D5", "POND"], "U2 + POND + P6D": ["ACTW", "S6", "MONO", "D5", "POND", "P6D"], "U2 + POND + P6D + S5": ["ACTW", "S6", "MONO", "D5", "POND", "P6D", "S5"] })) {
    apply(...b);
    const t = m.decouperInci(TO.inci).map((x) => x.trim()); const i = t.findIndex((x) => /phenoxyethanol/i.test(x)); const t1 = [...t]; t1.splice(i + 1, 0, "Sodium Hyaluronate", "Panthenol", "Allantoin"); const t3 = [...t, "Camellia Sinensis Leaf Extract", "Centella Asiatica Extract", "Aloe Barbadensis Leaf Juice", "Chamomilla Recutita Flower Extract", "Glycyrrhiza Glabra Root Extract", "Panthenol", "Allantoin", "Sodium Hyaluronate"]; const t4 = [...t, "Ceramide NP", "Tocopherol"];
    const ser = CAT.filter((p) => p.category === "serum").map((p) => SF(p).score);
    rows.push([n, SF(TO).score, m.scoreFormule(t1.join(", "), "serum").score, m.scoreFormule([...t, "Retinol"].join(", "), "serum").score, m.scoreFormule(t3.join(", "), "serum").score, m.scoreFormule(t4.join(", "), "serum").score, ...soups.map((p) => SF(p).score), q(ser, .5), pct(ser.filter((v) => v >= 75).length, ser.length), Math.max(...ser), ET["Paula's Choice Resist (sérum)"] ? SF(ET["Paula's Choice Resist (sérum)"]).score : "-", ET["Effaclar Adapalene 0,1 %"] ? SF(ET["Effaclar Adapalene 0,1 %"]).score : "-"]);
  }
  console.log(tableau(rows, ["variante", "TO Niacinamide", "+3 actifs apres conservateur", "+Retinol queue", "+8 extraits queue", "+Ceramide NP+Tocopherol queue", ...soups.map((p) => p.name.slice(0, 18)), "serum med", "%vert", "max", "PC Resist", "Adapalene"]));
  for (const [c, R] of Object.entries(G0)) { const np = R.merites.filter((l) => !l.pondere && !l.parType && typeof l.quoi === "string" && !l.quoi.startsWith("@")).map((l) => l.id + "(" + (l.plafond ?? l.pts) + ")"); if (np.length) console.log("  ", c.padEnd(15), "lignes par fonction NON ponderees :", np.join(", ")); }
}
if (section === "F6B") {
  console.log("## F6 bis — P9 : ou sont les filtres organiques dans les non-solaires filtresUV ?");
  const nonSol = CAT.filter((p) => p.category !== "sunscreen" && p.filtresUV);
  const org = nonSol.map((p) => { const l = m.parseInci(p.inci); const f = l.filter((it) => (it.fiche?.fonctions || []).some((x) => x.startsWith("filtre")) && !/ZINC OXIDE|TITANIUM DIOXIDE/.test(it.name)); return { p, pos: f.length ? Math.min(...f.map((x) => x.pos)) : null, spf: /SPF|FPS|UV|SUN/i.test(p.name) }; });
  console.log("  filtre organique en pos <= 8 :", org.filter((x) => x.pos && x.pos <= 8).length, "; filtre organique seulement au-dela de pos 8 :", org.filter((x) => x.pos && x.pos > 8).length, "->", org.filter((x) => x.pos && x.pos > 8).slice(0, 5).map((x) => x.p.name.slice(0, 35) + " (pos " + x.pos + ", SPF au nom : " + x.spf + ")").join(" ; "));
  console.log("  sans filtre organique et sans SPF au nom :", org.filter((x) => !x.pos && !x.spf).length, "; avec SPF au nom :", org.filter((x) => x.spf).length);
}

if (section === "ATTR") {
  console.log("## ATTRIBUTION — paquet D10, brique par brique (cumulatif)\n");
  const ordre = ["BASE", "S1", "D10", "S6", "ACTW", "MONO", "D5", "P6D", "POND", "S5", "D8B", "D4", "D7", "S3", "D3", "ZNO", "PG", "P4", "P5"];
  const noms = [/CeraVe Hydrating|Toleriane Purifying|Sensibio|TO Niacinamide|Adapalene|VT Cosmetics|Paula's Choice Resist|TO Caffeine|Tonique menthol|Anthelios|Dermallergo|Weleda/];
  const rows = [], rowsF = []; const cum = [];
  for (const b of ordre) { cum.push(b); apply(...cum);
    const g = global(); const ps = persoStats(PR.sens3);
    rows.push(["+" + b, g.moy, g.vert, g.rouge, ps.dmoy, ps.rouge, ps.cinq, ...etalons(noms, []).map((e) => e[2])]);
    rowsF.push(["+" + b, ...medCat()]);
  }
  console.log(tableau(rows, ["brique", "moy", "%vert", "%rouge", "sens3 Δ", "%rouge", "%=5", ...etalons(noms, []).map((e) => e[0].slice(0, 14))]));
  console.log("\nmédianes par famille :");
  console.log(tableau(rowsF, ["brique", ...CATS]));
  apply(...cum);
  for (const k of ["Toleriane Purifying Foaming", "CeraVe Hydrating Cleanser"]) { const p = ET[k]; const f = SF(p); console.log("\n  paquet — " + k + " → " + f.score + " : " + f.details.map((d) => (d.id || d.type) + " " + (d.pts > 0 ? "+" : "") + d.pts).join(" ; ")); }
  apply("BASE");
  for (const k of ["Toleriane Purifying Foaming", "CeraVe Hydrating Cleanser"]) { const p = ET[k]; const f = SF(p); console.log("  V0 — " + k + " → " + f.score + " : " + f.details.map((d) => (d.id || d.type) + " " + (d.pts > 0 ? "+" : "") + d.pts).join(" ; ")); }
}
if (section === "S4") {
  console.log("## S4 — @actifTop5 gradué par w(pos) au lieu de binaire\n");
  const toks = (p) => m.decouperInci(p.inci).map((t) => t.trim()).filter(Boolean);
  let seed = 42; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const rows = [];
  for (const [n, b] of Object.entries({ "V0": ["BASE"], "GRAD": ["GRAD"], "GRAD + D5 (lowDose)": ["GRAD", "D5"], "paquet D10": ["S1", "D10", "S6", "ACTW", "MONO", "D5", "P6D", "POND", "S5", "D8B", "D4", "D7", "S3", "D3", "ZNO", "PG", "P4", "P5"], "paquet D10 + GRAD": ["S1", "D10", "S6", "ACTW", "MONO", "D5", "P6D", "POND", "S5", "D8B", "D4", "D7", "S3", "D3", "ZNO", "PG", "P4", "P5", "GRAD"] })) {
    apply(...b);
    const t1b = CAT.map((p) => m.scoreFormule(["Niacinamide", ...toks(p)].join(", "), p.category, p.filtresUV).score - SF(p).score).filter((x) => x < 0).length;
    const t2 = CAT.map((p) => m.scoreFormule(["Water", ...toks(p)].join(", "), p.category, p.filtresUV).score - SF(p).score).filter((x) => x > 0).length;
    seed = 42; const r4 = []; for (const p of CAT) { const t = toks(p); if (t.length < 8) continue; const i = Math.floor(rnd() * 5); [t[i], t[i + 1]] = [t[i + 1], t[i]]; r4.push(Math.abs(m.scoreFormule(t.join(", "), p.category, p.filtresUV).score - SF(p).score)); }
    const fal = CAT.filter((p) => ["serum", "treatment", "toner", "mask", "sunscreen"].includes(p.category)).map((p) => { const l = m.parseInci(p.inci); const first = l.find((it) => it.fiche?.role === "active" && (it.fiche.benefitPower || 0) >= 3); if (!(first && first.pos >= 6 && first.pos <= 7)) return null; const t = toks(p); const t2 = [...t]; const [x] = t2.splice(first.pos - 1, 1); t2.splice(4, 0, x); return m.scoreFormule(t2.join(", "), p.category, p.filtresUV).score - SF(p).score; }).filter((x) => x !== null);
    const g = global();
    rows.push([n, g.moy, g.vert, t1b, t2, r1(mean(r4)), Math.max(...r4), fal.length, r1(mean(fal)), Math.max(...fal), ...etalons([/TO Niacinamide|Paula's Choice Resist|VT Cosmetics|Adapalene/], []).map((e) => e[2])]);
  }
  console.log(tableau(rows, ["variante", "moy", "%vert", "T1b baisses (niacinamide en tête)", "T2 hausses (eau en tête)", "R4 |Δ| moy", "R4 max", "falaise 6-7 : n", "gain moyen en montant d'un cran", "max", "TO Niac", "PC Resist", "VT PDRN", "Adapalene"]));
}

if (section === "FIN") {
  const PK = ["S1", "D10", "S6", "ACTW", "MONO", "D5", "P6D", "POND", "S5", "D8B", "D4", "D7", "S3", "D3", "ZNO", "PG", "P4", "P5", "GRAD"];
  console.log("## (a) D6 : prérequis « un actif power ≥ 2 à w ≥ 0,6 » — trivial à cause de la glycérine ?");
  apply("BASE");
  const ser = CAT.filter((p) => ["serum", "treatment", "mask"].includes(p.category));
  const barre = (l) => { for (const it of l) if (m.CONFIG.marqueurs1pct.includes(it.name)) return it.pos; return Infinity; };
  const w = (it, b) => it.fiche?.lowDose ? 1 : it.pos >= b ? 0.3 : it.pos <= 5 ? 1 : it.pos <= 10 ? 0.6 : 0.3;
  let p2 = 0, p2sansGly = 0, p3 = 0;
  for (const p of ser) { const l = m.parseInci(p.inci); const b = barre(l); const forts = l.filter((it) => it.fiche?.role === "active" && it.fiche.benefits?.length && w(it, b) >= 0.6); if (forts.some((it) => it.fiche.benefitPower >= 2)) p2++; if (forts.some((it) => it.fiche.benefitPower >= 2 && !(it.fiche.fonctions || []).includes("humectant"))) p2sansGly++; if (forts.some((it) => it.fiche.benefitPower >= 3 && (it.pos <= 5 || it.fiche.lowDose))) p3++; }
  console.log("  sérums/traitements/masques (" + ser.length + ") : passent avec power≥2 à w≥0,6 :", pct(p2, ser.length), "% ; idem hors humectants (glycérine, HA) :", pct(p2sansGly, ser.length), "% ; passent avec MONO (power 3 en top 5 ou lowDose) :", pct(p3, ser.length), "%");
  console.log("\n## (b) D12 : la condition « w ≥ 0,6 ou lowDose » face aux fiches grossesse");
  const preg = Object.entries(D).filter(([k, v]) => v.pregnancyFlag).map(([k, v]) => k + (v.lowDose ? " (lowDose)" : ""));
  console.log("  fiches pregnancyFlag :", preg.join(" | "));
  const Pp = profil({ pregnancy: true });
  const cap15 = CAT.filter((p) => SP(p, Pp).score <= 15);
  console.log("  produits plafonnés à 15 pour un profil enceinte :", cap15.length, "; dont l'ingrédient déclencheur est au-delà de la position 10 :", cap15.filter((p) => m.parseInci(p.inci).filter((it) => it.fiche?.pregnancyFlag).every((it) => it.pos > 10)).length, "; dont lowDose (donc w = 1, D12 sans effet) :", cap15.filter((p) => m.parseInci(p.inci).some((it) => it.fiche?.pregnancyFlag && it.fiche.lowDose)).length);
  console.log("\n## (c) P12(d) : matchs perso × (benefitPower / 3)");
  for (const k of ["grasseAcne", "normaleAge"]) { const P = PR[k]; const res = CAT.map((p) => { const f = SF(p); const s = SP(p, P, f); let adj = 0; for (const x of s.facts) if (x.points > 0 && /targets your/.test(x.label)) { const pw = D[x.inci]?.benefitPower || 1; adj += x.points * (pw / 3) - x.points; } const raw = f.score + s.facts.filter((x) => x.points).reduce((a, x) => a + x.points, 0) + adj; return { s: s.score, c: Math.round(Math.min(100, Math.max(5, raw))), f: f.score }; }); console.log("  " + k.padEnd(12), "Δ moy vs formule : actuel", r1(mean(res.map((x) => x.s - x.f))), "→ ×power/3", r1(mean(res.map((x) => x.c - x.f))), "; %vert", pct(res.filter((x) => x.s >= 75).length, res.length), "→", pct(res.filter((x) => x.c >= 75).length, res.length), "; %=100", pct(res.filter((x) => x.s >= 100).length, res.length), "→", pct(res.filter((x) => x.c >= 100).length, res.length)); }
  console.log("\n## (d) D9 : richesse par classes (beurres 1 · huiles 0,7 · esters/CCT/squalane 0,3 · émulsifiants 0)");
  const etR = { "Vanicream Daily Facial Moisturizer": find(/Vanicream Daily Facial Moisturizer/, "moisturizer"), "Kiehl's Ultra Facial Cream": find(/Kiehl's Ultra Facial Cream$/, "moisturizer") || find(/Kiehl's Ultra Facial Cream/, "moisturizer"), "Toleriane Sensitive Riche": find(/Toleriane.*Riche/i, "moisturizer"), "CeraVe PM": find(/CeraVe PM/, "moisturizer"), "Weleda Skin Food": ET["Weleda Skin Food (US, parfum)"], "Dermalogica Precleanse": find(/Dermalogica Precleanse/, "makeup-remover"), "CeraVe Moisturizing Cream": find(/^CeraVe Moisturizing Cream/, "moisturizer"), "Neutrogena Hydro Boost": find(/Hydro Boost Water Gel/, "moisturizer") };
  const rows = [];
  for (const [n, b] of [["V0", []], ["D9", ["D9"]]]) { apply(...b); const rr = CATS.map((c) => { const L = CAT.filter((p) => p.category === c); return pct(L.filter((p) => m.natureProduit(m.parseInci(p.inci)).riche).length, L.length); }); rows.push([n, ...rr, ...Object.values(etR).map((p) => p ? r1(m.natureProduit(m.parseInci(p.inci)).richesse) + (m.natureProduit(m.parseInci(p.inci)).riche ? " R" : m.natureProduit(m.parseInci(p.inci)).legere ? " L" : "") : "-")]); }
  console.log(tableau(rows, ["variante", ...CATS.map((c) => "%riche " + c.slice(0, 6)), ...Object.keys(etR).map((k) => k.slice(0, 16))]));
  apply("BASE"); const g0 = CAT.map((p) => SP(p, PR.grasseAcne).score); apply("D9"); const g1 = CAT.map((p) => SP(p, PR.grasseAcne).score);
  console.log("  perso grasseAcne : médiane", q(g0, .5), "→", q(g1, .5), "; hydratants « heavy for your oily skin » :", CAT.filter((p, i) => p.category === "moisturizer" && g0[i] < g1[i]).length, "produits remontent, Δ moyen", r1(mean(CAT.map((p, i) => g1[i] - g0[i]).filter((x) => x > 0))));
  console.log("\n## (e) masques sous le paquet : prérequis « trois actifs » à w ≥ 0,6");
  for (const [n, b] of [["V0", ["BASE"]], ["paquet", PK], ["paquet + prérequis masque 10 → 5", [...PK, "MASK5"]]]) { apply(...b); const L = CAT.filter((p) => p.category === "mask").map((p) => SF(p)); console.log("  " + n.padEnd(34), "médiane", q(L.map((f) => f.score), .5), "; %vert", pct(L.filter((f) => f.score >= 75).length, L.length), "; %rouge", pct(L.filter((f) => f.score < 45).length, L.length), "; % prérequis manquant", pct(L.filter((f) => f.details.some((d) => d.type === "manque")).length, L.length)); }
  console.log("\n## (f) paquet final (D10 + GRAD) — distribution complète");
  apply(...PK); const g = global(); console.log("  formule : moy", g.moy, "méd", g.med, "%vert", g.vert, "%rouge", g.rouge, "max", g.max, "; médianes :", CATS.map((c, i) => c + " " + medCat()[i]).join(", "));
  for (const k of Object.keys(PR)) { const s = persoStats(PR[k]); console.log("  perso " + k.padEnd(14), JSON.stringify(s)); }
  const capped = CAT.filter((p) => SF(p).cap < Infinity); console.log("  plafonnés :", capped.length, "; perso > cap :", capped.filter((p) => Math.max(...Object.values(PR).map((P) => SP(p, P).score)) > SF(p).cap).length);
  const toks = (p) => m.decouperInci(p.inci).map((x) => x.trim()).filter(Boolean);
  let seed = 42; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const r3 = []; for (const p of CAT) { const t = toks(p); if (t.length < 8) continue; t[Math.floor(rnd() * 5)] = "Xqzv"; r3.push(Math.abs(m.scoreFormule(t.join(", "), p.category, p.filtresUV).score - SF(p).score)); }
  console.log("  R3 (un ingrédient du top 5 mal lu) : |Δ| moy", r1(mean(r3)), "p90", q(r3, .9), "max", Math.max(...r3), "(V0 : 1,7 / 6 / 31)");
}
