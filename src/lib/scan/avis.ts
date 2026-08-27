// AVIS CLIENTS — appariement entre le catalogue de scan et les avis Amazon déjà collectés.
//
// Les deux jeux ont été constitués séparément : le catalogue de scan vient à 78 % d'Ulta, les
// avis d'Amazon. L'ASIN ne les relie que pour 17 produits. Le NOM, lui, en relie 60 — c'est
// gratuit et immédiat, alors qu'aller chercher les autres demande de retrouver chaque produit
// sur Amazon d'abord.
//
// Règle : on n'invente jamais. Un produit sans avis n'affiche pas de bloc « avis », il n'affiche
// rien. Le bloc précédent était écrit en dur et montrait les mêmes 4,4 étoiles sur tout.
import fs from "node:fs";
import path from "node:path";

type AvisBrut = {
  customers_say?: string;
  aspects?: Record<string, string>;
  sample_reviews?: { rating?: string; date?: string; text?: string; title?: string }[];
  asin?: string;
  reviews?: unknown;
};

export type Avis = {
  resume: string;
  aspects: { nom: string; mentions: string }[];
  extraits: { note: number; date: string; texte: string }[];
  source: "amazon";
};

const DOSSIER = path.join(process.cwd(), "data");
const norm = (s: string) => String(s || "").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim();

let _parAsin: Record<string, AvisBrut> | null = null;
let _parNom: Map<string, AvisBrut> | null = null;

function charger() {
  if (_parAsin) return;
  try {
    _parAsin = JSON.parse(fs.readFileSync(path.join(DOSSIER, "reviews-insights.json"), "utf8"));
  } catch { _parAsin = {}; }
  // index par nom : les avis sont indexés par ASIN, mais le nom du produit se trouve dans
  // le catalogue V1 (catalog-final.json), qui porte les deux.
  _parNom = new Map();
  try {
    const v1 = JSON.parse(fs.readFileSync(path.join(DOSSIER, "catalog-final.json"), "utf8"));
    for (const p of Array.isArray(v1) ? v1 : []) {
      const a = p?.asin && _parAsin![p.asin];
      const nom = norm(p?.name || p?.title || "");
      if (a && nom) _parNom.set(nom, a);
    }
  } catch { /* pas de catalogue V1 : on se rabat sur l'ASIN seul */ }
}

/** Met en forme, en ne gardant que ce qui est réellement renseigné. */
function formater(a: AvisBrut): Avis | null {
  const resume = typeof a.customers_say === "string" ? a.customers_say.trim() : "";
  if (!resume) return null;                       // sans résumé, le bloc n'a rien à dire
  const aspects = Object.entries(a.aspects || {})
    .map(([nom, mentions]) => ({ nom, mentions: String(mentions) }))
    .slice(0, 6);
  const extraits = (a.sample_reviews || [])
    .filter((r) => r && typeof r.text === "string" && r.text.trim().length > 40)
    .slice(0, 3)
    .map((r) => ({
      note: Math.max(1, Math.min(5, Number(r.rating) || 5)),
      date: String(r.date || ""),
      texte: String(r.text).trim().slice(0, 420),
    }));
  return { resume, aspects, extraits, source: "amazon" };
}

/** Avis d'un produit, par ASIN puis par nom. `null` si on n'en a pas — et alors on n'affiche rien. */
export function avisPour(produit: { name?: string; asin?: string }): Avis | null {
  charger();
  const parAsin = produit.asin ? _parAsin![produit.asin] : null;
  if (parAsin) { const f = formater(parAsin); if (f) return f; }

  const nom = norm(produit.name || "");
  if (!nom) return null;
  const exact = _parNom!.get(nom);
  if (exact) { const f = formater(exact); if (f) return f; }
  // appariement souple : l'un contient l'autre (« CeraVe Foaming Facial Cleanser » vs le même
  // nom suivi d'une mention de contenance). On exige 12 caractères pour éviter les faux amis.
  for (const [n, a] of _parNom!) {
    if (n.length >= 12 && (n.includes(nom) || nom.includes(n))) {
      const f = formater(a);
      if (f) return f;
    }
  }
  return null;
}

/** Combien de produits d'une liste ont des avis — sert à mesurer la couverture. */
export function couverture(produits: { name?: string; asin?: string }[]) {
  charger();
  let n = 0;
  for (const p of produits) if (avisPour(p)) n++;
  return { couverts: n, total: produits.length };
}
