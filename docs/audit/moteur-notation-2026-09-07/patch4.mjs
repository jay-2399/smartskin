import fs from "node:fs";
let s = fs.readFileSync("scoring-sim.mjs", "utf8");
const rep = (a, b) => { if (s.split(a).length !== 2) throw new Error("patch4 : " + a.slice(0, 50)); s = s.replace(a, b); };
rep(`top5Gradue: false };`, `top5Gradue: false, d9: false };`);
rep(`    if (MOTS_RICHE.some((w) => it.name.includes(w)) && !MOTS_LEGER.some((w) => it.name === w)) richesse += poids;`,
`    if (SIM.d9) {
      const n = it.name; let k = 0;
      if (/BUTTER|WAX|PETROLATUM|LANOLIN|SHEA|CERA /.test(n)) k = 1;
      else if (/\\bOIL\\b/.test(n)) k = 0.7;
      else if (/STEARATE|PALMITATE|MYRISTATE/.test(n)) k = /(GLYCERYL|PEG-\\d+|SORBITAN|SUCROSE|POLYGLYCERYL-\\d+|METHYL GLUCOSE|ASCORBYL|RETINYL) /.test(n) || /^PEG-/.test(n) ? 0 : 0.3;
      else if (/SQUALANE|TRIGLYCERIDE|ALKANE|ISODODECANE/.test(n)) k = 0.3;
      if (k && !MOTS_LEGER.some((w) => n === w)) richesse += poids * k;
    } else if (MOTS_RICHE.some((w) => it.name.includes(w)) && !MOTS_LEGER.some((w) => it.name === w)) richesse += poids;`);
fs.writeFileSync("scoring-sim.mjs", s);
let t = fs.readFileSync("sim2.mjs", "utf8");
t = t.replace(`  BASE: () => {},`, `  D9: () => { m.SIM.d9 = true; },
  MASK5: () => { m.CONFIG.RUBRIQUES.mask.prerequis[0].pts = 5; },
  BASE: () => {},`);
