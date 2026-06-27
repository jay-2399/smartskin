import { describe, it, expect } from "vitest";
import { capWhy, capitalizeFirst } from "../to-routine-data";

const visibleLen = (s: string) => s.replace(/<[^>]+>/g, "").length;
const countTag = (s: string, tag: string) => (s.match(new RegExp(tag, "g")) ?? []).length;

describe("capWhy — plafond ~200 caractères, lecture rapide", () => {
  it("laisse un texte court intact", () => {
    const short = "Ton diagnostic a relevé <b>tes points noirs</b>. L'<b>acide salicylique</b> désincruste les pores.";
    expect(capWhy(short)).toBe(short);
  });

  it("coupe un texte trop long à une fin de phrase, sous 200 caractères visibles", () => {
    const long =
      "Ton diagnostic a relevé <b>tes points noirs</b> et <b>ta brillance</b>. " +
      "Son <b>acide salicylique</b> désincruste les pores et limite l'excès de sébum sans dessécher. " +
      "Utilise-le matin et soir pour préparer la peau aux actifs ciblés de ta routine au quotidien.";
    const out = capWhy(long);
    expect(visibleLen(out)).toBeLessThanOrEqual(200);
    expect(out.length).toBeLessThan(long.length);
    expect(/[.!?]$/.test(out.trim())).toBe(true); // se termine sur une phrase complète
  });

  it("ne casse jamais une balise <b> (HTML équilibré après coupe)", () => {
    const long =
      "Ton diagnostic a relevé <b>tes rougeurs</b>. Ce produit contient de la <b>niacinamide</b> apaisante. " +
      "Il renforce la <b>barrière cutanée</b> et unifie visiblement le teint au fil des semaines d'utilisation régulière.";
    const out = capWhy(long);
    expect(countTag(out, "<b>")).toBe(countTag(out, "</b>"));
  });

  it("garde au moins la première phrase même si elle dépasse la limite", () => {
    const oneLongSentence = "x".repeat(260) + ".";
    expect(capWhy(oneLongSentence)).toBe(oneLongSentence);
  });
});

describe("capitalizeFirst — majuscule sur la 1ʳᵉ lettre visible", () => {
  it("capitalise une lettre ouvrant une balise <b> (cas réel IA)", () => {
    expect(capitalizeFirst("<b>ta brillance</b> : il hydrate sans fini gras.")).toBe(
      "<b>Ta brillance</b> : il hydrate sans fini gras."
    );
  });

  it("capitalise un début en texte simple", () => {
    expect(capitalizeFirst("ton acide salicylique désincruste.")).toBe("Ton acide salicylique désincruste.");
  });

  it("laisse intact un texte déjà capitalisé", () => {
    const ok = "Recommandé pour <b>tes rougeurs</b>.";
    expect(capitalizeFirst(ok)).toBe(ok);
  });

  it("gère les accents (à → À)", () => {
    expect(capitalizeFirst("<b>à surveiller</b> de près.")).toBe("<b>À surveiller</b> de près.");
  });
});
