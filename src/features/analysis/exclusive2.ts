import type { AnalysisResult, AttributeResult } from "./schema";

// Bilan « exclusif 2 » — page reveal autonome hors funnel (/exclusive-2).
// ⚠️ VRAIE analyse (Claude Opus vision, /api/analyze) sur `public/exclusive2-face.jpg`,
// figée ici, AVEC UNE CORRECTION MANUELLE : le modèle avait sous-évalué la desquamation
// (« none ») parce que la photo plein cadre, en plein soleil, la masquait ; un gros plan
// la montre marquée. On remonte donc `flaking` à 3 et on recadre le bilan sur une
// barrière compromise (score revu 66 → 50). Le reste des attributs est brut.

const attributes: AttributeResult[] = [
  { id: "acne", level: 1, tip: "clear", situation: "No active inflammatory pimples on any zone — forehead, cheeks and chin are essentially <b>clear</b>." },
  { id: "comedones", level: 1, tip: "none", situation: "No visible blackheads; the nose shows only normal, fine pores." },
  { id: "post_acne_marks", level: 1, tip: "none", situation: "No brown post-acne marks or pitted scars visible." },
  { id: "pores", level: 2, tip: "mild", situation: "Slightly visible pores on the <b>nose and inner cheeks</b>, emphasized by direct light — nothing enlarged." },
  { id: "texture", level: 2, tip: "light", situation: "Fine surface texture and a few tiny bumps near the nose and cheeks, largely accentuated by the harsh sunlight." },
  { id: "flaking", level: 3, tip: "peeling", situation: "Clear <b>peeling and flaking across the cheeks</b> — sheets of skin lifting, a sign the barrier is compromised (post-sun or over-exfoliation)." },
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
    "Photo is clear, taken in bright natural sunlight (harsh direct light emphasizes shine and texture). Forehead: shiny with light sheen, smooth overall, no active pimples. T-zone: nose and center show noticeable shine/oil, a few tiny visible pores, no clear blackheads. Cheeks: diffuse pink redness across the mid-cheeks with clear peeling and flaking (skin lifting in sheets), no inflammatory acne — a compromised, likely sun-stressed barrier. Chin: clear, slightly shiny, minor redness at the lip border. Eye area: mild under-eye coloration/shadow, no significant puffiness. Overall complexion: fresh, youthful, warm-toned, healthy; redness on cheeks is the most notable sign, likely accentuated by the strong sunlight. Natural even tone, no brown pigment spots.",
  score: 50,
  state: "Barrier to repair",
  sub: "Your skin is peeling and flushed — the barrier is compromised right now. It rebuilds well with gentle, repairing care and a pause on anything harsh.",
  photoQuality: { ok: true, issue: "Harsh direct sunlight exaggerates shine and surface texture — some readings stay cautious." },
  skinAge: 24,
  skinTypeBreakdown: "compromised, peeling barrier · reactive, pink-prone cheeks",
  verdict: {
    title: "The priority is clear: <em>repair the barrier and stop the peeling</em>.",
    body: "Underneath, the skin is young and free of acne or pigment marks — a good base. But right now two things converge on the cheeks: visible <b>peeling and flaking</b> and a diffuse <b>pink flush</b>. Together they point to a <b>compromised barrier</b>, most likely from sun exposure or over-exfoliation. Calmed and rebuilt, it recovers fast.",
    behavioralLink: "Go gentle, not active: <b>pause acids, retinoids and scrubs</b> until the peeling settles, and favor fragrance-free, repairing products — the barrier needs rebuilding, not stripping.",
    plan: [
      { label: "Repair the barrier", sub: "A rich, fragrance-free moisturizer with ceramides & panthenol; pause all harsh actives." },
      { label: "Soothe the redness", sub: "Niacinamide or centella to calm the diffuse flush on the cheeks." },
      { label: "Protect & don't strip", sub: "A gentle SPF daily, and keep the routine minimal while it heals." },
    ],
  },
  profile: {
    skinType: "Sensitive, compromised barrier",
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
