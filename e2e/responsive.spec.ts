import { test, expect, expectNoJsError } from "./fixtures";

/* Responsive : les pages clés rendent sans erreur ET sans débordement horizontal,
   en mobile (390px) comme en desktop (1280px). L'app doit être pleinement responsive
   (exigence produit), pas un mockup figé. */

const SIZES = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];
const PAGES: { path: string; sel: string }[] = [
  { path: "/", sel: ".cta-btn" },
  { path: "/login", sel: ".auth-oauth" },
  { path: "/checkout", sel: ".checkout" },
  { path: "/dashboard", sel: ".dash" },
  { path: "/resultats?demo=1", sel: ".results" },
];

for (const size of SIZES) {
  for (const p of PAGES) {
    test(`${size.name} — ${p.path} rend sans erreur ni débordement`, async ({ page, jsErrors }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto(p.path);
      await expect(page.locator(p.sel).first()).toBeVisible({ timeout: 30_000 });
      // pas de scroll horizontal (débordement de mise en page)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, "débordement horizontal (px)").toBeLessThanOrEqual(1);
      expectNoJsError(jsErrors);
    });
  }
}
