import { describe, it, expect } from "vitest";
import { versProfilPeau, cleProfil, FAMILLES, type Famille } from "@/lib/scan/profil-peau";
import { ATTRIBUTES } from "@/features/analysis/attributes";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import { EXCLUSIVE_RESULT } from "@/features/analysis/exclusive";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";

/* Gabarit repris de features/recommendation/__tests__/profile.test.ts. */
function result(overrides: Record<string, number> = {}, skinType = "Mixte"): AnalysisResult {
  return {
    score: 60, state: "x", sub: "y", photoQuality: { ok: true },
    profile: { skinType, ageRange: "25-35", carnation: 3, carnationLabel: "x",
      undertone: 2, undertoneLabel: "x", phototype: 3, phototypeSub: "x" },
    attributes: ATTRIBUTES.map((a) => ({ id: a.id, level: overrides[a.id] ?? 1, tip: "x", situation: "y" })),
  };
}
const ans = (o: Partial<Answers> = {}): Answers => ({ ...EMPTY_ANSWERS, ...o });
const somme = (c: Partial<Record<Famille, number>>) =>
  Object.values(c).reduce((n, v) => n + (v ?? 0), 0);

describe("versProfilPeau — invariants de forme", () => {
  const cas: [string, AnalysisResult, Answers][] = [
    ["bilan vide", result(), ans()],
    ["acné sévère", result({ acne: 4, redness: 3, comedones: 3, shine: 3 }), ans({ q1: ["blemishes"] })],
    ["fixture exclusive", EXCLUSIVE_RESULT, ans({ q1: ["hydration", "fine_lines"] })],
    ["fixture sample", SAMPLE_RESULT, ans({ q1: ["fine_lines"] })],
  ];
  for (const [nom, r, a] of cas) {
    it(nom, () => {
      const p = versProfilPeau(r, a);
      expect(["oily", "combination", "dry", "normal"]).toContain(p.skinType);
      expect([0, 1, 2, 3]).toContain(p.sensitivity);
      expect(Object.keys(p.concerns).length).toBeLessThanOrEqual(3);
      for (const [k, v] of Object.entries(p.concerns)) {
        expect(FAMILLES).toContain(k as Famille);
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThanOrEqual(3);
      }
      expect(somme(p.concerns)).toBeLessThanOrEqual(4 + 1e-9);
      expect(p.allergies).toEqual([]);
      expect(p.strengthCeiling).toBeGreaterThanOrEqual(1);
    });
  }
});

describe("la table 16 attributs → 7 familles", () => {
  const attendu: [string, Famille][] = [
    ["acne", "blemishes"], ["comedones", "blemishes"], ["shine", "oiliness"],
    ["texture", "aging"], ["radiance", "aging"], ["fine_lines", "aging"], ["wrinkles", "aging"],
    ["tone_evenness", "spots"], ["dark_spots", "spots"], ["post_acne_marks", "spots"],
    ["redness", "redness"], ["visible_vessels", "redness"],
  ];
  for (const [attr, famille] of attendu) {
    it(`${attr} seul à 4 → ${famille} à la sévérité 3`, () => {
      const p = versProfilPeau(result({ [attr]: 4 }), ans());
      expect(p.concerns[famille]).toBe(3);
    });
  }
  it("pores alimente blemishes ET oiliness", () => {
    const p = versProfilPeau(result({ pores: 4 }), ans());
    expect(p.concerns.blemishes).toBeGreaterThan(0);
    expect(p.concerns.oiliness).toBeGreaterThan(0);
  });
  it("flaking alimente dehydration ET barrier", () => {
    const p = versProfilPeau(result({ flaking: 4 }), ans());
    expect(p.concerns.dehydration).toBeGreaterThan(0);
    expect(p.concerns.barrier).toBeGreaterThan(0);
  });
  it("les DEUX orphelins de la zone des yeux ne produisent AUCUNE famille — c'est voulu, pas un oubli", () => {
    const p = versProfilPeau(result({ under_eye_circles: 4, under_eye_puffiness: 4 }), ans());
    expect(p.concerns).toEqual({});
  });
});

describe("le déclaré", () => {
  it("q1 « dark_spots » sur un bilan calme → spots au plancher 2", () => {
    expect(versProfilPeau(result(), ans({ q1: ["dark_spots"] })).concerns).toEqual({ spots: 2 });
  });
  it("q1 « blemishes » n'ouvre PAS spots — la fuite de Q1_CONCERNS est fermée", () => {
    const p = versProfilPeau(result(), ans({ q1: ["blemishes"] }));
    expect(p.concerns).toEqual({ blemishes: 2 });
    expect(p.concerns.spots).toBeUndefined();
  });
  it("un symptôme q5 ouvre sa famille", () => {
    const p = versProfilPeau(result(), ans({ q5: { changed: true, symptoms: ["breakouts"] } }));
    expect(p.concerns.blemishes).toBe(2);
  });
  it("q1 « eye_area » n'a aucun effet sur la note — connu et assumé", () => {
    expect(versProfilPeau(result(), ans({ q1: ["eye_area"] })).concerns).toEqual({});
  });
  it("à sévérité égale, le MESURÉ passe devant le DÉCLARÉ", () => {
    // 3 familles mesurées à sev 2 + une déclarée au plancher 2 : la déclarée est évincée.
    const p = versProfilPeau(
      result({ acne: 3, shine: 3, dark_spots: 3 }),
      ans({ q1: ["redness"] }));
    expect(Object.keys(p.concerns).sort()).toEqual(["blemishes", "oiliness", "spots"]);
  });
});

