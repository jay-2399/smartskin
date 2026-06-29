// Catalogue d'ACTIFS (Phase 1 — AUCUNE marque, aucun produit, aucun prix).
// On recommande des ingrédients et on explique POURQUOI, en lien avec le bilan.
// Les marques/produits/affiliation = Phase 2 (séparée, monétisation).

export type Slot = "matin" | "soir";
export type Role = "Nettoyant" | "Sérum" | "Traitement" | "Hydratant" | "Protection" | "Rituel";

export type Active = {
  id: string;
  name: string; // nom de l'ingrédient (ex. « Acide salicylique (BHA) »)
  role: Role;
  benefit: string; // bénéfice générique (le « quoi »)
  targets: string[]; // ids d'attributs ciblés (cf. attributes.ts)
  frequency: string; // ex. « 1×/jour », « 2-3×/sem »
  // Coût d'irritation par application (playbook §3.1). 0 = socle (n'use pas la
  // barrière, usage quotidien) ; ≥ 2 = actif « rotatif » qui vit dans le calendrier.
  cost: number;
  // Exclusions de sécurité (issues du questionnaire q7) :
  unsafePregnancy?: boolean; // déconseillé grossesse/allaitement
  unsafeSensitive?: boolean; // trop agressif pour rosacée/eczéma/peau réactive
};

export const ACTIVES: Record<string, Active> = {
  gentle_cleanser: {
    id: "gentle_cleanser", name: "Nettoyant doux", role: "Nettoyant",
    benefit: "Nettoie sans décaper ni agresser la barrière cutanée.",
    targets: [], frequency: "matin & soir", cost: 0,
  },
  salicylic_acid: {
    id: "salicylic_acid", name: "Acide salicylique (BHA)", role: "Traitement",
    benefit: "Désobstrue les pores et régule le sébum, de l'intérieur du pore.",
    targets: ["acne", "comedones", "pores", "shine"], frequency: "2-3×/sem le soir", cost: 2,
    unsafePregnancy: true, unsafeSensitive: true,
  },
  niacinamide: {
    id: "niacinamide", name: "Niacinamide", role: "Sérum",
    benefit: "Régule le sébum, resserre les pores et atténue rougeurs et marques.",
    targets: ["shine", "pores", "redness", "post_acne_marks", "tone_evenness"], frequency: "1-2×/jour", cost: 0,
  },
  retinoid: {
    id: "retinoid", name: "Rétinoïde (rétinol)", role: "Traitement",
    benefit: "Accélère le renouvellement cellulaire : lisse, raffermit, atténue les imperfections.",
    targets: ["fine_lines", "wrinkles", "texture", "acne", "post_acne_marks"], frequency: "2-3×/sem le soir", cost: 4,
    unsafePregnancy: true, unsafeSensitive: true,
  },
  vitamin_c: {
    id: "vitamin_c", name: "Vitamine C", role: "Sérum",
    benefit: "Illumine le teint et atténue les taches ; antioxydant le matin.",
    targets: ["radiance", "dark_spots", "tone_evenness"], frequency: "le matin", cost: 1,
  },
  aha: {
    id: "aha", name: "Acide glycolique (AHA)", role: "Traitement",
    benefit: "Exfolie la surface : grain plus lisse, teint plus lumineux.",
    targets: ["texture", "radiance", "tone_evenness", "dark_spots"], frequency: "1-2×/sem le soir", cost: 3,
    unsafePregnancy: true, unsafeSensitive: true,
  },
  azelaic_acid: {
    id: "azelaic_acid", name: "Acide azélaïque", role: "Traitement",
    benefit: "Apaise les rougeurs et estompe les marques en douceur — bien toléré.",
    targets: ["redness", "post_acne_marks", "acne", "tone_evenness"], frequency: "1×/jour", cost: 0,
  },
  centella: {
    id: "centella", name: "Centella asiatica (apaisant)", role: "Sérum",
    benefit: "Calme les rougeurs et renforce une peau réactive.",
    targets: ["redness", "visible_vessels"], frequency: "1-2×/jour", cost: 0,
  },
  hyaluronic_acid: {
    id: "hyaluronic_acid", name: "Acide hyaluronique", role: "Sérum",
    benefit: "Repulpe et retient l'eau : confort et souplesse immédiats.",
    targets: ["flaking"], frequency: "1-2×/jour", cost: 0,
  },
  moisturizer: {
    id: "moisturizer", name: "Crème hydratante", role: "Hydratant",
    benefit: "Scelle l'hydratation et répare la barrière cutanée.",
    targets: ["flaking"], frequency: "matin & soir", cost: 0,
  },
  spf: {
    id: "spf", name: "Protection solaire SPF 50", role: "Protection",
    benefit: "Empêche taches et marques de s'installer — le geste anti-âge n°1.",
    targets: ["dark_spots", "post_acne_marks"], frequency: "tous les matins", cost: 0,
  },
  clay_mask: {
    id: "clay_mask", name: "Masque purifiant (argile)", role: "Rituel",
    benefit: "Absorbe l'excès de sébum et resserre visiblement les pores le temps d'un soir.",
    targets: ["shine", "pores", "acne", "comedones"], frequency: "1×/sem le soir", cost: 1,
  },
  hydrating_mask: {
    id: "hydrating_mask", name: "Masque hydratant", role: "Rituel",
    benefit: "Gorge la peau d'eau et apaise les tiraillements : confort et éclat immédiats.",
    targets: ["flaking", "radiance"], frequency: "1-2×/sem le soir", cost: 0,
  },
  exfoliating_mask: {
    id: "exfoliating_mask", name: "Masque désincrustant (exfoliant doux)", role: "Rituel",
    benefit: "Désincruste les pores et lisse le grain pour un teint plus net et lumineux.",
    targets: ["texture", "pores", "tone_evenness", "radiance"], frequency: "1×/sem le soir", cost: 2,
    unsafeSensitive: true,
  },
  soothing_mask: {
    id: "soothing_mask", name: "Masque apaisant", role: "Rituel",
    benefit: "Calme les rougeurs et réconforte une peau réactive ou échauffée.",
    targets: ["redness", "visible_vessels"], frequency: "1-2×/sem le soir", cost: 0,
  },
};

/** Phrase courte décrivant un attribut, pour personnaliser le « pourquoi ». */
export const CONCERN_PHRASE: Record<string, string> = {
  acne: "your blemishes",
  comedones: "your blackheads",
  post_acne_marks: "your post-acne marks",
  pores: "your enlarged pores",
  texture: "your uneven texture",
  flaking: "your dryness",
  tone_evenness: "your uneven tone",
  radiance: "your dull complexion",
  dark_spots: "your dark spots",
  redness: "your redness",
  shine: "your shine",
  visible_vessels: "your visible vessels",
  fine_lines: "your fine lines",
  wrinkles: "your wrinkles",
  under_eye_circles: "your dark circles",
  under_eye_puffiness: "your puffiness",
};
