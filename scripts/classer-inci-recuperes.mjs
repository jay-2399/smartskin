// Reclasse la récolte de data/scan/inci-recuperes.json — sans refaire une seule requête.
//
// Le premier classement se contentait de compter les ingrédients (≥8 = vrai INCI). Il rejetait donc
// des listes courtes mais parfaitement réelles — un patch anti-boutons a cinq ingrédients, un
// gel silicone en a six — et acceptait n'importe quelle énumération pourvu qu'elle soit longue.
// Ce qui distingue vraiment une liste d'ingrédients d'un argumentaire, ce n'est pas la longueur :
// c'est l'ABSENCE DE PROSE. « Salicylic Acid: Unclogs pores, treats acne » a des virgules et des
// noms d'ingrédients, et n'est pas un INCI.
import fs from "node:fs";
import path from "node:path";
import { normaliserInci, tauxReconnu } from "./normaliser-inci.mjs";

const FICHIER = path.join(import.meta.dirname, "../data/scan/inci-recuperes.json");
const a = JSON.parse(fs.readFileSync(FICHIER, "utf8"));

// marqueurs de prose : ce qu'on ne trouve JAMAIS dans une liste d'ingrédients réglementaire
const RENVOI = /\b(refer to|see (the )?(product )?packaging|see (the )?label|listed on the|for (a )?complete)\b/i;
const VERBES = /\b(unclogs?|treats?|hydrates?|soothes?|smooths?|brightens?|exfoliates?|protects?|reduces?|helps?|improves?|nourishes?|firms?|calms?|boosts?|delivers?|targets?)\b/i;
const GLOSE = /[A-Za-z]\s*:\s*[A-Z][a-z]+\s+[a-z]+/;   // « Glycolic Acid: Exfoliates, smooths »
const PUCES = /(^|\s)[-•*]\s+[A-Z]/;

function classer(brut) {
  if (brut == null || !String(brut).trim()) return { type: "absent", n: 0, reconnu: 0 };
  const t = String(brut).trim();
  if (RENVOI.test(t)) return { type: "renvoi", n: 0, reconnu: 0 };      // « voir l'emballage »
  if (GLOSE.test(t) || PUCES.test(t) || VERBES.test(t)) return { type: "marketing", n: 0, reconnu: 0 };

  const items = t.split(",").map((s) => s.trim()).filter(Boolean);
  const reconnu = tauxReconnu(t);
  const n = items.length;

  // une vraie liste : plusieurs entrées, et le dictionnaire en reconnaît une part sérieuse
  if (n >= 8 && reconnu >= 0.45) return { type: "inci", n, reconnu };
  if (n >= 3 && reconnu >= 0.4) return { type: "inci-court", n, reconnu };
  // un seul ingrédient : légitime pour un patch hydrocolloïde, une huile 100 %, un spray d'acide
  if (n <= 2 && reconnu >= 0.5) return { type: "mono", n, reconnu };
  if (n >= 8) return { type: "douteux", n, reconnu };                   // longue mais peu reconnue
  return { type: "marketing", n, reconnu };
}

const compte = {};
for (const v of Object.values(a)) {
  // on RE-normalise depuis le texte brut : la normalisation a pu être corrigée depuis la récolte,
  // et refaire le calcul ne coûte rien alors que ré-aspirer la page se paie.
  if (v.brut != null) { const r = normaliserInci(v.brut); v.inci = r.inci; v.forme = r.forme; }
  const source = v.inci ?? v.brut;
  const c = classer(v.type === "introuvable" ? null : source);
  v.type = v.type === "introuvable" && v.brut == null ? "introuvable" : c.type;
  v.n = c.n; v.reconnu = Math.round(c.reconnu * 100) / 100;
  compte[v.type] = (compte[v.type] || 0) + 1;
}
fs.writeFileSync(FICHIER, JSON.stringify(a, null, 2), "utf8");

const ordre = ["inci", "inci-court", "mono", "douteux", "marketing", "renvoi", "absent", "introuvable"];
console.log("— classement —");
for (const k of ordre) if (compte[k]) console.log("  " + k.padEnd(13) + compte[k]);
const utiles = (compte.inci || 0) + (compte["inci-court"] || 0) + (compte.mono || 0);
console.log("\nEXPLOITABLES : " + utiles + " / " + Object.keys(a).length);
