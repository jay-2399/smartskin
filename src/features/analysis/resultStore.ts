import { create } from "zustand";
import type { AnalysisResult } from "./schema";
import type { RoutineData } from "@/features/routine/products";

// Résultat du bilan + photo associée, gardés EN MÉMOIRE le temps de la session
// (jamais persistés). Alimenté par l'écran d'analyse, lu par l'écran résultats.
// `validatedRoutine` = la routine VALIDÉE au reveal (les produits gardés par swipe)
// → le dashboard l'affiche telle quelle au lieu d'en recalculer une.
// `preparedReco` = la reco construite par /preparation (AVANT le paywall) → après
// paiement, le deck s'affiche sans refaire les ~40 s de calcul.

/** Réponse brute de /api/routine, gardée telle quelle. */
export type PreparedReco = {
  routine: RoutineData;
  totaux: { prix: number; irritation: number };
  avertissements: string[];
};

type ResultState = {
  result: AnalysisResult | null;
  photo: Blob | null;
  validatedRoutine: RoutineData | null;
  preparedReco: PreparedReco | null;
  set: (result: AnalysisResult, photo: Blob | null) => void;
  setValidatedRoutine: (routine: RoutineData | null) => void;
  setPreparedReco: (reco: PreparedReco | null) => void;
  clear: () => void;
};

export const useResult = create<ResultState>((set) => ({
  result: null,
  photo: null,
  validatedRoutine: null,
  preparedReco: null,
  // Un NOUVEAU bilan invalide la reco préparée pour l'ancien.
  set: (result, photo) => set({ result, photo, preparedReco: null }),
  setValidatedRoutine: (validatedRoutine) => set({ validatedRoutine }),
  setPreparedReco: (preparedReco) => set({ preparedReco }),
  clear: () => set({ result: null, photo: null, validatedRoutine: null, preparedReco: null }),
}));
