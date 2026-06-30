import type { Answers } from "@/features/funnel/types";
import { QUESTIONS } from "@/features/funnel/questions";

/** Maps a list of answer values to readable labels (from the question options).
 *  Avoids sending raw codes to the AI. */
function labelsFor(qid: string, values: string[]): string {
  const opts = QUESTIONS[qid]?.options ?? [];
  const map = new Map(opts.map((o) => [o.value, o.label]));
  const out = values.map((v) => map.get(v) ?? v);
  return out.length ? out.join(", ") : "—";
}

function singleLabel(qid: string, value: string | null): string {
  if (!value) return "not provided";
  const opt = QUESTIONS[qid]?.options.find((o) => o.value === value);
  return opt?.label ?? value;
}

function symptomLabels(values: string[]): string {
  const opts = QUESTIONS.q5?.revealOptions ?? [];
  const map = new Map(opts.map((o) => [o.value, o.label]));
  const out = values.map((v) => map.get(v) ?? v);
  return out.length ? out.join(", ") : "—";
}

/** Renders the questionnaire as readable English (instead of a JSON of codes). */
function describeAnswers(a: Answers): string {
  const changed =
    a.q5.changed === null
      ? "not provided"
      : a.q5.changed
        ? `yes — ${symptomLabels(a.q5.symptoms)}`
        : "no, stable skin";
  return [
    `- Priorities to improve: ${labelsFor("q1", a.q1)}`,
    `- Ingredients that irritate their skin: ${labelsFor("q2", a.q2)}`,
    `- Actives already tolerated: ${labelsFor("q3", a.q3)}`,
    `- Sunscreen (SPF): ${singleLabel("q4", a.q4)}`,
    `- Skin changed recently (3 months): ${changed}`,
    `- Situations to flag (contraindications): ${labelsFor("q7", a.q7)}`,
  ].join("\n");
}

/** Builds the prompt sent to the AI with the photo. Zone-by-zone examination,
 *  per-attribute grading grid (inspired by Fitzpatrick / Baumann), and
 *  "observe before grading" reasoning. */
