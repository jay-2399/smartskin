import fs from "node:fs";
let s = fs.readFileSync("scoring-sim.mjs", "utf8");
const rep = (a, b) => { if (s.split(a).length !== 2) throw new Error("patch3 : " + a.slice(0, 50)); s = s.replace(a, b); };
rep(`d8min: false };`, `d8min: false, top5Gradue: false };`);
rep(`"@actifTop5": (ctx) => ctx.list.some((it) => (it.pos <= 5 || (SIM.actifTop5LowDose && it.fiche?.lowDose)) && it.fiche?.role === "active" &&
                                               (it.fiche.benefitPower || 0) >= 3) ? 1 : 0,`,
`"@actifTop5": (ctx) => SIM.top5Gradue
    ? Math.max(0, ...ctx.list.filter((it) => it.fiche?.role === "active" && (it.fiche.benefitPower || 0) >= 3).map((it) => ctx.w(it)))
    : (ctx.list.some((it) => (it.pos <= 5 || (SIM.actifTop5LowDose && it.fiche?.lowDose)) && it.fiche?.role === "active" &&
                                               (it.fiche.benefitPower || 0) >= 3) ? 1 : 0),`);
fs.writeFileSync("scoring-sim.mjs", s);
let t = fs.readFileSync("sim2.mjs", "utf8");
t = t.replace(`  BASE: () => {},`, `  GRAD: () => { m.SIM.top5Gradue = true; },
  BASE: () => {},`);
t += `
if (section === "ATTR") {
  console.log("## ATTRIBUTION — paquet D10, brique par brique (cumulatif)\\n");
  const ordre = ["BASE", "S1", "D10", "S6", "ACTW", "MONO", "D5", "P6D", "POND", "S5", "D8B", "D4", "D7", "S3", "D3", "ZNO", "PG", "P4", "P5"];
  const noms = [/CeraVe Hydrating|Toleriane Purifying|Sensibio|TO Niacinamide|Adapalene|VT Cosmetics|Paula's Choice Resist|TO Caffeine|Tonique menthol|Anthelios|Dermallergo|Weleda/];
  const rows = [], rowsF = []; const cum = [];
  for (const b of ordre) { cum.push(b); apply(...cum);
    const g = global(); const ps = persoStats(PR.sens3);
    rows.push(["+" + b, g.moy, g.vert, g.rouge, ps.dmoy, ps.rouge, ps.cinq, ...etalons(noms, []).map((e) => e[2])]);
    rowsF.push(["+" + b, ...medCat()]);
  }
  console.log(tableau(rows, ["brique", "moy", "%vert", "%rouge", "sens3 Δ", "%rouge", "%=5", ...etalons(noms, []).map((e) => e[0].slice(0, 14))]));
  console.log("\\nmédianes par famille :");
  console.log(tableau(rowsF, ["brique", ...CATS]));
  apply(...cum);
  for (const k of ["Toleriane Purifying Foaming", "CeraVe Hydrating Cleanser"]) { const p = ET[k]; const f = SF(p); console.log("\\n  paquet — " + k + " → " + f.score + " : " + f.details.map((d) => (d.id || d.type) + " " + (d.pts > 0 ? "+" : "") + d.pts).join(" ; ")); }
  apply("BASE");
  for (const k of ["Toleriane Purifying Foaming", "CeraVe Hydrating Cleanser"]) { const p = ET[k]; const f = SF(p); console.log("  V0 — " + k + " → " + f.score + " : " + f.details.map((d) => (d.id || d.type) + " " + (d.pts > 0 ? "+" : "") + d.pts).join(" ; ")); }
}
if (section === "S4") {
  console.log("## S4 — @actifTop5 gradué par w(pos) au lieu de binaire\\n");
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
`;
fs.writeFileSync("sim2.mjs", t);
console.log("patch3 ok");