t += `
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
  console.log("\\n## (b) D12 : la condition « w ≥ 0,6 ou lowDose » face aux fiches grossesse");
  const preg = Object.entries(D).filter(([k, v]) => v.pregnancyFlag).map(([k, v]) => k + (v.lowDose ? " (lowDose)" : ""));
  console.log("  fiches pregnancyFlag :", preg.join(" | "));
  const Pp = profil({ pregnancy: true });
  const cap15 = CAT.filter((p) => SP(p, Pp).score <= 15);
  console.log("  produits plafonnés à 15 pour un profil enceinte :", cap15.length, "; dont l'ingrédient déclencheur est au-delà de la position 10 :", cap15.filter((p) => m.parseInci(p.inci).filter((it) => it.fiche?.pregnancyFlag).every((it) => it.pos > 10)).length, "; dont lowDose (donc w = 1, D12 sans effet) :", cap15.filter((p) => m.parseInci(p.inci).some((it) => it.fiche?.pregnancyFlag && it.fiche.lowDose)).length);
  console.log("\\n## (c) P12(d) : matchs perso × (benefitPower / 3)");
  for (const k of ["grasseAcne", "normaleAge"]) { const P = PR[k]; const res = CAT.map((p) => { const f = SF(p); const s = SP(p, P, f); let adj = 0; for (const x of s.facts) if (x.points > 0 && /targets your/.test(x.label)) { const pw = D[x.inci]?.benefitPower || 1; adj += x.points * (pw / 3) - x.points; } const raw = f.score + s.facts.filter((x) => x.points).reduce((a, x) => a + x.points, 0) + adj; return { s: s.score, c: Math.round(Math.min(100, Math.max(5, raw))), f: f.score }; }); console.log("  " + k.padEnd(12), "Δ moy vs formule : actuel", r1(mean(res.map((x) => x.s - x.f))), "→ ×power/3", r1(mean(res.map((x) => x.c - x.f))), "; %vert", pct(res.filter((x) => x.s >= 75).length, res.length), "→", pct(res.filter((x) => x.c >= 75).length, res.length), "; %=100", pct(res.filter((x) => x.s >= 100).length, res.length), "→", pct(res.filter((x) => x.c >= 100).length, res.length)); }
  console.log("\\n## (d) D9 : richesse par classes (beurres 1 · huiles 0,7 · esters/CCT/squalane 0,3 · émulsifiants 0)");
  const etR = { "Vanicream Daily Facial Moisturizer": find(/Vanicream Daily Facial Moisturizer/, "moisturizer"), "Kiehl's Ultra Facial Cream": find(/Kiehl's Ultra Facial Cream$/, "moisturizer") || find(/Kiehl's Ultra Facial Cream/, "moisturizer"), "Toleriane Sensitive Riche": find(/Toleriane.*Riche/i, "moisturizer"), "CeraVe PM": find(/CeraVe PM/, "moisturizer"), "Weleda Skin Food": ET["Weleda Skin Food (US, parfum)"], "Dermalogica Precleanse": find(/Dermalogica Precleanse/, "makeup-remover"), "CeraVe Moisturizing Cream": find(/^CeraVe Moisturizing Cream/, "moisturizer"), "Neutrogena Hydro Boost": find(/Hydro Boost Water Gel/, "moisturizer") };
  const rows = [];
  for (const [n, b] of [["V0", []], ["D9", ["D9"]]]) { apply(...b); const rr = CATS.map((c) => { const L = CAT.filter((p) => p.category === c); return pct(L.filter((p) => m.natureProduit(m.parseInci(p.inci)).riche).length, L.length); }); rows.push([n, ...rr, ...Object.values(etR).map((p) => p ? r1(m.natureProduit(m.parseInci(p.inci)).richesse) + (m.natureProduit(m.parseInci(p.inci)).riche ? " R" : m.natureProduit(m.parseInci(p.inci)).legere ? " L" : "") : "-")]); }
  console.log(tableau(rows, ["variante", ...CATS.map((c) => "%riche " + c.slice(0, 6)), ...Object.keys(etR).map((k) => k.slice(0, 16))]));
  apply("BASE"); const g0 = CAT.map((p) => SP(p, PR.grasseAcne).score); apply("D9"); const g1 = CAT.map((p) => SP(p, PR.grasseAcne).score);
  console.log("  perso grasseAcne : médiane", q(g0, .5), "→", q(g1, .5), "; hydratants « heavy for your oily skin » :", CAT.filter((p, i) => p.category === "moisturizer" && g0[i] < g1[i]).length, "produits remontent, Δ moyen", r1(mean(CAT.map((p, i) => g1[i] - g0[i]).filter((x) => x > 0))));
  console.log("\\n## (e) masques sous le paquet : prérequis « trois actifs » à w ≥ 0,6");
  for (const [n, b] of [["V0", ["BASE"]], ["paquet", PK], ["paquet + prérequis masque 10 → 5", [...PK, "MASK5"]]]) { apply(...b); const L = CAT.filter((p) => p.category === "mask").map((p) => SF(p)); console.log("  " + n.padEnd(34), "médiane", q(L.map((f) => f.score), .5), "; %vert", pct(L.filter((f) => f.score >= 75).length, L.length), "; %rouge", pct(L.filter((f) => f.score < 45).length, L.length), "; % prérequis manquant", pct(L.filter((f) => f.details.some((d) => d.type === "manque")).length, L.length)); }
  console.log("\\n## (f) paquet final (D10 + GRAD) — distribution complète");
  apply(...PK); const g = global(); console.log("  formule : moy", g.moy, "méd", g.med, "%vert", g.vert, "%rouge", g.rouge, "max", g.max, "; médianes :", CATS.map((c, i) => c + " " + medCat()[i]).join(", "));
  for (const k of Object.keys(PR)) { const s = persoStats(PR[k]); console.log("  perso " + k.padEnd(14), JSON.stringify(s)); }
  const capped = CAT.filter((p) => SF(p).cap < Infinity); console.log("  plafonnés :", capped.length, "; perso > cap :", capped.filter((p) => Math.max(...Object.values(PR).map((P) => SP(p, P).score)) > SF(p).cap).length);
  const toks = (p) => m.decouperInci(p.inci).map((x) => x.trim()).filter(Boolean);
  let seed = 42; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const r3 = []; for (const p of CAT) { const t = toks(p); if (t.length < 8) continue; t[Math.floor(rnd() * 5)] = "Xqzv"; r3.push(Math.abs(m.scoreFormule(t.join(", "), p.category, p.filtresUV).score - SF(p).score)); }
  console.log("  R3 (un ingrédient du top 5 mal lu) : |Δ| moy", r1(mean(r3)), "p90", q(r3, .9), "max", Math.max(...r3), "(V0 : 1,7 / 6 / 31)");
}
`;
fs.writeFileSync("sim2.mjs", t);
console.log("patch4 ok");
