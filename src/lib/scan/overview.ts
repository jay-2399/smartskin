import Anthropic from "@anthropic-ai/sdk";
import { tousLesAvis, type ProfilAvis } from "./avis";

// Synthèse des avis clients écrite à la lecture de la fiche, pour les produits dont on a les avis
// bruts mais pas de fiche enrichie. Les produits déjà enrichis gardent leur affichage : cette
// voie ne les touche pas.
//
// Pourquoi au runtime plutôt qu'en amont : l'enrichissement hors ligne produit un paragraphe par
// type de peau et un par problème, figés. Il ne peut pas articuler « peau grasse ET boutons » —
// l'écran empile deux paragraphes. Ici le modèle lit les avis en connaissant le profil entier.
//
// Le danger de cette approche est unique et connu : à qui on donne un type de peau et des avis,
// un modèle produira TOUJOURS une phrase plausible sur ce type de peau, fondée ou non. D'où la
// contrainte centrale du prompt — ne parler du profil que si les avis en parlent, et le DIRE
// quand ce n'est pas le cas. C'est déjà le principe de la ligne « No reviewer described their
// skin as… » que l'écran affiche aujourd'hui.

const MODELE = process.env.SCAN_MODEL || "claude-haiku-4-5-20251001";
const MAX_AVIS = 120;          // au-delà, le rendement décroît et la facture monte
const MAX_CAR = 40000;         // garde-fou dur sur la taille du prompt

export type Overview = {
  texte: string;
  /** la mention en italique quand les avis ne disent rien du profil — sinon `null` */
  absence: string | null;
  /** le type de peau du profil — n'est renseigné QUE si la synthèse en parle vraiment, donc
   *  seulement quand `absence` est nulle. L'écran s'en sert pour le sous-titre « · your oily
   *  skin » : l'afficher alors que les avis n'en disent rien serait une promesse fausse. */
  peau: string | null;
  /** combien d'avis ont réellement été lus, pour le journal (jamais affiché) */
  lus: number;
};

const LIBELLE_PEAU: Record<string, string> = {
  oily: "oily", dry: "dry", combination: "combination", normal: "normal", sensitive: "sensitive",
};
const LIBELLE_SOUCI: Record<string, string> = {
  blemishes: "breakouts", oiliness: "oiliness", dehydration: "dehydration", redness: "redness",
  darkspots: "dark spots", wrinkles: "fine lines", pores: "enlarged pores", texture: "uneven texture",
  dullness: "dullness", barrier: "a weakened barrier", sensitivity: "sensitivity",
};

function consigne(peau: string | null, soucis: string[]): string {
  return `You are summarising real customer reviews of a skincare product for one reader.

LENGTH — three sentences, 55 words at most. The box on screen holds three lines. Longer text is
cut off, so a fourth sentence is a sentence nobody reads.

WHAT TO SAY
- What buyers actually report: texture, how it feels, what it did, what went wrong.
- Quantify honestly: "most reviewers", "several", "a few", "one reviewer". Never write "most"
  for something two people said, and never turn one person's bad experience into "some users".
- Never repeat the star rating or the review count — the screen shows them already.
- Never give advice, never recommend, never address the reader as a patient.
- Never invent an ingredient, a duration or a result that no review states.

THE READER${peau ? `
- Skin type: ${peau}` : ""}${soucis.length ? `
- Flagged concerns: ${soucis.join(", ")}` : ""}

TWO SEPARATE JUDGEMENTS, and this is where it goes wrong if you are not careful.

1. "peauCouverte" — do reviewers describe ${peau ? "**" + peau + "** skin, or a skin type close enough to speak for it" : "the reader's skin type"}? Yes or no.
   If yes, weave it into the paragraph: name what THAT skin reports.
   If no, write NOTHING about it — not even a hedged sentence. A plausible sentence about
   ${peau || "a skin type"}, written from reviews that never mention it, is an invention. This is the
   single thing you must not do.

2. "absence" — fill this ONLY when peauCouverte is false. One short sentence saying reviewers
   did not describe that skin type. It is NOT a place for nuances the reviews left out: if
   reviewers speak to the reader's skin, absence is null, full stop. A paragraph that mentions
   "${peau || "the reader's skin"} skin" and an absence line saying reviewers did not cover it
   contradict each other on screen.

Answer with JSON only:
{"texte": "three sentences, 55 words max",
 "peauCouverte": true or false,
 "absence": "one sentence, or null when peauCouverte is true"}`;
}

