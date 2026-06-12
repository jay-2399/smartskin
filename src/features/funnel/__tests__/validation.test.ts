import { describe, it, expect } from "vitest";
import { toggleOption, isStepValid } from "@/features/funnel/validation";
import { EMPTY_ANSWERS } from "@/features/funnel/types";

describe("toggleOption (multi avec exclusif)", () => {
  it("ajoute puis retire une valeur", () => {
    const a = toggleOption(["fragrance"], "alcohol", false);
    expect(a).toEqual(["fragrance", "alcohol"]);
    expect(toggleOption(a, "alcohol", false)).toEqual(["fragrance"]);
  });

  it("cocher l'option exclusive vide les autres", () => {
    expect(toggleOption(["fragrance", "alcohol"], "none", true)).toEqual(["none"]);
  });

  it("cocher une option normale retire l'exclusive en place", () => {
    expect(toggleOption(["none"], "fragrance", false)).toEqual(["fragrance"]);
  });

  it("respecte le maximum (q1 : 3 choix max, comme la maquette)", () => {
    const full = ["hydration", "radiance", "pores"];
    expect(toggleOption(full, "texture", false, 3)).toEqual(full);
    // retirer reste possible à max atteint
    expect(toggleOption(full, "pores", false, 3)).toEqual(["hydration", "radiance"]);
    // l'exclusive remplace tout, même à max atteint
    expect(toggleOption(full, "discover", true, 3)).toEqual(["discover"]);
  });
});

describe("isStepValid", () => {
  it("q1 (multi) invalide si vide, valide si ≥1", () => {
    expect(isStepValid("q1", EMPTY_ANSWERS)).toBe(false);
    expect(isStepValid("q1", { ...EMPTY_ANSWERS, q1: ["pores"] })).toBe(true);
  });

  it("q4 (single) invalide si null, valide si choisi", () => {
    expect(isStepValid("q4", EMPTY_ANSWERS)).toBe(false);
    expect(isStepValid("q4", { ...EMPTY_ANSWERS, q4: "daily" })).toBe(true);
  });

  it("q5 : 'Non' valide directement", () => {
    expect(isStepValid("q5", { ...EMPTY_ANSWERS, q5: { changed: false, symptoms: [] } })).toBe(true);
  });

  it("q5 : 'Oui' exige ≥1 symptôme", () => {
    expect(isStepValid("q5", { ...EMPTY_ANSWERS, q5: { changed: true, symptoms: [] } })).toBe(false);
    expect(isStepValid("q5", { ...EMPTY_ANSWERS, q5: { changed: true, symptoms: ["dry"] } })).toBe(true);
  });
});
