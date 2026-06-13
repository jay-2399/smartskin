import { describe, it, expect } from "vitest";
import { toSections } from "@/features/analysis/format";
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
  });

  it("marque les attributs binaires", () => {
    const flaking = sections[0].items.find((i) => i.id === "flaking")!;
    expect(flaking.binary).toBe(true);
  });
});
