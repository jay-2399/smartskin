import type { AnalysisResult } from "./schema";

// Bilan d'exemple — affiché quand aucune clé GEMINI_API_KEY n'est configurée,
// pour pouvoir parcourir l'app de bout en bout sans appel réel ni compte.
// Valeurs reprises de la maquette 11-prop_1-resultats.html.
export const SAMPLE_RESULT: AnalysisResult = {
  score: 84,
  state: "Bon état général",
  sub: "Continue, tu es sur la bonne voie.",
  photoQuality: { ok: true },
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
    { id: "acne", level: 2, tip: "légères", situation: "Quelques imperfections inflammatoires ponctuelles et d'intensité légère — leur impact sur le score global reste limité." },
    { id: "comedones", level: 2, tip: "rares", situation: "Points noirs rares et localisés, sans obstruction marquée des pores." },
    { id: "post_acne_marks", level: 3, tip: "modérées", situation: "Des marques résiduelles modérées subsistent après d'anciennes imperfections, encore visibles sur les joues." },
    { id: "pores", level: 3, tip: "modérés", situation: "Pores modérément visibles sur la zone T, signe d'une activité sébacée présente mais maîtrisée." },
    { id: "texture", level: 2, tip: "lisse", situation: "Grain de peau globalement lisse, avec un renouvellement cellulaire régulier." },
    { id: "flaking", level: 1, tip: "absente", situation: "Aucune desquamation détectée : la barrière cutanée retient bien l'eau." },
    { id: "tone_evenness", level: 2, tip: "uniforme", situation: "Teint plutôt uniforme, avec de légères variations de pigmentation sans réelle irrégularité visible." },
    { id: "radiance", level: 2, tip: "frais", situation: "Teint frais et plutôt lumineux, sans signe marqué de fatigue cutanée à l'analyse." },
    { id: "dark_spots", level: 3, tip: "quelques", situation: "Quelques taches pigmentaires visibles, d'origine post-inflammatoire, surtout sur les joues." },
    { id: "redness", level: 3, tip: "localisées", situation: "Rougeurs localisées sur le nez et les ailes, traduisant une réactivité vasculaire ponctuelle." },
    { id: "shine", level: 4, tip: "brillante", situation: "Brillance marquée sur la zone T, signe d'une production de sébum à réguler." },
    { id: "visible_vessels", level: 1, tip: "absents", situation: "Aucun vaisseau apparent : pas de signe visible de fragilité capillaire." },
    { id: "fine_lines", level: 2, tip: "discrètes", situation: "Ridules discrètes, principalement liées à l'hydratation, sans installation profonde." },
    { id: "wrinkles", level: 1, tip: "absentes", situation: "Aucune ride installée : la structure cutanée reste ferme." },
    { id: "under_eye_circles", level: 3, tip: "modérés", situation: "Cernes modérés d'origine pigmentaire sous les yeux, accentuant l'aspect fatigué du regard." },
    { id: "under_eye_puffiness", level: 1, tip: "absentes", situation: "Aucune poche détectée : le contour de l'œil reste bien drainé." },
  ],
};
