// AVIS CLIENTS — appariement entre le catalogue de scan et les avis Amazon enrichis.
//
// Les deux jeux ont été constitués séparément : le catalogue de scan vient à 78 % d'Ulta, les
// avis d'Amazon. L'ASIN ne les relie que pour une partie des produits ; le NOM en relie
// davantage, et c'est gratuit.
//
// Règle : on n'invente jamais. Un produit sans avis n'affiche pas de bloc « avis », il n'affiche
// rien. Et on ne montre à l'utilisatrice QUE ce qui la concerne : le segment de SA peau et les
// problèmes qu'elle a déclarés. Le reste existe dans le fichier mais ne s'affiche pas — elle
// garde l'accès à tous les avis bruts par « See all reviews ».
import fs from "node:fs";
import path from "node:path";

type Extrait = {
  note: number | null; auteur: string; titre: string; texte: string; date: string;
  verifie: boolean; utiles: number; peau: string | null; sujets: string[];
};
type Enrichi = {
  ref: string; asin: string | null; pid: string | null; source: "amazon" | "ulta";
  nom: string; note: number | null; nbAvis: number | null;
  lus: number; collectes: number;
  segments: Record<string, string>;
  concerns: Record<string, string>;
  aspects: { libelle: string; polarite: "pos" | "neg"; concerne?: string[] }[];
  extraits: Extrait[];
  reserve: string | null;
};

/** Ce que la fiche affiche, une fois filtré pour CETTE utilisatrice. */
export type Avis = {
  note: number | null; nbAvis: number | null; collectes: number;
  /** d'où viennent les avis — la fiche l'affiche, on ne masque jamais la source */
  source: "amazon" | "ulta";
  /** Ulta ne renseigne jamais l'achat vérifié : l'afficher serait mentir */
  verifiable: boolean;
  /** le segment de sa peau — `substitut` est renseigné quand personne n'a déclaré sa peau */
  pourElle: { peau: string; texte: string; substitut: string | null } | null;
  /** un bloc par problème qu'elle a déclaré, et rien d'autre */
  problemes: { cle: string; libelle: string; texte: string }[];
  aspects: { libelle: string; polarite: "pos" | "neg" }[];
  extraits: Extrait[];
  reserve: string | null;
};

export type ProfilAvis = {
  skinType?: string;
  concerns?: Record<string, number>;
  /** Le mot à AFFICHER par famille, calculé depuis les attributs qui l'ont alimentée
   *  (cf. profil-peau.ts). Absent sur PROFIL_NEUTRE → repli sur LIBELLE_SOUCI. */
  libelles?: Record<string, string>;
};

const DOSSIER = path.join(process.cwd(), "data");
const ENRICHIS = path.join(DOSSIER, "avis-enrichis");
const norm = (s: string) => String(s || "").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim();

// Le repli quand personne n'a déclaré sa peau : le type le plus proche, jamais une moyenne.
// « Aucun testeur ne s'est déclaré peau mixte — voici ce que rapportent les peaux grasses. »
const VOISINS: Record<string, string[]> = {
  combination: ["oily", "normal", "dry"],
  oily: ["combination", "normal"],
  dry: ["sensitive", "normal", "combination"],
  sensitive: ["dry", "normal"],
  normal: ["combination", "oily", "dry"],
  mature: ["dry", "normal", "sensitive"],
};
const LIBELLE_PEAU: Record<string, string> = {
  combination: "combination", oily: "oily", dry: "dry",
  sensitive: "sensitive", normal: "normal", mature: "mature",
};
const LIBELLE_SOUCI: Record<string, string> = {
  aging: "Fine lines & firmness", dehydration: "Dehydration", redness: "Redness & reactivity",
  barrier: "Barrier repair", spots: "Dark spots", blemishes: "Breakouts & clogged pores",
  oiliness: "Shine & oily T-zone",
};

let _parRef: Record<string, Enrichi> | null = null;
let _parNom: Map<string, Enrichi> | null = null;

/** L'identifiant PowerReviews d'une URL Ulta — le dernier segment. */
export function pidUlta(url?: string): string | null {
  const m = String(url || "").split("?")[0].match(/\/p\/[^/?]*?-([A-Za-z]+\d+)$/);
  return m ? m[1] : null;
}

function charger() {
  if (_parRef) return;
  _parRef = {}; _parNom = new Map();
  let noms: string[] = [];
  try { noms = fs.readdirSync(ENRICHIS).filter((f) => f.endsWith(".json")); } catch { return; }
  for (const f of noms) {
    try {
      const e: Enrichi = JSON.parse(fs.readFileSync(path.join(ENRICHIS, f), "utf8"));
      // indexé par sa référence, qu'elle soit un ASIN Amazon ou un identifiant Ulta
      if (e?.ref) _parRef[e.ref] = e;
      if (e?.asin) _parRef[e.asin] = e;
      const n = norm(e?.nom || "");
      if (n) _parNom.set(n, e);
    } catch { /* fichier illisible : on l'ignore plutôt que de tout casser */ }
  }
}

