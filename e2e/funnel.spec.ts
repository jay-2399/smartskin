import { test, expect, expectNoJsError } from "./fixtures";

/* Questionnaire : validation de l'âge (bouton bloqué tant que la saisie est invalide)
   et sélection des options (q1, multi-choix). */

test("âge : le bouton reste bloqué tant que la saisie est invalide", async ({ page, jsErrors }) => {
  await page.goto("/questions/age");
  const cta = page.locator(".cta-btn");
  await page.locator(".age-input").fill("5"); // hors plage (13–99)
  await expect(cta).toBeDisabled();
  await page.locator(".age-input").fill("30");
  await expect(cta).toBeEnabled();
  await cta.click();
  await expect(page).not.toHaveURL(/\/questions\/age/);
  expectNoJsError(jsErrors);
});

test("q1 : sélectionner une option active le bouton et le compteur", async ({ page, jsErrors }) => {
  await page.goto("/questions/q1");
  const options = page.locator(".opt");
  expect(await options.count()).toBeGreaterThan(0);
  await expect(page.locator(".cta-btn")).toBeDisabled(); // rien de sélectionné
  await options.first().click();
  await expect(options.first()).toHaveClass(/sel/);
  await expect(page.locator(".cta-btn")).toBeEnabled();
  await expect(page.locator(".counter b")).toContainText("1");
  expectNoJsError(jsErrors);
});

test("q1 : le maximum de choix est respecté (options en trop grisées)", async ({ page, jsErrors }) => {
  await page.goto("/questions/q1");
  const max = Number((await page.locator(".counter").textContent())?.match(/\/(\d+)/)?.[1] ?? "3");
  const options = page.locator(".opt:not(.gate)");
  const n = await options.count();
  // sélectionne jusqu'au max (en évitant une éventuelle option exclusive)
  for (let i = 0; i < Math.min(max, n); i++) await options.nth(i).click();
  await expect(page.locator(".counter b")).toContainText(String(Math.min(max, n)));
  // si plus d'options que le max → les non-sélectionnées sont grisées (dim)
  if (n > max) await expect(page.locator(".opt.dim").first()).toBeVisible();
  expectNoJsError(jsErrors);
});
