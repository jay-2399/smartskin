import type { AnalysisResult, AttributeResult } from "./schema";

// Bilan « exclusif 2 » — page reveal autonome hors funnel (/exclusive-2).
// ⚠️ VRAIE analyse : ce bilan est la sortie réelle du pipeline Claude Opus vision
// (/api/analyze) sur la photo `public/exclusive2-face.jpg`, figée ici pour la vitrine.
// Seul le préambule « no questionnaire answers » du behavioralLink a été retiré
// (artefact d'un appel sans réponses de questionnaire) ; tout le reste est brut.

const attributes: AttributeResult[] = [
  { id: "acne", level: 1, tip: "clear", situation: "No active inflammatory pimples on any zone — forehead, cheeks and chin are essentially <b>clear</b>." },
  { id: "comedones", level: 1, tip: "none", situation: "No visible blackheads; the nose shows only normal, fine pores." },
  { id: "post_acne_marks", level: 1, tip: "none", situation: "No brown post-acne marks or pitted scars visible." },
  { id: "pores", level: 2, tip: "mild", situation: "Slightly visible pores on the <b>nose and inner cheeks</b>, emphasized by direct light — nothing enlarged." },
  { id: "texture", level: 2, tip: "light", situation: "Fine surface texture and a few tiny bumps near the nose and cheeks, largely accentuated by the harsh sunlight." },
  { id: "flaking", level: 1, tip: "none", situation: "No peeling or dry flakes visible on any zone." },
  { id: "tone_evenness", level: 2, tip: "slight", situation: "Tone is mostly even; the only variation is the pinker cheek area, not brown pigment." },
  { id: "radiance", level: 1, tip: "fresh", situation: "Complexion looks <b>bright and fresh</b>, no dullness or grey cast." },
  { id: "dark_spots", level: 1, tip: "none", situation: "No pigmented dark spots — the complexion is clear of hyperpigmentation." },
  { id: "redness", level: 3, tip: "diffuse", situation: "Clear <b>diffuse pink redness across both cheeks</b> and lightly around the nose — the dominant sign, partly amplified by sun exposure." },
  { id: "shine", level: 2, tip: "T-zone", situation: "Visible sheen on the <b>forehead, nose and chin</b>; cheeks stay more balanced, so shine is limited to the T-zone." },
  { id: "visible_vessels", level: 1, tip: "none", situation: "No distinct broken capillaries visible; the redness reads as diffuse rather than vascular." },
  { id: "fine_lines", level: 1, tip: "none", situation: "No fine lines noticeable, including around the eyes and forehead." },
  { id: "wrinkles", level: 1, tip: "none", situation: "No set-in wrinkles — skin looks smooth and youthful." },
  { id: "under_eye_circles", level: 2, tip: "mild", situation: "Light under-eye shadowing visible, more coloration than hollowing." },
  { id: "under_eye_puffiness", level: 1, tip: "none", situation: "No significant puffiness under the eyes." },
];

export const EXCLUSIVE2_RESULT: AnalysisResult = {
  observations:
    "Photo is clear, taken in bright natural sunlight (harsh direct light emphasizes shine and texture). Forehead: shiny with light sheen, smooth overall, no active pimples. T-zone: nose and center show noticeable shine/oil, a few tiny visible pores, no clear blackheads. Cheeks: diffuse pink redness across the mid-cheeks, some fine texture/small bumps, mild sun-induced flush, no inflammatory acne. Chin: clear, slightly shiny, minor redness at the lip border. Eye area: mild under-eye coloration/shadow, no significant puffiness. Overall complexion: fresh, youthful, warm-toned, healthy; redness on cheeks is the most notable sign, likely accentuated by the strong sunlight. Natural even tone, no brown pigment spots.",
  score: 66,
  state: "Good overall condition",
  sub: "Healthy, youthful skin — the main thing to address is diffuse redness on the cheeks, partly amplified by the strong sun in this shot.",
  photoQuality: { ok: true, issue: "Harsh direct sunlight exaggerates shine and surface texture — some readings stay cautious." },
  skinAge: 24,
  skinTypeBreakdown: "slightly shiny T-zone · reactive, pink-prone cheeks",
  verdict: {
    title: "A genuinely healthy base — one lever stands out: <em>calming the diffuse redness on your cheeks</em>.",
    body: "Your skin is clear, even and youthful with no active acne or pigment marks. The main signal is a soft, diffuse <b>pink flush across both cheeks</b>, paired with a light sheen on the T-zone — a reactive, sensitive pattern rather than an oily one. The strong sunlight in this photo amplifies both the redness and the shine, so the reality is likely a touch calmer than it looks here.",
    behavioralLink: "The cheek redness suggests your skin leans <b>sensitive</b>, so favoring gentle, fragrance-free products will keep it comfortable.",
    plan: [
      { label: "Soothe the cheeks", sub: "A fragrance-free moisturizer with niacinamide or centella to calm diffuse redness." },
      { label: "Protect daily", sub: "A gentle SPF every morning — sun exposure is a key trigger for the flush you see." },
      { label: "Keep it simple", sub: "Maintain a light, non-stripping routine to preserve your healthy barrier." },
    ],
  },
  profile: {
    skinType: "Normal, sensitive",
    ageRange: "20–28 yrs",
    carnation: 3,
    carnationLabel: "Light-medium",
    undertone: 2,
    undertoneLabel: "Rather warm",
    phototype: 3,
    phototypeSub: "Fair-to-medium skin that tans easily",
  },
  attributes,
};
