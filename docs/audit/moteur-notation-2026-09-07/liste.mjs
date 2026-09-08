import fs from "node:fs";
process.chdir("/Users/jayenbellili/dev/smartskin.app");
const m = await import("/Users/jayenbellili/dev/smartskin.app/src/lib/scan/scoring.mjs");
const CAT = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8")).filter((p) => p.category !== "hors-perimetre" && p.inci && p.inci.length > 20);
const re = /Adapalene|SKIN1004.*Centella|Ordinary.*Squalane|Hydro Boost.*SPF|Weleda Skin Food|Toleriane.*Micell|Urban Hydration|Vanicream.*(SPF|Mineral)|Avène.*Thermal|Avene.*Thermal|Eau Thermale/i;
for (const p of CAT.filter((p) => re.test(p.name))) { const n = m.parseInci(p.inci).length; console.log(`${p.brand} | ${p.name} | ${p.category} | n=${n} | V0=${m.scoreFormule(p.inci, p.category, p.filtresUV).score} | ${p.inci.slice(0, 70)}`); }
const D = JSON.parse(fs.readFileSync("data/scan/dictionnaire.json", "utf8"));
console.log("\nbanniUE :", Object.entries(D).filter(([k, v]) => v.banniUE).map(([k]) => k).join(" | "));
console.log("hamamelis :", Object.entries(D).filter(([k, v]) => /HAMAMELIS|WITCH HAZEL/.test(k)).map(([k, v]) => k + " p" + v.benefitPower + " irr" + v.risks.irritant + " [" + (v.benefits || []).join(",") + "]").join(" | "));
console.log("hyaluron actifs humectants :", Object.entries(D).filter(([k, v]) => /HYALURON/.test(k) && v.role === "active").map(([k, v]) => k + (v.lowDose ? " (lowDose)" : "")).join(" | "));
console.log("retinoïdes lowDose :", Object.entries(D).filter(([k, v]) => v.lowDose && /RETIN|ADAPALENE/.test(k)).map(([k]) => k).join(" | "));
