import { describe, it, expect } from "vitest";
import { JOURS_ENTRE_SCANS, peutScanner, prochainScan } from "@/lib/scan/cadence";

const JOUR = 86400000;
const t0 = new Date("2026-09-02T10:00:00Z");

describe("cadence du scan visage — un bilan tous les 7 jours", () => {
  it("la règle est bien de 7 jours", () => expect(JOURS_ENTRE_SCANS).toBe(7));
  it("jamais scanné → oui", () => expect(peutScanner(null, t0)).toBe(true));
  it("scanné il y a 3 jours → non", () => expect(peutScanner(new Date(t0.getTime() - 3 * JOUR), t0)).toBe(false));
  it("scanné il y a 7 jours pile → oui", () => expect(peutScanner(new Date(t0.getTime() - 7 * JOUR), t0)).toBe(true));
  it("la date annoncée est le bilan + 7 jours", () =>
    expect(prochainScan(t0).toISOString()).toBe("2026-09-09T10:00:00.000Z"));
});