/** Filtre l'enrichissement pour un profil donné. C'est ici que se fait la personnalisation. */
function pourProfil(e: Enrichi, profil: ProfilAvis): Avis | null {
  const peau = String(profil.skinType || "").toLowerCase();
  let pourElle: Avis["pourElle"] = null;
  if (peau && e.segments?.[peau]) {
    pourElle = { peau: LIBELLE_PEAU[peau] || peau, texte: e.segments[peau], substitut: null };
  } else if (peau) {
    const voisin = (VOISINS[peau] || []).find((v) => e.segments?.[v]);
    if (voisin) {
      pourElle = {
        peau: LIBELLE_PEAU[peau] || peau, texte: e.segments[voisin],
        substitut: LIBELLE_PEAU[voisin] || voisin,
      };
    }
  }

  const declares = Object.entries(profil.concerns || {}).filter(([, v]) => v > 0).map(([k]) => k);
  const problemes = declares
    .filter((c) => e.concerns?.[c])
    .map((c) => ({ cle: c, libelle: profil.libelles?.[c] ?? LIBELLE_SOUCI[c] ?? c, texte: e.concerns[c] }));

  // un aspect qui ne vaut QUE pour une peau ou un problème qui ne sont pas les siens ne
  // s'affiche pas : elle n'a pas à trier ce qui ne la concerne pas.
  const sien = new Set([peau, ...declares].filter(Boolean));
  const aspects = (e.aspects || [])
    .filter((a) => !a.concerne?.length || a.concerne.some((c) => sien.has(c)))
    .map((a) => ({ libelle: a.libelle, polarite: a.polarite }));

  // extraits : ceux qui lui correspondent d'abord, en gardant au moins un avis critique
  const colle = (x: Extrait) => (x.peau && sien.has(x.peau) ? 2 : 0) + (x.sujets?.some((s) => sien.has(s)) ? 1 : 0);
  const tries = [...(e.extraits || [])].sort((a, b) => colle(b) - colle(a));
  // Trois éloges, deux critiques. Sans ce quota, le tri par affinité fait remonter les avis
  // critiques — ils parlent des problèmes qu'elle a déclarés, donc ils « collent » mieux — et un
  // produit noté 4,6 se retrouve illustré par quatre avis négatifs sur cinq. Aussi faux qu'une
  // sélection tout élogieuse. On garde l'affinité pour CHOISIR dans chaque camp, pas pour arbitrer
  // entre les deux, et on affiche de la meilleure note à la pire.
  const positifs = tries.filter((x) => (x.note ?? 5) >= 4);
  const critiques = tries.filter((x) => (x.note ?? 5) <= 3);
  const extraits = [...positifs.slice(0, 3), ...critiques.slice(0, 2)];
  const reste = [...positifs.slice(3), ...critiques.slice(2)];
  while (extraits.length < 5 && reste.length) extraits.push(reste.shift()!);
  extraits.sort((a, b) => (b.note ?? 0) - (a.note ?? 0));

  if (!pourElle && !problemes.length && !aspects.length) return null;
  const source = e.source === "ulta" ? "ulta" : "amazon";
  return {
    note: e.note, nbAvis: e.nbAvis, collectes: e.collectes,
    source, verifiable: source === "amazon",
    pourElle, problemes, aspects, extraits, reserve: e.reserve,
  };
}

/** Avis d'un produit pour un profil, par ASIN puis par nom. `null` si on n'a rien à dire. */
export function avisPour(produit: { name?: string; asin?: string; asinAvis?: string; url?: string }, profil: ProfilAvis = {}): Avis | null {
  charger();
  // par référence exacte d'abord : ASIN Amazon, puis identifiant tiré de l'URL Ulta. Aucun de
  // ces deux chemins ne peut se tromper de produit — contrairement à l'appariement par nom.
  // `asinAvis` est la référence Amazon retrouvée pour un produit qu'on a listé ailleurs : elle ne
  // sert QU'aux avis, jamais au lien d'achat.
  const ref = produit.asin || produit.asinAvis || pidUlta(produit.url);
  const direct = ref ? _parRef![ref] : null;
  if (direct) return pourProfil(direct, profil);

  const nom = norm(produit.name || "");
  if (!nom) return null;
  const exact = _parNom!.get(nom);
  if (exact) return pourProfil(exact, profil);
  // appariement souple : l'un contient l'autre (« CeraVe Foaming Facial Cleanser » vs le même
  // nom suivi d'une mention de contenance). On exige 12 caractères pour éviter les faux amis.
  for (const [n, e] of _parNom!) {
    if (n.length >= 12 && (n.includes(nom) || nom.includes(n))) return pourProfil(e, profil);
  }
  return null;
}

/** Tous les avis bruts d'un produit — ce que sert « See all reviews ». La référence est un ASIN
 *  Amazon ou un identifiant Ulta ; on cherche dans les deux dépôts. */
export function tousLesAvis(ref: string) {
  for (const [dossier, source] of [["avis-bruts", "amazon"], ["avis-bruts-ulta", "ulta"]] as const) {
    try {
      const b = JSON.parse(fs.readFileSync(path.join(DOSSIER, dossier, ref + ".json"), "utf8"));
      return { note: b.note, nbAvis: b.nbAvis, distribution: b.distribution, avis: b.avis, source };
    } catch { /* pas dans ce dépôt : on essaie l'autre */ }
  }
  return null;
}

/** Combien de produits d'une liste ont des avis — sert à mesurer la couverture. */
export function couverture(produits: { name?: string; asin?: string }[]) {
  charger();
  let n = 0;
  for (const p of produits) if (avisPour(p, { skinType: "combination", concerns: { blemishes: 1 } })) n++;
  return { couverts: n, total: produits.length };
}
