import type { AnalysisResult, AttributeResult } from "./schema";

// Bilan « exclusif 2 » — page reveal autonome hors funnel (/exclusive-2), pour un
// visage précis : peau jeune, claire et globalement saine, mais RÉACTIVE — rougeurs
// diffuses sur joues/nez, exposée au soleil. Score MOYEN (60 → bande « fair »).

const attributes: AttributeResult[] = [
  { id: "acne", level: 1, tip: "clear", situation: "Skin is essentially clear — no active blemishes." },
  { id: "comedones", level: 2, tip: "few", situation: "A few small clogged pores around the nose, nothing widespread." },
  { id: "post_acne_marks", level: 1, tip: "none", situation: "No post-acne marks — the skin heals cleanly." },
  { id: "pores", level: 2, tip: "visible", situation: "Visible pores on the T-zone, a sign of active sebum there." },
  { id: "texture", level: 2, tip: "slight", situation: "Slightly uneven surface on the cheeks, tied to the reactivity." },
  { id: "flaking", level: 1, tip: "absent", situation: "No flaking: the barrier still holds water well." },
  { id: "tone_evenness", level: 3, tip: "uneven", situation: "Uneven tone — the diffuse redness breaks up the complexion." },
  { id: "radiance", level: 2, tip: "fair", situation: "Decent glow, but the sun sheen and redness dull it slightly." },
  { id: "dark_spots", level: 2, tip: "sun freckles", situation: "A few light sun freckles on the cheeks and nose bridge." },
  { id: "redness", level: 4, tip: "marked", situation: "Marked diffuse redness across the cheeks and nose — the clear priority." },
  { id: "shine", level: 2, tip: "T-zone", situation: "Some shine on the T-zone (nose, forehead)." },
  { id: "visible_vessels", level: 2, tip: "slight", situation: "Slight visible vessels near the nose — a reactive-skin signal." },
  { id: "fine_lines", level: 1, tip: "none", situation: "No fine line: the skin stays supple and plump." },
  { id: "wrinkles", level: 1, tip: "absent", situation: "No set-in wrinkle: young, firm skin structure." },
  { id: "under_eye_circles", level: 2, tip: "light", situation: "Light under-eye shadows, otherwise the eye area looks rested." },
  { id: "under_eye_puffiness", level: 1, tip: "none", situation: "No real puffiness under the eyes." },
];

export const EXCLUSIVE2_RESULT: AnalysisResult = {
  observations:
    "Forehead: mostly clear, light sheen near the hairline. Cheeks & nose: diffuse redness and warmth, a few sun freckles, slight visible vessels. T-zone: visible pores and shine. Eyes: light shadows, otherwise rested. Overall complexion: young, healthy skin whose main signal is reactivity and sun-stress — not blemishes, not aging.",
  score: 60,
  state: "Reactive, sun-stressed skin",
  sub: "Your skin has a healthy base — the main thing pulling it down is diffuse redness and sun exposure. Both calm quickly with the right, gentle routine.",
  photoQuality: { ok: true },
  skinAge: 25,
  skinTypeBreakdown: "fair & reactive · diffuse redness on the cheeks and nose, sun-exposed",
  verdict: {
    title: "The priority is clear: <em>calm the redness and shield from the sun</em>.",
    body: "Your skin has youth and a solid base — no acne, no aging signs. But two things converge on the cheeks and nose: <b>diffuse redness</b> and a <b>reactive, sun-stressed</b> surface. They feed each other; soothed and protected together, the complexion evens out fast.",
    behavioralLink: "Daily <b>SPF</b> is non-negotiable here: sun is the main trigger of the flushing, and without it the redness and freckles keep coming back.",
    plan: [
      { label: "Calm the redness & reactivity", sub: "the priority — soothing + barrier repair" },
      { label: "Shield from the sun, every day", sub: "broad-spectrum SPF — the main trigger" },
      { label: "Refine pores & even the tone", sub: "regulate the T-zone, smooth the surface" },
    ],
  },
  profile: {
    skinType: "Normal to combination, reactive",
    ageRange: "22–30 yrs",
    carnation: 2,
    carnationLabel: "Fair",
    undertone: 2,
    undertoneLabel: "Rather warm",
    phototype: 2,
    phototypeSub: "burns easily, tans slowly",
  },
  attributes,
};
