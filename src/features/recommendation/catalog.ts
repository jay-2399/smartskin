import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

/* Catalogue produit (140 fiches Amazon affiliées) — entrée n°1 du moteur de reco.
   Source : data/catalog-final.json (3 couches : commerciale + dermato + avis digérés).
   Chargé CÔTÉ SERVEUR uniquement (lecture disque, jamais expédié au navigateur).
   Cf. docs/moteur-reco-implementation.md §2. */

export type SkinTypeKey = "grasse" | "seche" | "mixte" | "sensible" | "normale";
export const SKIN_TYPES: SkinTypeKey[] = ["grasse", "seche", "mixte", "sensible", "normale"];

export type ByProfileVerdict = "positive" | "caution" | "negative" | "unknown";

export type Category =
  | "nettoyant" | "démaquillant" | "hydratant" | "spf" | "serum"
  | "exfoliant" | "traitement" | "masque" | "contour_yeux" | "soin_cible";
export const CATEGORIES: Category[] = [
  "nettoyant", "démaquillant", "hydratant", "spf", "serum",
  "exfoliant", "traitement", "masque", "contour_yeux", "soin_cible",
];

export interface Couche3 {
  sentiment: number;
  byProfile: Partial<Record<SkinTypeKey, ByProfileVerdict>>;
  note?: string;
  customers_say?: string;
  aspects?: Record<string, string>;
  quotes?: string[];
}

export interface CatalogProduct {
  num: number;
  asin: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  rating: number;
  reviews: number;
  bsr?: number | null;
  bought?: string | null;
  keyActives: string;
  targets: string[];
  skinTypes: string[];
  moment: "am" | "pm" | "both";
  night?: boolean | null; // crème de nuit dédiée (catégorie hydratant) — cf. splitCreams
  frequency: string;
  unsafePregnancy: boolean;
  unsafeSensitive: boolean;
  irritationCost: number;
  activeStrength?: number | null;
  evidenceLevel: number;
  fragranceFree?: boolean | null;
  alcoholFree?: boolean | null;
  ingredients?: string | null;
  image: string;
  image_amazon?: string;
  couche3?: Couche3 | null;
}

/* Schéma zod PERMISSIF : le catalogue est figé et sous notre contrôle, on valide
   en garde-fou (détecter une corruption au chargement), sans rejeter sur un `null`
   attendu. `.passthrough()` conserve les champs non listés. */
const ProductSchema = z
  .object({
    num: z.number(),
    asin: z.string(),
    name: z.string(),
    brand: z.string(),
    category: z.string(),
    price: z.number(),
    rating: z.number(),
    reviews: z.number(),
    keyActives: z.string().nullish(),
    targets: z.array(z.string()).nullish(),
    moment: z.string().nullish(),
    frequency: z.string().nullish(),
    unsafePregnancy: z.boolean().nullish(),
    unsafeSensitive: z.boolean().nullish(),
    irritationCost: z.number().nullish(),
    evidenceLevel: z.number().nullish(),
    image: z.string().nullish(),
  })
  .passthrough();

const CatalogSchema = z.array(ProductSchema).min(1);

let cache: CatalogProduct[] | null = null;

/** Charge (et met en cache) le catalogue depuis le disque. Serveur uniquement. */
export function loadCatalog(): CatalogProduct[] {
  if (cache) return cache;
  const raw = readFileSync(join(process.cwd(), "data", "catalog-final.json"), "utf8");
  const parsed = CatalogSchema.parse(JSON.parse(raw));
  // Normalise les champs sécurité/coût absents en valeurs sûres par défaut.
  cache = parsed.map((p) => ({
    ...p,
    targets: p.targets ?? [],
    keyActives: p.keyActives ?? "",
    unsafePregnancy: p.unsafePregnancy ?? false,
    unsafeSensitive: p.unsafeSensitive ?? false,
    irritationCost: p.irritationCost ?? 0,
    evidenceLevel: p.evidenceLevel ?? 1,
  })) as unknown as CatalogProduct[];
  return cache;
}

/** Regroupe le catalogue par catégorie (lookup O(1) par le moteur). */
export function catalogByCategory(catalog: CatalogProduct[]): Record<Category, CatalogProduct[]> {
  const out = Object.fromEntries(CATEGORIES.map((c) => [c, [] as CatalogProduct[]])) as Record<Category, CatalogProduct[]>;
  for (const p of catalog) if (out[p.category as Category]) out[p.category as Category].push(p);
  return out;
}
