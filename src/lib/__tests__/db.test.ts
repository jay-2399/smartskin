import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("db", () => {
  it("expose les modèles attendus", () => {
    expect(db).toHaveProperty("user");
    expect(db).toHaveProperty("analysis");
    expect(db).toHaveProperty("captureMetric");
  });
});
