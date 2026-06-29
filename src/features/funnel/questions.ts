import type { QuestionDef } from "./types";

// Libellés, sous-textes, aides et icônes repris des maquettes
// reference/User_flow_screens/02-q1.html … 09-q7.html (textes traduits en anglais).

const CHECK = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.3 2.3 4.7-5"/></svg>`;
export const CHECK_ICON = CHECK;

export const QUESTIONS: Record<string, QuestionDef> = {
  // 1ʳᵉ question (reveal v2) : âge réel, pour situer l'« âge de peau » estimé.
  age: {
    id: "age", index: 1, mode: "age", ctaLabel: "Continue",
    title: "How old are you?",
    helperHtml: `To place your <b>skin age</b> against your real age.`,
    options: [],
  },
  q1: {
    id: "q1", index: 2, mode: "multi", maxSelect: 3, grid: true,
    title: "What would you like to improve first?",
    helperHtml: `Pick <b>up to 3</b> priorities.`,
    options: [
      { value: "hydration", label: "Hydration", sub: "tight, dry skin",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 3C11 3 5 9.5 5 13a6 6 0 0 0 12 0C17 9.5 11 3 11 3Z" stroke-linejoin="round"/></svg>` },
      { value: "radiance", label: "Radiance", sub: "dull complexion",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M17 5l-1.4 1.4M6.4 15.6L5 17"/></svg>` },
      { value: "blemishes", label: "Blemishes", sub: "breakouts, blackheads",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><circle cx="8.5" cy="9.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="13.5" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="13.5" r="1.2" fill="currentColor" stroke="none"/></svg>` },
      { value: "pores", label: "Pores", sub: "enlarged, uneven texture",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="2.2"/><circle cx="14" cy="8.6" r="1.8"/><circle cx="9" cy="14" r="2"/><circle cx="14.6" cy="14.2" r="1.5"/></svg>` },
      { value: "dark_spots", label: "Dark spots", sub: "even out skin tone",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M8 6.5a3.6 3.6 0 1 0 .3 7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="13.5" cy="8.5" r="2.5" fill="currentColor"/><circle cx="14" cy="14" r="1.6" fill="currentColor"/></svg>` },
      { value: "fine_lines", label: "Fine lines & wrinkles", sub: "first signs of aging",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7.5c2.4-1.6 4.8 1.6 7.2 0s4.8-1.6 6.8 0M4 13c2.4-1.6 4.8 1.6 7.2 0s4.8-1.6 6.8 0"/></svg>` },
      { value: "firmness", label: "Firmness", sub: "anti-aging effect",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M11 3l6 2.5v4.5c0 4-2.6 6.7-6 8-3.4-1.3-6-4-6-8V5.5L11 3Z"/><path d="M8.5 11l1.8 1.8 3.4-3.6" stroke-linecap="round"/></svg>` },
      { value: "redness", label: "Redness", sub: "sensitivity, reactivity",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M11 4C13.4 7.4 15.6 9 15.6 12a4.6 4.6 0 0 1-9.2 0C6.4 9 8.6 7.4 11 4Z"/></svg>` },
      { value: "eye_area", label: "Dark circles & bags", sub: "tired eye area",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 11C4.8 7.6 7.6 6 11 6s6.2 1.6 8 5c-1.8 3.4-4.6 5-8 5s-6.2-1.6-8-5Z"/><circle cx="11" cy="11" r="2.6"/></svg>` },
      { value: "oiliness", label: "Oil & shine", sub: "excess oil, T-zone",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 3.5C11 3.5 5.5 9.2 5.5 12.7a5.5 5.5 0 0 0 11 0C16.5 9.2 11 3.5 11 3.5Z" stroke-linejoin="round"/><path d="M8.6 12.4a2.4 2.4 0 0 0 2.4 2.4" stroke-linecap="round"/></svg>` },
      { value: "texture", label: "Skin texture", sub: "refine, smooth texture",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="6" cy="6" r="1.1" fill="currentColor"/><circle cx="11" cy="6" r="1.1" fill="currentColor"/><circle cx="16" cy="6" r="1.1" fill="currentColor"/><circle cx="6" cy="11" r="1.1" fill="currentColor"/><circle cx="11" cy="11" r="1.1" fill="currentColor"/><circle cx="16" cy="11" r="1.1" fill="currentColor"/><circle cx="6" cy="16" r="1.1" fill="currentColor"/><circle cx="11" cy="16" r="1.1" fill="currentColor"/><circle cx="16" cy="16" r="1.1" fill="currentColor"/></svg>` },
      { value: "discover", label: "Understand my skin", sub: "I'm not sure", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M14 8l-1.8 4.4L8 14l1.8-4.4L14 8Z" stroke-linejoin="round"/></svg>` },
    ],
  },
  q2: {
    id: "q2", index: 3, mode: "multi",
    title: "Any ingredients that irritate your skin?",
    helperHtml: `Select any that apply — <b>optional</b>.`,
    options: [
      { value: "fragrance", label: "Fragrance", sub: "redness, stinging",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="8" r="3.2"/><path d="M11 11.2V18M8 14l3 1.5L14 14"/></svg>` },
      { value: "alcohol", label: "Alcohol", sub: "tightness, dryness",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M6 4h10l-1.2 6a3.8 3.8 0 0 1-7.6 0z"/><path d="M11 14v4M8 18h6" stroke-linecap="round"/></svg>` },
      { value: "essential-oils", label: "Essential oils", sub: "lavender, citrus — sensitizing",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19c-3.5 0-6-2.4-6-6 0-4 6-10 6-10s6 6 6 10c0 3.6-2.5 6-6 6Z"/><path d="M11 4.5v14" opacity=".45"/></svg>` },
      { value: "sulfates", label: "Sulfates", sub: "foaming cleansers, drying",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="12" r="3"/><circle cx="13.5" cy="13" r="2.4"/><circle cx="12" cy="7.5" r="2"/><circle cx="6" cy="6.5" r="1.3"/></svg>` },
      { value: "none", label: "None", sub: "nothing to report", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M11 3l6 2.5v4.5c0 4-2.6 6.7-6 8-3.4-1.3-6-4-6-8V5.5L11 3Z"/><path d="M8.5 11l1.8 1.8 3.4-3.6" stroke-linecap="round"/></svg>` },
    ],
  },
  q3: {
    id: "q3", index: 4, mode: "multi",
    title: "Have you used these actives before?",
    helperHtml: `Check what your skin <b>already tolerates</b> — we'll ease in the rest.`,
    options: [
      { value: "retinol", label: "Retinol / retinoids", sub: "anti-aging, renewal",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M17 5l-1.4 1.4M6.4 15.6L5 17"/></svg>` },
      { value: "acids", label: "AHA / BHA acids", sub: "salicylic, glycolic — acne, pores",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M9 3v6l-3.6 7.6A2 2 0 0 0 7.2 19.6h7.6a2 2 0 0 0 1.8-3L13 9V3"/><path d="M8 3h6M7.5 13.5h7" stroke-linecap="round"/></svg>` },
      { value: "vitc", label: "Vitamin C", sub: "radiance, dark spots",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7.5"/><path d="M11 6.5a4.5 4.5 0 1 0 4.4 5.6"/><path d="M11 11h4.5"/></svg>` },
      { value: "niacinamide", label: "Niacinamide", sub: "pores, oil, redness",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M11 2.5l5.5 3v5c0 4.2-2.7 7-5.5 8.2C8.2 17.5 5.5 14.7 5.5 10.5v-5z"/><path d="M9 10.5h4M11 8.5v4" stroke-linecap="round"/></svg>` },
      { value: "none", label: "None, I'm a beginner", sub: "we'll start gently", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M11 7.5v4M11 14.5v.05"/></svg>` },
    ],
  },
  q4: {
    id: "q4", index: 5, mode: "single",
    title: "Do you wear sunscreen?",
    helperHtml: `<b>SPF</b> changes the whole dark-spot strategy.`,
    options: [
      { value: "daily", label: "Every day", sub: "rain or shine",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M17 5l-1.4 1.4M6.4 15.6L5 17"/></svg>` },
      { value: "sometimes", label: "Sometimes", sub: "summer, sunny days",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 14a4 4 0 0 1 1-7.9 5 5 0 0 1 9.5 1.4A3.5 3.5 0 0 1 15 14z"/><path d="M11 3.2v1.2"/></svg>` },
      { value: "never", label: "Never", sub: "not in my routine yet",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M2.5 11h2M5 5l1.4 1.4M5 17l12-12"/></svg>` },
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
      { value: "dry", label: "Drier", sub: "new tightness, discomfort",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l1.5 2L5 8M9 3l1.5 2L9 7M13 4l1.5 2L13 8M17 5l-1.5 2L17 9"/><path d="M4 13h14M4 16h14" opacity=".55"/></svg>` },
      { value: "oily", label: "Oilier", sub: "more shine, rising oil",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3s5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 5-9 5-9Z"/><path d="M9 12.5a2 2 0 0 0 2 2" opacity=".6"/></svg>` },
      { value: "redness", label: "Redness / sensitivity", sub: "new reactions",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3c1 2.5 3.5 4 3.5 7a3.5 3.5 0 0 1-7 0c0-1.4.7-2.4 1.4-3.3C9.7 8.2 11 6 11 3Z"/><path d="M6 14a5 5 0 0 0 10 0" opacity=".5"/></svg>` },
      { value: "spots", label: "Spots / marks", sub: "appeared recently",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M8 8.5a1.6 1.6 0 1 0 .01 0M14 13a1.3 1.3 0 1 0 .01 0M13.5 8a1 1 0 1 0 .01 0" fill="currentColor" stroke="none" opacity=".75"/></svg>` },
      { value: "pores", label: "More visible pores", sub: "uneven texture",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="2.2"/><circle cx="14" cy="8.6" r="1.8"/><circle cx="9" cy="14" r="2"/><circle cx="14.6" cy="14.2" r="1.5"/></svg>` },
      { value: "dull", label: "Duller complexion", sub: "lacks radiance",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M17 5l-1.4 1.4M6.4 15.6L5 17"/></svg>` },
      { value: "fine_lines", label: "More noticeable fine lines", sub: "tired, drawn features",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7.5c2.4-1.6 4.8 1.6 7.2 0s4.8-1.6 6.8 0M4 13c2.4-1.6 4.8 1.6 7.2 0s4.8-1.6 6.8 0"/></svg>` },
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
    title: "Anything we should know?",
    helperHtml: `To <b>rule out actives</b> not advised in your case.`,
    options: [
      { value: "pregnancy", label: "Pregnancy / breastfeeding", sub: "we avoid retinoids & salicylic",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4.5" r="1.8"/><path d="M11 7v6a4 4 0 0 0 4 4M11 9c-2.5 0-4 1.6-4 4s1 5 1 5"/></svg>` },
      { value: "condition", label: "Rosacea / eczema", sub: "diagnosed reactive skin",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19s-6.5-3.8-6.5-9A3.5 3.5 0 0 1 11 7a3.5 3.5 0 0 1 6.5 3c0 5.2-6.5 9-6.5 9Z"/><path d="M8.5 9h2l1 2 1-3.5 1 1.5h1.5" opacity=".6"/></svg>` },
      { value: "treatment", label: "Ongoing derm treatment", sub: "prescription (Accutane, etc.)",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="9" height="9" rx="4.5" transform="rotate(-45 8 13.5)"/><path d="M9 11l4 4"/></svg>` },
      { value: "none", label: "Nothing to report", sub: "no restrictions", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M11 3l6 2.5v4.5c0 4-2.6 6.7-6 8-3.4-1.3-6-4-6-8V5.5L11 3Z"/><path d="M8.5 11l1.8 1.8 3.4-3.6" stroke-linecap="round"/></svg>` },
    ],
  },
};

// age en 1ʳᵉ position ; q6 (budget) retiré du parcours → 7 étapes (age → q1…q5 → q7).
export const STEP_ORDER = ["age", "q1", "q2", "q3", "q4", "q5", "q7"] as const;
