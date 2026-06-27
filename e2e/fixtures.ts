import { test as base, expect, type Page } from "@playwright/test";

/* Fixture partagée : collecte les exceptions JS non gérées de la page (le signal de
   bug le plus fort). Chaque test peut asserter `expectNoJsError(jsErrors)`. */
export const test = base.extend<{ jsErrors: string[] }>({
  jsErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await use(errors);
  },
});

export { expect };

export const expectNoJsError = (errors: string[]) =>
  expect(errors, `Erreurs JS:\n${errors.join("\n")}`).toHaveLength(0);

// Ferme la modale de check-in du dashboard (sinon son scrim bloque les clics).
export async function dismissCheckin(page: Page) {
  const skip = page.locator(".ci-skip");
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expect(page.locator(".dash .ci-modal.hidden")).toHaveCount(1);
}
