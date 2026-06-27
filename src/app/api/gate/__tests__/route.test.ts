import { describe, it, expect, afterEach } from "vitest";
import { codeMatches, POST } from "../route";

describe("codeMatches", () => {
  it("bon code — insensible à la casse et aux espaces", () => {
    expect(codeMatches("glow5", "GLOW5")).toBe(true);
    expect(codeMatches(" g l o w 5 ", "GLOW5")).toBe(true);
  });
  it("mauvais code → false (vide inclus)", () => {
    expect(codeMatches("WRONG", "GLOW5")).toBe(false);
    expect(codeMatches("", "GLOW5")).toBe(false);
  });
  it("aucun code configuré → tout code NON vide passe (dev) ; vide → false", () => {
    expect(codeMatches("ABCDE", undefined)).toBe(true);
    expect(codeMatches("ABCDE", "")).toBe(true);
    expect(codeMatches("", undefined)).toBe(false);
  });
});

describe("POST /api/gate", () => {
  const orig = process.env.REVEAL_GATE_CODE;
  afterEach(() => { process.env.REVEAL_GATE_CODE = orig; });

  const post = async (body: unknown) =>
    (await POST(new Request("http://x/api/gate", { method: "POST", body: JSON.stringify(body) }))).json();

  it("ok:true pour le bon code", async () => {
    process.env.REVEAL_GATE_CODE = "GLOW5";
    expect(await post({ code: "glow5" })).toEqual({ ok: true });
  });
  it("ok:false pour un mauvais code", async () => {
    process.env.REVEAL_GATE_CODE = "GLOW5";
    expect(await post({ code: "NOPE9" })).toEqual({ ok: false });
  });
  it("corps non-JSON → ok:false, sans exception", async () => {
    process.env.REVEAL_GATE_CODE = "GLOW5";
    const res = await POST(new Request("http://x/api/gate", { method: "POST", body: "{bad" }));
    expect(await res.json()).toEqual({ ok: false });
  });
});
