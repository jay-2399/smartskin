import { CONCERN_PHRASE } from "@/features/routine/actives";
import type { IconKey, Product, Step, RoutineData } from "@/features/routine/products";
import type { CatalogProduct, Category } from "./catalog";
import type { EngineProfile } from "./profile";

/* Adaptateur : traduit les produits du catalogue (CatalogProduct) + le placement
   matin/soir vers le contrat UI EXISTANT (RoutineData) consommé par storytelling.ts.
   Aucune logique de sélection ici — uniquement du formatage. */

const TAG = process.env.AMAZON_AFFILIATE_TAG || "smartskin-20";

const CAT_LABEL: Record<Category, string> = {
  nettoyant: "Nettoyant", démaquillant: "Démaquillant", serum: "Sérum", traitement: "Traitement",
  exfoliant: "Exfoliant", hydratant: "Hydratant", spf: "Protection", masque: "Masque",
  contour_yeux: "Contour des yeux", soin_cible: "Soin ciblé",
};

const CAT_ICON: Record<Category, IconKey> = {
  nettoyant: "pump", démaquillant: "bottle", serum: "dropper", traitement: "dropper",
  exfoliant: "bottle", hydratant: "jar", spf: "pump", masque: "jar",
  contour_yeux: "dropper", soin_cible: "dropper",
};

const CAT_USE: Record<Category, string> = {
  nettoyant: "Masse sur peau humide ~30 s, puis rince à l'eau tiède.",
  démaquillant: "Le soir, masse sur peau sèche pour dissoudre maquillage et SPF, puis rince.",
  serum: "Quelques gouttes sur peau propre, à faire pénétrer avant l'hydratant.",
  traitement: "Sur peau propre, en couche fine. Monte en fréquence selon ta tolérance.",
  exfoliant: "Sur peau sèche après nettoyage, ne pas rincer. Jamais avec un autre acide le même soir.",
  hydratant: "Une noisette pour sceller l'hydratation.",
  spf: "En dernière étape le matin, généreusement. À renouveler en cas d'exposition.",
  masque: "Sur peau propre, laisse poser 10-15 min puis rince. Pas le même soir que l'exfoliant.",
  contour_yeux: "Tapote une petite quantité autour de l'œil, sans tirer la peau.",
  soin_cible: "En touche locale sur la zone concernée, après le sérum.",
};

// Libellé court d'une préoccupation pour les puces « diagnostic » du protocole.
const CHIP: Record<string, string> = {
  acne: "Imperfections", comedones: "Points noirs", pores: "Pores dilatés", shine: "Excès de sébum",
  post_acne_marks: "Marques post-acné", texture: "Grain irrégulier", flaking: "Sécheresse",
  tone_evenness: "Teint irrégulier", radiance: "Teint terne", dark_spots: "Taches", redness: "Rougeurs",
  visible_vessels: "Vaisseaux", fine_lines: "Ridules", wrinkles: "Rides",
  under_eye_circles: "Cernes", under_eye_puffiness: "Poches",
};

function affiliateUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${TAG}`;
}

function priceLabel(price: number): string {
  return `$${price.toFixed(2).replace(/\.00$/, "")}`;
}

/** Traduit la fréquence catalogue en libellé lisible pour un moment donné. */
function frequencyToFr(frequency: string, moment: "matin" | "soir"): string {
  if (frequency === "3x/sem") return moment === "soir" ? "3 soirs / sem" : "3×/sem";
  if (frequency === "1-2x/sem") return moment === "soir" ? "1-2 soirs / sem" : "1-2×/sem";
  return moment === "soir" ? "Chaque soir" : "Chaque matin";
}

function freqLabel(key: string, moment: "am" | "pm", product: CatalogProduct): string {
  if (key === "exfoliant") return frequencyToFr(product.frequency, "soir");
  if (key === "masque") return "1×/sem le soir";
  return moment === "am" ? "Chaque matin" : "Chaque soir";
}

/** Libellé / icône / mode d'emploi d'une étape — y compris les 2 crèmes jour/nuit. */
function stepMeta(key: string): { cat: string; icon: IconKey; use: string } {
  if (key === "hydratant_jour") return { cat: "Crème jour", icon: "jar", use: "Texture légère le matin, avant le SPF — non grasse sous le maquillage." };
  if (key === "hydratant_nuit") return { cat: "Crème nuit", icon: "jar", use: "Texture plus riche le soir, pour nourrir et réparer la barrière pendant la nuit." };
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
    ? `Recommandé pour <b>${phrase}</b> grâce à <b>${p.keyActives}</b>.`
    : `Étape socle adaptée à ta peau ${profile.skinType}, sans actif agressif.`;
  return `${head}${note}`;
}

function toUiProduct(p: CatalogProduct, profile: EngineProfile, llmWhy: Map<number, string>): Product {
  return {
    brand: p.brand,
    name: p.name,
    img: p.image, // jamais image_amazon (backup)
    price: priceLabel(p.price),
    p: p.price,
    why: llmWhy.get(p.num) ?? templateWhy(p, profile),
    url: affiliateUrl(p.asin),
    targets: p.targets,
    actives: p.keyActives ? p.keyActives.split(/[\/,]/).map((s) => s.trim()).filter(Boolean) : [],
    unsafePregnancy: p.unsafePregnancy || undefined,
    unsafeSensitive: p.unsafeSensitive || undefined,
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
    : ["Peau équilibrée"];

  return { day, night, diagnostic, productCount: day.length + night.length };
}
