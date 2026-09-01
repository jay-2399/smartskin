import { describe, it, expect } from "vitest";
import { scoreFormule, scorePerso, moteurDisponible } from "@/lib/scan/moteur";
import { versProfilPeau, type ProfilPeau } from "@/lib/scan/profil-peau";
import { ATTRIBUTES } from "@/features/analysis/attributes";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import type { AnalysisResult } from "@/features/analysis/schema";

/* LE BONUS SOLAIRE NE VA QU'À CE QUI RESTE SUR LA PEAU.

   La règle ajoutée le 01/09 testait `grille.rince`, un champ qui n'existe QUE dans
   `CONFIG.categoriesLegacy` — le bloc que le fichier marque lui-même « PLUS UTILISÉ ».
   Sur les grilles actives il valait toujours undefined, `?? 1` le remontait à 1, et la
   condition était donc TOUJOURS vraie : un masque à l'argile ou un baume à lèvres
   contenant du dioxyde de titane recevait le bonus, avec la phrase « UV filters — it
   protects your dark spots » affichée à l'écran.

   Le champ correct est `exposition` (cleanser 0.55, makeup-remover 0.5, mask 0.7,
   exfoliant 0.85 ; absent — donc 1 — sur tout ce qui reste posé).

   Les deux premiers tests échouent sur l'ancien code. */

const INCI_FILTRE_MINERAL = "Water, Zinc Oxide, Titanium Dioxide, Glycerin, Kaolin, Silica";

function bilan(overrides: Record<string, number> = {}): AnalysisResult {
  return {
    score: 60, state: "x", sub: "y", photoQuality: { ok: true },
    profile: { skinType: "Mixte", ageRange: "25-35", carnation: 3, carnationLabel: "x",
      undertone: 2, undertoneLabel: "x", phototype: 3, phototypeSub: "x" },
    attributes: ATTRIBUTES.map((a) => ({ id: a.id, level: overrides[a.id] ?? 1, tip: "x", situation: "y" })),
  };
}

/** Profil qui déclenche le bonus au maximum : ne met jamais de solaire. */
function profilSansSolaire(): ProfilPeau {
  return versProfilPeau(bilan(), { ...EMPTY_ANSWERS, q4: "never" });
}

/** Points et libellés de la ligne « UV filters », s'il y en a une. */
function ligneUV(categorie: string, profil: ProfilPeau) {
  const f = scoreFormule(INCI_FILTRE_MINERAL, categorie, true);
  const p = scorePerso(INCI_FILTRE_MINERAL, profil, categorie, f, true);
  const ligne = p.facts?.find((x) => /UV filters/i.test(x.label));
  return { score: p.score, ligne };
}

describe.runIf(moteurDisponible())("bonus solaire — seulement sur ce qui reste posé", () => {
  const profil = profilSansSolaire();

  it("un masque ne reçoit AUCUN bonus solaire", () => {
    expect(ligneUV("mask", profil).ligne).toBeUndefined();
  });

  it("aucune des quatre catégories rincées ne reçoit le bonus", () => {
    for (const categorie of ["cleanser", "makeup-remover", "mask", "exfoliant"]) {
      expect(ligneUV(categorie, profil).ligne, `${categorie} ne doit rien recevoir`).toBeUndefined();
    }
  });

  it("un solaire, lui, le reçoit bien — la règle n'est pas simplement désactivée", () => {
    const { ligne } = ligneUV("sunscreen", profil);
    expect(ligne).toBeDefined();
    expect(ligne!.points).toBeGreaterThan(0);
    expect(ligne!.label).toMatch(/you say you skip sunscreen/);
  });

  it("une crème hydratante avec filtres le reçoit aussi (elle reste sur la peau)", () => {
    expect(ligneUV("moisturizer", profil).ligne).toBeDefined();
  });

  it("le masque et le solaire ne sont donc plus notés pareil", () => {
    expect(ligneUV("sunscreen", profil).score).toBeGreaterThan(ligneUV("mask", profil).score);
  });
});
