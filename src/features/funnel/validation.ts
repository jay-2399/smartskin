import type { Answers, StepId } from "./types";
import { QUESTIONS } from "./questions";

/** Bascule une valeur dans une sélection multi, en gérant l'exclusivité et le maximum.
 *  - cocher une option `exclusive` → la sélection ne contient plus qu'elle
 *  - cocher une option normale → retire toute option exclusive précédemment posée
 *  - `max` atteint (q1 : 3) → cocher une option de plus est ignoré (décocher reste possible) */
export function toggleOption(
  current: string[],
  value: string,
  isExclusive: boolean,
  max?: number
): string[] {
  if (current.includes(value)) return current.filter((v) => v !== value);
  if (isExclusive) return [value];
  // retire les exclusives connues (celles marquées exclusive dans une question)
  const exclusiveValues = new Set(
    Object.values(QUESTIONS)
      .flatMap((q) => [...q.options, ...(q.revealOptions ?? [])])
      .filter((o) => o.exclusive)
      .map((o) => o.value)
  );
  const cleaned = current.filter((v) => !exclusiveValues.has(v));
  if (max !== undefined && cleaned.length >= max) return current;
  return [...cleaned, value];
}

export function isStepValid(step: StepId, answers: Answers): boolean {
  switch (step) {
    case "age": return answers.age !== null && Number.isInteger(answers.age) && answers.age >= 13 && answers.age <= 99;
    case "q1": return answers.q1.length > 0;
    case "q2": return answers.q2.length > 0;
    case "q3": return answers.q3.length > 0;
    case "q4": return answers.q4 !== null;
    case "q5":
      if (answers.q5.changed === false) return true;
      if (answers.q5.changed === true) return answers.q5.symptoms.length > 0;
      return false;
    case "q6": return answers.q6 !== null;
    case "q7": return answers.q7.length > 0;
  }
}
