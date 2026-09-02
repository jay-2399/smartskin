import { describe, it, expect, vi, beforeEach } from "vitest";

/* CETTE ROUTE ACCORDE L'ACCÈS PAYANT. Elle n'a le droit de le faire que pour un plan
   explicite et vendu.

   Deux défauts corrigés le 01/09, les deux reproduits ci-dessous sur l'ancien code :

   1. `.catch(() => ({ plan: "lifetime" }))` — un corps vide ou illisible donnait
      l'accès À VIE. Les deux appels sans corps étaient les restaurations ; elles
      passent désormais par l'entitlement StoreKit réel (/api/iap/sync).

   2. Un `else` attrape-tout : n'importe quelle chaîne inconnue tombait aussi sur
      « à vie ». Et « lifetime » lui-même n'est plus un plan vendu — le laisser
      passer gardait ouverte une route donnant un accès permanent et irréversible
      à qui postait le bon mot.

   Ce qui reste accordé ici : weekly (7 j) et annual (365 j), en baseline. La date
   d'expiration réelle d'Apple est posée juste après par /api/iap/sync. */

const { update } = vi.hoisted(() => ({ update: vi.fn(async (..._a: unknown[]) => ({})) }));
vi.mock("@/lib/db", () => ({ db: { user: { update } } }));
vi.mock("@/features/auth", () => ({ auth: async () => ({ user: { id: "u1" } }) }));

import { POST } from "@/app/api/iap/grant/route";

let ip = 0;
const appel = (body?: unknown) =>
  new Request("http://test/api/iap/grant", {
    method: "POST",
    // une IP par appel : la route est protégée par un rate-limit
    headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${++ip}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

/** Combien de jours d'accès la route vient-elle de poser ? */
function joursPoses(): number | null {
  const data = update.mock.calls[0]?.[0] as { data?: { accessUntil?: Date } } | undefined;
  if (!data?.data?.accessUntil) return null;
  return Math.round((data.data.accessUntil.getTime() - Date.now()) / 86_400_000);
}

describe("iap/grant — le plan doit être explicite et vendu", () => {
  beforeEach(() => update.mockClear());

  it("annual → 365 jours", async () => {
    expect((await POST(appel({ plan: "annual" }))).status).toBe(200);
    expect(joursPoses()).toBe(365);
  });

  it("weekly → 7 jours", async () => {
    expect((await POST(appel({ plan: "weekly" }))).status).toBe(200);
    expect(joursPoses()).toBe(7);
  });

  it("corps VIDE → refus, aucun accès posé", async () => {
    expect((await POST(appel())).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("plan inconnu → refus, aucun accès posé", async () => {
    expect((await POST(appel({ plan: "pizza" }))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("« lifetime » n'est plus vendu → refus, et surtout AUCUN accès permanent", async () => {
    expect((await POST(appel({ plan: "lifetime" }))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("aucun appel ne pose jamais lifetimeAccess", async () => {
    for (const p of [{ plan: "annual" }, { plan: "weekly" }, { plan: "lifetime" }, {}]) {
      update.mockClear();
      await POST(appel(p));
      for (const call of update.mock.calls) {
        expect((call[0] as { data?: Record<string, unknown> })?.data).not.toHaveProperty("lifetimeAccess");
      }
    }
  });
});
