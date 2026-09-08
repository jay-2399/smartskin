import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/* INVARIANTS DU DICTIONNAIRE — la cible du lot « données » de l'audit du 7 septembre
   (docs/audit/moteur-notation-2026-09-07/rapport-final-v2.md, G1).

   Le dictionnaire est un JSON d'une ligne, édité à la main : rien ne vérifie sa cohérence.
   Ce test tourne sur le VRAI fichier. Écrit rouge avant les correctifs, il dit exactement ce
   que le lot 1 doit produire, et empêche qu'une régénération de `fonctions` ou un correctif
   ultérieur défasse une décision de l'audit sans qu'on le voie. */

type Fiche = {
  role?: string; fonctions?: string[]; fragrance?: boolean; euFragranceAllergen?: boolean;
  lowDose?: boolean; banniUE?: boolean; banniUEPortee?: string;
  risks?: { irritant?: number; sensibilisant?: number; comedogenic?: number };
  benefits?: string[]; benefitPower?: number; strength?: number;
};
const D = path.join(process.cwd(), "data", "scan");
const dico: Record<string, Fiche> = JSON.parse(fs.readFileSync(path.join(D, "dictionnaire.json"), "utf8"));
const alias: Record<string, string> = JSON.parse(fs.readFileSync(path.join(D, "ingredients-canon.json"), "utf8")).alias;

const fiche = (n: string) => { expect(dico[n], `fiche absente : ${n}`).toBeDefined(); return dico[n]; };
const fonctions = (n: string) => fiche(n).fonctions ?? [];

describe("dictionnaire — forme", () => {
  it("chaque fiche a un rôle du vocabulaire (active / support / filler)", () => {
    const horsVocab = Object.entries(dico).filter(([, f]) => !["active", "support", "filler"].includes(f.role ?? ""));
    expect(horsVocab.map(([n, f]) => `${n}:${f.role}`)).toEqual([]);
  });
  it("l'entrée inversée ETANORULAYH MUIDOS n'existe plus", () => {
    expect(dico["ETANORULAYH MUIDOS"]).toBeUndefined();
  });
  it("tout ingrédient banni en UE porte sa portée (tous | pose)", () => {
    const bannis = Object.entries(dico).filter(([, f]) => f.banniUE);
    expect(bannis.length).toBeGreaterThanOrEqual(4);
    for (const [n, f] of bannis) expect(["tous", "pose"], `banniUEPortee manquante : ${n}`).toContain(f.banniUEPortee);
    expect(dico["METHYLISOTHIAZOLINONE"]?.banniUEPortee).toBe("pose");
    expect(dico["BUTYLPHENYL METHYLPROPIONAL"]?.banniUEPortee).toBe("tous");
  });
});

describe("dictionnaire — solaires (B1)", () => {
  it("l'oxyde de zinc couvre UVA et UVB ; le dioxyde de titane UVB seul", () => {
    expect(fonctions("ZINC OXIDE")).toEqual(expect.arrayContaining(["filtre-uva", "filtre-uvb"]));
    expect(fonctions("TITANIUM DIOXIDE")).toContain("filtre-uvb");
    expect(fonctions("TITANIUM DIOXIDE")).not.toContain("filtre-uva");
  });
  it("Tinosorb S, Tinosorb M et Mexoryl XL sont à large spectre", () => {
    for (const n of ["BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE", "METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL", "DROMETRIZOLE TRISILOXANE"])
      expect(fonctions(n), n).toEqual(expect.arrayContaining(["filtre-uva", "filtre-uvb"]));
  });
  it("les vrais stabilisants de l'avobenzone portent la fonction", () => {
    for (const n of ["OCTOCRYLENE", "BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE", "ETHYLHEXYL METHOXYCRYLENE", "BUTYLOCTYL SALICYLATE"])
      expect(fonctions(n), n).toContain("stabilisant-avobenzone");
  });
  it("les filtres ajoutés existent avec leur spectre", () => {
    expect(fonctions("DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE")).toContain("filtre-uva");
    expect(fonctions("DIETHYLHEXYL BUTAMIDO TRIAZONE")).toContain("filtre-uvb");
    expect(alias["OCTISALATE"]).toBe("ETHYLHEXYL SALICYLATE");
  });
});