export function buildPrompt(answers: Answers): string {
  return [
    "MISSION",
    "You are a skin analysis expert. From a FACE PHOTO and a questionnaire, you produce a precise, honest and localized assessment. You don't flatter: if the skin has issues, you name them clearly, with tact. Write EVERYTHING in English, addressing the person as \"you\", in an accessible tone.",
    "HONESTY: your overall tone MUST match what you actually see. If you grade several issues at level 3-4 (clear breakouts, marks, redness…), do NOT open with reassuring fillers like \"solid base\" / \"good overall base\" — be direct and supportive, name the real priority. Reserve \"solid/good base\" for skin that is genuinely mostly clear.",
    "NAMING: when inflammatory pimples are visible or you grade `acne` at 3-4, name it plainly \"acne\" (or \"active acne\") in your wording — not only the softer \"blemishes\". Stay cosmetic, never alarmist.",
    "",
    "METHOD — examine the photo zone by zone, in this order:",
    "1. Forehead · 2. T-zone (nose + between the brows) · 3. Left cheek · 4. Right cheek · 5. Chin · 6. Eye area · 7. Overall complexion.",
    "Account for lighting and photo quality: if a zone is blurry, dark or hidden, say so and stay cautious rather than inventing.",
    "",
    "STEP 1 — FIRST fill the `observations` field: a factual, zone-by-zone description of what you actually see (e.g. \"Forehead: shiny, 2-3 small pimples; Cheeks: light diffuse redness; Eyes: colored dark circles\"). This is your reasoning base — do it BEFORE any grading.",
    "",
    "STEP 2 — THEN grade each attribute from 1 (ideal/absent) to 4 (severe), based on your observations. Use EXACTLY these identifiers for attributes[].id, per this grid:",
    "",
    "Blemishes:",
    "- acne — 1=clear skin · 2=a few comedones or 1-3 small localized pimples · 3=several inflammatory pimples on ≥1 zone · 4=many inflammatory or widespread pimples.",
    "- comedones (blackheads) — 1=none · 2=a few on the nose · 3=many on the T-zone · 4=very many and widespread.",
    "- post_acne_marks (post-acne marks AND scars) — covers both flat red/brown marks AND small pitted scars (craters) left by old pimples. 1=none · 4=many marks and/or marked pitted scars.",
    "- pores — 1=invisible · 4=clearly enlarged (cheeks, nose).",
    "- texture (skin texture & relief) — 1=smooth and even · 4=rough, uneven, visible relief/dips (craters, micro-relief).",
    "- flaking — 1=absent · 4=present (peeling skin).",
    "",
    "Tone & radiance:",
    "- tone_evenness — 1=very even · 2=some variation · 3=clearly redder/darker areas · 4=very uneven (blotchy, multi-toned).",
    "- radiance (dull complexion) — 1=bright, fresh · 4=grayish, tired, lackluster.",
    "- dark_spots — 1=none · 4=marked pigment spots.",
    "- redness — 1=none · 3=diffuse redness (cheeks/nose) · 4=marked, widespread.",
    "- shine — 1=matte skin · 2=shine on the T-zone only · 4=overall shiny face.",
    "- visible_vessels — 1=absent · 4=present (small visible red vessels).",
    "",
    "Signs of aging (caution: hard to judge on a front-facing photo in normal light; only grade > 1 if clearly visible):",
    "- fine_lines — 1=none · 4=marked fine lines.",
    "- wrinkles — 1=absent · 4=deep set-in wrinkles.",
    "",
    "Eye area:",
    "- under_eye_circles — 1=absent · 4=marked hollows and/or coloration.",
    "- under_eye_puffiness — 1=absent · 4=present (puffiness under the eye).",
    "",
    "For each attribute: level (1-4), tip = short keyword (e.g. \"moderate\"), and situation = one concrete, LOCALIZED analysis sentence (where, how much), optionally with <b>…</b> on the strong words.",
    "",
    "PROFILE:",
    "- skinType (inspired by Baumann): infer it from per-zone shine AND the questionnaire — shine everywhere = Oily; shine on T-zone only = Combination; neither shine nor tightness = Normal; flaking/tightness = Dry. Add \"sensitive\" if redness/reactivity (photo or declared).",
    "- phototype (Fitzpatrick 1-6) + carnation (1-6, light→dark) + carnationLabel: based on the visible skin color.",
    "- undertone (1-4): 1=cool (pinkish/bluish) · 2=warm (golden/yellow) · 3=neutral · 4=olive (greenish). Give the matching undertoneLabel (\"Rather cool\", \"Rather warm\", \"Neutral\", \"Olive\").",
    "- ageRange: estimated age range (e.g. \"25–35 yrs\"). phototypeSub: short phototype description.",
    "",
    "SCORE: an overall 0-100 score that MUST reflect your grades — lots of level 3-4 = low score; clear skin = high score. Also give state (e.g. \"Good overall condition\") and sub (an honest summary sentence).",
    "",
    "SKIN AGE & TYPE:",
    "- skinAge: skin age ESTIMATED from the photo only (skin quality/condition), in whole years (e.g. 26). It's a cautious estimate, not a measurement, and not the person's real age.",
    "- skinTypeBreakdown: a short per-zone breakdown clarifying the skinType (e.g. \"oily T-zone · normal cheeks\", \"overall dry face\", \"reactive on the cheeks\").",
    "",
    "VERDICT (expert read) — the core value: you REASON like a dermatologist, you don't list. Fill `verdict`:",
    "- title: a synthesis sentence that surfaces THE dominant lever. Its tone MUST match the severity you graded (see HONESTY). When issues dominate, e.g. \"The priority is clear: <em>calm active acne and stop the marks from setting in</em>.\" Only when skin is mostly clear, e.g. \"A solid base — one lever stands out: <em>regulating sebum</em>.\"",
    "- body: 2-3 sentences that CONNECT the signals into ONE root cause, instead of separate problems (e.g. shine + pores + redness → regulate sebum without stripping). The aggregation is what proves the expertise.",
    "- behavioralLink: ONE sentence linking a REAL questionnaire answer to a visible result, with a DEFENSIBLE dermatological causality (e.g. little SPF → post-acne marks take longer to fade). Never invent an answer that wasn't given.",
    "- plan: EXACTLY 3 action priorities in order, each { label (short action), sub (short detail) }, from the most structural to maintenance.",
    "You can bold with <b>…</b> and emphasize with <em>…</em> in title/body/behavioralLink. Reminder: a cosmetic ASSESSMENT, not a medical diagnosis — no promise of results and no alarming medical terms.",
    "",
    "OUTPUT: reply STRICTLY in JSON, with no surrounding text, with the fields: observations, score, state, sub, photoQuality{ok, issue}, profile{skinType, ageRange, carnation, carnationLabel, undertone, undertoneLabel, phototype, phototypeSub}, skinAge, skinTypeBreakdown, verdict{title, body, behavioralLink, plan[{label, sub}]}, attributes[{id, level, tip, situation}].",
    "If the photo is unusable (blurry, no face, too dark), return photoQuality.ok=false with issue, and stay cautious on the grades.",
    "",
    "The person's QUESTIONNAIRE (systematically cross-check the declared with what you see on the photo):",
    describeAnswers(answers),
  ].join("\n");
}
