import { describe, it, expect, beforeEach } from "vitest";
import { useFunnel } from "@/features/funnel/store";

describe("useFunnel store", () => {
  beforeEach(() => useFunnel.getState().reset());

  it("démarre vide", () => {
    expect(useFunnel.getState().answers.q1).toEqual([]);
    expect(useFunnel.getState().photo).toBeNull();
  });

  it("setSingle écrit une réponse single", () => {
    useFunnel.getState().setSingle("q4", "daily");
    expect(useFunnel.getState().answers.q4).toBe("daily");
  });

  it("toggleMulti ajoute/retire une valeur multi", () => {
    useFunnel.getState().toggleMulti("q2", "fragrance", false);
    expect(useFunnel.getState().answers.q2).toEqual(["fragrance"]);
  });

  it("toggleMulti respecte le max 3 de q1", () => {
    const s = useFunnel.getState();
    s.toggleMulti("q1", "hydration", false);
    s.toggleMulti("q1", "radiance", false);
    s.toggleMulti("q1", "pores", false);
    s.toggleMulti("q1", "texture", false);
    expect(useFunnel.getState().answers.q1).toEqual(["hydration", "radiance", "pores"]);
  });

  it("setGate('non') vide les symptômes", () => {
    useFunnel.getState().setGate(true);
    useFunnel.getState().toggleSymptom("dry");
    expect(useFunnel.getState().answers.q5.symptoms).toEqual(["dry"]);
    useFunnel.getState().setGate(false);
    expect(useFunnel.getState().answers.q5).toEqual({ changed: false, symptoms: [] });
  });

  it("setPhoto stocke un Blob, reset le vide", () => {
    const blob = new Blob(["x"], { type: "image/jpeg" });
    useFunnel.getState().setPhoto(blob);
    expect(useFunnel.getState().photo).toBe(blob);
    useFunnel.getState().reset();
    expect(useFunnel.getState().photo).toBeNull();
  });
});
