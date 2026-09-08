import fs from "node:fs";
let s = fs.readFileSync("scoring-sim.mjs", "utf8");
const rep = (a, b) => { if (s.split(a).length !== 2) throw new Error("patch7 : " + a.slice(0, 60)); s = s.replace(a, b); };
rep(`matchScale: false };`, `matchScale: false, humLowDose: false };`);
rep(`    if (SIM.banMode && f.banniUE) {
      if ((R.exposition ?? 1) >= 1) { cap = Math.min(cap, SIM.banMode); details.push({ type: "banni", inci: it.name, cap: SIM.banMode }); }`,
`    if (SIM.banMode && f.banniUE) {
      if (f.banniUEPortee === "tous" || (R.exposition ?? 1) >= 1) { cap = Math.min(cap, SIM.banMode); details.push({ type: "banni", inci: it.name, cap: SIM.banMode }); }`);
rep(`    const hum = ctx.list.some((it) => it.fiche?.role === "active" && (it.fiche.fonctions || []).includes("humectant") && !GLY.test(it.name));`,
    `    const hum = ctx.list.some((it) => it.fiche?.role === "active" && (it.fiche.fonctions || []).includes("humectant") && !GLY.test(it.name) && (!SIM.humLowDose || it.fiche.lowDose));`);
fs.writeFileSync("scoring-sim.mjs", s);
let t = fs.readFileSync("sim3.mjs", "utf8");
const rt = (a, b) => { if (t.split(a).length !== 2) throw new Error("patch7 sim3 : " + a.slice(0, 60)); t = t.replace(a, b); };
// réserves dermato : hamamélis, propanediol/heptanediol, hyaluronates lowDose, TRIS-BIPHENYL uvb seul, portée des bans
rt(`    for (const n of Object.keys(D)) if (/^GLYCERIN \\(VEGETABLE/.test(n)) setFiche(n, { benefitPower: 2, benefits: ["dehydration"] });`,
`    for (const n of Object.keys(D)) if (/^GLYCERIN \\(VEGETABLE/.test(n)) setFiche(n, { benefitPower: 2, benefits: ["dehydration"] });
    for (const n of Object.keys(D)) if (/HAMAMELIS|WITCH HAZEL/.test(n)) setFiche(n, { benefitPower: 1, risks: { irritant: 1 } });
    for (const n of ["1,3-PROPANEDIOL", "1,2-HEPTANEDIOL"]) if (D[n]) setFiche(n, { role: "support", fonctions: [...new Set([...(D[n].fonctions || []), "humectant"])] });
    for (const n of Object.keys(D)) if (/HYALURON/.test(n) && D[n].role === "active") setFiche(n, { lowDose: true });
    for (const n of Object.keys(D)) if (D[n].banniUE) setFiche(n, { banniUEPortee: /METHYLISOTHIAZOLINONE/.test(n) ? "pose" : "tous" });`);
rt(`addFn("TRIS-BIPHENYL TRIAZINE", "filtre-uva", "filtre-uvb");`, `addFn("TRIS-BIPHENYL TRIAZINE", "filtre-uvb");`);
rt(`  MASK5: () => { m.CONFIG.RUBRIQUES.mask.prerequis[0].pts = 5; },`, `  MASK5: () => { m.CONFIG.RUBRIQUES.mask.prerequis[0].pts = 5; },
  HUMLD: () => { m.SIM.humLowDose = true; },`);
// consensus v2 : lowDose w = 1 partout (LD10 retiré), clause humectant lowDose
rt(`const CONSENSUS = ["S1", "DEDUP", "ACTW", "GRAD", "LD10", "POND", "D4", "D7", "S3", "D3", "ALIAS", "UV", "DICO", "P4", "P5", "D10P", "D8", "FORCE", "TEXT"];`,
   `const CONSENSUS = ["S1", "DEDUP", "ACTW", "GRAD", "POND", "D4", "D7", "S3", "D3", "ALIAS", "UV", "DICO", "P4", "P5", "D10P", "D8", "FORCE", "TEXT", "HUMLD"];`);
// P9 : mot entier hors marque
rt(`if (!orga && !/SPF|FPS|\\bUV\\b|SUN/i.test(p.name)) p.filtresUV = false; } }`,
   `const nomSansMarque = String(p.name).replace(new RegExp(String(p.brand || "").replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&"), "i"), ""); if (!orga && !/\\b(SPF|FPS|UV|SUN)\\b/i.test(nomSansMarque)) p.filtresUV = false; } }`);
// étalons : fiches exactes
rt(`  "Effaclar Adapalene": find(/Effaclar Adapalene/, "treatment"),`, `  "LRP Effaclar Adapalene 0,1 %": find(/Effaclar Adapalene/, "treatment", (p) => /La Roche/i.test(p.brand + p.name)),
  "Differin / Evenly Clear (adapalène lisible)": find(/Adapalene/i, "treatment", (p) => !/La Roche|Effaclar/i.test(p.brand + p.name)),`);
