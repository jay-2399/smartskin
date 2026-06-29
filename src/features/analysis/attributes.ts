// Catalogue des attributs cutanés évalués — aligné sur la maquette
// reference/User_flow_screens/11-prop_1-resultats.html (4 sections, 16 attributs).
// Chaque attribut a un niveau 1..4 (1 = idéal/absent, 4 = sévère) renvoyé par l'IA.

export const SECTIONS = [
  "imperfections",
  "teint_eclat",
  "signes_age",
  "zone_yeux",
] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<Section, string> = {
  imperfections: "Blemishes",
  teint_eclat: "Tone & Radiance",
  signes_age: "Signs of aging",
  zone_yeux: "Eye area",
};

export type AttributeDef = {
  id: string;
  label: string;
  section: Section;
  low: string;   // libellé extrémité gauche de la jauge
  high: string;  // libellé extrémité droite
  binary?: boolean; // absent/présent (jauge à 2 crans)
  icon?: string;    // fichier dans /public ; absent = tuile masquée (comme la maquette)
  // Polarité pour le gradient de la jauge (rouge = mauvais → vert = bon).
  // TOUS les attributs actuels sont des « défauts » : niveau 1 (bas) = idéal → le
  // bas est VERT. Mettre `betterHigh: true` seulement pour une future métrique où
  // une valeur ÉLEVÉE serait le bon côté (ex. hydratation) → le gradient s'inverse.
  betterHigh?: boolean;
};

export const ATTRIBUTES: AttributeDef[] = [
  // ── Imperfections ──
  { id: "acne", label: "Blemishes", section: "imperfections", low: "none", high: "severe", icon: "/icon-acne.png" },
  { id: "comedones", label: "Blackheads", section: "imperfections", low: "none", high: "many", icon: "/icon-comedones.png" },
  { id: "post_acne_marks", label: "Post-acne marks", section: "imperfections", low: "none", high: "marked" },
  { id: "pores", label: "Pores", section: "imperfections", low: "invisible", high: "enlarged" },
  { id: "texture", label: "Skin texture", section: "imperfections", low: "very smooth", high: "very rough" },
  { id: "flaking", label: "Flaking", section: "imperfections", low: "absent", high: "present", binary: true },
  // ── Tone & Radiance ──
  { id: "tone_evenness", label: "Unevenness", section: "teint_eclat", low: "very even", high: "very uneven" },
  { id: "radiance", label: "Dullness", section: "teint_eclat", low: "bright", high: "very dull" },
  { id: "dark_spots", label: "Dark spots", section: "teint_eclat", low: "none", high: "very marked", icon: "/icon-dark-spots.png" },
  { id: "redness", label: "Redness", section: "teint_eclat", low: "none", high: "diffuse" },
  { id: "shine", label: "Shine", section: "teint_eclat", low: "matte", high: "very oily" },
  { id: "visible_vessels", label: "Vessels", section: "teint_eclat", low: "absent", high: "present", binary: true, icon: "/icon-vessels.png" },
  // ── Signs of aging ──
  { id: "fine_lines", label: "Fine lines", section: "signes_age", low: "none", high: "marked" },
  { id: "wrinkles", label: "Wrinkles", section: "signes_age", low: "absent", high: "deep" },
  // ── Eye area ──
  { id: "under_eye_circles", label: "Dark circles", section: "zone_yeux", low: "absent", high: "marked" },
  { id: "under_eye_puffiness", label: "Eye puffiness", section: "zone_yeux", low: "absent", high: "present", binary: true },
];

export const ATTRIBUTE_IDS = ATTRIBUTES.map((a) => a.id);
export const ATTRIBUTE_BY_ID = Object.fromEntries(ATTRIBUTES.map((a) => [a.id, a]));

// Carnation (ITA°) et sous-ton : nuanciers repris de la maquette
export const CARNATION_SWATCHES = ["#F6E0CE", "#EECBA6", "#DFAE84", "#C5895A", "#9B6440", "#5E3A25"];
export const UNDERTONE_SWATCHES = ["#E4B3B0", "#E8C496", "#DEBDA0", "#C7BB8E"];

// Mapping niveau (1..4) → position de la jauge (%) et classe, repris de la maquette
export const LEVEL_TO_PERCENT: Record<number, number> = { 1: 6, 2: 30, 3: 53, 4: 76 };
