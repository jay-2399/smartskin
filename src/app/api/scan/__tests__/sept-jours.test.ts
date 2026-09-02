import { describe, it, expect, vi, beforeEach } from "vitest";

/* UN BILAN TOUS LES 7 JOURS — la règle tient au SERVEUR.
   Avant, /api/scan enregistrait un bilan à chaque appel : le dashboard affichait
   « Next face scan in 5 days » mais laissait scanner quand même (constaté le 02/09). */

const JOUR = 86400000;
const { findFirst, create } = vi.hoisted(() => ({
  findFirst: vi.fn(async (..._a: unknown[]): Promise<{ createdAt: Date } | null> => null),
  create: vi.fn(async (..._a: unknown[]) => ({})),
}));
vi.mock("@/lib/db", () => ({ db: { analysis: { findFirst, create } } }));
vi.mock("@/features/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));
vi.mock("@/lib/rate-limit", () => ({ writeRateLimit: () => ({ ok: true }) }));
vi.mock("@/lib/scan/profil-utilisateur", () => ({ oublierProfil: vi.fn() }));

import { POST } from "@/app/api/scan/route";

const requete = () =>
  new Request("http://test/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ result: { score: 72 }, answers: {}, photo: null }),
  });

describe("/api/scan — un bilan tous les 7 jours", () => {
  beforeEach(() => { findFirst.mockReset(); findFirst.mockResolvedValue(null); create.mockClear(); });

  it("premier bilan → enregistré", async () => {
    const r = await POST(requete());
    expect(r.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("bilan il y a 3 jours → 409 trop_tot, rien d'enregistré, la date du prochain est annoncée", async () => {
    const dernier = new Date(Date.now() - 3 * JOUR);
    findFirst.mockResolvedValue({ createdAt: dernier });
    const r = await POST(requete());
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ error: "trop_tot", prochainScan: new Date(dernier.getTime() + 7 * JOUR).toISOString() });
    expect(create).not.toHaveBeenCalled();
  });

  it("bilan il y a 7 jours → enregistré", async () => {
    findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 7 * JOUR) });
    const r = await POST(requete());
    expect(r.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
