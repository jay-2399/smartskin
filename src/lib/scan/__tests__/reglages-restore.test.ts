import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/* « Restore purchase » dans les réglages, sans compte.

   /api/iap/sync exige une session : sans compte, le serveur ne rattache l'achat à
   personne. L'écran annonçait pourtant « Purchase restored » et rechargeait la page —
   la personne restait en gratuit. Le testeur Apple, qui supprime son compte puis
   revient, tombe exactement dessus. Les paywalls, eux, demandent un compte avant.

   Même méthode que welcome-apple-signup.test.ts : on lit le fichier servi. */

const html = fs.readFileSync(
  path.join(process.cwd(), "public", "scan-proto", "17-reglages.html"),
  "utf8",
);
const debut = html.indexOf('getElementById("row-restore").addEventListener');
const bloc = html.slice(debut, html.indexOf("/* ── questionnaire", debut));

describe("Réglages — « Restore purchase » sans compte", () => {
  it("demande la connexion avant de restaurer, puis revient restaurer", () => {
    expect(debut).toBeGreaterThan(0);
    expect(bloc).toContain('"15-compte.html?next=" + encodeURIComponent("17-reglages.html?restore=1")');
    expect(bloc).toMatch(/get\("restore"\)\s*===\s*"1"/);
  });

  it("ne recharge pas la page avec ?restore=1 (sinon la restauration boucle)", () => {
    expect(bloc).not.toContain("location.reload()");
  });
});
