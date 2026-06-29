import type { AnalysisResult } from "./schema";

// Sample assessment — shown when no analysis key is configured, to walk through
// the app end-to-end without a real call or account.
// Levels chosen to stay CONSISTENT with the scale: computeScore(attributes) must
// return this `score` (checked by sample.score.test.ts).
export const SAMPLE_RESULT: AnalysisResult = {
  observations:
    "Forehead: fairly clear skin, slight shine near the hairline. T-zone: shine and a few slightly visible pores on the nose. Cheeks: light, localized redness on the sides of the nose, a few blackheads. Chin: nothing to report. Eyes: light dark circles, no puffiness. Overall complexion: mostly even and fresh.",
  score: 73,
  state: "Good overall condition",
  sub: "Your skin is mostly balanced: mainly shine on the T-zone and small blemishes to ease gently.",
  photoQuality: { ok: true },
  skinAge: 26,
  skinTypeBreakdown: "oily T-zone · normal cheeks",
  verdict: {
    title: "A good overall base — one lever stands out from your analysis: <em>regulating sebum</em>.",
    body: "Three signals converge: <b>shine on the T-zone</b>, <b>visible pores</b> and <b>localized redness</b>. These aren't three separate problems — it's <b>one single lever</b>: regulate sebum without stripping, otherwise redness and marks keep feeding each other.",
    behavioralLink: "From your answers — <b>little SPF</b> day to day — your post-acne marks take longer to fade: without protection, the sun keeps them going.",
    plan: [
      { label: "Regulate sebum without stripping", sub: "the priority — everything else depends on it" },
      { label: "Fade post-acne marks & dark spots", sub: "targeted actives, in a second step" },
      { label: "Soothe redness & strengthen the barrier", sub: "as daily maintenance" },
    ],
  },
  profile: {
    skinType: "Combination",
    ageRange: "25–35 yrs",
    carnation: 3,
    carnationLabel: "Intermediate",
    undertone: 2,
    undertoneLabel: "Rather warm",
    phototype: 3,
    phototypeSub: "burns moderately, tans gradually",
  },
  attributes: [
    { id: "acne", level: 2, tip: "mild", situation: "A few occasional, mild inflammatory blemishes, mostly on the lower face." },
    { id: "comedones", level: 2, tip: "rare", situation: "Rare, localized blackheads on the nose, with no marked pore clogging." },
    { id: "post_acne_marks", level: 1, tip: "none", situation: "No notable mark or scar left by past blemishes." },
    { id: "pores", level: 2, tip: "mild", situation: "Slightly visible pores on the T-zone, a sign of present but controlled sebum activity." },
    { id: "texture", level: 1, tip: "smooth", situation: "Even, smooth skin texture, with no visible uneven relief." },
    { id: "flaking", level: 1, tip: "absent", situation: "No flaking detected: the skin barrier retains water well." },
    { id: "tone_evenness", level: 2, tip: "slight", situation: "Mostly even tone, with slight variations and no real marked unevenness." },
    { id: "radiance", level: 2, tip: "decent", situation: "Fairly fresh complexion, with a slight loss of glow but no marked sign of fatigue." },
    { id: "dark_spots", level: 1, tip: "none", situation: "No visible pigment spot on analysis." },
    { id: "redness", level: 2, tip: "localized", situation: "Light, localized redness on the nose and its sides, without spreading across the whole face." },
    { id: "shine", level: 2, tip: "T-zone", situation: "Shine present on the T-zone (nose, forehead), typical of combination skin." },
    { id: "visible_vessels", level: 1, tip: "absent", situation: "No visible vessels: no visible sign of capillary fragility." },
    { id: "fine_lines", level: 1, tip: "none", situation: "No notable fine line: the skin stays supple and plump." },
    { id: "wrinkles", level: 1, tip: "absent", situation: "No set-in wrinkle: the skin structure stays firm." },
    { id: "under_eye_circles", level: 2, tip: "mild", situation: "Light under-eye circles, barely hollow, only slightly emphasizing the eyes." },
    { id: "under_eye_puffiness", level: 1, tip: "absent", situation: "No puffiness detected: the eye area stays well drained." },
  ],
};
