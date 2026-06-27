import { create } from "zustand";
import type { AnalysisResult } from "./schema";
import type { RoutineData } from "@/features/routine/products";

// Résultat du bilan + photo associée, gardés EN MÉMOIRE le temps de la session
// (jamais persistés). Alimenté par l'écran d'analyse, lu par l'écran résultats.
// `validatedRoutine` = la routine VALIDÉE au reveal (les produits gardés par swipe)
// → le dashboard l'affiche telle quelle au lieu d'en recalculer une.
type ResultState = {
  result: AnalysisResult | null;
  photo: Blob | null;
  validatedRoutine: RoutineData | null;
  set: (result: AnalysisResult, photo: Blob | null) => void;
  setValidatedRoutine: (routine: RoutineData | null) => void;
  clear: () => void;
};

export const useResult = create<ResultState>((set) => ({
  result: null,
  photo: null,
  validatedRoutine: null,
  set: (result, photo) => set({ result, photo }),
  setValidatedRoutine: (validatedRoutine) => set({ validatedRoutine }),
  clear: () => set({ result: null, photo: null, validatedRoutine: null }),
}));
