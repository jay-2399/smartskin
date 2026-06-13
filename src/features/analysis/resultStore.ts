import { create } from "zustand";
import type { AnalysisResult } from "./schema";

// Résultat du bilan + photo associée, gardés EN MÉMOIRE le temps de la session
// (jamais persistés). Alimenté par l'écran d'analyse, lu par l'écran résultats.
type ResultState = {
  result: AnalysisResult | null;
  photo: Blob | null;
  set: (result: AnalysisResult, photo: Blob | null) => void;
  clear: () => void;
};

export const useResult = create<ResultState>((set) => ({
  result: null,
  photo: null,
  set: (result, photo) => set({ result, photo }),
  clear: () => set({ result: null, photo: null }),
}));
