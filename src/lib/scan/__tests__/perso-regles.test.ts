import { describe, it, expect } from "vitest";
import { scoreFormule, scorePerso } from "@/lib/scan/scoring.mjs";
import { catalogue } from "@/lib/scan/moteur";
import { allergiesDe } from "@/lib/scan/profil-peau";

/* LA NOTE PERSO (audit du 7 septembre, G2 #13-#18).
   Le défaut n° 1 de l'audit : parfum, huiles essentielles et allergènes facturés à chaque
   ingrédient, sans plafond. Une marque qui déclare ses six allergènes (obligation UE) tombait à
   5/100 pour une peau réactive quand « Parfum » seul restait à 57 : prime à l'opacité. La note
   perso ignorait aussi la dose (un acide en position 30 déclenchait « trop fort pour vous »),
   confondait peau réactive et allergie de contact, et comparait les allergies par sous-chaîne. */

type Fact = { label: string; points: number | null; inci?: string };
const profil = (o: Record<string, unknown> = {}) => ({ skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [] as string[], besoinSolaire: 0, libelles: {}, ...o });
const perso = (inci: string, p: object, cat = "moisturizer") => scorePerso(inci, p, cat, scoreFormule(inci, cat, false), false);
const facts = (inci: string, p: object, cat = "moisturizer") => perso(inci, p, cat).facts as Fact[];

const CREME = "Water, Glycerin, Caprylic/Capric Triglyceride, Niacinamide, Cetearyl Alcohol, Glyceryl Stearate, Ceramide NP, Panthenol, Sodium Hyaluronate, Tocopherol";
const SENS3 = profil({ sensitivity: 3, concerns: { redness: 2 }, strengthCeiling: 1 });

describe("parfum, huiles essentielles, allergènes : une fois par produit", () => {
  it("la marque qui déclare ses six allergènes n'est plus punie huit fois : une seule ligne parfum, écart ≤ 8 avec « Parfum » seul", () => {
    const opaque = `${CREME}, Parfum, Phenoxyethanol, Xanthan Gum`;
    const transparente = `${CREME}, Parfum, Linalool, Limonene, Citronellol, Geraniol, Coumarin, Citral, Phenoxyethanol, Xanthan Gum`;
    expect(perso(opaque, SENS3).score - perso(transparente, SENS3).score).toBeLessThanOrEqual(8);
    expect(facts(transparente, SENS3).filter((x) => /fragrance/i.test(x.label))).toHaveLength(1);
  });
  it("Weleda Skin Food (fiche US, quatre allergènes) n'est plus au plancher pour une peau sèche réactive", () => {
    const p = catalogue().find((x) => x.name === "Weleda Skin Food Face Care Nourishing Day Cream")!;
    const sr = profil({ skinType: "dry", sensitivity: 3, concerns: { dehydration: 3, redness: 2, barrier: 2 }, strengthCeiling: 0 });
    expect(perso(p.inci!, sr, p.category).score).toBeGreaterThan(45);
  });
});

describe("allergie déclarée : jeton entier, familles canoniques", () => {
  it("« D-LIMONENE » n'est pas « LIMONENE », le Mexoryl SX n'est pas du camphre", () => {
    const limonene = profil({ allergies: ["LIMONENE"] });
    expect(perso(`${CREME}, D-Limonene, Phenoxyethanol`, limonene).score).toBeGreaterThan(10);
    expect(perso(`${CREME}, Limonene, Phenoxyethanol`, limonene).score).toBe(10);
    const camphre = profil({ allergies: ["CAMPHOR"] });
    expect(perso(`${CREME}, Terephthalylidene Dicamphor Sulfonic Acid, Phenoxyethanol`, camphre).score).toBeGreaterThan(10);
  });
  it("le groupe « parfum » du quiz ne contient plus l'alcool benzylique ni le menthol", () => {
    const dico = { LIMONENE: { euFragranceAllergen: true }, "BENZYL ALCOHOL": { euFragranceAllergen: true }, MENTHOL: { euFragranceAllergen: true }, "BENZYL BENZOATE": { euFragranceAllergen: true }, CAMPHOR: { euFragranceAllergen: true }, GLYCERIN: {} };
    const l = allergiesDe({ q7: ["allergy-fragrance"] } as never, dico as never);
    expect(l).toContain("LIMONENE");
    expect(l).toContain("CAMPHOR");
    for (const n of ["BENZYL ALCOHOL", "BENZYL BENZOATE", "MENTHOL"]) expect(l).not.toContain(n);
  });
});

