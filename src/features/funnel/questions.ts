import type { QuestionDef } from "./types";

// Libellés, sous-textes, aides et icônes repris verbatim des maquettes
// reference/User_flow_screens/02-q1.html … 09-q7.html.

const CHECK = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.3 2.3 4.7-5"/></svg>`;
export const CHECK_ICON = CHECK;

export const QUESTIONS: Record<string, QuestionDef> = {
  // 1ʳᵉ question (reveal v2) : âge réel, pour situer l'« âge de peau » estimé.
  age: {
    id: "age", index: 1, mode: "age",
    title: "Quel âge as-tu ?",
    helperHtml: `Pour situer ton <b>âge de peau</b> par rapport à ton âge réel.`,
    options: [],
  },
  q1: {
    id: "q1", index: 2, mode: "multi", maxSelect: 3, grid: true,
    title: "Qu'est-ce que tu aimerais améliorer en priorité ?",
    helperHtml: `Choisis <b>jusqu'à 3</b> priorités.`,
    options: [
      { value: "hydration", label: "Hydrater", sub: "peau qui tiraille",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 3C11 3 5 9.5 5 13a6 6 0 0 0 12 0C17 9.5 11 3 11 3Z" stroke-linejoin="round"/></svg>` },
      { value: "radiance", label: "Éclat", sub: "teint terne",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M17 5l-1.4 1.4M6.4 15.6L5 17"/></svg>` },
      { value: "blemishes", label: "Imperfections", sub: "boutons, points noirs",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><circle cx="8.5" cy="9.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="13.5" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="13.5" r="1.2" fill="currentColor" stroke="none"/></svg>` },
      { value: "pores", label: "Pores", sub: "dilatés, grain irrégulier",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="2.2"/><circle cx="14" cy="8.6" r="1.8"/><circle cx="9" cy="14" r="2"/><circle cx="14.6" cy="14.2" r="1.5"/></svg>` },
      { value: "dark_spots", label: "Taches", sub: "unifier le teint",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M8 6.5a3.6 3.6 0 1 0 .3 7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="13.5" cy="8.5" r="2.5" fill="currentColor"/><circle cx="14" cy="14" r="1.6" fill="currentColor"/></svg>` },
      { value: "fine_lines", label: "Ridules & rides", sub: "premiers signes de l'âge",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7.5c2.4-1.6 4.8 1.6 7.2 0s4.8-1.6 6.8 0M4 13c2.4-1.6 4.8 1.6 7.2 0s4.8-1.6 6.8 0"/></svg>` },
      { value: "firmness", label: "Raffermir", sub: "effet anti-âge",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M11 3l6 2.5v4.5c0 4-2.6 6.7-6 8-3.4-1.3-6-4-6-8V5.5L11 3Z"/><path d="M8.5 11l1.8 1.8 3.4-3.6" stroke-linecap="round"/></svg>` },
      { value: "redness", label: "Rougeurs", sub: "sensibilité, réactivité",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M11 4C13.4 7.4 15.6 9 15.6 12a4.6 4.6 0 0 1-9.2 0C6.4 9 8.6 7.4 11 4Z"/></svg>` },
      { value: "eye_area", label: "Cernes & poches", sub: "contour des yeux fatigué",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 11C4.8 7.6 7.6 6 11 6s6.2 1.6 8 5c-1.8 3.4-4.6 5-8 5s-6.2-1.6-8-5Z"/><circle cx="11" cy="11" r="2.6"/></svg>` },
      { value: "oiliness", label: "Sébum & brillance", sub: "excès de gras, zone T",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 3.5C11 3.5 5.5 9.2 5.5 12.7a5.5 5.5 0 0 0 11 0C16.5 9.2 11 3.5 11 3.5Z" stroke-linejoin="round"/><path d="M8.6 12.4a2.4 2.4 0 0 0 2.4 2.4" stroke-linecap="round"/></svg>` },
      { value: "texture", label: "Grain de peau", sub: "affiner, lisser la texture",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="6" cy="6" r="1.1" fill="currentColor"/><circle cx="11" cy="6" r="1.1" fill="currentColor"/><circle cx="16" cy="6" r="1.1" fill="currentColor"/><circle cx="6" cy="11" r="1.1" fill="currentColor"/><circle cx="11" cy="11" r="1.1" fill="currentColor"/><circle cx="16" cy="11" r="1.1" fill="currentColor"/><circle cx="6" cy="16" r="1.1" fill="currentColor"/><circle cx="11" cy="16" r="1.1" fill="currentColor"/><circle cx="16" cy="16" r="1.1" fill="currentColor"/></svg>` },
      { value: "discover", label: "Comprendre ma peau", sub: "je ne sais pas trop", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M14 8l-1.8 4.4L8 14l1.8-4.4L14 8Z" stroke-linejoin="round"/></svg>` },
    ],
  },
  q2: {
    id: "q2", index: 3, mode: "multi",
    title: "Des ingrédients qui irritent ta peau ?",
    helperHtml: `Plusieurs choix possibles — <b>optionnel</b>.`,
    options: [
      { value: "fragrance", label: "Parfum", sub: "rougeurs, picotements",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="8" r="3.2"/><path d="M11 11.2V18M8 14l3 1.5L14 14"/></svg>` },
      { value: "alcohol", label: "Alcool", sub: "tiraillements, sécheresse",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M6 4h10l-1.2 6a3.8 3.8 0 0 1-7.6 0z"/><path d="M11 14v4M8 18h6" stroke-linecap="round"/></svg>` },
      { value: "essential-oils", label: "Huiles essentielles", sub: "lavande, agrumes — sensibilisants",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19c-3.5 0-6-2.4-6-6 0-4 6-10 6-10s6 6 6 10c0 3.6-2.5 6-6 6Z"/><path d="M11 4.5v14" opacity=".45"/></svg>` },
      { value: "sulfates", label: "Sulfates", sub: "nettoyants moussants, dessèchent",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="12" r="3"/><circle cx="13.5" cy="13" r="2.4"/><circle cx="12" cy="7.5" r="2"/><circle cx="6" cy="6.5" r="1.3"/></svg>` },
      { value: "none", label: "Aucun", sub: "rien à signaler", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M11 3l6 2.5v4.5c0 4-2.6 6.7-6 8-3.4-1.3-6-4-6-8V5.5L11 3Z"/><path d="M8.5 11l1.8 1.8 3.4-3.6" stroke-linecap="round"/></svg>` },
    ],
  },
  q3: {
    id: "q3", index: 4, mode: "multi",
    title: "As-tu déjà utilisé ces actifs ?",
    helperHtml: `Coche ce que ta peau <b>tolère déjà</b> — on dose le reste en douceur.`,
    options: [
      { value: "retinol", label: "Rétinol / rétinoïdes", sub: "anti-âge, renouvellement",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M17 5l-1.4 1.4M6.4 15.6L5 17"/></svg>` },
      { value: "acids", label: "Acides AHA / BHA", sub: "acide salicylique, glycolique — acné, pores",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M9 3v6l-3.6 7.6A2 2 0 0 0 7.2 19.6h7.6a2 2 0 0 0 1.8-3L13 9V3"/><path d="M8 3h6M7.5 13.5h7" stroke-linecap="round"/></svg>` },
      { value: "vitc", label: "Vitamine C", sub: "éclat, anti-taches",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7.5"/><path d="M11 6.5a4.5 4.5 0 1 0 4.4 5.6"/><path d="M11 11h4.5"/></svg>` },
      { value: "niacinamide", label: "Niacinamide", sub: "pores, sébum, rougeurs",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M11 2.5l5.5 3v5c0 4.2-2.7 7-5.5 8.2C8.2 17.5 5.5 14.7 5.5 10.5v-5z"/><path d="M9 10.5h4M11 8.5v4" stroke-linecap="round"/></svg>` },
      { value: "none", label: "Aucun, je débute", sub: "on commence en douceur", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M11 7.5v4M11 14.5v.05"/></svg>` },
    ],
  },
  q4: {
    id: "q4", index: 5, mode: "single",
    title: "Tu mets de la crème solaire ?",
    helperHtml: `Le <b>SPF</b> change toute la stratégie anti-taches.`,
    options: [
      { value: "daily", label: "Tous les jours", sub: "pluie ou soleil",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M17 5l-1.4 1.4M6.4 15.6L5 17"/></svg>` },
      { value: "sometimes", label: "Parfois", sub: "l'été, les jours ensoleillés",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 14a4 4 0 0 1 1-7.9 5 5 0 0 1 9.5 1.4A3.5 3.5 0 0 1 15 14z"/><path d="M11 3.2v1.2"/></svg>` },
      { value: "never", label: "Jamais", sub: "pas encore dans ma routine",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M2.5 11h2M5 5l1.4 1.4M5 17l12-12"/></svg>` },
    ],
  },
  q5: {
    id: "q5", index: 6, mode: "gate",
    title: "Ta peau a changé récemment ?",
    helperHtml: `Sur les <b>3 derniers mois</b> — pour distinguer une poussée passagère d'un état installé.`,
    options: [
      { value: "yes", label: "Oui, quelque chose a changé", sub: "stress, hormones, saison, produit…",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11a8 8 0 0 1 13.5-5.5L19 8M19 3v5h-5"/><path d="M19 11a8 8 0 0 1-13.5 5.5L3 14M3 19v-5h5"/></svg>` },
      { value: "no", label: "Non, elle est stable", sub: "comme d'habitude",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h16"/><path d="M5 7.5h12M5 14.5h12" opacity=".45"/></svg>` },
    ],
    revealTitle: "Qu'est-ce qui a changé ?",
    revealOptions: [
      { value: "breakouts", label: "Plus de boutons", sub: "une poussée récente",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><circle cx="8" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="14" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="13.5" r="1.1" fill="currentColor" stroke="none"/></svg>` },
      { value: "dry", label: "Plus sèche", sub: "tiraillements, inconfort nouveau",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l1.5 2L5 8M9 3l1.5 2L9 7M13 4l1.5 2L13 8M17 5l-1.5 2L17 9"/><path d="M4 13h14M4 16h14" opacity=".55"/></svg>` },
      { value: "oily", label: "Plus grasse", sub: "brillances, sébum en hausse",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3s5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 5-9 5-9Z"/><path d="M9 12.5a2 2 0 0 0 2 2" opacity=".6"/></svg>` },
      { value: "redness", label: "Rougeurs / sensibilité", sub: "réactions nouvelles",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3c1 2.5 3.5 4 3.5 7a3.5 3.5 0 0 1-7 0c0-1.4.7-2.4 1.4-3.3C9.7 8.2 11 6 11 3Z"/><path d="M6 14a5 5 0 0 0 10 0" opacity=".5"/></svg>` },
      { value: "spots", label: "Taches / marques", sub: "apparues récemment",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M8 8.5a1.6 1.6 0 1 0 .01 0M14 13a1.3 1.3 0 1 0 .01 0M13.5 8a1 1 0 1 0 .01 0" fill="currentColor" stroke="none" opacity=".75"/></svg>` },
      { value: "pores", label: "Pores plus visibles", sub: "grain de peau irrégulier",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="2.2"/><circle cx="14" cy="8.6" r="1.8"/><circle cx="9" cy="14" r="2"/><circle cx="14.6" cy="14.2" r="1.5"/></svg>` },
      { value: "dull", label: "Teint plus terne", sub: "manque d'éclat",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="4"/><path d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M5 5l1.4 1.4M15.6 15.6L17 17M17 5l-1.4 1.4M6.4 15.6L5 17"/></svg>` },
      { value: "fine_lines", label: "Ridules plus marquées", sub: "traits tirés, fatigue",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 7.5c2.4-1.6 4.8 1.6 7.2 0s4.8-1.6 6.8 0M4 13c2.4-1.6 4.8 1.6 7.2 0s4.8-1.6 6.8 0"/></svg>` },
    ],
  },
  // q6 (budget) — RETIRÉ du parcours V1 : absent de STEP_ORDER, donc jamais posé.
  // Conservé ici + dans le moteur (profile.ts) en dormance, pour réactivation en V2.
  q6: {
    id: "q6", index: 6, mode: "single",
    title: "Ton budget pour ta routine skincare ?",
    helperHtml: `On adapte la routine à <b>ton budget</b>, sans compromis.`,
    options: [
      { value: "lt30", label: "Moins de $30", sub: "l'essentiel, malin",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M13 8.2a2.6 2.6 0 0 0-2.3-1.2c-1.3 0-2.2.7-2.2 1.7 0 2.3 4.8 1.2 4.8 3.6 0 1.1-1 1.8-2.4 1.8a2.8 2.8 0 0 1-2.5-1.3"/><path d="M11 5.5v1M11 15v1"/></svg>` },
      { value: "30-60", label: "$30 – $60", sub: "bon équilibre prix / actifs",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5h16v9H3z"/><circle cx="11" cy="11" r="2.3"/><path d="M5.5 11h.01M16.5 11h.01"/></svg>` },
      { value: "60-100", label: "$60 – $100", sub: "une routine complète",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l3-3h8l3 3-7 9z"/><path d="M4 8h14M9.5 5l1.5 3 1.5-3"/></svg>` },
      { value: "gt100", label: "Laisse l'IA composer", sub: "la meilleure routine, sans plafond de prix", badge: "★ Recommandé",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L11 15.3 6.2 17.9l.9-5.4L3.2 8.7l5.4-.8z"/></svg>` },
    ],
  },
  q7: {
    id: "q7", index: 7, mode: "multi", ctaLabel: "Lancer mon analyse",
    title: "Une situation à signaler ?",
    helperHtml: `Pour <b>écarter les actifs déconseillés</b> dans ton cas.`,
    options: [
      { value: "pregnancy", label: "Grossesse / allaitement", sub: "on évite rétinoïdes & salicylique",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4.5" r="1.8"/><path d="M11 7v6a4 4 0 0 0 4 4M11 9c-2.5 0-4 1.6-4 4s1 5 1 5"/></svg>` },
      { value: "condition", label: "Rosacée / eczéma", sub: "peau réactive diagnostiquée",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19s-6.5-3.8-6.5-9A3.5 3.5 0 0 1 11 7a3.5 3.5 0 0 1 6.5 3c0 5.2-6.5 9-6.5 9Z"/><path d="M8.5 9h2l1 2 1-3.5 1 1.5h1.5" opacity=".6"/></svg>` },
      { value: "treatment", label: "Traitement dermato en cours", sub: "prescription (Roaccutane, etc.)",
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="9" height="9" rx="4.5" transform="rotate(-45 8 13.5)"/><path d="M9 11l4 4"/></svg>` },
      { value: "none", label: "Rien à signaler", sub: "aucune restriction", exclusive: true,
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M11 3l6 2.5v4.5c0 4-2.6 6.7-6 8-3.4-1.3-6-4-6-8V5.5L11 3Z"/><path d="M8.5 11l1.8 1.8 3.4-3.6" stroke-linecap="round"/></svg>` },
    ],
  },
};

// age en 1ʳᵉ position ; q6 (budget) retiré du parcours → 7 étapes (age → q1…q5 → q7).
export const STEP_ORDER = ["age", "q1", "q2", "q3", "q4", "q5", "q7"] as const;
