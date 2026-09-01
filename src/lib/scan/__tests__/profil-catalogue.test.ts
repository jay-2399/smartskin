import { describe, it, expect } from "vitest";
import { catalogue, scoreFormule, scorePerso, moteurDisponible } from "@/lib/scan/moteur";
import { versProfilPeau, type ProfilPeau } from "@/lib/scan/profil-peau";
import { ATTRIBUTES } from "@/features/analysis/attributes";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";

/* RECETTE SUR LE VRAI CATALOGUE.
   Ce que les tests unitaires ne peuvent pas dire : est-ce que le profil branché produit
   des NOTES qui se distinguent, ou un score unique déguisé ?

   Garde-fou obligatoire : scoring.mjs résout data/scan/ depuis process.cwd() et DÉGRADE
   EN SILENCE s'il ne trouve pas le dictionnaire — plus aucun match, tous les seuils
   ci-dessous passeraient alors sans rien vérifier. */

function result(overrides: Record<string, number> = {}, skinType = "Mixte"): AnalysisResult {
  return {
    score: 60, state: "x", sub: "y", photoQuality: { ok: true },
    profile: { skinType, ageRange: "25-35", carnation: 3, carnationLabel: "x",
      undertone: 2, undertoneLabel: "x", phototype: 3, phototypeSub: "x" },
    attributes: ATTRIBUTES.map((a) => ({ id: a.id, level: overrides[a.id] ?? 1, tip: "x", situation: "y" })),
  };
}
const ans = (o: Partial<Answers> = {}): Answers => ({ ...EMPTY_ANSWERS, ...o });

/** Note perso de tous les produits d'une catégorie, pour un profil. */
function notes(profil: ProfilPeau, categorie: string) {
  return catalogue()
    .filter((p) => p.category === categorie && p.inci)
    .map((p) => {
      const f = scoreFormule(p.inci!, p.category, p.filtresUV);
      return { nom: p.name, perso: scorePerso(p.inci!, profil, p.category, f, p.filtresUV).score };
    })
    .sort((a, b) => b.perso - a.perso);
}
const moyenne = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

describe("le moteur est bien chargé", () => {
  it("sinon tout le reste de ce fichier passerait à vide", () => {
    expect(moteurDisponible()).toBe(true);
    expect(catalogue().length).toBeGreaterThan(1000);
  });
});

describe("LA preuve que le bouchon est mort", () => {
  // Deux peaux opposées. Si le profil n'était pas branché, elles donneraient le même
  // classement — c'est exactement ce que faisait profil.json servi à tout le monde.
  const grasseAcneique = versProfilPeau(
    result({ acne: 4, comedones: 3, shine: 4, pores: 3 }, "Grasse"), ans());
  const secheReactive = versProfilPeau(
    result({ flaking: 3, redness: 4, visible_vessels: 3 }, "Sèche, sensible"),
    ans({ q2: ["fragrance", "essential-oils"] }));

  it("les deux profils sont réellement distincts", () => {
    expect(grasseAcneique.skinType).toBe("oily");
    expect(secheReactive.skinType).toBe("dry");
    expect(secheReactive.sensitivity).toBeGreaterThanOrEqual(2);
    expect(Object.keys(grasseAcneique.concerns)).not.toEqual(Object.keys(secheReactive.concerns));
  });

  it("leurs trois meilleurs nettoyants n'ont AUCUN produit en commun", () => {
    const a = notes(grasseAcneique, "cleanser").slice(0, 3).map((x) => x.nom);
    const b = notes(secheReactive, "cleanser").slice(0, 3).map((x) => x.nom);
    expect(a.filter((n) => b.includes(n))).toEqual([]);
  });

  it("et leurs moyennes s'écartent de plus de 10 points", () => {
    const a = moyenne(notes(grasseAcneique, "cleanser").map((x) => x.perso));
    const b = moyenne(notes(secheReactive, "cleanser").map((x) => x.perso));
    expect(Math.abs(a - b)).toBeGreaterThan(10);
  });
});

describe("le garde-fou anti-saturation", () => {
  // Le branchement NAÏF (toutes les familles d'un vrai bilan, sans budget) mettait 12 %
  // du catalogue à 100/100 : le score ne notait plus, il tamponnait. Ce seuil est ce qui
  // empêche quiconque de rouvrir cette porte.
  const profils: [string, ProfilPeau][] = [
    ["acné sévère", versProfilPeau(result({ acne: 4, redness: 3, comedones: 3, shine: 3 }, "Grasse"), ans({ q1: ["blemishes"] }))],
    ["barrière abîmée", versProfilPeau(result({ flaking: 3, redness: 3, texture: 3 }, "Sèche, sensible"), ans({ q1: ["hydration"] }))],
    ["mature", versProfilPeau(result({ wrinkles: 3, dark_spots: 3, radiance: 3 }, "Normale"), ans({ q1: ["dark_spots", "fine_lines"] }))],
    ["peau nette", versProfilPeau(result({}, "Normale"), ans({ q1: ["discover"] }))],
  ];

  for (const [nom, p] of profils) {
    it(`${nom} : moins de 4 % du catalogue à 100/100`, () => {
      const tous = catalogue().filter((x) => x.inci);
      const cent = tous.filter((x) => {
        const f = scoreFormule(x.inci!, x.category, x.filtresUV);
        return scorePerso(x.inci!, p, x.category, f, x.filtresUV).score >= 100;
      }).length;
      expect(cent / tous.length).toBeLessThan(0.04);
    });
  }
});

