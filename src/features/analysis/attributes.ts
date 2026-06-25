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
  imperfections: "Imperfections",
  teint_eclat: "Teint & Éclat",
  signes_age: "Signes d'âge",
  zone_yeux: "Zone yeux",
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
  { id: "acne", label: "Imperfections", section: "imperfections", low: "aucune", high: "sévères", icon: "/icon-acne.png" },
  { id: "comedones", label: "Points noirs", section: "imperfections", low: "aucun", high: "très nombreux", icon: "/icon-comedones.png" },
  { id: "post_acne_marks", label: "Marques post-acné", section: "imperfections", low: "aucune", high: "marquées" },
  { id: "pores", label: "Pores", section: "imperfections", low: "invisibles", high: "dilatés" },
  { id: "texture", label: "Grain de peau", section: "imperfections", low: "très lisse", high: "très rugueux" },
  { id: "flaking", label: "Desquamation", section: "imperfections", low: "absente", high: "présente", binary: true },
  // ── Teint & Éclat ──
  { id: "tone_evenness", label: "Irrégularités", section: "teint_eclat", low: "très uniforme", high: "très irrégulier" },
  { id: "radiance", label: "Teint terne", section: "teint_eclat", low: "lumineux", high: "très terne" },
  { id: "dark_spots", label: "Taches", section: "teint_eclat", low: "aucune", high: "très marquées", icon: "/icon-dark-spots.png" },
  { id: "redness", label: "Rougeurs", section: "teint_eclat", low: "aucune", high: "diffuses" },
  { id: "shine", label: "Brillance", section: "teint_eclat", low: "mate", high: "très grasse" },
  { id: "visible_vessels", label: "Vaisseaux", section: "teint_eclat", low: "absent", high: "présent", binary: true, icon: "/icon-vessels.png" },
  // ── Signes d'âge ──
  { id: "fine_lines", label: "Ridules", section: "signes_age", low: "aucune", high: "marquées" },
  { id: "wrinkles", label: "Rides", section: "signes_age", low: "absentes", high: "profondes" },
  // ── Zone yeux ──
  { id: "under_eye_circles", label: "Cernes", section: "zone_yeux", low: "absents", high: "marqués" },
  { id: "under_eye_puffiness", label: "Poches yeux", section: "zone_yeux", low: "absentes", high: "présentes", binary: true },
];

export const ATTRIBUTE_IDS = ATTRIBUTES.map((a) => a.id);
export const ATTRIBUTE_BY_ID = Object.fromEntries(ATTRIBUTES.map((a) => [a.id, a]));

// Carnation (ITA°) et sous-ton : nuanciers repris de la maquette
export const CARNATION_SWATCHES = ["#F6E0CE", "#EECBA6", "#DFAE84", "#C5895A", "#9B6440", "#5E3A25"];
export const UNDERTONE_SWATCHES = ["#E4B3B0", "#E8C496", "#DEBDA0", "#C7BB8E"];

// Mapping niveau (1..4) → position de la jauge (%) et classe, repris de la maquette
export const LEVEL_TO_PERCENT: Record<number, number> = { 1: 6, 2: 30, 3: 53, 4: 76 };
