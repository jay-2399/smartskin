import { describe, it, expect, vi } from "vitest";

// Le gating repose sur UNE seule question — sessionPremium() — qu'on fige ici à
// « visiteur gratuit » : pas de session, pas d'accès. Les routes doivent alors
// dépersonnaliser leurs réponses (contrat scan-v2, §2 « Gating des routes produit »).
vi.mock("@/lib/scan/acces", () => ({
  PROFIL_NEUTRE: { skinType: "", sensitivity: 0, concerns: {}, avoid: [], pregnancy: false, allergies: [] },
  sessionPremium: vi.fn(async () => ({ uid: null, premium: false })),
}));

import { GET as fiche } from "@/app/api/produit/fiche/route";
import { GET as overview } from "@/app/api/produit/overview/route";
import { GET as alternatives } from "@/app/api/produit/alternatives/route";

describe("gating !premium des routes produit", () => {
  it("fiche : score.perso ABSENT, avis null — formule et produit conservés", async () => {
    const q = encodeURIComponent("CeraVe Hydrating Facial Cleanser");
    const r = await fiche(new Request(`http://test/api/produit/fiche?q=${q}`));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.produit?.nom).toBeTruthy();
    expect(j.score?.formule).toBeTruthy();
    expect(j.score).not.toHaveProperty("perso");
    expect(j.avis).toBeNull();
  });

  it("overview : { overview: null } sans appel modèle", async () => {
    const r = await overview(new Request("http://test/api/produit/overview?ref=B00JJPMXDO"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ overview: null });
  });

  it("alternatives : { alternatives: [] }", async () => {
    const r = await alternatives(new Request("http://test/api/produit/alternatives?categorie=cleanser"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ alternatives: [] });
  });
});
