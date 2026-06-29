import type { EngineProfile } from "./profile";

/* Étape 1 — Garde médicale (RÈGLES déterministes). Transforme les cases q7 + la
   sensibilité en CONTRAINTES DURES, AVANT tout le reste. La sécurité ne dépend
   jamais du LLM. Cf. docs/moteur-reco-implementation.md §4 Étape 1.
   Le scan LLM du texte libre est branché ailleurs (llm-choice n'y touche pas) ;
   tant que le funnel ne collecte pas de freeText, cette étape est 100 % règles. */

export interface Constraints {
  excludePregnancyUnsafe: boolean;
  excludeSensitiveUnsafe: boolean;
  maxIrritationPerProduct: number; // 0..5
  excludeActives: string[]; // sous-chaînes recherchées dans keyActives (minuscule)
  adviseDoctor: string | null; // message d'orientation dermato (off-ramp), sinon null
}

// Rétinoïdes OTC à écarter en cas de traitement dermato prescrit (doc §4 Étape 1).
const RETINOIDS = ["retinol", "retinal", "rétinal", "retinaldehyde", "adapalene", "adapalène", "retinoid", "rétinoïde"];

/** Construit les contraintes dures à partir du profil (règles q7 + sensibilité). */
export function buildConstraints(profile: EngineProfile): Constraints {
  const treatment = profile.medicalConditions.includes("treatment");
  const condition = profile.medicalConditions.includes("condition"); // rosacée / eczéma
  const sensitive = profile.sensitive || condition;

  return {
    excludePregnancyUnsafe: profile.pregnant || profile.breastfeeding,
    excludeSensitiveUnsafe: sensitive,
    // Peau réactive → on plafonne l'agressivité par produit (sinon tolérance large).
    maxIrritationPerProduct: sensitive ? 2 : 5,
    excludeActives: treatment ? [...RETINOIDS] : [],
    adviseDoctor: treatment
      ? "You indicated an ongoing dermatological treatment: check any new active with your doctor before adding it."
      : null,
  };
}
