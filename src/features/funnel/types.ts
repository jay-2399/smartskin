export type StepId = "q1" | "q2" | "q3" | "q4" | "q5" | "q6" | "q7";

export type OptionDef = {
  value: string;
  label: string;
  sub?: string;        // sous-texte optionnel
  icon?: string;       // SVG inline (markup repris des maquettes)
  exclusive?: boolean; // si coché, vide les autres (ex. "none", "discover")
  badge?: string;      // pastille de mise en avant (ex. q6 « ★ Recommandé »)
};

export type QuestionDef = {
  id: StepId;
  index: number;       // 1..7 (pour la barre de progression)
  title: string;
  helperHtml: string;  // texte d'aide sous le titre (peut contenir <b>)
  mode: "single" | "multi" | "gate";
  options: OptionDef[];
  maxSelect?: number;  // q1 : 3 choix max (compteur + options grisées)
  grid?: boolean;      // q1 : liste en grille 2 colonnes
  ctaLabel?: string;   // défaut "Continuer" (q7 : "Lancer mon analyse")
  // q5 uniquement : symptômes révélés si gate = "oui"
  revealTitle?: string;
  revealOptions?: OptionDef[];
};

export type Answers = {
  q1: string[];                 // multi, "discover" exclusif, max 3
  q2: string[];                 // multi, "none" exclusif
  q3: string[];                 // multi, "none" exclusif
  q4: string | null;            // single
  q5: { changed: boolean | null; symptoms: string[] };
  q6: string | null;            // single
  q7: string[];                 // multi, "none" exclusif
};

export const EMPTY_ANSWERS: Answers = {
  q1: [], q2: [], q3: [], q4: null,
  q5: { changed: null, symptoms: [] },
  q6: null, q7: [],
};
