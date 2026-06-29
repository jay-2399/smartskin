import { CONCERN_PHRASE } from "@/features/routine/actives";
import type { IconKey, Product, Step, RoutineData } from "@/features/routine/products";
import type { CatalogProduct, Category } from "./catalog";
import type { EngineProfile } from "./profile";

/* Adaptateur : traduit les produits du catalogue (CatalogProduct) + le placement
   matin/soir vers le contrat UI EXISTANT (RoutineData) consommé par storytelling.ts.
   Aucune logique de sélection ici — uniquement du formatage. */

const TAG = process.env.AMAZON_AFFILIATE_TAG || "smartskin-20";

const CAT_LABEL: Record<Category, string> = {
  nettoyant: "Cleanser", démaquillant: "Makeup remover", serum: "Serum", traitement: "Treatment",
  exfoliant: "Exfoliant", hydratant: "Moisturizer", spf: "Protection", masque: "Mask",
  contour_yeux: "Eye care", soin_cible: "Targeted care",
};

export const CAT_ICON: Record<Category, IconKey> = {
  nettoyant: "pump", démaquillant: "bottle", serum: "dropper", traitement: "dropper",
  exfoliant: "bottle", hydratant: "jar", spf: "pump", masque: "jar",
  contour_yeux: "dropper", soin_cible: "dropper",
};

const CAT_USE: Record<Category, string> = {
  nettoyant: "Massage onto damp skin ~30s, then rinse with lukewarm water.",
  démaquillant: "In the evening, massage onto dry skin to dissolve makeup and SPF, then rinse.",
  serum: "A few drops on clean skin, let it absorb before moisturizer.",
  traitement: "On clean skin, in a thin layer. Increase frequency as your tolerance allows.",
  exfoliant: "On dry skin after cleansing, do not rinse. Never with another acid the same night.",
  hydratant: "A pea-size amount to seal in hydration.",
  spf: "Last morning step, generously. Reapply after sun exposure.",
  masque: "On clean skin, leave on 10-15 min then rinse. Not the same night as the exfoliant.",
  contour_yeux: "Dab a small amount around the eye, without pulling the skin.",
  soin_cible: "As a local touch on the affected area, after the serum.",
};

// Libellé court d'une préoccupation pour les puces « diagnostic » du protocole.
const CHIP: Record<string, string> = {
  acne: "Blemishes", comedones: "Blackheads", pores: "Enlarged pores", shine: "Excess sebum",
  post_acne_marks: "Post-acne marks", texture: "Uneven texture", flaking: "Dryness",
  tone_evenness: "Uneven tone", radiance: "Dull complexion", dark_spots: "Dark spots", redness: "Redness",
  visible_vessels: "Vessels", fine_lines: "Fine lines", wrinkles: "Wrinkles",
  under_eye_circles: "Dark circles", under_eye_puffiness: "Puffiness",
};

function affiliateUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${TAG}`;
}

function priceLabel(price: number): string {
  return `$${price.toFixed(2).replace(/\.00$/, "")}`;
}

/** Traduit la fréquence catalogue en libellé lisible pour un moment donné. */
function frequencyToFr(frequency: string, moment: "matin" | "soir"): string {
  if (frequency === "3x/sem") return moment === "soir" ? "3 nights / week" : "3×/week";
  if (frequency === "1-2x/sem") return moment === "soir" ? "1-2 nights / week" : "1-2×/week";
  return moment === "soir" ? "Every evening" : "Every morning";
}

function freqLabel(key: string, moment: "am" | "pm", product: CatalogProduct): string {
  if (key === "exfoliant") return frequencyToFr(product.frequency, "soir");
  if (key === "masque") return "1×/week evening";
  return moment === "am" ? "Every morning" : "Every evening";
}

/** Libellé / icône / mode d'emploi d'une étape — y compris les 2 crèmes jour/nuit. */
function stepMeta(key: string): { cat: string; icon: IconKey; use: string } {
  if (key === "hydratant_jour") return { cat: "Day cream", icon: "jar", use: "Light texture in the morning, before SPF — non-greasy under makeup." };
  if (key === "hydratant_nuit") return { cat: "Night cream", icon: "jar", use: "Richer texture in the evening, to nourish and repair the barrier overnight." };
  const c = key as Category;
  return { cat: CAT_LABEL[c], icon: CAT_ICON[c], use: CAT_USE[c] };
}

/** « pourquoi » déterministe, HONNÊTE : ne cite une préoccupation que si elle est
 *  dans le bilan. Sert de repli (sans LLM) et pour les alternatives du deck. */
export function templateWhy(p: CatalogProduct, profile: EngineProfile): string {
  const hit = profile.concerns.find((c) => p.targets.includes(c));
  const phrase = hit ? CONCERN_PHRASE[hit] : null;
  const raw = p.couche3?.note?.trim();
  const note = raw ? ` ${raw.charAt(0).toUpperCase()}${raw.slice(1)}.` : "";
  const head = phrase
    ? `Recommended for <b>${phrase}</b> thanks to <b>${p.keyActives}</b>.`
    : `A foundation step suited to your ${profile.skinType} skin, with no harsh active.`;
  return `${head}${note}`;
}

/** Met une majuscule à la 1ʳᵉ lettre visible, même si elle ouvre une balise (ex.
 *  « <b>ta brillance</b>… » → « <b>Ta brillance</b>… »). L'IA démarre parfois en
 *  minuscule pour gagner des caractères. */
export function capitalizeFirst(html: string): string {
  return html.replace(/^((?:<[^>]+>|\s)*)([a-zà-ÿ])/iu, (_m, pre, ch) => pre + ch.toUpperCase());
}

/** Plafonne le « pourquoi » à ~200 caractères VISIBLES (lecture rapide), en coupant à
 *  une fin de phrase — jamais au milieu d'une balise <b> → HTML toujours équilibré. */
export function capWhy(html: string, max = 200): string {
  const visible = (s: string) => s.replace(/<[^>]+>/g, "").length;
  if (visible(html) <= max) return html;
  const sentences = html.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (out && visible(next) > max) break; // garde au moins la 1ʳᵉ phrase complète
    out = next;
  }
  return out || html;
}

function toUiProduct(p: CatalogProduct, profile: EngineProfile, llmWhy: Map<number, string>): Product {
  return {
    brand: p.brand,
    name: p.name,
    img: p.image, // jamais image_amazon (backup)
    price: priceLabel(p.price),
    p: p.price,
    why: capitalizeFirst(capWhy(llmWhy.get(p.num) ?? templateWhy(p, profile))),
    url: affiliateUrl(p.asin),
    targets: p.targets,
    actives: p.keyActives ? p.keyActives.split(/[\/,]/).map((s) => s.trim()).filter(Boolean) : [],
    unsafePregnancy: p.unsafePregnancy || undefined,
    unsafeSensitive: p.unsafeSensitive || undefined,
    // ── Champs restock (consommable) → le restock du dashboard suit la routine validée. ──
    asin: p.asin,
    size_ml: p.size_ml ?? null,
    frequency: p.frequency,
    moment: p.moment,
    category: p.category,
    // ── Avis (couche3) → carte du reveal. `p.reviews` = NOMBRE total ; `couche3.reviews` = liste. ──
    rating: p.rating,
    reviewCount: p.reviews,
    customersSay: p.couche3?.customers_say || undefined,
    aspects: Object.entries(p.couche3?.aspects ?? {}).slice(0, 6),
    reviews: (p.couche3?.reviews ?? []).slice(0, 5).map((r) => ({
      author: r.author || "Amazon Customer", rating: r.rating, verified: !!r.verified, date: r.date, text: r.text,
    })),
  };
}

function buildStep(
  key: string,
  moment: "am" | "pm",
  options: CatalogProduct[],
  profile: EngineProfile,
  llmWhy: Map<number, string>
): Step {
  const m = stepMeta(key);
  return {
    cat: m.cat,
    icon: m.icon,
    freq: freqLabel(key, moment, options[0]),
    use: m.use,
    options: options.map((p) => toUiProduct(p, profile, llmWhy)),
  };
}

/** Construit le RoutineData (deck + protocole) à partir des étapes ordonnées matin/soir.
 *  `dayKeys`/`nightKeys` : clés d'étape déjà ordonnées et filtrées (un produit = une carte ;
 *  exception `hydratant_jour`/`hydratant_nuit` = 2 crèmes distinctes). */
export function toRoutineData(args: {
  dayKeys: string[];
  nightKeys: string[];
  picks: Record<string, CatalogProduct[]>;
  profile: EngineProfile;
  llmWhy: Map<number, string>;
}): RoutineData {
  const { dayKeys, nightKeys, picks, profile, llmWhy } = args;

  const day: Step[] = dayKeys.map((k) => buildStep(k, "am", picks[k], profile, llmWhy));
  const night: Step[] = nightKeys.map((k) => buildStep(k, "pm", picks[k], profile, llmWhy));

  const diagnostic = profile.concerns.length
    ? [...new Set(profile.concerns.slice(0, 4).map((c) => CHIP[c] ?? c))]
    : ["Balanced skin"];

  return { day, night, diagnostic, productCount: day.length + night.length };
}
