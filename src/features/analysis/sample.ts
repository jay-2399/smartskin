import type { AnalysisResult } from "./schema";

// Bilan d'exemple — affiché quand aucune clé d'analyse n'est configurée,
// pour parcourir l'app de bout en bout sans appel réel ni compte.
// Niveaux choisis pour être COHÉRENTS avec le barème : computeScore(attributes)
// doit redonner ce `score` (vérifié par sample.score.test.ts).
export const SAMPLE_RESULT: AnalysisResult = {
  observations:
    "Front : peau plutôt nette, légère brillance près de la racine des cheveux. Zone T : brillance et quelques pores un peu visibles sur le nez. Joues : rougeurs légères et localisées sur les ailes du nez, quelques points noirs. Menton : RAS. Yeux : cernes légers, pas de poches. Teint d'ensemble : globalement uniforme et frais.",
  score: 73,
  state: "Bon état général",
  sub: "Ta peau est globalement équilibrée : surtout de la brillance en zone T et de petites imperfections à accompagner en douceur.",
  photoQuality: { ok: true },
  skinAge: 26,
  skinTypeBreakdown: "zone T grasse · joues normales",
  verdict: {
    title: "Une bonne base d'ensemble — un seul levier ressort de ton analyse : <em>la régulation du sébum</em>.",
    body: "Trois signaux convergent : <b>brillance en zone T</b>, <b>pores visibles</b> et <b>rougeurs localisées</b>. Ce ne sont pas trois problèmes séparés — c'est <b>un seul levier</b> : réguler le sébum sans décaper, sinon rougeurs et marques s'entretiennent.",
    behavioralLink: "D'après tes réponses — <b>peu de SPF</b> au quotidien — tes marques post-acné mettent plus de temps à s'estomper : sans protection, le soleil les entretient.",
    plan: [
      { label: "Réguler le sébum sans décaper", sub: "la priorité — tout le reste en dépend" },
      { label: "Estomper marques & taches post-acné", sub: "actifs ciblés, en 2ᵉ temps" },
      { label: "Apaiser rougeurs & renforcer la barrière", sub: "en entretien, au quotidien" },
    ],
  },
  profile: {
    skinType: "Mixte",
    ageRange: "25–35 ans",
    carnation: 3,
    carnationLabel: "Intermédiaire",
    undertone: 2,
    undertoneLabel: "Plutôt chaud",
    phototype: 3,
    phototypeSub: "brûle modérément, bronze progressivement",
  },
  attributes: [
    { id: "acne", level: 2, tip: "légères", situation: "Quelques imperfections inflammatoires ponctuelles et d'intensité légère, surtout sur le bas du visage." },
    { id: "comedones", level: 2, tip: "rares", situation: "Points noirs rares et localisés sur le nez, sans obstruction marquée des pores." },
    { id: "post_acne_marks", level: 1, tip: "aucune", situation: "Pas de marque ni de cicatrice notable laissée par d'anciennes imperfections." },
    { id: "pores", level: 2, tip: "légers", situation: "Pores légèrement visibles sur la zone T, signe d'une activité sébacée présente mais maîtrisée." },
    { id: "texture", level: 1, tip: "lisse", situation: "Grain de peau régulier et lisse, sans relief irrégulier visible." },
    { id: "flaking", level: 1, tip: "absente", situation: "Aucune desquamation détectée : la barrière cutanée retient bien l'eau." },
    { id: "tone_evenness", level: 2, tip: "léger", situation: "Teint plutôt uniforme, avec de légères variations sans réelle irrégularité marquée." },
    { id: "radiance", level: 2, tip: "correct", situation: "Teint plutôt frais, avec une légère perte d'éclat sans signe de fatigue marqué." },
    { id: "dark_spots", level: 1, tip: "aucune", situation: "Pas de tache pigmentaire visible à l'analyse." },
    { id: "redness", level: 2, tip: "localisées", situation: "Rougeurs légères et localisées sur le nez et les ailes, sans diffusion sur tout le visage." },
    { id: "shine", level: 2, tip: "zone T", situation: "Brillance présente sur la zone T (nez, front), typique d'une peau mixte." },
    { id: "visible_vessels", level: 1, tip: "absents", situation: "Aucun vaisseau apparent : pas de signe visible de fragilité capillaire." },
    { id: "fine_lines", level: 1, tip: "aucune", situation: "Pas de ridule notable : la peau reste souple et rebondie." },
    { id: "wrinkles", level: 1, tip: "absentes", situation: "Aucune ride installée : la structure cutanée reste ferme." },
    { id: "under_eye_circles", level: 2, tip: "légers", situation: "Cernes légers sous les yeux, peu creusés, accentuant à peine le regard." },
    { id: "under_eye_puffiness", level: 1, tip: "absentes", situation: "Aucune poche détectée : le contour de l'œil reste bien drainé." },
  ],
};
