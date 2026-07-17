import { describe, it, expect } from "vitest";
import { rateLimit, clientIp } from "../rate-limit";

describe("rateLimit (fenêtre glissante)", () => {
  it("autorise jusqu'à la limite puis bloque", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k1", 3, 1000, t).ok).toBe(true);
    const blocked = rateLimit("k1", 3, 1000, t);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("réautorise une fois la fenêtre passée", () => {
    const t = 2_000_000;
    for (let i = 0; i < 3; i++) rateLimit("k2", 3, 1000, t);
    expect(rateLimit("k2", 3, 1000, t).ok).toBe(false);
    expect(rateLimit("k2", 3, 1000, t + 1001).ok).toBe(true);
  });

  it("isole les clés (une IP n'affecte pas une autre)", () => {
    const t = 3_000_000;
    for (let i = 0; i < 3; i++) rateLimit("kA", 3, 1000, t);
    expect(rateLimit("kA", 3, 1000, t).ok).toBe(false);
    expect(rateLimit("kB", 3, 1000, t).ok).toBe(true);
  });
});

describe("clientIp", () => {
  const req = (h: Record<string, string>) => new Request("http://x", { headers: h });
  it("prend la 1re IP de x-forwarded-for", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });
  it("retombe sur 'unknown' sans en-tête", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });
});
