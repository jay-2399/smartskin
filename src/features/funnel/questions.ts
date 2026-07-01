import type { QuestionDef } from "./types";

// Libellés, sous-textes, aides et icônes repris des maquettes Q-liquid-glass
// (Q-liquid-glass/q1.html … q7.html). Les `value` sont conservées (moteur de reco).

const CHECK = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.3 2.3 4.7-5"/></svg>`;
export const CHECK_ICON = CHECK;

// Icône « personne » des tranches d'âge (maquette q1) ; version barrée pour « prefer not ».
const PERSON_ICON = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="7.3" r="3.4"/><path d="M4.7 17.6c0-3.3 2.9-5.4 6.3-5.4s6.3 2.1 6.3 5.4"/></svg>`;
const PERSON_MUTED_ICON = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="7.3" r="3.4"/><path d="M4.7 17.6c0-3.3 2.9-5.4 6.3-5.4s6.3 2.1 6.3 5.4"/><path d="M6 7.3h10" opacity="0.55"/></svg>`;

// Âge représentatif de chaque tranche → pour l'« âge de peau » (skinAgeDelta). null = pas d'écart.
export const AGE_RANGE_YEARS: Record<string, number | null> = {
  under_18: 17, "18_24": 21, "25_34": 29, "35_44": 39, "45_plus": 50, prefer_not: null,
};
export const ageRangeToYears = (range: string | null): number | null =>
  range ? (AGE_RANGE_YEARS[range] ?? null) : null;