function corpus(avis: { note?: number; titre?: string; texte?: string }[]): string {
  let out = "", n = 0;
  for (const a of avis.slice(0, MAX_AVIS)) {
    const t = `[${a.note ?? "?"}★] ${a.titre || ""} — ${a.texte || ""}`.replace(/\s+/g, " ").trim();
    if (out.length + t.length > MAX_CAR) break;
    out += t + "\n"; n++;
  }
  return out;
}

function extraireJson(texte: string): string {
  const cloture = texte.match(/```(?:json)?\s*([\s\S]*?)```/);
  const corps = cloture ? cloture[1] : texte;
  const a = corps.indexOf("{"), b = corps.lastIndexOf("}");
  return a >= 0 && b > a ? corps.slice(a, b + 1) : corps;
}

// Deux lectures de la même fiche par la même personne doivent rendre le même texte : sans cache,
// le paragraphe change à chaque rechargement, ce qui donne l'impression que rien n'est vrai.
const cache = new Map<string, Overview>();
const empreinteProfil = (p: ProfilAvis) =>
  [p.skinType || "", ...Object.entries(p.concerns || {}).filter(([, v]) => v > 0).map(([k]) => k).sort()].join("|");

export function overviewConfigure(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** `null` quand il n'y a pas d'avis bruts, pas de clé, ou que l'appel échoue : l'écran n'affiche
 *  alors rien de plus qu'aujourd'hui. Jamais de texte de repli inventé. */
export async function overviewPour(ref: string, profil: ProfilAvis): Promise<Overview | null> {
  if (!overviewConfigure()) return null;
  const bruts = tousLesAvis(ref);
  if (!bruts?.avis?.length) return null;

  const cle = ref + "::" + empreinteProfil(profil);
  const enCache = cache.get(cle);
  if (enCache) return enCache;

  const peau = LIBELLE_PEAU[String(profil.skinType || "").toLowerCase()] || null;
  const soucis = Object.entries(profil.concerns || {})
    .filter(([, v]) => (v as number) > 0)
    .map(([k]) => LIBELLE_SOUCI[k] || k);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const r = await client.messages.create({
      model: MODELE,
      max_tokens: 350,
      system: consigne(peau, soucis),
      messages: [{ role: "user", content: corpus(bruts.avis) }],
    });
    const brut = r.content.find((c) => c.type === "text");
    if (!brut || brut.type !== "text") return null;
    const j = JSON.parse(extraireJson(brut.text));
    if (typeof j?.texte !== "string" || !j.texte.trim()) return null;
    // `peauCouverte` décide, pas la présence d'une phrase d'absence : le modèle remplissait
    // volontiers `absence` d'une nuance non traitée alors qu'il venait de parler de la peau du
    // lecteur — l'écran affichait alors le paragraphe personnalisé ET « les avis n'en parlent
    // pas », qui se contredisent.
    const couverte = j.peauCouverte === true;
    const out: Overview = {
      texte: j.texte.trim(),
      absence: !couverte && typeof j.absence === "string" && j.absence.trim() ? j.absence.trim() : null,
      peau: couverte ? peau : null,
      lus: Math.min(bruts.avis.length, MAX_AVIS),
    };
    cache.set(cle, out);
    return out;
  } catch {
    return null;   // réseau, quota, JSON illisible : la fiche s'affiche sans overview
  }
}
