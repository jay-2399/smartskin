import { test, expect, expectNoJsError, dismissCheckin } from "./fixtures";

/* Interactions du dashboard (logique client riche) : check-in adaptatif, toggle
   Matin/Soir, checklist du soir, restock. Le gate (espace) est désactivé en dev →
   /dashboard rend la démo « Sarah ». */

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator(".dash")).toBeVisible({ timeout: 30_000 });
});

test("check-in « Irritée » met l'exfoliant en pause (Nuit douce)", async ({ page, jsErrors }) => {
  // la modale s'ouvre seule ; on choisit « Irritée » (3ᵉ option)
  await expect(page.locator(".dash .ci-modal:not(.hidden)")).toBeVisible();
  await page.locator(".ci-opt").nth(2).click();
  await expect(page.locator(".dash .ci-modal.hidden")).toHaveCount(1);
  // le kicker passe en « NUIT DOUCE » et une étape est en pause
  await expect(page.locator(".tn-kicker")).toContainText(/NUIT DOUCE/i);
  await expect(page.locator(".rt-step.paused")).toHaveCount(1);
  expectNoJsError(jsErrors);
});

test("bascule Matin/Soir change la routine", async ({ page, jsErrors }) => {
  await dismissCheckin(page);
  // Soir (défaut) = checklist cochable
  await expect(page.locator(".tonight .rt-check").first()).toBeVisible();
  // Matin = étapes numérotées (non cochables) + bouton de confirmation unique
  await page.locator(".seg button", { hasText: /Matin/i }).click();
  await expect(page.locator(".tonight .rt-num").first()).toBeVisible();
  await expect(page.locator(".tn-confirm")).toBeVisible();
  await expect(page.locator(".tonight .rt-check")).toHaveCount(0);
  // retour Soir
  await page.locator(".seg button", { hasText: /Soir/i }).click();
  await expect(page.locator(".tonight .rt-check").first()).toBeVisible();
  expectNoJsError(jsErrors);
});

test("cocher une étape du soir incrémente le compteur", async ({ page, jsErrors }) => {
  await dismissCheckin(page);
  await expect(page.locator(".tn-foot")).toContainText(/0\/\d+ fait ce soir/);
  await page.locator(".tonight .rt-step").first().click();
  await expect(page.locator(".tn-foot")).toContainText(/1\/\d+ fait ce soir/);
  expectNoJsError(jsErrors);
});

test("restock : au moins un produit « bientôt fini » avec bouton Racheter", async ({ page, jsErrors }) => {
  await dismissCheckin(page);
  const cards = page.locator(".dash .prod");
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: /Racheter/i }).first()).toBeVisible();
  expectNoJsError(jsErrors);
});

test("le score réel et la courbe sont affichés", async ({ page, jsErrors }) => {
  await dismissCheckin(page);
  await expect(page.locator(".ch-num")).toContainText(/\d+/);
  await expect(page.locator(".ch-svg path").first()).toBeVisible();
  expectNoJsError(jsErrors);
});
