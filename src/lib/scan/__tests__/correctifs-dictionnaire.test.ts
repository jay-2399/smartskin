import { describe, it, expect } from "vitest";
import { appliquerCorrectifs, appliquerAlias, appliquerCatalogue, CORRECTIFS } from "../../../../scripts/corriger-dictionnaire.mjs";

/* LE SCRIPT DE CORRECTIFS : déclaratif, idempotent, et il s'arrête sur une dérive.
   Le dictionnaire n'a ni script de construction ni revue : ce mécanisme est le seul filet
   entre une décision de l'audit et le fichier d'une ligne qu'on ne peut pas relire. */

const fiche = (o: Record<string, unknown> = {}) => ({ role: "support", benefits: [], benefitPower: 0, risks: { irritant: 0, comedogenic: 0, sensibilisant: 0 }, strength: 0, essentialOil: false, fragrance: false, fonctions: [], ...o });
const DICO = () => ({
  "PROPYLENE GLYCOL": fiche({ risks: { irritant: 2, comedogenic: 0, sensibilisant: 1 }, fonctions: ["humectant"] }),
  "BENZYL ALCOHOL": fiche({ fragrance: true, euFragranceAllergen: true }),
  "SODIUM HYALURONATE": fiche({ role: "active", benefits: ["dehydration"], benefitPower: 2 }),
  "HYALURONIC ACID GEL": fiche({ role: "support" }),
  "ETANORULAYH MUIDOS": fiche({ role: "active", benefitPower: 3 }),
  "AZELAIC ACID": fiche({ role: "active", benefits: ["blemishes", "spots"], benefitPower: 3 }),
});

describe("appliquerCorrectifs", () => {
  it("applique un patch par chemin pointé et le rapporte, sans toucher au reste", () => {
    const { dico, rapport, derives } = appliquerCorrectifs(DICO(), [
      { id: "pg", cible: "PROPYLENE GLYCOL", avant: { "risks.irritant": 2 }, patch: { "risks.irritant": 1, "risks.sensibilisant": 2 } },
    ]);
    expect(dico["PROPYLENE GLYCOL"].risks).toEqual({ irritant: 1, comedogenic: 0, sensibilisant: 2 });
    expect(dico["PROPYLENE GLYCOL"].fonctions).toEqual(["humectant"]);
    expect(rapport).toHaveLength(2);
    expect(derives).toEqual([]);
  });
  it("détecte une dérive : valeur actuelle ≠ attendue ≠ cible → rien n'est écrit sur ce champ", () => {
    const d = DICO(); d["PROPYLENE GLYCOL"].risks.irritant = 3;
    const { dico, rapport, derives } = appliquerCorrectifs(d, [
      { id: "pg", cible: "PROPYLENE GLYCOL", avant: { "risks.irritant": 2 }, patch: { "risks.irritant": 1 } },
    ]);
    expect(dico["PROPYLENE GLYCOL"].risks.irritant).toBe(3);
    expect(rapport).toEqual([]);
    expect(derives).toMatchObject([{ id: "pg", cible: "PROPYLENE GLYCOL", champ: "risks.irritant", actuel: 3, attendu: 2 }]);
  });
  it("cible par RegExp avec filtre `si`, patch par fonction, création et suppression", () => {
    const { dico, rapport } = appliquerCorrectifs(DICO(), [
      { id: "hya", cible: /HYALURON/, si: (f: { role: string }) => f.role === "active", patch: { lowDose: true } },
      { id: "aze", cible: "AZELAIC ACID", patch: (f: { benefits: string[] }) => ({ benefits: [...f.benefits, "redness"] }) },
      { id: "new", cible: "UVINUL", creer: fiche({ fonctions: [] }) },
      { id: "del", cible: "ETANORULAYH MUIDOS", supprimer: true },
    ]);
    expect(dico["SODIUM HYALURONATE"].lowDose).toBe(true);
    expect(dico["HYALURONIC ACID GEL"].lowDose).toBeUndefined();
    expect(dico["AZELAIC ACID"].benefits).toEqual(["blemishes", "spots", "redness"]);
    expect(dico["UVINUL"]).toBeDefined();
    expect(dico["ETANORULAYH MUIDOS"]).toBeUndefined();
    expect(rapport.map((r: { id: string }) => r.id)).toEqual(["hya", "aze", "new", "del"]);
  });
  it("est idempotent : une seconde application n'a rien à rapporter", () => {
    const table = [
      { id: "pg", cible: "PROPYLENE GLYCOL", avant: { "risks.irritant": 2 }, patch: { "risks.irritant": 1 } },
      { id: "new", cible: "UVINUL", creer: fiche() },
      { id: "del", cible: "ETANORULAYH MUIDOS", supprimer: true },
    ];
    const une = appliquerCorrectifs(DICO(), table);
    const deux = appliquerCorrectifs(une.dico, table);
    expect(deux.rapport).toEqual([]);
    expect(deux.dico).toEqual(une.dico);
  });
  it("une fiche absente est une dérive, pas une création silencieuse", () => {
    const { derives } = appliquerCorrectifs(DICO(), [{ id: "x", cible: "INEXISTANT", patch: { lowDose: true } }]);
    expect(derives).toMatchObject([{ cible: "INEXISTANT", champ: "(fiche)" }]);
  });
  it("refuse de toucher au champ fonctions (il appartient à fonctions.mjs)", () => {
    expect(() => appliquerCorrectifs(DICO(), [{ id: "x", cible: "BENZYL ALCOHOL", patch: { fonctions: ["emollient"] } }])).toThrow(/fonctions/);
    for (const c of CORRECTIFS) if (typeof c.patch === "object") expect(Object.keys(c.patch), c.id).not.toContain("fonctions");
  });
});

describe("appliquerAlias / appliquerCatalogue", () => {
  it("ajoute ou corrige un alias sans toucher aux autres", () => {
    const { canon, rapport } = appliquerAlias({ canon: { A: 1 }, alias: { AQUA: "WATER" } }, { OCTISALATE: "ETHYLHEXYL SALICYLATE" });
    expect(canon.alias).toEqual({ AQUA: "WATER", OCTISALATE: "ETHYLHEXYL SALICYLATE" });
    expect(canon.canon).toEqual({ A: 1 });
    expect(rapport).toHaveLength(1);
    expect(appliquerAlias(canon, { OCTISALATE: "ETHYLHEXYL SALICYLATE" }).rapport).toEqual([]);
  });
  it("répare une INCI du catalogue par nom exact, vérifie l'état attendu, garde l'ordre des fiches", () => {
    const cat = [{ name: "A", inci: "Water, Glycerin" }, { name: "B", source: "us", inci: "Water, 1, Alcohol" }, { name: "B", source: "fr", inci: "Water, Lanolin" }];
    const { catalogue, rapport, derives } = appliquerCatalogue(cat, [
      { nom: "B", source: "us", avant: /^Water, 1/, inci: null },
      { nom: "B", source: "fr", avant: /^Water, Lanolin/, inci: "Water, Lanolin, Parfum, Limonene" },
      { nom: "A", avant: /^Nope/, inci: "X" },
    ]);
    expect(catalogue.map((p: { name: string }) => p.name)).toEqual(["A", "B", "B"]);
    expect(catalogue[1].inci).toBeNull();
    expect(catalogue[2].inci).toBe("Water, Lanolin, Parfum, Limonene");
    expect(catalogue[0].inci).toBe("Water, Glycerin");
    expect(rapport).toHaveLength(2);
    expect(derives).toMatchObject([{ cible: "A", champ: "inci" }]);
  });
});
