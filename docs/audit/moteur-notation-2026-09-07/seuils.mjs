import { m, CAT, CATS, q, mean, r1, pct, sf, tableau, DICT } from "./lib.mjs";
import fs from "node:fs";
const raw = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8"));
console.log("## F5 — seuils « non évaluable » : combien de produits tombent hors évaluation (sur", CAT.length, "en périmètre avec INCI ; +", raw.filter((p) => p.category !== "hors-perimetre" && !(p.inci && p.inci.length > 20)).length, "sans INCI déjà exclus)");
const n = CAT.map((p) => ({ p, n: m.parseInci(p.inci).length, f: sf(p) }));
for (const k of [4, 6, 8, 10, 12]) console.log(`  n ingrédients < ${k} :`.padEnd(30), n.filter((x) => x.n < k).length, "(" + pct(n.filter((x) => x.n < k).length, n.length) + "%)", "— note moyenne de ces produits :", r1(mean(n.filter((x) => x.n < k).map((x) => x.f.score))), "% verts :", pct(n.filter((x) => x.n < k && x.f.score >= 75).length, n.filter((x) => x.n < k).length));
for (const k of [0.6, 0.7, 0.8, 0.9]) console.log(`  couverture top10 < ${k} :`.padEnd(30), n.filter((x) => x.f.couverture < k).length, "(" + pct(n.filter((x) => x.f.couverture < k).length, n.length) + "%)");
// tête plausible : eau / huile / tensioactif / solvant dans les 3 premières positions
const TETE = /WATER|AQUA|OIL|GLYCERIN|ALCOHOL|BUTYLENE GLYCOL|PROPANEDIOL|DIMETHICONE|SQUALANE|PETROLATUM|GLYCOL|ISODODECANE|SILICA|KAOLIN|TALC|BUTTER|WAX|ZINC OXIDE|TITANIUM DIOXIDE|CYCLOPENTASILOXANE|HYDROGENATED|TRIGLYCERIDE|SULFATE|GLUCOSIDE|BETAINE|SODIUM|ACID|ESTER|CARBONATE|ALKANE|ETHYLHEXYL|HOMOSALATE|C12-15|C13-14|C15-19|PARAFFIN|LANOLIN|ALOE|HAMAMELIS|JUICE|EXTRACT|FERMENT|SEED|CENTELLA|HYALURON|NIACINAMIDE|UREA|BENZOATE|SALICYLATE/;
const teteKO = n.filter((x) => !m.parseInci(x.p.inci).slice(0, 3).some((it) => TETE.test(it.name)));
console.log("  tête implausible (aucun solvant/huile/tensio/actif majeur en pos 1-3) :", teteKO.length, teteKO.slice(0, 5).map((x) => x.p.name.slice(0, 35) + " [" + m.parseInci(x.p.inci).slice(0, 3).map((i) => i.name).join(", ") + "]"));
const FILTRES = /OXIDE|AVOBENZONE|METHOXYDIBENZOYLMETHANE|HOMOSALATE|OCTOCRYLENE|OCTINOXATE|OCTISALATE|ETHYLHEXYL SALICYLATE|ETHYLHEXYL METHOXYCINNAMATE|ETHYLHEXYL TRIAZONE|BENZOPHENONE|OXYBENZONE|PHENYLBENZIMIDAZOLE|ENSULIZOLE|TEREPHTHALYLIDENE|DROMETRIZOLE|BIS-ETHYLHEXYLOXYPHENOL|METHYLENE BIS-BENZOTRIAZOLYL|DIETHYLAMINO HYDROXYBENZOYL|DIETHYLHEXYL BUTAMIDO|TRIS-BIPHENYL|POLYSILICONE-15|ISOAMYL P-METHOXYCINNAMATE|METHYL ANTHRANILATE|MEROXYL|BUTYL METHOXY|4-METHYLBENZYLIDENE|PADIMATE/;
const sun = n.filter((x) => x.p.category === "sunscreen");
const sansDict = sun.filter((x) => x.f.details.some((d) => d.id === "filtres"));
const sansRien = sun.filter((x) => !m.parseInci(x.p.inci).some((it) => FILTRES.test(it.name)));
console.log("  solaires sans filtre reconnu par le dictionnaire :", sansDict.length, "; dont sans AUCUN nom de filtre connu (regex élargi, = vraie donnée manquante) :", sansRien.length, "; récupérables par le dictionnaire (D1/P2a) :", sansDict.length - sansRien.length);
const conf = {}; for (const p of CAT) { const c = p.catConfiance || p._catConfiance || "?"; conf[c] = (conf[c] || 0) + 1; } console.log("  confiance catégorie (catalogue) :", JSON.stringify(conf));
const incert = CAT.filter((p) => /incertain|aucune/.test(p.catConfiance || p._catConfiance || ""));
console.log("  catégorie incertaine/aucune :", incert.length, "; note moyenne", r1(mean(incert.map((p) => sf(p).score))), "; % verts", pct(incert.filter((p) => sf(p).score >= 75).length, incert.length));
// union de seuils proposés
const regles = {
  "A : n<6 OU couverture<0.7 OU solaire sans aucun filtre": (x) => x.n < 6 || x.f.couverture < 0.7 || (x.p.category === "sunscreen" && !m.parseInci(x.p.inci).some((it) => FILTRES.test(it.name))),
  "B : A OU n<8": (x) => x.n < 8 || x.f.couverture < 0.7 || (x.p.category === "sunscreen" && !m.parseInci(x.p.inci).some((it) => FILTRES.test(it.name))),
  "C : B OU tête implausible": (x) => x.n < 8 || x.f.couverture < 0.7 || (x.p.category === "sunscreen" && !m.parseInci(x.p.inci).some((it) => FILTRES.test(it.name))) || !m.parseInci(x.p.inci).slice(0, 3).some((it) => TETE.test(it.name)),
  "D : C OU catégorie incertaine": (x) => x.n < 8 || x.f.couverture < 0.7 || (x.p.category === "sunscreen" && !m.parseInci(x.p.inci).some((it) => FILTRES.test(it.name))) || !m.parseInci(x.p.inci).slice(0, 3).some((it) => TETE.test(it.name)) || /incertain|aucune/.test(x.p.catConfiance || x.p._catConfiance || ""),
};
for (const [k, f] of Object.entries(regles)) { const h = n.filter(f); console.log("  règle", k.padEnd(52), "→", h.length, "hors évaluation (" + pct(h.length, n.length) + "%) ; ces produits étaient notés en moyenne", r1(mean(h.map((x) => x.f.score))), "; verts parmi eux :", h.filter((x) => x.f.score >= 75).length); }
console.log("\n## F6 — P9 : bonus « filtres UV » sur des NON-solaires");
const nonSol = CAT.filter((p) => p.category !== "sunscreen" && p.filtresUV);
const ORGA = (l) => l.some((it) => (it.fiche?.fonctions || []).some((f) => f.startsWith("filtre")) && !/ZINC OXIDE|TITANIUM DIOXIDE/.test(it.name));
const cls = { "filtre organique reconnu": 0, "SPF dans le nom": 0, "ZnO/TiO2 en pos ≤ 6": 0, "ZnO/TiO2 tardif seulement (pigment/trace)": 0 };
const faux = [];
for (const p of nonSol) { const l = m.parseInci(p.inci); if (ORGA(l)) cls["filtre organique reconnu"]++; else if (/SPF|FPS|SUN|SOLAIRE|UV/i.test(p.name)) cls["SPF dans le nom"]++; else if (l.some((it) => /ZINC OXIDE|TITANIUM DIOXIDE/.test(it.name) && it.pos <= 6)) cls["ZnO/TiO2 en pos ≤ 6"]++; else { cls["ZnO/TiO2 tardif seulement (pigment/trace)"]++; faux.push(p); } }
console.log("  non-solaires avec filtresUV=true :", nonSol.length, JSON.stringify(cls));
console.log("  faux bonus probables (ZnO/TiO2 tardif, pas de SPF au nom) :", faux.length, "→ ex :", faux.slice(0, 8).map((p) => `${p.name.slice(0, 38)} (${p.category}, ${sf(p).score})`).join(" ; "));
const byCat = {}; for (const p of faux) byCat[p.category] = (byCat[p.category] || 0) + 1; console.log("  par catégorie :", JSON.stringify(byCat));
const P = { skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 2, libelles: {} };
console.log("  dont recevant la phrase perso « you say you skip sunscreen » (+7 à +10, produit posé) :", faux.filter((p) => m.scorePerso(p.inci, P, p.category, sf(p), p.filtresUV).facts.some((f) => /^UV filters/.test(f.label))).length);
console.log("\n## D2 — produits touchés par banniUE / sensibilisant 3 / libereFormaldehyde (hors parfum)");
const has = (pred) => CAT.filter((p) => m.parseInci(p.inci).some((it) => it.fiche && pred(it.fiche) && !it.fiche.fragrance && !it.fiche.essentialOil));
console.log("  banniUE :", has((f) => f.banniUE).length, "; sensibilisant 3 (hors parfum/HE) :", has((f) => f.risks?.sensibilisant === 3).length, "; libereFormaldehyde :", has((f) => f.libereFormaldehyde).length, "; irritant 3 :", has((f) => f.risks?.irritant === 3).length);
