import { create } from "zustand";
import type { Answers } from "./types";
import { EMPTY_ANSWERS } from "./types";
import { QUESTIONS } from "./questions";
import { toggleOption } from "./validation";

type FunnelState = {
  answers: Answers;
  photo: Blob | null;
  setAge: (value: number | null) => void;
  setSingle: (step: "q4" | "q6", value: string) => void;
  toggleMulti: (step: "q1" | "q2" | "q3" | "q7", value: string, exclusive: boolean) => void;
  setGate: (changed: boolean) => void;
  toggleSymptom: (value: string) => void;
  setPhoto: (blob: Blob | null) => void;
  reset: () => void;
};

export const useFunnel = create<FunnelState>((set) => ({
  answers: structuredClone(EMPTY_ANSWERS),
  photo: null,
  setAge: (value) => set((s) => ({ answers: { ...s.answers, age: value } })),
  setSingle: (step, value) =>
    set((s) => ({ answers: { ...s.answers, [step]: value } })),
  toggleMulti: (step, value, exclusive) =>
    set((s) => ({
      answers: {
        ...s.answers,
        [step]: toggleOption(s.answers[step], value, exclusive, QUESTIONS[step].maxSelect),
      },
    })),
  setGate: (changed) =>
    set((s) => ({
      answers: { ...s.answers, q5: { changed, symptoms: changed ? s.answers.q5.symptoms : [] } },
    })),
  toggleSymptom: (value) =>
    set((s) => ({
      answers: {
        ...s.answers,
        q5: { ...s.answers.q5, symptoms: toggleOption(s.answers.q5.symptoms, value, false) },
      },
    })),
  setPhoto: (blob) => set({ photo: blob }),
  reset: () => set({ answers: structuredClone(EMPTY_ANSWERS), photo: null }),
}));
