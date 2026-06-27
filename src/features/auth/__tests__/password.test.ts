import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/features/auth/password";

describe("password (bcrypt)", () => {
  it("hash ≠ mot de passe clair, et se vérifie", async () => {
    const hash = await hashPassword("s3cretPass!");
    expect(hash).not.toBe("s3cretPass!");
    expect(hash.length).toBeGreaterThan(20);
    expect(await verifyPassword("s3cretPass!", hash)).toBe(true);
  });

  it("rejette un mauvais mot de passe", async () => {
    const hash = await hashPassword("s3cretPass!");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("deux hash du même mot de passe diffèrent (sel)", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
});
