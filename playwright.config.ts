import { defineConfig, devices } from "@playwright/test";

/* Tests E2E (navigateur réel) — séparés des tests unitaires Vitest (qui ne scannent
   que src/). On rejoue les parcours critiques pour débusquer les bugs/régressions.
   Réutilise le serveur de dev déjà lancé sur :3000 (sinon le démarre). */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