describe("la dose compte aussi côté perso", () => {
  it("un actif rapporte au prorata de sa preuve, à sévérité et position égales", () => {
    // même préoccupation (brillance), même position : niacinamide preuve 3, zinc PCA preuve 2.
    // Sévérité 1 pour rester sous le plafond de 10 points par ingrédient, qui écrase le rapport.
    const p = profil({ concerns: { oiliness: 1 } });
    const pts = (actif: string) => facts(`Water, Glycerin, ${actif}, Cetearyl Alcohol, Phenoxyethanol`, p, "serum").find((x) => /targets your/.test(x.label))?.points ?? 0;
    expect(pts("Niacinamide") / pts("Zinc PCA")).toBeCloseTo(1.5, 1);
  });
  it("l'alcool en position 20 coûte moins à une peau sèche qu'en position 2", () => {
    const seche = profil({ skinType: "dry" });
    const fillers = Array.from({ length: 17 }, (_, i) => `Filler ${i + 1}`).join(", ");
    const tete = `Water, Alcohol Denat., Glycerin, ${fillers}, Phenoxyethanol`;
    const queue = `Water, Glycerin, ${fillers}, Phenoxyethanol, Alcohol Denat.`;
    const cout = (inci: string) => facts(inci, seche).find((x) => /alcohol/i.test(x.label))?.points ?? 0;
    expect(cout(tete)).toBeLessThan(cout(queue));
  });
  it("un acide en position 30 ne déclenche pas « trop fort pour vous »", () => {
    const fillers = Array.from({ length: 27 }, (_, i) => `Filler ${i + 1}`).join(", ");
    const tolerance0 = profil({ sensitivity: 3, strengthCeiling: 0 });
    expect(facts(`Water, Glycerin, ${fillers}, Phenoxyethanol, Salicylic Acid`, tolerance0, "treatment").some((x) => /comfort zone/.test(x.label))).toBe(false);
  });
  it("comédogène 3 : rien en position 8, une ligne en position 3 ; comédogène 4 partout ; plafond −6", () => {
    const grasse = profil({ skinType: "oily" });
    const c3 = "Isocetyl Stearate";       // comédogène 3
    const c4 = "Isopropyl Myristate";     // comédogène 4
    const pos8 = `Water, Glycerin, Cetearyl Alcohol, Squalane, Dimethicone, Panthenol, Allantoin, ${c3}, Phenoxyethanol`;
    const pos3 = `Water, Glycerin, ${c3}, Cetearyl Alcohol, Phenoxyethanol`;
    const quatreEnQueue = `Water, Glycerin, Cetearyl Alcohol, Squalane, Dimethicone, Panthenol, Allantoin, ${c4}, Phenoxyethanol`;
    const trois = `Water, ${c4}, Isopropyl Palmitate, Cocos Nucifera (Coconut) Oil, Cetearyl Alcohol, Phenoxyethanol`;
    const clog = (inci: string) => facts(inci, grasse).filter((x) => /pore-clogging/.test(x.label));
    expect(clog(pos8)).toHaveLength(0);
    expect(clog(pos3).length).toBeGreaterThan(0);
    expect(clog(quatreEnQueue).length).toBeGreaterThan(0);
    expect(clog(trois).reduce((s, x) => s + (x.points ?? 0), 0)).toBeGreaterThanOrEqual(-6);
  });
});

describe("plafonds et sensibilisants", () => {
  it("la note perso ne dépasse jamais le plafond de la formule (lilial)", () => {
    const inci = `${CREME}, Butylphenyl Methylpropional, Phenoxyethanol`;
    const flatteur = profil({ skinType: "dry", concerns: { dehydration: 3, barrier: 3, aging: 3 } });
    expect(perso(inci, flatteur).score).toBeLessThanOrEqual(45);
  });
  it("un sensibilisant fort hors parfum est facturé par la formule, pas deux fois par le perso", () => {
    const inci = `${CREME}, Methylisothiazolinone, Phenoxyethanol`;
    expect(facts(inci, SENS3).some((x) => /methylisothiazolinone/i.test(x.label))).toBe(false);
  });
});
