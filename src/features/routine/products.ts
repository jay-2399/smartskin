/* Routine v2 product catalog (« storytelling »).
   Extracted from storytelling.ts to be reusable by the personalized selector
   (personalize.ts). Each product is TAGGED:
   - `targets`: concern ids (cf. analysis/attributes.ts) it addresses;
   - `actives`: key actives (used for filtering / consistency with recommend.ts);
   - `unsafePregnancy` / `unsafeSensitive`: safety exclusions (q7).
   The « why » (marketing) texts are kept: a product is only shown when its
   `targets` match the assessment, so its rationale stays relevant. */

export type IconKey = "pump" | "dropper" | "jar" | "bottle";
export type TabKey = "day" | "night";

export interface Review {
  author: string;
  rating: number;
  verified: boolean;
  date: string;
  text: string;
}
export interface Product {
  brand: string;
  name: string;
  img?: string;
  price: string;
  p: number;
  why: string;
  url: string;
  freq?: string;
  targets: string[];
  actives: string[];
  unsafePregnancy?: boolean;
  unsafeSensitive?: boolean;
  // ── Restock fields (consumable): carried by the product so the dashboard restock
  //    follows the routine VALIDATED on swipe (not a recomputed routine). ──
  asin?: string;
  size_ml?: number | null;
  frequency?: string;
  moment?: string;
  category?: string;
  // ── Customer reviews (reveal card) — fed by catalog layer 3 ──
  rating?: number; // average rating /5 (e.g. 4.8)
  reviewCount?: number; // total number of reviews (e.g. 102671)
  customersSay?: string; // AI summary of the reviews
  aspects?: [string, string][]; // [["Effectiveness","2.7K"], …] — top 6, pre-formatted
  reviews?: Review[]; // 0 to 5 verified reviews
}
export interface Step {
  cat: string;
  icon: IconKey;
  freq: string;
  use: string;
  options: Product[];
}
export interface RoutineData {
  day: Step[];
  night: Step[];
  diagnostic: string[];
  productCount: number;
}

/* Restock data for a chosen product (routine consumable): everything the dashboard
   needs to estimate « out in ~X days » with the real formula. */
export interface RestockItem {
  name: string;
  asin: string;
  icon: IconKey;
  img?: string;
  category: string;
  frequency: string;
  moment: string;
  size_ml: number;
}

/* Cleanser — oily / blemish-prone skin (rinse-off BHA = pregnancy-safe). */
export const CLEANSER: Product[] = [
  { brand: "La Roche-Posay", name: "Effaclar Gel Cleanser", img: "/prod-effaclar.png", price: "$18.99", p: 19, targets: ["acne", "comedones", "pores", "shine"], actives: ["salicylic_acid"], unsafeSensitive: true, why: "Your analysis flagged <b>excess sebum</b> and <b>blemishes</b> on the T-zone. This gel cleans deeply thanks to <b>2% salicylic acid</b>, which dissolves embedded sebum and unclogs pores without harshness. Used morning and evening, it primes the skin for your routine's targeted actives and limits new blemishes.", url: "https://www.laroche-posay.us/our-products/face/acne-products/effaclar-medicated-acne-face-wash-effaclaracnewash.html" },
  { brand: "CeraVe", name: "Foaming Cleanser", price: "$15", p: 15, targets: ["acne", "comedones", "pores", "shine"], actives: ["niacinamide"], why: "A gentler alternative if your skin tends to feel tight. Its <b>niacinamide</b> and <b>ceramides</b> remove the <b>excess sebum</b> flagged by your analysis while strengthening the <b>skin barrier</b>. A good efficacy/tolerance balance for daily use.", url: "https://www.cerave.com/skincare/cleansers/foaming-facial-cleanser" },
  { brand: "Avène", name: "Cleanance Cleansing Gel", price: "$17", p: 17, targets: ["acne", "comedones", "pores", "shine"], actives: [], why: "Designed for <b>oily, blemish-prone skin</b> as your analysis indicates. This gel purifies and mattifies the T-zone and targets <b>excess sebum</b> without stripping, all dermatologist-tested.", url: "https://www.aveneusa.com" },
  { brand: "The Inkey List", name: "Salicylic Acid Cleanser", price: "$11", p: 11, targets: ["acne", "comedones", "pores"], actives: ["salicylic_acid"], unsafeSensitive: true, why: "Same logic as the recommended product, at a tiny price. The <b>2% salicylic acid</b> and <b>zinc</b> clear the pores and target the <b>blackheads</b> spotted in your analysis.", url: "https://www.theinkeylist.com" },
];
const CLEANSER_GENTLE: Product = { brand: "CeraVe", name: "Hydrating Cleanser", price: "$16", p: 16, targets: [], actives: [], why: "A gentle, non-foaming cleanser that removes the day's impurities and sebum without stripping the <b>skin barrier</b>. It suits all skin types and primes the skin for the next steps.", url: "https://www.cerave.com" };

