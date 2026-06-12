import { describe, it, expect } from "vitest";
import { ping } from "@/lib/smoke";

describe("ping", () => {
  it("retourne pong", () => {
    expect(ping()).toBe("pong");
  });
});