rt(`  "SKIN1004 Centella Ampoule": find(/SKIN1004.*Centella.*Ampoule/i, "serum"),`, `  "SKIN1004 Centella Ampoule (7 ingrédients)": find(/SKIN1004.*Centella.*Ampoule/i, "serum", (p) => m.parseInci(p.inci).length <= 10),
  "SKIN1004 Tea-Trica Relief Ampoule": find(/SKIN1004.*Tea-Trica/i, "serum"),`);
rt(`  "TO Squalane 100 %": find(/Ordinary.*Squalane/i),`, `  "TO 100 % Plant-Derived Squalane (n = 1)": find(/Ordinary.*Squalane/i, null, (p) => m.parseInci(p.inci).length <= 2),
  "TO Squalane Cleanser": find(/Ordinary.*Squalane Cleanser/i),`);
rt(`  "Neutrogena Hydro Boost SPF 50": find(/Hydro Boost.*SPF/i),`, `  "Neutrogena Hydro Boost HA Moisturizer SPF 50": find(/Hydro Boost.*Moisturizer.*SPF/i),
  "Neutrogena Hydro Boost Water Gel Lotion SPF 50": find(/Hydro Boost.*Water Gel.*SPF|Hydro Boost.*Lotion.*SPF/i),`);
rt(`  "Weleda Skin Food US (parfum)": find(/Weleda Skin Food/, "moisturizer", (p) => /parfum|fragrance/i.test(p.inci)),`,
   `  "Weleda Skin Food US (fiche propre, 4 allergènes)": find(/Weleda Skin Food/, "moisturizer", (p) => /parfum|fragrance/i.test(p.inci) && !/Travel|Clear 40/i.test(p.name) && !/(^|, )1(,|$)/.test(p.inci)),`);
rt(`  "[F] sérum peptides + Retinol en queue": fict(`, `  "[F] sérum peptides (sans rétinol)": fict("peptides", "serum", "Water, Glycerin, Propanediol, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Sodium Hyaluronate, Panthenol, Phenoxyethanol, Xanthan Gum"),
  "[F] sérum eau thermale de marque + glycérine": fict("eau thermale", "serum", "Avene Thermal Spring Water (Avene Aqua), Glycerin, Xanthan Gum, Phenoxyethanol"),
  "[F] crème Ceramide NP seul": fict("ceramide 1", "moisturizer", "Water, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Ceramide NP, Cholesterol, Panthenol, Phenoxyethanol"),
  "[F] crème Ceramide NP + Ceramide 3 (synonymes)": fict("ceramide 2", "moisturizer", "Water, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Ceramide NP, Ceramide 3, Cholesterol, Panthenol, Phenoxyethanol"),
  "[F] sérum peptides + Retinol en queue": fict(`);
