import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  AUTH_SECRET: "x".repeat(32),
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  RESEND_API_KEY: "re_test",
  GOOGLE_CLOUD_PROJECT: "ss-app",
  GOOGLE_CLOUD_LOCATION: "europe-west1",
};

describe("parseEnv", () => {
  it("accepte un environnement valide", () => {
    expect(() => parseEnv(valid)).not.toThrow();
  });

  it("rejette une DATABASE_URL absente", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omission volontaire de la clé
    const { DATABASE_URL, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow();
  });

  it("rejette un AUTH_SECRET trop court", () => {
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "court" })).toThrow();
  });
});