describe("LE test de non-régression — le mesuré grave n'est jamais évincé", () => {
  it("acné sévère + q1 sans rapport → blemishes reste dans le profil", () => {
    // Le cas exact qui avait fait tomber la première version de la règle de sélection :
    // les 3 places étaient mangées par les déclarations avant que la photo parle.
    const p = versProfilPeau(EXCLUSIVE_RESULT, ans({ q1: ["hydration", "fine_lines"] }));
    expect(p.concerns.blemishes).toBeGreaterThan(0);
  });
});

describe("échelle et budget", () => {
  it("la sévérité absolue survit : acné 2 → 1, acné 4 → 3", () => {
    expect(versProfilPeau(result({ acne: 2 }), ans()).concerns.blemishes).toBe(1);
    expect(versProfilPeau(result({ acne: 4 }), ans()).concerns.blemishes).toBe(3);
  });
  it("Σ > 4 → renormalisation au prorata", () => {
    const p = versProfilPeau(result({ acne: 4, dark_spots: 4, redness: 3 }), ans());
    expect(somme(p.concerns)).toBeCloseTo(4, 5);
  });
  it("le profil de RÉFÉRENCE (Σ = 4) traverse le plafond INCHANGÉ", () => {
    // data/scan/profil.json = {blemishes:2, oiliness:2} — le seul profil sur lequel le
    // score perso ait jamais tourné. S'il bougeait, toute la calibration bougerait avec.
    const p = versProfilPeau(result({ acne: 3, shine: 3 }), ans());
    expect(p.concerns).toEqual({ blemishes: 2, oiliness: 2 });
  });
});

describe("texture et sensibilité, deux axes séparés", () => {
  it("« sensible » n'est JAMAIS rendu tel quel — il est reconstruit en texture", () => {
    const p = versProfilPeau(result({ flaking: 3 }, "Sensitive, compromised barrier"), ans());
    expect(p.skinType).toBe("dry");
    expect(p.sensitivity).toBeGreaterThanOrEqual(2);   // la réactivité n'est pas perdue
  });
  it("« sensible » + brillance élevée → grasse", () => {
    expect(versProfilPeau(result({ shine: 4 }, "Sensitive"), ans()).skinType).toBe("oily");
  });
  it("les libellés FR de l'IA passent (donnée vivante en base)", () => {
    expect(versProfilPeau(result({}, "Mixte"), ans()).skinType).toBe("combination");
  });
  it("q2 coché monte la sensibilité à 1", () => {
    expect(versProfilPeau(result(), ans({ q2: ["fragrance"] })).sensitivity).toBe(1);
  });
  it("q2 « none » ne la monte pas", () => {
    expect(versProfilPeau(result(), ans({ q2: ["none"] })).sensitivity).toBe(0);
  });
  it("le symptôme q5 « redness » ouvre le plancher de sensibilité ET la famille redness", () => {
    const p = versProfilPeau(result(), ans({ q5: { changed: true, symptoms: ["redness"] } }));
    expect(p.sensitivity).toBeGreaterThanOrEqual(2);
    expect(p.concerns.redness).toBeGreaterThan(0);
  });
});

describe("les libellés sont calculés, pas figés", () => {
  it("aging venu du grain dit « skin texture », pas « fine lines »", () => {
    expect(versProfilPeau(result({ texture: 4 }), ans()).libelles.aging).toBe("skin texture");
  });
  it("aging venu des rides dit « fine lines »", () => {
    expect(versProfilPeau(result({ fine_lines: 4 }), ans()).libelles.aging).toBe("fine lines");
  });
  it("aging venu du teint terne dit « dullness »", () => {
    expect(versProfilPeau(result({ radiance: 4 }), ans()).libelles.aging).toBe("dullness");
  });
  it("les deux sources → les deux mots", () => {
    const l = versProfilPeau(result({ fine_lines: 4, texture: 4 }), ans()).libelles.aging ?? "";
    expect(l).toContain("fine lines");
    expect(l).toContain("skin texture");
  });
});

describe("robustesse", () => {
  it("un bilan PARTIEL est un cas normal : profil valide et maigre, jamais vide ni en erreur", () => {
    const partiel: AnalysisResult = {
      ...result(),
      attributes: [{ id: "acne", level: 3, tip: "x", situation: "y" }],
    };
    const p = versProfilPeau(partiel, ans());
    expect(p.concerns).toEqual({ blemishes: 2 });
    expect(p.skinType).toBe("combination");
  });
  it("deux peaux différentes donnent deux profils différents — le test qui interdit le retour du bouchon", () => {
    const a = versProfilPeau(SAMPLE_RESULT, ans());
    const b = versProfilPeau(EXCLUSIVE_RESULT, ans());
    expect(a).not.toEqual(b);
    expect(cleProfil(a)).not.toBe(cleProfil(b));
  });
});

describe("cleProfil", () => {
  it("arrondit les sévérités : deux profils quasi identiques partagent leur entrée de cache", () => {
    expect(cleProfil({ skinType: "oily", concerns: { blemishes: 1.7141 } }))
      .toBe(cleProfil({ skinType: "oily", concerns: { blemishes: 1.7139 } }));
  });
  it("distingue deux sévérités réellement différentes", () => {
    expect(cleProfil({ skinType: "oily", concerns: { blemishes: 1 } }))
      .not.toBe(cleProfil({ skinType: "oily", concerns: { blemishes: 3 } }));
  });
  it("ne contient pas d'identifiant : deux personnes de même peau partagent la clé", () => {
    const p = { skinType: "dry", sensitivity: 2, concerns: { redness: 2 } };
    expect(cleProfil(p)).toBe(cleProfil({ ...p }));
  });
});
