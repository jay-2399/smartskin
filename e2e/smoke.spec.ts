import { test as base, expect, type Page } from "@playwright/test";

/* Salve E2E « smoke » — rejoue les parcours critiques dans un vrai Chromium et
   échoue dès qu'une page jette une erreur JavaScript (uncaught) — le signal de bug
   le plus fort. Le login Google réel n'est PAS testable (Google bloque les robots) ;
   on couvre tout le reste : funnel, démo reveal/routine, checkout, login, dashboard, gate. */

// Fixture : collecte les exceptions JS non gérées de la page.
const test = base.extend<{ jsErrors: string[] }>({
  jsErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await use(errors);
  },
});

// Helper : aucune erreur JS non gérée.
const expectNoJsError = (errors: string[]) =>
  expect(errors, `Erreurs JS:\n${errors.join("\n")}`).toHaveLength(0);

// Helper : l'overlay d'erreur Next.js (dev) ne doit pas être présent.
async function expectNoNextError(page: Page) {
  await expect(
    page.getByText(/Unhandled Runtime Error|Build Error|Failed to compile/i)
  ).toHaveCount(0);
}

test("landing s'affiche et démarre le funnel", async ({ page, jsErrors }) => {
  await page.goto("/");
  await expect(page.locator(".cta-btn")).toBeVisible();
  await page.locator(".cta-btn").click();
  await expect(page).toHaveURL(/\/questions\/age/);
  await expect(page.locator(".age-input")).toBeVisible();
  await expectNoNextError(page);
  expectNoJsError(jsErrors);
});

test("question âge → étape suivante", async ({ page, jsErrors }) => {
  await page.goto("/questions/age");
  await page.locator(".age-input").fill("30");
  const cta = page.locator(".cta-btn");
  await expect(cta).toBeEnabled();
  await cta.click();
  await expect(page).not.toHaveURL(/\/questions\/age/);
  expectNoJsError(jsErrors);
});

test("login est passwordless (Google + lien magique, pas de mot de passe)", async ({ page, jsErrors }) => {
  await page.goto("/login");
  await expect(page.locator(".auth-oauth")).toContainText(/Google/i);
  await expect(page.locator(".auth-magic")).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expectNoNextError(page);
  expectNoJsError(jsErrors);
});

test("checkout : « Unlock » déclenche le paiement Stripe", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.locator(".checkout")).toBeVisible();
  // le bouton appelle bien /api/checkout (on ne lit pas la réponse : la page part vers Stripe)
  const [req] = await Promise.all([
    page.waitForRequest((r) => r.url().includes("/api/checkout") && r.method() === "POST"),
    page.getByRole("button", { name: /unlock my protocol/i }).click(),
  ]);
  expect(req).toBeTruthy();
});

test("/api/checkout crée une session Stripe (page de paiement)", async ({ request }) => {
  const resp = await request.post("/api/checkout");
  expect(resp.ok()).toBeTruthy();
  const data = await resp.json();
  expect(data.url).toContain("checkout.stripe.com");
});

test("démo : reveal résultats s'affiche", async ({ page, jsErrors }) => {
  await page.goto("/resultats?demo=1");
  await expect(page.locator(".results")).toBeVisible();
  await expectNoNextError(page);
  expectNoJsError(jsErrors);
});

test("code-gate viral s'affiche sans erreur d'hydratation", async ({ page, jsErrors }) => {
  // ?demo=1&gate=1 : contenu de démo derrière + gate forcé (non bypassé)
  await page.goto("/resultats?demo=1&gate=1");
  await expect(page.locator(".codegate")).toBeVisible();
  await expect(page.locator(".cg-cell")).toHaveCount(5);
  await expectNoNextError(page);
  expectNoJsError(jsErrors);
});

test("démo : routine se construit avec de vrais produits", async ({ page, jsErrors }) => {
  await page.goto("/routine?demo=1");
  // la routine est calculée côté serveur (catalogue) → on attend la vue finale
  await expect(page.locator(".routine-v2")).toBeVisible({ timeout: 30_000 });
  await expectNoNextError(page);
  expectNoJsError(jsErrors);
});

test("dashboard s'affiche (gate désactivé en dev)", async ({ page, jsErrors }) => {
  await page.goto("/dashboard");
  await expect(page.locator(".dash")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".dash .hello")).toContainText(/Bonjour/i);
  await expectNoNextError(page);
  expectNoJsError(jsErrors);
});

test("paywall : /routine sans démo ni session → redirige vers checkout", async ({ page }) => {
  await page.goto("/routine");
  await expect(page).toHaveURL(/\/checkout/);
});