describe("invariant de contradiction — le banc doit pouvoir se contredire", () => {
  it("le profil de référence garde sa moyenne historique", () => {
    // data/scan/profil.json = {blemishes:2, oiliness:2}. Si cette moyenne sortait de la
    // fourchette, c'est que le banc mesure autre chose que ce qu'on croit — c'est
    // précisément ce qui a piégé les deux agents pendant l'étude.
    const reference = { skinType: "combination", sensitivity: 0, strengthCeiling: 3,
      concerns: { blemishes: 2, oiliness: 2 }, pregnancy: false, allergies: [] };
    const tous = catalogue().filter((x) => x.inci);
    const m = moyenne(tous.map((x) => {
      const f = scoreFormule(x.inci!, x.category, x.filtresUV);
      return scorePerso(x.inci!, reference, x.category, f, x.filtresUV).score;
    }));
    expect(m).toBeGreaterThan(60);
    expect(m).toBeLessThan(80);
  });
});

describe("le mot affiché suit la personne, pas la famille", () => {
  // La famille `aging` couvre les rides, le grain ET le teint terne — mêmes actifs.
  // Un mot fixe serait donc faux pour quelqu'un.
  function phrases(profil: ProfilPeau) {
    const out: string[] = [];
    for (const p of catalogue().filter((x) => x.inci).slice(0, 400)) {
      const f = scoreFormule(p.inci!, p.category, p.filtresUV);
      const s = scorePerso(p.inci!, profil, p.category, f, p.filtresUV) as {
        facts?: { label?: string }[];
      };
      for (const fa of s.facts ?? []) if (fa.label?.includes("targets your")) out.push(fa.label);
    }
    return out;
  }

  it("grain de peau → « skin texture », jamais « fine lines »", () => {
    const jeune = versProfilPeau(result({ texture: 4, pores: 3 }, "Mixte"), ans({ q1: ["texture"] }));
    const l = phrases(jeune);
    expect(l.length).toBeGreaterThan(0);
    expect(l.some((x) => x.includes("skin texture"))).toBe(true);
    expect(l.some((x) => x.includes("fine lines"))).toBe(false);
  });

  it("rides → « fine lines », et pas le vocabulaire du grain", () => {
    const mature = versProfilPeau(result({ wrinkles: 4, fine_lines: 3 }, "Normale"), ans());
    const l = phrases(mature);
    expect(l.length).toBeGreaterThan(0);
    expect(l.some((x) => x.includes("fine lines"))).toBe(true);
    expect(l.some((x) => x.includes("skin texture"))).toBe(false);
  });
});

describe("le bonus solaire va à qui en a besoin", () => {
  const base = { skinType: "combination" as const, sensitivity: 0 as const, strengthCeiling: 3,
    libelles: {}, pregnancy: false, allergies: [] };
  function note(p: object, nomProduit: string) {
    const prod = catalogue().find((x) => x.name.includes(nomProduit) && x.inci)!;
    const f = scoreFormule(prod.inci!, prod.category, prod.filtresUV);
    return scorePerso(prod.inci!, p, prod.category, f, prod.filtresUV).score;
  }
  const SOLAIRE = "La Roche-Posay Anthelios";
  const NETTOYANT = "CeraVe Foaming Facial Cleanser";

  it("celle qui ne se protège jamais note le solaire plus haut", () => {
    const jamais = note({ ...base, concerns: {}, besoinSolaire: 2 }, SOLAIRE);
    const toujours = note({ ...base, concerns: {}, besoinSolaire: 0 }, SOLAIRE);
    expect(jamais).toBeGreaterThan(toujours);
  });

  it("la pigmentation compte aussi, même chez quelqu'un qui se protège", () => {
    const taches = note({ ...base, concerns: { spots: 2 }, besoinSolaire: 0 }, SOLAIRE);
    const sans = note({ ...base, concerns: {}, besoinSolaire: 0 }, SOLAIRE);
    expect(taches).toBeGreaterThan(sans);
  });

  it("les deux signaux se cumulent, sans dépasser le plafond d'un ingrédient", () => {
    const rien = note({ ...base, concerns: {}, besoinSolaire: 0 }, SOLAIRE);
    const tout = note({ ...base, concerns: { spots: 2 }, besoinSolaire: 2 }, SOLAIRE);
    expect(tout - rien).toBeGreaterThan(0);
    expect(tout - rien).toBeLessThanOrEqual(10);
  });

  it("un produit SANS filtre UV ne bouge pas d'un point", () => {
    const a = note({ ...base, concerns: { spots: 2 }, besoinSolaire: 2 }, NETTOYANT);
    const b = note({ ...base, concerns: {}, besoinSolaire: 0 }, NETTOYANT);
    expect(a).toBe(b);
  });

  it("la note de FORMULE du solaire est intacte — aucun barème universel n'a bougé", () => {
    const p = catalogue().find((x) => x.name.includes(SOLAIRE) && x.inci)!;
    expect(scoreFormule(p.inci!, p.category, p.filtresUV).score).toBe(78);
  });
});
