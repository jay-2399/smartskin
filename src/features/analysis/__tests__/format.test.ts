import { describe, it, expect } from "vitest";
import { toSections, skinAgeDelta } from "@/features/analysis/format";
import { SAMPLE_RESULT } from "@/features/analysis/sample";

describe("toSections", () => {
  const sections = toSections(SAMPLE_RESULT);

  it("produit les 4 sections de la maquette", () => {
    expect(sections.map((s) => s.id)).toEqual([
      "imperfections", "teint_eclat", "signes_age", "zone_yeux",
    ]);
  });

  it("attache libellés de bornes et position de jauge", () => {
    const acne = sections[0].items.find((i) => i.id === "acne")!;
    expect(acne.label).toBe("Imperfections");
    expect(acne.low).toBe("aucune");
    expect(acne.high).toBe("sévères");
    expect(acne.percent).toBe(30); // level 2 → 30%
    expect(acne.betterHigh).toBe(false); // défaut : le bas (peu d'imperfections) = bon côté = vert
  });

  it("marque les attributs binaires", () => {
    const flaking = sections[0].items.find((i) => i.id === "flaking")!;
    expect(flaking.binary).toBe(true);
  });
});

describe("skinAgeDelta", () => {
  it("peau plus jeune que l'âge réel → « −X ans »", () => {
    expect(skinAgeDelta(26, 28)).toEqual({ years: -2, deltaText: "−2 ans", suffix: "vs ton âge réel" });
  });
  it("peau plus âgée → « +X ans »", () => {
    expect(skinAgeDelta(40, 35)).toEqual({ years: 5, deltaText: "+5 ans", suffix: "vs ton âge réel" });
  });
  it("écart d'un an → singulier", () => {
    expect(skinAgeDelta(27, 28)?.deltaText).toBe("−1 an");
  });
  it("même âge → pas de suffixe", () => {
    expect(skinAgeDelta(30, 30)).toEqual({ years: 0, deltaText: "Pile ton âge", suffix: "" });
  });
  it("donnée manquante (âge non renseigné) → null", () => {
    expect(skinAgeDelta(26, null)).toBeNull();
    expect(skinAgeDelta(undefined, 28)).toBeNull();
  });
});
