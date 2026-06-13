import { describe, it, expect, vi, beforeEach } from "vitest";

const analyzeMock = vi.fn();
vi.mock("@/features/analysis/gemini", () => ({ analyzeWithGemini: analyzeMock }));

import { POST } from "@/app/api/analyze/route";

function req(body: object) {
  return new Request("http://x/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const payload = { answers: { q1: ["pores"] }, image: Buffer.from("x").toString("base64") };

describe("POST /api/analyze", () => {
  beforeEach(() => analyzeMock.mockReset());

  it("400 si answers ou image manquants", async () => {
    const res = await POST(req({ answers: { q1: [] } }));
    expect(res.status).toBe(400);
  });

  it("renvoie le bilan (200) — pas d'auth requise", async () => {
    analyzeMock.mockResolvedValue({ score: 84, photoQuality: { ok: true } });
    const res = await POST(req(payload));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ score: 84 });
  });

  it("photo inexploitable → 422", async () => {
    analyzeMock.mockResolvedValue({ photoQuality: { ok: false, issue: "blurry" } });
    const res = await POST(req(payload));
    expect(res.status).toBe(422);
  });
});