/* Niacinamide serum — sebum, pores, redness, marks. */
export const SERUM_NIA: Product[] = [
  { brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", img: "/prod-niacinamide.png", price: "~$6.50", p: 6.5, targets: ["shine", "pores", "redness", "post_acne_marks", "tone_evenness"], actives: ["niacinamide"], why: "Your analysis points to abundant <b>sebum</b> and visible <b>pores</b>. <b>10% niacinamide</b> regulates sebum production while <b>zinc</b> calms blemishes. Within a few weeks, the skin texture refines and marks fade. Apply in the morning before moisturizer to mattify the day.", url: "https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html" },
  { brand: "Naturium", name: "Niacinamide Serum 12%", price: "$16", p: 16, targets: ["shine", "pores", "tone_evenness"], actives: ["niacinamide"], why: "A more concentrated version for the same needs. <b>12% niacinamide</b> tightens the <b>pores</b> identified in your analysis and evens the tone, in a fluid, non-sticky texture.", url: "https://naturium.com" },
  { brand: "Paula's Choice", name: "10% Niacinamide Booster", price: "$49", p: 49, targets: ["pores", "shine"], actives: ["niacinamide"], why: "A premium booster very targeted on the enlarged <b>pores</b> and uneven texture in your analysis. <b>10% niacinamide</b> refines the skin in a silky base, to mix into your serum or moisturizer.", url: "https://www.paulaschoice.com" },
  { brand: "Good Molecules", name: "Niacinamide Serum", price: "$12", p: 12, targets: ["shine", "pores"], actives: ["niacinamide"], why: "The essentials at the fairest price. A simple, effective <b>niacinamide</b> that regulates the <b>excess sebum</b> flagged by your analysis, ideal to start without breaking the bank.", url: "https://goodmolecules.com" },
];

/* Hydrating serum — dehydration, radiance. */
export const SERUM_HYDRA: Product[] = [
  { brand: "Typology", name: "Hyaluronic Acid Serum", img: "/prod-typology.png", price: "~$30", p: 30, targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "Even oily skin lacks water: your analysis reveals <b>dehydration</b> under the excess sebum. <b>Hyaluronic acid</b> plumps and <b>vitamin B5</b> soothes, in a light, <b>non-greasy</b> texture that doesn't clog pores. It rebalances the skin and limits the sebum rebound caused by dryness.", url: "https://us.typology.com/products/hyaluronic-acid" },
  { brand: "The Ordinary", name: "Hyaluronic Acid 2% + B5", price: "$9", p: 9, targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "The same hydrating benefit at a tiny price. Multi-weight <b>hyaluronic acid</b> and <b>B5</b> plump the <b>dehydration</b> noted in your analysis, in a light texture suited to combination-to-oily skin.", url: "https://theordinary.com" },
  { brand: "La Roche-Posay", name: "Hyalu B5 Serum", price: "$40", p: 40, targets: ["flaking", "radiance", "redness"], actives: ["hyaluronic_acid"], why: "More repairing, if your analysis also shows <b>sensitized areas</b>. <b>Hyaluronic acid</b>, <b>vitamin B5</b> and madecassoside plump and repair fragile skin.", url: "https://www.laroche-posay.us" },
  { brand: "Vichy", name: "Minéral 89 Booster", price: "$30", p: 30, targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "A fortifying booster: <b>hyaluronic acid</b> and volcanic water strengthen the <b>skin barrier</b> and intensely hydrate the dehydrated skin spotted in your analysis.", url: "https://www.vichyusa.com" },
];

/* Cream — final hydration, non-comedogenic. */
export const CREAM: Product[] = [
  { brand: "Dr. Althea", name: "345 Relief Cream", img: "/prod-dralthea.png", price: "$24–27", p: 25, targets: ["flaking", "post_acne_marks", "redness"], actives: ["moisturizer"], why: "To seal in hydration without restarting the <b>sebum</b> flagged by your analysis. This <b>non-comedogenic</b> cream hydrates and <b>soothes</b> the <b>post-acne</b> and sensitive areas without leaving a greasy film. It closes your morning routine and keeps the skin comfortable all day.", url: "https://www.ulta.com/p/345-relief-cream-pimprod2056740" },
  { brand: "CeraVe", name: "Moisturizing Cream", price: "$17", p: 17, targets: ["flaking"], actives: ["moisturizer"], why: "Rich in <b>ceramides</b> and <b>hyaluronic acid</b>, it restores the <b>skin barrier</b> without triggering comedones — suited to the sensitized areas identified in your analysis.", url: "https://www.cerave.com" },
  { brand: "La Roche-Posay", name: "Toleriane Double Repair", price: "$21", p: 21, targets: ["flaking", "redness"], actives: ["moisturizer"], why: "<b>Ceramides</b> and niacinamide to soothe and repair, daily, the reactive skin noted in your analysis, without overloading the pores.", url: "https://www.laroche-posay.us" },
  { brand: "Avène", name: "Tolerance Control Cream", price: "$32", p: 32, targets: ["redness", "flaking"], actives: ["moisturizer"], why: "A minimalist, soothing formula: it calms the <b>redness</b> and discomfort of the sensitive areas flagged by your analysis, ideal for reactive skin.", url: "https://www.aveneusa.com" },
];

/* BHA exfoliant (leave-on) — pores, blackheads. Not advised in pregnancy / reactive skin. */
export const EXFO: Product[] = [
  { brand: "Paula's Choice", name: "Skin Perfecting 2% BHA", img: "/prod-paula.png", price: "$37", p: 37, freq: "2-3×/week", targets: ["acne", "comedones", "pores"], actives: ["salicylic_acid"], unsafePregnancy: true, unsafeSensitive: true, why: "Your analysis reveals <b>clogged pores</b> and <b>blackheads</b>. This <b>salicylic acid (BHA)</b> exfoliant penetrates the pore to dissolve sebum and impurities, smooths the texture and prevents blemishes. Use 2-3 evenings a week, never with other strong actives.", url: "https://www.paulaschoice.com/skin-perfecting-2pct-bha-liquid-exfoliant/201-2010.html" },
  { brand: "The Ordinary", name: "Salicylic Acid 2% Solution", price: "$9", freq: "2-3×/week", p: 9, targets: ["acne", "comedones", "pores"], actives: ["salicylic_acid"], unsafePregnancy: true, unsafeSensitive: true, why: "The same active at a tiny price. <b>2% salicylic acid</b> targets the <b>clogged pores</b> and <b>blackheads</b> in your analysis, 2-3 times a week.", url: "https://theordinary.com" },
  { brand: "COSRX", name: "BHA Blackhead Power Liquid", price: "$25", freq: "evening", p: 25, targets: ["comedones", "pores"], actives: ["salicylic_acid"], unsafePregnancy: true, unsafeSensitive: true, why: "Gentler to start exfoliating. <b>BHA</b> combined with white willow loosens the <b>blackheads</b> spotted in your analysis while respecting the skin.", url: "https://www.cosrx.com" },
  { brand: "COSRX", name: "AHA/BHA Clarifying Toner", price: "$19", freq: "2-3×/week", p: 19, targets: ["pores", "texture"], actives: ["salicylic_acid", "aha"], unsafePregnancy: true, unsafeSensitive: true, why: "A light <b>AHA/BHA</b> exfoliation for maintenance: it refines the texture and unclogs the <b>pores</b> noted in your analysis, gently.", url: "https://www.cosrx.com" },
];

/* Sunscreen — essential daytime step (#1 anti-spot / anti-aging). */
export const SPF: Product[] = [
  { brand: "La Roche-Posay", name: "Anthelios UVMune 400 SPF 50+", price: "$33", p: 33, targets: ["dark_spots", "post_acne_marks"], actives: ["spf"], why: "Sunscreen is the #1 <b>anti-spot</b> and <b>anti-aging</b> step: without it, UV darkens marks and pigmentation and cancels the rest of your routine's efforts. This fluid texture leaves no white cast and wears every day, even under makeup.", url: "https://www.laroche-posay.us" },
  { brand: "EltaMD", name: "UV Clear SPF 46", price: "$43", p: 43, targets: ["dark_spots", "redness"], actives: ["spf"], why: "A favorite of blemish-prone and sensitive skin: its <b>niacinamide</b> soothes while the SPF protects from UV, in a light, non-greasy finish that doesn't clog pores.", url: "https://eltamd.com" },
  { brand: "Supergoop!", name: "Unseen Sunscreen SPF 40", price: "$38", p: 38, targets: ["dark_spots"], actives: ["spf"], why: "A totally invisible, velvety finish, perfect as a makeup base. It protects from UV daily with no white cast or sticky feel.", url: "https://supergoop.com" },
  { brand: "CeraVe", name: "Hydrating Mineral SPF 30", price: "$17", p: 17, targets: ["dark_spots", "redness"], actives: ["spf"], why: "A gentle mineral protection at a low price, with <b>ceramides</b> and <b>niacinamide</b>: ideal for reactive skin that doesn't tolerate chemical filters.", url: "https://www.cerave.com" },
];

/* Purifying mask (clay) — weekly ritual for oily skin / pores / blemishes. */
export const MASK_PURIFYING: Product[] = [
  { brand: "Innisfree", name: "Super Volcanic Pore Clay Mask", price: "$18", p: 18, freq: "1×/week evening", targets: ["shine", "pores", "acne", "comedones"], actives: ["clay"], why: "Once a week, this <b>volcanic clay</b> mask absorbs excess sebum and deeply clears the pores. Ideal for an oily T-zone: it refines the texture and prevents blackheads without drying out the rest of the face.", url: "https://us.innisfree.com" },
  { brand: "The INKEY List", name: "Kaolin Clay Mask", price: "$11", p: 11, freq: "1×/week evening", targets: ["shine", "pores", "comedones"], actives: ["clay"], why: "The essentials at a tiny price: <b>kaolin clay</b> mattifies and visibly tightens pores. Gentle enough for weekly use.", url: "https://www.theinkeylist.com" },
  { brand: "L'Oréal", name: "Pure-Clay Detox Mask", price: "$13", p: 13, freq: "1×/week evening", targets: ["shine", "pores"], actives: ["clay", "charcoal"], why: "Three clays + <b>charcoal</b> to detoxify oily skin and brighten a dull complexion. A weekly radiance treatment.", url: "https://www.lorealparisusa.com" },
  { brand: "Aztec Secret", name: "Indian Healing Clay", price: "$14", p: 14, freq: "1×/week evening", targets: ["pores", "acne"], actives: ["clay"], why: "The cult jar: 100% pure <b>bentonite</b>, highly absorbent. Reserve for tolerant oily skin, 1×/week max.", url: "https://www.aztecsecret.com" },
];

/* Hydrating mask — weekly ritual for dry / dehydrated skin / dull complexion. */
export const MASK_HYDRATING: Product[] = [
  { brand: "Laneige", name: "Water Sleeping Mask", price: "$29", p: 29, freq: "1-2×/week evening", targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "An overnight mask that plumps the skin during sleep. On waking, the complexion is <b>fresh and bouncy</b>: perfect when the skin feels tight or lacks glow.", url: "https://us.laneige.com" },
  { brand: "Typology", name: "Plumping Night Mask", price: "$30", p: 30, freq: "1-2×/week evening", targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "A short, clean <b>hyaluronic acid</b> formula: it hydrates intensely overnight and smooths the dull complexion noted in your analysis.", url: "https://us.typology.com" },
  { brand: "Garnier", name: "Moisture Bomb Sheet Mask", price: "$4", p: 4, freq: "1-2×/week evening", targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "The express boost at a tiny price: a sheet mask soaked in <b>hyaluronic acid</b> to rehydrate in 15 minutes.", url: "https://www.garnierusa.com" },
  { brand: "e.l.f.", name: "Holy Hydration! Face Mask", price: "$14", p: 14, freq: "1-2×/week evening", targets: ["flaking"], actives: ["hyaluronic_acid"], why: "A nourishing cream-mask with <b>hyaluronic acid</b> and squalane: instant comfort for skin that feels tight.", url: "https://www.elfcosmetics.com" },
];

/* « why » variant of a product (reused in the evening with different text). */
export function withWhy(list: Product[], idx: number, why: string): Product {
  return { ...list[idx], why };
}

/* Default routine (combination/oily skin) — used in demo `?demo=1` and as a
   fallback if there is no assessment. Reproduces the original catalog + SPF. */
export const DEFAULT_ROUTINE: RoutineData = {
  day: [
    { cat: "Cleanser", icon: "pump", freq: "Every morning", use: "Massage onto damp skin ~30s, then rinse with lukewarm water.", options: CLEANSER },
    { cat: "Serum", icon: "dropper", freq: "Every morning", use: "3-4 drops on clean skin, let it absorb before moisturizer.", options: SERUM_NIA },
    { cat: "Serum", icon: "dropper", freq: "Every morning", use: "A few drops on still slightly damp skin.", options: SERUM_HYDRA },
    { cat: "Cream", icon: "jar", freq: "Every morning", use: "A pea-size amount to seal in hydration.", options: CREAM },
    { cat: "Protection", icon: "pump", freq: "Every morning", use: "Last step, generously. Reapply after sun exposure.", options: SPF },
  ],
  night: [
    { cat: "Cleanser", icon: "pump", freq: "Every evening", use: "Massage to remove the day's sebum and pollution, then rinse.", options: [withWhy(CLEANSER, 0, "Through the day, sebum and pollution build up and clog the pores — the source of the <b>blackheads</b> spotted in your analysis. This <b>2% salicylic acid</b> cleanser removes that <b>excess sebum</b> in the evening and resets the skin before the night actives. A key step to clear without drying."), CLEANSER[1], CLEANSER[2], CLEANSER[3]] },
    { cat: "Exfoliant", icon: "bottle", freq: "2-3 nights / week", use: "On dry skin after cleansing, do not rinse. Never with other acids the same night.", options: EXFO },
    { cat: "Serum", icon: "dropper", freq: "Every evening", use: "Rehydrate right after the exfoliant, on slightly damp skin.", options: [withWhy(SERUM_HYDRA, 0, "After the evening exfoliant, the skin can feel tight. This <b>hyaluronic acid</b> + <b>B5</b> serum rehydrates deeply and calms the <b>sensitized areas</b> spotted in your analysis. It offsets the drying effect of exfoliation and preserves the <b>skin barrier</b> overnight."), SERUM_HYDRA[1], SERUM_HYDRA[2], SERUM_HYDRA[3]] },
    { cat: "Cream", icon: "jar", freq: "Every evening", use: "A pea-size amount as the last step, to repair overnight.", options: [withWhy(CREAM, 0, "At night, the skin repairs itself. This <b>non-comedogenic</b> cream nourishes, <b>soothes</b> and supports the <b>skin barrier</b> weakened by the blemishes and <b>post-acne</b> marks in your analysis, with no risk of clogging pores."), CREAM[1], CREAM[2], CREAM[3]] },
  ],
  diagnostic: ["Excess sebum", "Clogged pores", "Blemishes"],
  productCount: 9,
};

/* Dedicated gentle cleanser when the skin has no sebum/blemish concern. */
export { CLEANSER_GENTLE };
