import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/* REJET APP STORE 2.1(a) DU 02/09/2026 — « the Sign in with Apple attempt was
   unsuccessful due to an error », iPad Air M3.

   L'accueil V2 appelait SS.auth.apple(…, "login") : un Apple ID sans compte SmartSkin
   se faisait répondre « No SmartSkin account found ». Or pour Apple, Sign in with Apple
   « lets people sign in OR sign up » (HIG) — un refus est un bug. Le testeur, qui teste
   la suppression de compte puis revient, tombe exactement dessus.

   Ce test lit le fichier servi, pas une copie : les écrans V2 sont du HTML statique
   dans public/scan-proto/, il n'y a pas d'autre endroit où verrouiller ça. */

const ECRANS = path.join(process.cwd(), "public", "scan-proto");
const lire = (f: string) => fs.readFileSync(path.join(ECRANS, f), "utf8");

describe("Sign in with Apple — aucun écran V2 ne refuse un Apple ID sans compte", () => {
  it("l'accueil inscrit OU connecte (mode signup)", () => {
    const html = lire("00-welcome.html");
    expect(html).toMatch(/SS\.auth\.apple\(idToken,\s*name,\s*"signup"\)/);
    expect(html).not.toMatch(/SS\.auth\.apple\([^)]*"login"\)/);
  });

  it("l'écran compte aussi", () => {
    expect(lire("15-compte.html")).toMatch(/SS\.auth\.apple\(idToken,\s*name,\s*"signup"\)/);
  });

  it("le libellé est « Continue with Apple » — celui qu'Apple prévoit pour un bouton qui fait les deux", () => {
    // Un bouton qui inscrit ET connecte ne doit promettre ni l'un ni l'autre.
    // « Sign in with Apple » sur un bouton qui inscrit = le mismatch du rejet de juillet ;
    // « Sign in with Apple » qui refuse d'inscrire = le rejet de septembre.
    for (const f of ["00-welcome.html", "15-compte.html"]) {
      const html = lire(f);
      expect(html, f).toMatch(/<\/span>Continue with Apple<\/button>/);
      expect(html, f).not.toMatch(/<\/span>Sign in with Apple<\/button>/);
    }
  });

  it("le message « No SmartSkin account found » a disparu des écrans", () => {
    for (const f of fs.readdirSync(ECRANS).filter((x) => x.endsWith(".html"))) {
      expect(lire(f), f).not.toContain("No SmartSkin account found");
    }
  });
});
