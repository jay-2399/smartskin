import { describe, it, expect, vi, beforeEach } from "vitest";

/* LES ROUTES QUAND ON NE PEUT PAS NOTER (audit du 7 septembre, B4).
   Une même forme de réponse pour les trois chemins qui notent, pour que les écrans n'aient
   qu'un seul cas à connaître : `score.disponible = false`, un `statut`, une `raison` et un
   message lisible. Le produit et ses ingrédients restent renvoyés — on montre ce qu'on a lu,
   on refuse seulement d'en tirer un chiffre. */

const { SOLAIRE_SANS_FILTRE, CREME_OK } = vi.hoisted(() => ({
  SOLAIRE_SANS_FILTRE: { name: "Solaire liste amputée", brand: "X", category: "sunscreen", filtresUV: false, image: null, url: "", inci: "Water, Glycerin, Dimethicone, Cetearyl Alcohol, Squalane, Panthenol, Tocopherol, Phenoxyethanol, Xanthan Gum, Disodium EDTA" },
  CREME_OK: { name: "Crème lisible", brand: "Y", category: "moisturizer", filtresUV: false, image: null, url: "", inci: "Water, Glycerin, Caprylic/Capric Triglyceride, Niacinamide, Cetearyl Alcohol, Ceramide NP, Panthenol, Phenoxyethanol, Xanthan Gum" },
}));

vi.mock("@/lib/scan/acces", () => ({
  sessionPremium: vi.fn(async () => ({ uid: null, premium: false })),
  PROFIL_NEUTRE: { skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 3, pregnancy: false, allergies: [] },
}));
vi.mock("@/lib/scan/profil-utilisateur", () => ({ profilUtilisateur: vi.fn(async () => ({ etat: "aucun-bilan" })) }));
vi.mock("@/lib/scan/avis", () => ({ avisPour: () => null, tousLesAvis: () => null, pidUlta: () => "" }));
vi.mock("@/lib/scan/moteur", async (orig) => {
  const m = (await orig()) as Record<string, unknown>;
  return { ...m, catalogue: () => [SOLAIRE_SANS_FILTRE, CREME_OK].map((p, i) => ({ ...p, id: i })) };
});

import { GET as fiche } from "@/app/api/produit/fiche/route";
import { POST as scores } from "@/app/api/produit/scores/route";

const json = async (r: Response) => r.json();

describe("/api/produit/fiche", () => {
  beforeEach(() => vi.clearAllMocks());

  it("un solaire dont la liste a perdu ses filtres : pas de note, mais le produit et les ingrédients restent", async () => {
    const d = await json(await fiche(new Request("http://t/api/produit/fiche?q=" + encodeURIComponent(SOLAIRE_SANS_FILTRE.name))));
    expect(d.score).toMatchObject({ disponible: false, statut: "non-evaluable", raison: "solaire-sans-filtre" });
    expect(typeof d.score.message).toBe("string");
    expect(d.score.formule).toBeUndefined();
    expect(d.produit.nom).toBe(SOLAIRE_SANS_FILTRE.name);
    expect(Array.isArray(d.ingredients)).toBe(true);
  });

  it("une liste lisible garde sa note", async () => {
    const d = await json(await fiche(new Request("http://t/api/produit/fiche?q=" + encodeURIComponent(CREME_OK.name))));
    expect(d.score.disponible).toBe(true);
    expect(typeof d.score.formule.score).toBe("number");
    expect(d.score.formule.evaluable).toBe(true);
  });
});

describe("/api/produit/scores", () => {
  it("efface la note enregistrée d'un produit devenu non évaluable, et annonce la version de l'algorithme", async () => {
    const r = await scores(new Request("http://t/api/produit/scores", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ produits: [SOLAIRE_SANS_FILTRE.name, CREME_OK.name] }),
    }));
    const d = await json(r);
    expect(d.scores[SOLAIRE_SANS_FILTRE.name]).toMatchObject({ formule: null, perso: null, nonEvaluable: true });
    expect(typeof d.scores[CREME_OK.name].formule).toBe("number");
    expect(d.algoVersion).toBe("2.1.0-audit");
  });
});
