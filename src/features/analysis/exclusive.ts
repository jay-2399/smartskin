import type { AnalysisResult, AttributeResult } from "./schema";

// Bilan « exclusif » — page reveal autonome hors funnel (/exclusive), pour un visage
// précis. Score volontairement BAS (40 → bande « needs work ») : peau jeune en pleine
// poussée d'acné inflammatoire (front + joues), rougeurs et marques fraîches. Objectif :
// montrer une peau clairement à traiter → créer l'envie vers la routine.

const attributes: AttributeResult[] = [
  { id: "acne", level: 4, tip: "widespread", situation: "Numerous inflammatory blemishes across the forehead and cheeks — the clear #1 priority." },
  { id: "comedones", level: 3, tip: "congested", situation: "Marked congestion and clogged pores, especially on the forehead." },
  { id: "post_acne_marks", level: 3, tip: "fresh marks", situation: "Red and brown marks left by healing blemishes on the cheeks and forehead." },
  { id: "pores", level: 3, tip: "dilated", situation: "Dilated pores on the T-zone, driven by active sebum in that area." },
  { id: "texture", level: 3, tip: "bumpy", situation: "Bumpy, uneven surface tied to the active breakout and congestion." },
  { id: "flaking", level: 1, tip: "absent", situation: "No flaking: the barrier still holds water reasonably well." },
  { id: "tone_evenness", level: 3, tip: "uneven", situation: "Uneven tone — inflammation and marks break up the complexion." },
  { id: "radiance", level: 3, tip: "dull", situation: "Complexion looks inflamed and lacks glow, weighed down by the active breakout." },
  { id: "dark_spots", level: 2, tip: "early", situation: "A few early pigment marks starting to settle where blemishes have healed." },
  { id: "redness", level: 3, tip: "inflamed", situation: "Diffuse redness around the blemishes on the forehead and cheeks." },
  { id: "shine", level: 3, tip: "oily", situation: "Oily shine across the T-zone (forehead, nose)." },
  { id: "visible_vessels", level: 1, tip: "absent", situation: "No visible vessels or capillary fragility." },
  { id: "fine_lines", level: 1, tip: "none", situation: "No fine line: the skin stays supple and plump." },
  { id: "wrinkles", level: 1, tip: "absent", situation: "No set-in wrinkle: young, firm skin structure." },
  { id: "under_eye_circles", level: 2, tip: "light", situation: "Light under-eye shadows, otherwise the eye area looks rested." },
  { id: "under_eye_puffiness", level: 1, tip: "none", situation: "No real puffiness under the eyes." },
];

export const EXCLUSIVE_RESULT: AnalysisResult = {
  observations:
    "Forehead: numerous small inflammatory blemishes and congestion — the most affected zone. Cheeks: scattered papules with surrounding redness and early post-acne marks. T-zone: dilated pores and oily shine on the nose and forehead. Eyes: light shadows, otherwise rested. Overall complexion: young skin in an active breakout phase — far more inflamed than aged.",
  score: 40,
  state: "Active breakout to calm",
  sub: "Your skin is in an active breakout — inflammatory blemishes, redness and fresh marks. It's very treatable with a consistent, calming routine.",
  photoQuality: { ok: true },
  skinAge: 25,
  skinTypeBreakdown: "oily-to-combination · active breakout on the forehead & cheeks",
  verdict: {
    title: "The priority is clear: <em>calm the active breakout first</em>.",
    body: "Your skin has youth on its side — no aging signs, firm structure — but three things converge right now: <b>inflammatory acne</b>, <b>congestion</b> and <b>redness</b>, mostly on the forehead and cheeks. They feed each other; calmed together, the skin clears up fast.",
    behavioralLink: "Go gentle, not aggressive: over-scrubbing or stacking harsh actives will inflame the breakout further. Daily <b>SPF</b> is non-negotiable to stop fresh marks from darkening.",
    plan: [
      { label: "Calm active blemishes & inflammation", sub: "the priority — targeted anti-blemish + soothing" },
      { label: "Unclog pores & control oil", sub: "regulate sebum on the T-zone" },
      { label: "Fade fresh marks & protect", sub: "brightening + daily SPF" },
    ],
  },
  profile: {
    skinType: "Oily to combination",
    ageRange: "20–28 yrs",
    carnation: 2,
    carnationLabel: "Fair",
    undertone: 2,
    undertoneLabel: "Rather cool",
    phototype: 2,
    phototypeSub: "burns first, tans slowly",
  },
  attributes,
};
