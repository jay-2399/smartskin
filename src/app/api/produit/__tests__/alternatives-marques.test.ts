import { describe, it, expect, vi } from "vitest";

/* TROIS MARQUES DISTINCTES, LES MIEUX NOTÉES DE LA CATÉGORIE POUR CETTE PEAU.

   Avant : la route triait la catégorie par note perso et prenait les trois premiers
   sans regarder la marque. Paula's Choice a 203 fiches — dans une catégorie qu'elle
   domine, l'écran montrait trois Paula's Choice, dont deux fois le même tube listé
   sous deux noms. Règle demandée le 02/09 : une fiche par marque, la meilleure de
   chacune, dans l'ordre du classement.

   Le moteur est remplacé par un stub qui lit les notes dans le champ `inci`
   (« perso|formule ») : la route ne passe que l'INCI au moteur, c'est donc le seul
   canal pour lui dicter une note. On teste la SÉLECTION, pas le calcul. */

const PROFIL = { skinType: "combination", sensitivity: 0 };

// Une marque qui écrase le haut du classement, puis trois autres, puis une autre catégorie.
const CATALOGUE = [
  { name: "Alpha Calm A1", brand: "Alpha", category: "moisturizer", inci: "96|90" },
  { name: "Alpha Calm A2", brand: "Alpha", category: "moisturizer", inci: "95|90" },
  { name: "Alpha Calm A3", brand: "Alpha", category: "moisturizer", inci: "94|90" },
  { name: "Beta Cream",    brand: "Beta",  category: "moisturizer", inci: "88|80" },
  { name: "Gamma Lotion",  brand: "Gamma", category: "moisturizer", inci: "81|79" },
  { name: "Delta Gel",     brand: "Delta", category: "moisturizer", inci: "60|70" },
  { name: "Omega Wash",    brand: "Omega", category: "cleanser",    inci: "99|99" },
];

vi.mock("@/lib/scan/moteur", () => ({
  catalogue: () => CATALOGUE,
  marqueDe: (p: { brand: string }) => p.brand,
  scoreFormule: (inci: string) => ({ score: Number(inci.split("|")[1]) }),
  scorePerso: (inci: string) => ({ score: Number(inci.split("|")[0]) }),
}));
vi.mock("@/lib/scan/acces", () => ({
  sessionPremium: vi.fn(async () => ({ uid: "u1", premium: true })),
}));
vi.mock("@/lib/scan/profil-utilisateur", () => ({
  profilUtilisateur: vi.fn(async () => ({ etat: "ok", profil: PROFIL })),
}));
vi.mock("@/lib/scan/profil-peau", () => ({
  cleProfil: () => "profil-test",
}));

import { GET } from "@/app/api/produit/alternatives/route";

async function appel(q: string) {
  const r = await GET(new Request("http://test/api/produit/alternatives?" + q));
  const j = await r.json();
  return (j.alternatives as { nom: string; marque: string }[]).map((a) => a.marque + ":" + a.nom);
}

describe("alternatives — trois marques distinctes", () => {
  it("une fiche par marque, la meilleure de chacune, dans l'ordre du classement", async () => {
    const l = await appel("categorie=moisturizer&exclure=&min=50&n=3");
    expect(l).toEqual(["Alpha:Alpha Calm A1", "Beta:Beta Cream", "Gamma:Gamma Lotion"]);
  });

  it("le produit scanné est écarté AVANT le dédoublonnage : sa marque reste représentée par son second", async () => {
    const l = await appel("categorie=moisturizer&exclure=" + encodeURIComponent("Alpha Calm A1") + "&min=50&n=3");
    expect(l).toEqual(["Alpha:Alpha Calm A2", "Beta:Beta Cream", "Gamma:Gamma Lotion"]);
  });

  it("jamais moins bien que le produit scanné : `min` élimine, même s'il reste moins de trois marques", async () => {
    const l = await appel("categorie=moisturizer&exclure=&min=85&n=3");
    expect(l).toEqual(["Alpha:Alpha Calm A1", "Beta:Beta Cream"]);
  });

  it("une autre catégorie ne se mélange pas", async () => {
    const l = await appel("categorie=cleanser&exclure=&min=0&n=3");
    expect(l).toEqual(["Omega:Omega Wash"]);
  });
});
