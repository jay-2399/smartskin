import { describe, it, expect } from "vitest";
import { buildPrompt } from "@/features/analysis/prompt";
import { EMPTY_ANSWERS } from "@/features/funnel/types";

describe("buildPrompt", () => {
  const p = buildPrompt({
    ...EMPTY_ANSWERS,
    q1: ["pores"],
    q4: "never",
    q5: { changed: true, symptoms: ["breakouts"] },
  });

  it("produit un bilan via une méthode d'examen zone par zone", () => {
    expect(p).toMatch(/bilan/i);
    expect(p).toMatch(/zone par zone/i);
    expect(p).toContain("Front");
  });

  it("impose d'observer AVANT de noter (champ observations)", () => {
    expect(p).toContain("observations");
    expect(p).toMatch(/AVANT/);
  });

  it("injecte les réponses du questionnaire en clair (libellés, pas codes)", () => {
    expect(p).toContain("Pores");           // q1: pores → libellé
    expect(p).toContain("Jamais");          // q4: never → libellé
    expect(p).toContain("Plus de boutons"); // q5 symptôme: breakouts → libellé
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
