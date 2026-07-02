import type { AnalysisResult, AttributeResult } from "./schema";

// Bilan « exclusif » — page reveal autonome hors funnel (/exclusive), pour un visage
// précis. Score volontairement MOYEN (54 → bande « fair » / warning) pour créer l'envie
// vers la routine : quelques signaux à rééquilibrer (marques, teint, contour de l'œil).

const attributes: AttributeResult[] = [
  { id: "acne", level: 2, tip: "mild", situation: "A few small blemishes, mostly on the lower cheeks — nothing widespread." },
  { id: "comedones", level: 2, tip: "some", situation: "Some blackheads on and around the nose, with light pore clogging." },
  { id: "post_acne_marks", level: 3, tip: "marked", situation: "Several brownish post-acne marks scattered on the cheeks — the clearest priority." },
  { id: "pores", level: 2, tip: "visible", situation: "Visible pores on the T-zone, a sign of active sebum in that area." },
  { id: "texture", level: 2, tip: "uneven", situation: "Slightly uneven surface on the cheeks, tied to the marks and pores." },
  { id: "flaking", level: 1, tip: "absent", situation: "No flaking: the barrier still holds water reasonably well." },
  { id: "tone_evenness", level: 3, tip: "uneven", situation: "Noticeably uneven tone — marks and light hyperpigmentation break up the complexion." },
  { id: "radiance", level: 3, tip: "dull", situation: "Complexion looks a little tired and lacks glow — the tone unevenness weighs it down." },
  { id: "dark_spots", level: 3, tip: "present", situation: "Several small pigment spots on the cheeks, superficial but visible." },
  { id: "redness", level: 2, tip: "localized", situation: "Light, localized redness around the nose and on the cheeks." },
  { id: "shine", level: 2, tip: "T-zone", situation: "Some shine on the T-zone (nose, forehead)." },
  { id: "visible_vessels", level: 1, tip: "absent", situation: "No visible vessels or capillary fragility." },
  { id: "fine_lines", level: 1, tip: "none", situation: "No fine line: the skin stays supple and plump." },
  { id: "wrinkles", level: 1, tip: "absent", situation: "No set-in wrinkle: firm skin structure." },
  { id: "under_eye_circles", level: 3, tip: "marked", situation: "Marked under-eye circles that noticeably tire the eye area." },
  { id: "under_eye_puffiness", level: 2, tip: "slight", situation: "Slight puffiness under the eyes in the morning." },
];

export const EXCLUSIVE_RESULT: AnalysisResult = {
  observations:
    "Forehead: mostly clear, slight shine near the hairline. Cheeks: several brownish post-acne marks, uneven tone, a few small blemishes. T-zone: visible pores and shine on the nose. Eyes: marked dark circles, slight puffiness. Overall complexion: warm but a little tired, tone to even out.",
  score: 54,
  state: "Skin to rebalance",
  sub: "A few signals are pulling your skin down — post-acne marks, uneven tone and a tired eye area. All fixable with the right routine.",
  photoQuality: { ok: true },
  skinAge: 27,
  skinTypeBreakdown: "normal-to-combination · marks & uneven tone on the cheeks",
  verdict: {
    title: "The priority is clear: <em>even out the tone and fade the marks</em>.",
    body: "Your skin has a solid base — no aging signs, good structure — but three things converge on the cheeks: <b>post-acne marks</b>, <b>uneven tone</b> and a <b>dull, tired look</b>. They feed each other; treated together, the complexion clears up fast.",
    behavioralLink: "Daily <b>SPF</b> is non-negotiable here: without it, the marks and pigment spots keep coming back no matter what actives you use.",
    plan: [
      { label: "Fade post-acne marks & even the tone", sub: "the priority — targeted brightening + daily SPF" },
      { label: "Refine pores & control shine", sub: "regulate sebum on the T-zone" },
      { label: "Brighten & de-puff the eye area", sub: "wake up a tired look" },
    ],
  },
  profile: {
    skinType: "Normal to combination",
    ageRange: "24–32 yrs",
    carnation: 4,
    carnationLabel: "Tan",
    undertone: 2,
    undertoneLabel: "Rather warm",
    phototype: 4,
    phototypeSub: "tans easily, rarely burns",
  },
  attributes,
};
