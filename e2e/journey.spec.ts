import { test, expect, expectNoJsError } from "./fixtures";

/* Parcours COMPLET du funnel, capture incluse — la caméra est remplacée par un
   UPLOAD de photo (le robot ne peut pas filmer). MediaPipe valide bien en headless.
   On s'arrête juste AVANT « Lancer mon analyse » pour ne pas déclencher l'appel IA
   réel (lent + payant). Flux : age → q1 → capture(upload) → q2 → q3 → q4 → q5 → q7. */

const FACE = "dashboard_smartskin/capture-face.jpg";

async function next(page: import("@playwright/test").Page) {
  const cta = page.locator(".cta-btn");
  await expect(cta).toBeEnabled();
  await cta.click();
}

test("funnel complet (capture par upload) jusqu'à l'analyse", async ({ page, jsErrors }) => {
  await page.goto("/");
  await page.locator(".cta-btn").click();

  // âge
  await expect(page).toHaveURL(/questions\/age/);
  await page.locator(".age-input").fill("30");
  await next(page);

  // q1 (multi) → mène à la capture
  await expect(page).toHaveURL(/questions\/q1/);
  await page.locator(".opt").first().click();
  await next(page);

  // capture PAR UPLOAD (pas de caméra)
  await expect(page).toHaveURL(/\/capture/);
  await page.locator(".cap-opt").first().waitFor({ timeout: 30_000 });
  await page.locator('input[type="file"]').setInputFiles(FACE);

  // q2 → q3 → q4 (la validation MediaPipe nous fait avancer)
  await expect(page).toHaveURL(/questions\/q2/, { timeout: 20_000 });
  await page.locator(".opt").first().click();
  await next(page);

  await expect(page).toHaveURL(/questions\/q3/);
  await page.locator(".opt").first().click();
  await next(page);

  await expect(page).toHaveURL(/questions\/q4/);
  await page.locator(".opt").first().click();
  await next(page);

  // q5 (gate) : « Non, elle est stable » → valide sans symptômes
  await expect(page).toHaveURL(/questions\/q5/);
  await page.getByRole("button", { name: /Non, elle est stable/i }).click();
  await next(page);

  // q7 (dernière) : on sélectionne et on vérifie que « Lancer mon analyse » est prêt,
  // SANS cliquer (évite l'appel IA réel).
  await expect(page).toHaveURL(/questions\/q7/);
  await page.locator(".opt").first().click();
  await expect(page.getByRole("button", { name: /Lancer mon analyse/i })).toBeEnabled();

  expectNoJsError(jsErrors);
});
