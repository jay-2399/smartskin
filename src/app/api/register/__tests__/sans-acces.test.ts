import { describe, it, expect, vi, beforeEach } from "vitest";

// UN COMPTE NEUF N'A JAMAIS L'ACCÈS, quoi que poste le client. Seul un achat le pose.
//
// Avant, la route écrivait `lifetimeAccess: !sansAcces` : le drapeau venait du CLIENT, donc
// une requête qui l'omettait — un simple curl — créait un compte premium à vie. Le second
// test ci-dessous échoue sur l'ancien code.
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

describe("register — l'inscription n'accorde jamais l'accès", () => {
  beforeEach(() => {
    findUnique.mockClear();
    create.mockClear();
  });

  it("inscription V2 (sansAcces:true) → compte créé SANS accès", async () => {
    const r = await POST(requete({ email: "v2@test.dev", password: "motdepasse", sansAcces: true }, "10.0.0.1"));
    expect(r.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ data: { lifetimeAccess: false } });
  });

  it("SANS le drapeau → toujours sans accès (le client ne décide plus)", async () => {
    const r = await POST(requete({ email: "v1@test.dev", password: "motdepasse" }, "10.0.0.2"));
    expect(r.status).toBe(200);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ data: { lifetimeAccess: false } });
  });

  it("drapeau forcé à false par un client hostile → toujours sans accès", async () => {
    const r = await POST(requete({ email: "x@test.dev", password: "motdepasse", sansAcces: false }, "10.0.0.3"));
    expect(r.status).toBe(200);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ data: { lifetimeAccess: false } });
  });
});