describe("dictionnaire — parfum et conservateurs (B2)", () => {
  it("un conservateur n'est pas un parfum ; l'alcool benzylique reste un allergène déclaré", () => {
    for (const n of ["BENZYL ALCOHOL", "PHENETHYL ALCOHOL", "PHENYLPROPANOL", "4-T-BUTYLCYCLOHEXANOL", "BENZOIC ACID"])
      expect(fiche(n).fragrance, n).toBe(false);
    expect(fiche("BENZYL ALCOHOL").euFragranceAllergen).toBe(true);
  });
});

describe("dictionnaire — fiches qui faussent la mécanique (B3)", () => {
  it("propylène glycol : irritant 1, sensibilisant 2", () => {
    expect(fiche("PROPYLENE GLYCOL").risks).toMatchObject({ irritant: 1, sensibilisant: 2 });
  });
  it("triclosan n'est plus un irritant fort", () => {
    expect(fiche("TRICLOSAN").risks?.irritant).toBe(1);
  });
  it("les actifs efficaces à faible dose sont marqués lowDose", () => {
    for (const n of ["ADAPALENE", "MENTHOL", "SODIUM HYALURONATE", "HYALURONIC ACID", "RETINOL"])
      expect(fiche(n).lowDose, n).toBe(true);
    expect(fiche("MENTHOL").strength).toBe(0);
  });
  it("niacinamide et acide azélaïque portent leurs bénéfices prouvés", () => {
    expect(fiche("NIACINAMIDE").benefits).toEqual(expect.arrayContaining(["blemishes", "oiliness", "aging", "spots", "redness", "barrier"]));
    expect(fiche("AZELAIC ACID").benefits).toContain("redness");
  });
  it("l'hamamélis est un apaisant modeste, pas un actif de premier rang", () => {
    const f = fiche("HAMAMELIS VIRGINIANA LEAF EXTRACT");
    expect(f.benefitPower).toBe(1);
    expect(f.risks?.irritant).toBe(1);
    expect(f.benefits).toContain("redness");
  });
  it("la lécithine est un émollient, pas un lipide de barrière", () => {
    expect(fonctions("LECITHIN")).toContain("emollient");
    expect(fonctions("LECITHIN")).not.toContain("lipide-barriere");
  });
  it("les propanediols sont des humectants au rôle support", () => {
    for (const n of ["1,3-PROPANEDIOL", "1,2-HEPTANEDIOL"]) {
      expect(fiche(n).role, n).toBe("support");
      expect(fonctions(n), n).toContain("humectant");
    }
  });
});

describe("dictionnaire — nettoyants et démaquillants (B6)", () => {
  it("les tensioactifs non ioniques micellaires sont des agents lavants doux", () => {
    for (const n of ["PEG-6 CAPRYLIC/CAPRIC GLYCERIDES", "POLOXAMER 184", "POLOXAMER 188", "PEG-40 HYDROGENATED CASTOR OIL", "SODIUM LAUROYL LACTYLATE", "POLYSORBATE 20"])
      expect(fonctions(n), n).toContain("tensioactif-doux");
  });
});

describe("alias — sans cycle ni chaîne longue", () => {
  it("toute chaîne d'alias se résout en 3 sauts au plus, sans boucle", () => {
    const problemes: string[] = [];
    for (const depart of Object.keys(alias)) {
      let cur = depart, sauts = 0;
      const vus = new Set<string>();
      while (alias[cur] !== undefined) {
        if (vus.has(cur) || ++sauts > 3) { problemes.push(depart); break; }
        vus.add(cur); cur = alias[cur];
      }
    }
    expect(problemes).toEqual([]);
  });
});
