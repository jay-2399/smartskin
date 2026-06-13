import { describe, it, expect } from "vitest";
import { buildPrompt } from "@/features/analysis/prompt";
import { EMPTY_ANSWERS } from "@/features/funnel/types";

describe("buildPrompt", () => {
  const p = buildPrompt({ ...EMPTY_ANSWERS, q1: ["pores"], q4: "never" });

  it("précise que c'est un bilan, pas un diagnostic médical", () => {
    expect(p).toMatch(/bilan/i);
    expect(p).toMatch(/pas un diagnostic médical/i);
  });

  it("injecte les réponses du questionnaire", () => {
    expect(p).toContain("pores");
    expect(p).toContain("never");
  });

  it("borne le vocabulaire aux identifiants d'attributs du catalogue", () => {
    expect(p).toContain("post_acne_marks");
    expect(p).toContain("under_eye_puffiness");
  });

  it("impose une réponse JSON et le français", () => {
    expect(p).toMatch(/JSON/);
    expect(p).toMatch(/français/i);
  });
});