// sortie FINAL : nom exact de la fiche, bandes, résiduel rétinol, triche catégorie, 5 rincés bannis
rt(`  const rowsE = []; for (const [k, p] of Object.entries(ET)) { if (!p) continue; const a = V0E.get(k); const f = SF(p); const ne = !p.fictif && !ok(p); rowsE.push([k, p.category, a.f + " → " + (ne ? "NE (" + f.score + ")" : f.score), a.sr + " → " + SP(p, PR.secheReactive, f).score, a.ga + " → " + SP(p, PR.grasseAcne, f).score, f.details.filter((d) => d.type === "manque").map((d) => d.id).join(",") || ""]); }
  console.log(tableau(rowsE, ["étalon", "cat", "formule", "sècheR", "grasseAcne", "prérequis manquants"]));`,
`  const rowsE = []; for (const [k, p] of Object.entries(ET)) { if (!p) continue; const a = V0E.get(k); const f = SF(p); const ne = !p.fictif && !ok(p); rowsE.push([k, p.fictif ? "(construit)" : (p.brand + " | " + p.name).slice(0, 60), p.category, a.f + " → " + (ne ? "NE (" + f.score + ")" : f.score), a.sr + " → " + SP(p, PR.secheReactive, f).score, a.ga + " → " + SP(p, PR.grasseAcne, f).score, f.details.filter((d) => d.type === "manque").map((d) => d.id).join(",") || ""]); }
  console.log(tableau(rowsE, ["étalon", "fiche exacte", "cat", "formule", "sècheR", "grasseAcne", "prérequis manquants"]));
  const bandeUp = chg.filter((x) => ["bad", "mid", "good"].indexOf(x.b.bande) > ["bad", "mid", "good"].indexOf(x.a.bande)).length, bandeDown = chg.filter((x) => ["bad", "mid", "good"].indexOf(x.b.bande) < ["bad", "mid", "good"].indexOf(x.a.bande)).length;
  console.log("\\n  bandes : montent de bande", bandeUp, "; descendent de bande", bandeDown, "; inchangées", chg.length - bandeUp - bandeDown, "; notes qui montent", chg.filter((x) => x.b.score > x.a.score).length, "; qui baissent", chg.filter((x) => x.b.score < x.a.score).length, "; inchangées", chg.filter((x) => x.b.score === x.a.score).length);
  // résiduel rétinol : TO Niacinamide, sérum peptides, et les rétinoïdes réels au-delà de la position 10 / barre
  const pep = ET["[F] sérum peptides (sans rétinol)"], pepR = ET["[F] sérum peptides + Retinol en queue"];
  console.log("  résiduel « Retinol en queue » : TO Niacinamide", SF(TO).score, "→", m.scoreFormule(TO.inci + ", Retinol", "serum").score, "; sérum peptides sans power 3 en top 5", SF(pep).score, "→", SF(pepR).score);
  const RET = /RETINOL|RETINAL|RETINYL|RETINOATE|ADAPALENE/;
  const reels = EV.filter((p) => { const l = m.parseInci(p.inci); const b = (() => { for (const it of l) if (m.CONFIG.marqueurs1pct.includes(it.name)) return it.pos; return Infinity; })(); return l.some((it) => it.fiche?.lowDose && RET.test(it.name) && (it.pos > 10 || it.pos >= b)); });
  const sW1 = reels.map((p) => SF(p).score); m.SIM.ld10 = true; const sLD = reels.map((p) => SF(p).score); m.SIM.ld10 = false;
  console.log("  rétinoïdes réels au-delà de la position 10 ou de la barre :", reels.length, "produits ; note moyenne avec lowDose w = 1 partout", r1(mean(sW1)), "contre", r1(mean(sLD)), "avec la clause 0,6 (Δ moyen +" + r1(mean(sW1) - mean(sLD)) + ", max +" + Math.max(...sW1.map((v, i) => v - sLD[i])) + ", produits qui changent " + sW1.filter((v, i) => v !== sLD[i]).length + ")");
  // triche catégorie
  const cv = ET["CeraVe Hydrating Cleanser"], vm = ET["Vanicream Moisturizing Cream"];
  console.log("  triche « catégorie par le nom » : CeraVe Hydrating en nettoyant", SF(cv).score, "/ en démaquillant", m.scoreFormule(cv.inci, "makeup-remover", cv.filtresUV).score, "/ en indéterminé", m.scoreFormule(cv.inci, "indetermine", cv.filtresUV).score, "; Vanicream Moisturizing Cream en hydratant", SF(vm).score, "/ en démaquillant", m.scoreFormule(vm.inci, "makeup-remover", vm.filtresUV).score, "/ en indéterminé", m.scoreFormule(vm.inci, "indetermine", vm.filtresUV).score);
  const et1 = ET["[F] sérum eau thermale de marque + glycérine"]; console.log("  eau thermale de marque en position 1 :", SF(et1).score, "; avec alias → WATER :", m.scoreFormule(et1.inci.replace(/Avene Thermal Spring Water \\(Avene Aqua\\)/, "Water"), "serum").score, "; perso rougeurs :", SP(et1, PR.rougeurs).score, "→", m.scorePerso(et1.inci.replace(/Avene Thermal Spring Water \\(Avene Aqua\\)/, "Water"), PR.rougeurs, "serum").score);
  console.log("  synonymes : crème Ceramide NP seul", SF(ET["[F] crème Ceramide NP seul"]).score, "; + Ceramide 3 (même molécule)", SF(ET["[F] crème Ceramide NP + Ceramide 3 (synonymes)"]).score);
  const ban5 = CAT.filter((p) => /Jack Black Face Buff|Jack Black All-Over|Galat[ée]e Confort|Nip \\+ Fab Glycolic Fix Night|Paula's Choice Triple-Action Dark Spot/i.test(p.name));
  console.log("  bannis « tous » en rincé :", ban5.map((p) => p.name.slice(0, 40) + " → " + SF(p).score + (SF(p).cap < Infinity ? " (cap " + SF(p).cap + ")" : "")).join(" ; "));
  console.log("  clause humectant lowDose : Vichy Minéral 89", SF(ET["Vichy Minéral 89"]).score, ET["Vichy Minéral 89"] && SF(ET["Vichy Minéral 89"]).details.some((d) => d.type === "manque") ? "ÉCHEC" : "ok", "; Drunk Elephant B-Hydra", SF(ET["Drunk Elephant B-Hydra"]).score, SF(ET["Drunk Elephant B-Hydra"]).details.some((d) => d.type === "manque") ? "ÉCHEC" : "ok", "; échecs sérum", pct(EV.filter((p) => p.category === "serum" && SF(p).details.some((d) => d.type === "manque" && d.id === "actifs")).length, EV.filter((p) => p.category === "serum").length), "%");`);
fs.writeFileSync("sim3.mjs", t); console.log("patch7 ok");
