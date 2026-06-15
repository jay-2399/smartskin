import { describe, it, expect } from "vitest";
import { buildRoutine, type Routine } from "@/features/routine/recommend";
import { ATTRIBUTES } from "@/features/analysis/attributes";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";

function result(overrides: Record<string, number> = {}): AnalysisResult {
  return {
    score: 60, state: "x", sub: "y", photoQuality: { ok: true },
    profile: { skinType: "Mixte", ageRange: "25-35", carnation: 3, carnationLabel: "x",
      undertone: 2, undertoneLabel: "x", phototype: 3, phototypeSub: "x" },
    attributes: ATTRIBUTES.map((a) => ({ id: a.id, level: overrides[a.id] ?? 1, tip: "x", situation: "y" })),
  };
}
const ans = (o: Partial<Answers> = {}): Answers => ({ ...EMPTY_ANSWERS, ...o });

const names = (r: Routine) => r.steps.map((s) => s.active);
const freqOf = (r: Routine, match: RegExp) => r.steps.find((s) => match.test(s.active))?.frequency ?? "";
const layerOf = (r: Routine, match: RegExp) => r.steps.find((s) => match.test(s.active))?.layer;

describe("buildRoutine — sélection & couches (playbook §1)", () => {
  it("propose TOUJOURS un nettoyant, un hydratant et une protection solaire", () => {
    const all = names(buildRoutine(result({ acne: 3 }), ans()));
    expect(all).toContain("Nettoyant doux");
    expect(all).toContain("Crème hydratante");
    expect(all.some((n) => n.includes("SPF"))).toBe(true);
  });

  it("organise en couches : nettoyant en socle, actif fort en couche ciblée", () => {
    const r = buildRoutine(result({ acne: 3 }), ans());
    expect(layerOf(r, /Nettoyant/)).toBe("socle");
    expect(layerOf(r, /salicylique/)).toBe("actif");
  });

  it("le rituel choisit le masque selon le besoin (purifiant / hydratant / apaisant)", () => {
    const mask = (r: Routine) => r.steps.find((s) => s.layer === "rituel")?.active ?? "";
    expect(mask(buildRoutine(result({ shine: 3, pores: 2 }), ans()))).toMatch(/purifiant/i);
    expect(mask(buildRoutine(result({ flaking: 2 }), ans()))).toMatch(/hydratant/i);
    expect(mask(buildRoutine(result({ redness: 2 }), ans()))).toMatch(/apaisant/i);
  });

  it("peau grasse/acnéique → cible le sébum (acide salicylique ou niacinamide)", () => {
    const all = names(buildRoutine(result({ acne: 3, shine: 3, pores: 2 }), ans()));
    expect(all.some((n) => /salicylique|Niacinamide/.test(n))).toBe(true);
  });

  it("pores/brillance SANS acné → niacinamide, PAS d'acide salicylique", () => {
    const all = names(buildRoutine(result({ pores: 2, shine: 2 }), ans())).join(" | ");
    expect(all).toMatch(/Niacinamide/);
    expect(all).not.toMatch(/salicylique/i);
  });
});

describe("buildRoutine — budget de tolérance (la fréquence s'adapte à la peau)", () => {
  it("la charge active reste sous le plafond", () => {
    const r = buildRoutine(result({ acne: 3, shine: 3, pores: 3 }), ans());
    expect(r.load).toBeLessThanOrEqual(r.ceiling);
  });

  it("débutant → cadence plus douce qu'un expert pour le MÊME besoin", () => {
    const beginner = buildRoutine(result({ fine_lines: 3, texture: 2 }), ans({ q3: [] }));
    const expert = buildRoutine(result({ fine_lines: 3, texture: 2 }), ans({ q3: ["retinol", "acids"] }));
    expect(freqOf(beginner, /rétino/i)).toMatch(/1×\/sem/);
    expect(freqOf(expert, /rétino/i)).toMatch(/3×\/sem/);
    expect(beginner.ceiling).toBeLessThan(expert.ceiling);
  });

  it("la fréquence d'un actif fort est exprimée en ×/sem", () => {
    const r = buildRoutine(result({ acne: 3, comedones: 2 }), ans({ q3: ["acids"] }));
    expect(freqOf(r, /salicylique/i)).toMatch(/×\/sem/);
  });

  it("message de progression (phase) : débutant vs expert", () => {
    expect(buildRoutine(result({ acne: 2 }), ans({ q3: [] })).introduction).toMatch(/débutes/i);
    expect(buildRoutine(result({ acne: 2 }), ans({ q3: ["retinol"] })).introduction).toMatch(/pleine|tolère/i);
  });
});

describe("buildRoutine — sécurité (garde-fous)", () => {
  it("grossesse : aucun rétinoïde ni acide salicylique", () => {
    const all = names(buildRoutine(result({ acne: 3, fine_lines: 3, texture: 3 }), ans({ q7: ["pregnancy"] }))).join(" | ");
    expect(all).not.toMatch(/rétinoïde|rétinol/i);
    expect(all).not.toMatch(/salicylique/i);
    expect(buildRoutine(result({ acne: 3 }), ans({ q7: ["pregnancy"] })).avoid.join(" ")).toMatch(/grossesse/i);
  });

  it("peau réactive (rosacée/eczéma) : pas d'acides agressifs", () => {
    const r = buildRoutine(result({ redness: 3, acne: 2 }), ans({ q7: ["condition"] }));
    expect(names(r).join(" | ")).not.toMatch(/salicylique|glycolique|rétino/i);
    expect(r.load).toBeLessThanOrEqual(r.ceiling);
  });

  it("suivi dermato en cours → routine minimale + renvoi au dermato", () => {
    const r = buildRoutine(result({ acne: 4 }), ans({ q7: ["treatment"] }));
    expect(r.minimal).toBe(true);
    expect(names(r).join(" ")).not.toMatch(/rétino|salicylique|glycolique/i);
    expect(r.avoid.join(" ")).toMatch(/dermatolog/i);
    expect(r.medicalNote).toMatch(/dermatolog/i);
  });

  it("acné sévère (niveau 4) → routine minimale + renvoi au dermatologue", () => {
    const r = buildRoutine(result({ acne: 4 }), ans());
    expect(r.minimal).toBe(true);
    expect(names(r).join(" ")).not.toMatch(/salicylique|rétino/i);
    expect(r.medicalNote).toMatch(/dermatologue/i);
  });

  it("barrière fragile (desquamation + rougeurs) → réparation, socle seul", () => {
    const r = buildRoutine(result({ flaking: 2, redness: 3 }), ans());
    expect(r.minimal).toBe(true);
    expect(r.steps.every((s) => s.layer === "socle")).toBe(true);
    expect(names(r).join(" ")).not.toMatch(/salicylique|rétino|glycolique/i);
  });

  it("reprend les ingrédients irritants déclarés (q2) dans « à éviter »", () => {
    const r = buildRoutine(result({ redness: 2 }), ans({ q2: ["fragrance", "alcohol"] }));
    expect(r.avoid.join(" ")).toMatch(/parfum/i);
    expect(r.avoid.join(" ")).toMatch(/alcool/i);
  });
});

describe("buildRoutine — sortie", () => {
  it("donne des priorités et une échéance cohérentes", () => {
    const r = buildRoutine(result({ dark_spots: 3, post_acne_marks: 2 }), ans());
    expect(r.priorities.length).toBeGreaterThan(0);
    expect(r.timeline).toMatch(/semaines/i);
  });
});
