import { describe, it, expect } from "vitest";
import { buildRoutine } from "@/features/routine/recommend";
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

const names = (r: ReturnType<typeof buildRoutine>) =>
  [...r.day, ...r.night].map((s) => s.active);

describe("buildRoutine", () => {
  it("propose TOUJOURS un nettoyant, un hydratant et une protection solaire", () => {
    const r = buildRoutine(result({ acne: 3 }), ans());
    const all = names(r);
    expect(all).toContain("Nettoyant doux");
    expect(all).toContain("Crème hydratante");
    expect(all.some((n) => n.includes("SPF"))).toBe(true);
  });

  it("peau grasse/acnéique → cible le sébum (acide salicylique ou niacinamide)", () => {
    const r = buildRoutine(result({ acne: 3, shine: 3, pores: 2 }), ans());
    const all = names(r);
    expect(all.some((n) => /salicylique|Niacinamide/.test(n))).toBe(true);
  });

  it("SÉCURITÉ grossesse : aucun rétinoïde ni acide salicylique", () => {
    const r = buildRoutine(result({ acne: 3, fine_lines: 3, texture: 3 }), ans({ q7: ["pregnancy"] }));
    const all = names(r).join(" | ");
    expect(all).not.toMatch(/rétinoïde|rétinol/i);
    expect(all).not.toMatch(/salicylique/i);
    expect(r.avoid.join(" ")).toMatch(/grossesse/i);
  });

  it("SÉCURITÉ peau réactive (rosacée/eczéma) : pas d'acides agressifs, ton apaisant", () => {
    const r = buildRoutine(result({ redness: 3, acne: 2 }), ans({ q7: ["condition"] }));
    const all = names(r).join(" | ");
    expect(all).not.toMatch(/salicylique|glycolique|rétino/i);
    expect(r.gentleStart).toBe(true);
  });

  it("traitement dermato en cours → routine minimale + renvoi au dermato", () => {
    const r = buildRoutine(result({ acne: 4 }), ans({ q7: ["treatment"] }));
    expect(r.minimal).toBe(true);
    expect(names(r).join(" ")).not.toMatch(/rétino|salicylique|glycolique/i);
    expect(r.avoid.join(" ")).toMatch(/dermatolog/i);
  });

  it("reprend les ingrédients irritants déclarés (q2) dans « à éviter »", () => {
    const r = buildRoutine(result({ redness: 2 }), ans({ q2: ["fragrance", "alcohol"] }));
    expect(r.avoid.join(" ")).toMatch(/parfum/i);
    expect(r.avoid.join(" ")).toMatch(/alcool/i);
  });

  it("débutant (aucun actif toléré en q3) → introduction en douceur", () => {
    expect(buildRoutine(result({ acne: 2 }), ans({ q3: [] })).gentleStart).toBe(true);
    expect(buildRoutine(result({ acne: 2 }), ans({ q3: ["retinol"] })).gentleStart).toBe(false);
  });

  it("donne des priorités et une échéance cohérentes", () => {
    const r = buildRoutine(result({ dark_spots: 3, post_acne_marks: 2 }), ans());
    expect(r.priorities.length).toBeGreaterThan(0);
    expect(r.timeline).toMatch(/semaines/i);
  });
});