export const QUESTIONS: Record<string, QuestionDef> = {
  // 1ʳᵉ question : TRANCHE d'âge (maquette q1), pour situer l'« âge de peau » estimé.
  age: {
    id: "age", index: 1, mode: "age", grid: true, ctaLabel: "Continue",
    title: "What age range are you in?",
    helperHtml: `Helps us <b>calibrate</b> your routine to your skin.`,
    options: [
      { value: "under_18", label: "Under 18", icon: PERSON_ICON },
      { value: "18_24", label: "18 – 24", icon: PERSON_ICON },
      { value: "25_34", label: "25 – 34", icon: PERSON_ICON },
      { value: "35_44", label: "35 – 44", icon: PERSON_ICON },
      { value: "45_plus", label: "45 +", icon: PERSON_ICON },
      { value: "prefer_not", label: "Prefer not to say", icon: PERSON_MUTED_ICON },
    ],
  },
  q1: {
    id: "q1", index: 2, mode: "multi", maxSelect: 3, grid: true,
    title: "What would you like to improve on your skin?",
    helperHtml: `Pick <b>up to 3</b> priorities.`,
    options: [
      { value: "hydration", label: "Hydration", sub: "tightness, dryness",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 3C11 3 5 9.5 5 13a6 6 0 0 0 12 0C17 9.5 11 3 11 3Z" stroke-linejoin="round"/></svg>` },
      { value: "radiance", label: "Radiance", sub: "dull, tired look",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M17 5l-1.4 1.4M6.4 15.6L5 17"/></svg>` },
      { value: "blemishes", label: "Clear skin", sub: "breakouts, blackheads",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><circle cx="8.5" cy="9.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="13.5" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="13.5" r="1.2" fill="currentColor" stroke="none"/></svg>` },
      { value: "pores", label: "Pores", sub: "visible, uneven",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7H8Q9.2 7 9.2 9.3L9.2 13.2Q9.2 17.6 11 17.6"/><path d="M19.5 7H14Q12.8 7 12.8 9.3L12.8 13.2Q12.8 17.6 11 17.6"/></svg>` },
      { value: "dark_spots", label: "Even tone", sub: "dark spots, marks",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7.5"/><path d="M11 3.5a7.5 7.5 0 0 1 0 15Z" fill="currentColor" stroke="none"/></svg>` },
      { value: "fine_lines", label: "Fine lines", sub: "first wrinkles",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7.5c2.4-1.6 4.8 1.6 7.2 0s4.8-1.6 6.8 0M4 13c2.4-1.6 4.8 1.6 7.2 0s4.8-1.6 6.8 0"/></svg>` },
      { value: "firmness", label: "Firmness", sub: "loss of bounce",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 16.5V6.2"/><path d="M6.6 10.6L11 6l4.4 4.6"/><path d="M6 19h10" opacity="0.45"/></svg>` },
      { value: "redness", label: "Calm skin", sub: "redness, reactivity",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 16.5C5.5 10 10 5.5 16.5 5.5c0 6.5-4.5 11-11 11Z"/><path d="M7.6 14.4c2.2-2.7 4.9-4.8 7.9-6.2"/></svg>` },
      { value: "eye_area", label: "Eye area", sub: "dark circles, bags",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 11C4.8 7.6 7.6 6 11 6s6.2 1.6 8 5c-1.8 3.4-4.6 5-8 5s-6.2-1.6-8-5Z"/><circle cx="11" cy="11" r="2.6"/></svg>` },
      { value: "oiliness", label: "Oil balance", sub: "excess oil, T-zone",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 14.5a6.5 6.5 0 0 1 13 0"/><path d="M11 14.5l3.2-3.8"/><circle cx="11" cy="14.5" r="1" fill="currentColor" stroke="none"/></svg>` },
      { value: "texture", label: "Texture", sub: "rough, uneven",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="6" cy="6" r="1.1" fill="currentColor"/><circle cx="11" cy="6" r="1.1" fill="currentColor"/><circle cx="16" cy="6" r="1.1" fill="currentColor"/><circle cx="6" cy="11" r="1.1" fill="currentColor"/><circle cx="11" cy="11" r="1.1" fill="currentColor"/><circle cx="16" cy="11" r="1.1" fill="currentColor"/><circle cx="6" cy="16" r="1.1" fill="currentColor"/><circle cx="11" cy="16" r="1.1" fill="currentColor"/><circle cx="16" cy="16" r="1.1" fill="currentColor"/></svg>` },
      { value: "discover", label: "Not sure yet", sub: "help me find out", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M14 8l-1.8 4.4L8 14l1.8-4.4L14 8Z" stroke-linejoin="round"/></svg>` },
    ],
  },
  q2: {
    id: "q2", index: 3, mode: "multi",
    title: "Any ingredients that irritate your skin?",
    helperHtml: `Select any that apply — <b>optional</b>.`,
    options: [
      { value: "fragrance", label: "Fragrance", sub: "redness, stinging",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7.3" y="9.5" width="7" height="8.5" rx="2.4"/><path d="M9.6 9.5V6.8h2.8v2.7"/><rect x="9.2" y="4.7" width="3.6" height="2.1" rx="0.6"/><circle cx="16" cy="5.8" r="0.7" fill="currentColor" stroke="none"/><circle cx="17.4" cy="7" r="0.55" fill="currentColor" stroke="none"/><circle cx="16.4" cy="8.3" r="0.5" fill="currentColor" stroke="none"/></svg>` },
      { value: "alcohol", label: "Alcohol", sub: "tightness, dryness",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.8 4h4.4"/><path d="M10 4v4L6.6 15.4A1.4 1.4 0 0 0 7.9 17.5h6.2a1.4 1.4 0 0 0 1.3-2.1L12 8V4"/><path d="M8.4 12.6h5.2"/></svg>` },
      { value: "essential-oils", label: "Essential oils", sub: "lavender, citrus — sensitizing",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9.5" y="3.8" width="3" height="7.4" rx="0.6"/><rect x="9.9" y="2.4" width="2.2" height="1.5" rx="0.4"/><path d="M11 13c0 0-1.3 1.5-1.3 2.5a1.3 1.3 0 0 0 2.6 0C12.3 14.5 11 13 11 13Z"/></svg>` },
      { value: "sulfates", label: "Sulfates", sub: "foaming cleansers, drying",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="9.2" r="2.7"/><circle cx="13.2" cy="8.2" r="2"/><circle cx="12.6" cy="13" r="2.4"/><circle cx="8.4" cy="13.8" r="1.6"/></svg>` },
      { value: "none", label: "None", sub: "nothing to report", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7.3"/><path d="M6.2 6.2l9.6 9.6"/></svg>` },
    ],
  },
  q3: {
    id: "q3", index: 4, mode: "multi",
    title: "Have you used these actives before?",
    helperHtml: `Check what your skin <b>already tolerates</b> — we'll ease in the rest.`,
    options: [
      { value: "retinol", label: "Retinol / retinoids", sub: "anti-aging, renewal",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.6 8.4A6 6 0 0 1 16.2 8"/><path d="M16.4 13.6A6 6 0 0 1 5.8 14"/><path d="M16.4 4.6v3.6h-3.6"/><path d="M5.6 17.4v-3.6h3.6"/></svg>` },
      { value: "acids", label: "AHA / BHA acids", sub: "salicylic, glycolic — acne, pores",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 6.4v3.2M9.4 12.3l-2.3 1.4M12.6 12.3l2.3 1.4"/><circle cx="11" cy="4.8" r="1.7"/><circle cx="6" cy="14.6" r="1.7"/><circle cx="16" cy="14.6" r="1.7"/><circle cx="11" cy="11" r="1.7"/></svg>` },
      { value: "vitc", label: "Vitamin C", sub: "radiance, dark spots",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8.3"/><path d="M16 11Q17.47 8.32 14.54 7.46Q13.68 4.53 11 6Q8.32 4.53 7.46 7.46Q4.53 8.32 6 11Q4.53 13.68 7.46 14.54Q8.32 17.47 11 16Q13.68 17.47 14.54 14.54Q17.47 13.68 16 11Z"/><path d="M11 11L16 11M11 11L14.54 7.46M11 11L11 6M11 11L7.46 7.46M11 11L6 11M11 11L7.46 14.54M11 11L11 16M11 11L14.54 14.54"/></svg>` },
      { value: "niacinamide", label: "Niacinamide", sub: "pores, oil, redness",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3.6L16.7 6.9V13.5L11 16.8 5.3 13.5V6.9z"/><circle cx="11" cy="10.2" r="1.5"/></svg>` },
      { value: "none", label: "None, I'm a beginner", sub: "we'll start gently", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 18V9.5"/><path d="M11 11.5C11 9.3 9.3 7.7 7 7.7 7 9.9 8.7 11.5 11 11.5Z"/><path d="M11 10C11 7.8 12.7 6.2 15 6.2 15 8.4 13.3 10 11 10Z"/><path d="M7.5 18h7"/></svg>` },
    ],
  },
  q4: {
    id: "q4", index: 5, mode: "single",
    title: "Do you wear sunscreen?",
    helperHtml: `<b>SPF</b> changes the whole dark-spot strategy.`,
    // Écran solaire : SANS icônes (fréquence abstraite → texte seul), fidèle à la maquette q5.
    options: [
      { value: "daily", label: "Every day", sub: "rain or shine" },
      { value: "sometimes", label: "Sometimes", sub: "summer, sunny days" },
      { value: "never", label: "Never", sub: "not in my routine yet" },
    ],
  },
  q5: {
    id: "q5", index: 6, mode: "gate",
    title: "Has your skin changed recently?",
    helperHtml: `Over the <b>last 3 months</b> — to tell a passing flare-up from a lasting state.`,
    options: [
      { value: "yes", label: "Yes, something changed", sub: "stress, hormones, season, product…",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11a8 8 0 0 1 13.5-5.5L19 8M19 3v5h-5"/><path d="M19 11a8 8 0 0 1-13.5 5.5L3 14M3 19v-5h5"/></svg>` },
      { value: "no", label: "No, it's stable", sub: "same as usual",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h16"/><path d="M5 7.5h12M5 14.5h12" opacity=".45"/></svg>` },
    ],
    revealTitle: "What changed?",
    revealOptions: [
      { value: "breakouts", label: "More breakouts", sub: "a recent flare-up",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><circle cx="8" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="14" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="13.5" r="1.1" fill="currentColor" stroke="none"/></svg>` },
      { value: "dry", label: "Drier", sub: "tightness, new discomfort",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l1.5 2L5 8M9 3l1.5 2L9 7M13 4l1.5 2L13 8M17 5l-1.5 2L17 9"/><path d="M4 13h14M4 16h14" opacity=".55"/></svg>` },
      { value: "oily", label: "Oilier", sub: "shine, more oil",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3s5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 5-9 5-9Z"/><path d="M9 12.5a2 2 0 0 0 2 2" opacity=".6"/></svg>` },
      { value: "redness", label: "Redness / sensitivity", sub: "new reactions",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3c1 2.5 3.5 4 3.5 7a3.5 3.5 0 0 1-7 0c0-1.4.7-2.4 1.4-3.3C9.7 8.2 11 6 11 3Z"/><path d="M6 14a5 5 0 0 0 10 0" opacity=".5"/></svg>` },
      { value: "spots", label: "Spots / marks", sub: "recently appeared",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M8 8.5a1.6 1.6 0 1 0 .01 0M14 13a1.3 1.3 0 1 0 .01 0M13.5 8a1 1 0 1 0 .01 0" fill="currentColor" stroke="none" opacity=".75"/></svg>` },
    ],
  },
  // q6 (budget) — RETIRÉ du parcours V1 : absent de STEP_ORDER, donc jamais posé.
  // Conservé ici + dans le moteur (profile.ts) en dormance, pour réactivation en V2.
  q6: {
    id: "q6", index: 6, mode: "single",
    title: "Your budget for your skincare routine?",
    helperHtml: `We tailor the routine to <b>your budget</b>, no compromise.`,
    options: [
      { value: "lt30", label: "Under $30", sub: "the smart essentials",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M13 8.2a2.6 2.6 0 0 0-2.3-1.2c-1.3 0-2.2.7-2.2 1.7 0 2.3 4.8 1.2 4.8 3.6 0 1.1-1 1.8-2.4 1.8a2.8 2.8 0 0 1-2.5-1.3"/><path d="M11 5.5v1M11 15v1"/></svg>` },
      { value: "30-60", label: "$30 – $60", sub: "good price / actives balance",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5h16v9H3z"/><circle cx="11" cy="11" r="2.3"/><path d="M5.5 11h.01M16.5 11h.01"/></svg>` },
      { value: "60-100", label: "$60 – $100", sub: "a complete routine",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l3-3h8l3 3-7 9z"/><path d="M4 8h14M9.5 5l1.5 3 1.5-3"/></svg>` },
      { value: "gt100", label: "Let the AI decide", sub: "the best routine, no price cap", badge: "★ Recommended",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L11 15.3 6.2 17.9l.9-5.4L3.2 8.7l5.4-.8z"/></svg>` },
    ],
  },
  q7: {
    id: "q7", index: 7, mode: "multi", ctaLabel: "Start my analysis",
    title: "Anything to flag?",
    helperHtml: `To <b>rule out actives</b> not advised in your case.`,
    options: [
      { value: "pregnancy", label: "Pregnancy / breastfeeding", sub: "we avoid retinoids & salicylic",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="9" r="5"/><circle cx="9.2" cy="8.6" r="0.55" fill="currentColor" stroke="none"/><circle cx="12.8" cy="8.6" r="0.55" fill="currentColor" stroke="none"/><path d="M9.4 11c1 .8 2.2.8 3.2 0"/><path d="M6.5 15.5c1-1.4 2.7-2.2 4.5-2.2s3.5.8 4.5 2.2"/></svg>` },
      { value: "condition", label: "Rosacea / eczema", sub: "diagnosed reactive skin",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="5" width="13" height="12" rx="3.6"/><path d="M6.8 10c1.2-1.1 2.6 1 4 0s2.8-1.1 4.2 0"/><circle cx="8.6" cy="13.6" r="0.7" fill="currentColor" stroke="none"/><circle cx="13" cy="13.2" r="0.6" fill="currentColor" stroke="none"/></svg>` },
      { value: "treatment", label: "Ongoing dermatological treatment", sub: "prescription (Accutane, etc.)",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(-38 11 11)"><rect x="4.6" y="8.5" width="12.8" height="5" rx="2.5"/><path d="M11 8.5v5"/></g></svg>` },
      { value: "none", label: "Nothing to report", sub: "no restrictions", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7.3"/><path d="M6.2 6.2l9.6 9.6"/></svg>` },
    ],
  },
};

// age en 1ʳᵉ position ; q6 (budget) retiré du parcours → 7 étapes (age → q1…q5 → q7).
export const STEP_ORDER = ["age", "q1", "q2", "q3", "q4", "q5", "q7"] as const;
