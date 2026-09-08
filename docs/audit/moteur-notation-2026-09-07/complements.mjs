import { m, CAT, CATS, q, mean, r1, pct, sf, sp, PROFILS, profil, tableau } from "./lib.mjs";
console.log("## C1 — SOLAIRES : prérequis « filtres » et « spectre »");
const sun = CAT.filter((p) => p.category === "sunscreen");
const noFiltre = sun.filter((p) => sf(p).details.some((d) => d.id === "filtres"));
console.log("  solaires sans filtre reconnu par le dictionnaire (−25) :", noFiltre.length, "/", sun.length, "; dont catalogue dit filtresUV=true :", noFiltre.filter((p) => p.filtresUV).length);
console.log("  exemples :", noFiltre.slice(0, 4).map((p) => `${p.name.slice(0, 45)} → ${sf(p).score} | top6: ${m.parseInci(p.inci).slice(0, 6).map((x) => x.name).join(", ")}`));
const zincOnly = sun.filter((p) => { const l = m.parseInci(p.inci); const uva = l.some((x) => (x.fiche?.fonctions || []).includes("filtre-uva")), uvb = l.some((x) => (x.fiche?.fonctions || []).includes("filtre-uvb")); return uva && !uvb; });
console.log("  solaires avec UVA seul (typiquement zinc oxide seul → pas de « spectre large », −13.5 pts) :", zincOnly.length, zincOnly.slice(0, 3).map((p) => `${p.name.slice(0, 40)} ${sf(p).score}`));
const photo = CAT.filter((p) => m.parseInci(p.inci).some((x) => /DIETHYLHEXYL (CARBONATE|ADIPATE|SUCCINATE|SEBACATE)/.test(x.name)) && m.parseInci(p.inci).some((x) => /AVOBENZONE|METHOXYDIBENZOYLMETHANE/.test(x.name)));
console.log("  @photostable : produits avec avobenzone « stabilisée » uniquement par un émollient DIETHYLHEXYL (carbonate/adipate…) — faux positif du regex :", photo.length);
console.log("\n## C2 — PARFUM : coût total réel (mérite sansParfum perdu + malus fixe) — médiane avec vs sans parfum, par famille");
const rows = [];
for (const c of CATS) { const L = CAT.filter((p) => p.category === c); const a = L.filter((p) => sf(p).details.some((d) => d.type === "complexe-parfumant")).map((p) => sf(p).score), b = L.filter((p) => !sf(p).details.some((d) => d.type === "complexe-parfumant")).map((p) => sf(p).score); rows.push([c, b.length, q(b, .5), pct(b.filter((v) => v >= 75).length, b.length), a.length, q(a, .5), pct(a.filter((v) => v >= 75).length, a.length), r1(q(b, .5) - q(a, .5))]); }
console.log(tableau(rows, ["cat", "n sans parfum", "méd sans", "%vert sans", "n parfumés", "méd parfumés", "%vert parfumés", "écart méd"]));
console.log("\n## C3 — ALLERGIE déclarée : test par sous-chaîne (scoring.mjs:568) → faux positifs");
for (const a of ["alcohol", "sulfate", "oil", "lanolin", "nickel", "paraben"]) { const P = profil({ allergies: [a] }); const n = CAT.filter((p) => sp(p, P, sf(p)).score <= 10).length; const ex = CAT.filter((p) => sp(p, P, sf(p)).score <= 10).slice(0, 1).map((p) => sp(p, P, sf(p)).facts.filter((f) => f.absolu).map((f) => f.inci).slice(0, 3).join(", ")); console.log("  allergie « " + a + " » → produits plafonnés à 10 :", n, "(" + pct(n, CAT.length) + "%)", "ex. déclencheurs :", ex[0] || "-"); }
console.log("\n## C4 — FORCE hors dose : strength lu sans pondération de position (perso lignes 561, 624 ; natureProduit ligne 353)");
const P3 = PROFILS.secheReactive;
const forceLoin = CAT.filter((p) => { const l = m.parseInci(p.inci); const s = l.filter((x) => (x.fiche?.strength || 0) >= 2); return s.length && s.every((x) => x.pos > 10); });
console.log("  produits dont le seul actif « fort » (strength ≥2) est au-delà de la position 10 :", forceLoin.length, "; perte perso (sèche réactive, ceiling 0) moyenne :", r1(mean(forceLoin.map((p) => sp(p, P3, sf(p)).facts.filter((f) => /Stronger|Strong exf/.test(f.label)).reduce((a, f) => a + f.points, 0)))), "pts ; ex :", forceLoin.slice(0, 3).map((p) => `${p.name.slice(0, 40)} (${m.parseInci(p.inci).find((x) => (x.fiche?.strength || 0) >= 2).name} pos ${m.parseInci(p.inci).find((x) => (x.fiche?.strength || 0) >= 2).pos})`));
console.log("\n## C5 — MÉRITES plafonnés, RISQUES non plafonnés : un actif prouvé mais irritant devient NET NÉGATIF une fois la ligne « richesse/actifs » saturée");
const sat = CAT.filter((p) => ["serum", "treatment"].includes(p.category)).filter((p) => { const d = sf(p).details.find((x) => x.id === "richesse"); const R = m.CONFIG.RUBRIQUES[p.category]; const l = R.merites.find((x) => x.id === "richesse"); return d && d.n >= 5; });
console.log("  sérums/traitements dont la ligne « richesse » est déjà saturée (≥5 actifs comptés) :", sat.length, "/", CAT.filter((p) => ["serum", "treatment"].includes(p.category)).length);
const S = (inci, p) => m.scoreFormule(inci, p.category, p.filtresUV).score;
for (const ing of ["Retinol", "Salicylic Acid", "Glycolic Acid", "Ascorbic Acid", "Azelaic Acid"]) { const d = sat.map((p) => S(p.inci + ", " + ing, p) - S(p.inci, p)); console.log("   +" + ing.padEnd(16), "en fin de liste : Δ moy", r1(mean(d)), "Δ<0 :", pct(d.filter((x) => x < 0).length, d.length), "%"); }
console.log("\n## C6 — SEVERITE × EXPOSITION : les risques sont multipliés (ligne 505) mais les mérites sont normalisés — poids relatif d'un même irritant (grav 2, pos 3) par famille, en points finaux");
console.log(tableau([...CATS, "indetermine"].map((c) => { const R = m.CONFIG.RUBRIQUES[c]; const k = R.severite * (R.exposition ?? 1); return [c, R.severite, R.exposition ?? 1, r1(4 * k), r1(6 * k), r1(k * 12)]; }), ["cat", "severite", "exposition", "grav2 top5 coûte", "grav3 top5 coûte", "plafond parfum"]));
console.log("\n## C7 — plancher perso à 5 : combien de produits y sont ÉCRASÉS (perte de discrimination) pour un profil sensibilité 3");
const P = profil({ sensitivity: 3 });
const brut = CAT.map((p) => { const f = sf(p); const s = sp(p, P, f); return { p, s: s.score, somme: f.score + s.facts.filter((x) => x.points).reduce((a, x) => a + x.points, 0) }; }).filter((x) => x.s <= 5);
console.log("  produits à 5/100 pour « sensibilité 3 » seule (aucune autre préoccupation) :", brut.length, "(" + pct(brut.length, CAT.length) + "%) ; score NON borné : méd", q(brut.map((x) => x.somme), .5), "min", Math.min(...brut.map((x) => x.somme)));
console.log("\n## C8 — sensibilisants : malus PAR ingrédient sans plafond (ligne 593-599) — nb de lignes « contact allergen » par produit, sensibilité 3");
const nS = CAT.map((p) => sp(p, P, sf(p)).facts.filter((f) => /contact allergen/.test(f.label)));
console.log("  produits avec ≥5 lignes :", nS.filter((a) => a.length >= 5).length, "; max lignes :", Math.max(...nS.map((a) => a.length)), "; somme max :", r1(Math.min(...nS.map((a) => a.reduce((s, f) => s + f.points, 0)))), "; ingrédients les plus fréquents :", Object.entries(nS.flat().reduce((o, f) => (o[f.inci] = (o[f.inci] || 0) + 1, o), {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + "(" + v + ")").join(", "));
