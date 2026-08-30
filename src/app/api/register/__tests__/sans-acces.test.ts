import { describe, it, expect, vi, beforeEach } from "vitest";

// L'inscription V2 (compte AVANT paywall) ne doit PAS offrir l'accès : `sansAcces: true`
// crée le compte avec lifetimeAccess=false. Sans le flag, comportement V1 (checkout) intact.
const { findUnique, create } = vi.hoisted(() => ({
  findUnique: vi.fn(async (..._a: unknown[]) => null),
  create: vi.fn(async (..._a: unknown[]) => ({})),
}));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique, create } } }));

import { POST } from "@/app/api/register/route";

const requete = (body: unknown, ip: string) =>
  new Request("http://test/api/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

describe("register — flag sansAcces", () => {
  beforeEach(() => {
    findUnique.mockClear();
    create.mockClear();
  });

  it("sansAcces:true → compte créé SANS lifetimeAccess", async () => {
    const r = await POST(requete({ email: "v2@test.dev", password: "motdepasse", sansAcces: true }, "10.0.0.1"));
    expect(r.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ data: { lifetimeAccess: false } });
  });

  it("sans le flag → comportement V1 intact (lifetimeAccess: true)", async () => {
    const r = await POST(requete({ email: "v1@test.dev", password: "motdepasse" }, "10.0.0.2"));
    expect(r.status).toBe(200);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ data: { lifetimeAccess: true } });
  });
});
