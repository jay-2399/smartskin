import fs from "node:fs";
let t = fs.readFileSync("sim3.mjs", "utf8");
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error("patch6 : " + a.slice(0, 60)); t = t.replace(a, b); };
rep(`const norm = (s) => String(s || "").replace(/\\s*\\d+(?:[.,]\\d+)?\\s*%/g, "").replace(/\\bUSP\\b/gi, "");`,
    `const norm = (s) => String(s || "").replace(/\\s*\\d+(?:[.,]\\d+)?\\s*%/g, "").replace(/\\bUSP\\b/gi, "").replace(/\\(\\s*\\)/g, "").replace(/\\s+,/g, ",");`);
rep(`  apply([...CONSENSUS, ...EXTRA], KN); const EV = CAT.filter(gate);`,
`  if (EXTRA.includes("P9")) { for (const p of CAT) if (p.category !== "sunscreen" && p.filtresUV) { const l = m.parseInci(p.inci); const orga = l.some((it) => (it.fiche?.fonctions || []).some((x) => x.startsWith("filtre")) && !/ZINC OXIDE|TITANIUM DIOXIDE/.test(it.name) && it.pos <= 8); if (!orga && !/SPF|FPS|\\bUV\\b|SUN/i.test(p.name)) p.filtresUV = false; } }
  apply([...CONSENSUS, ...EXTRA.filter((x) => x !== "P9")], KN); const EV = CAT.filter(gate);`);
fs.writeFileSync("sim3.mjs", t); console.log("patch6 ok");
