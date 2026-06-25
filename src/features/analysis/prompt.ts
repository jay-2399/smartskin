import type { Answers } from "@/features/funnel/types";
import { QUESTIONS } from "@/features/funnel/questions";

/** Traduit une liste de valeurs de réponse en libellés lisibles (depuis les
 *  options de la question). Évite d'envoyer des codes bruts à l'IA. */
function labelsFor(qid: string, values: string[]): string {
  const opts = QUESTIONS[qid]?.options ?? [];
  const map = new Map(opts.map((o) => [o.value, o.label]));
  const out = values.map((v) => map.get(v) ?? v);
  return out.length ? out.join(", ") : "—";
}

function singleLabel(qid: string, value: string | null): string {
  if (!value) return "non renseigné";
  const opt = QUESTIONS[qid]?.options.find((o) => o.value === value);
  return opt?.label ?? value;
}

function symptomLabels(values: string[]): string {
  const opts = QUESTIONS.q5?.revealOptions ?? [];
  const map = new Map(opts.map((o) => [o.value, o.label]));
  const out = values.map((v) => map.get(v) ?? v);
  return out.length ? out.join(", ") : "—";
}

/** Rend le questionnaire en français lisible (au lieu d'un JSON de codes). */
function describeAnswers(a: Answers): string {
  const changed =
    a.q5.changed === null
      ? "non renseigné"
      : a.q5.changed
        ? `oui — ${symptomLabels(a.q5.symptoms)}`
        : "non, peau stable";
  return [
    `- Priorités à améliorer : ${labelsFor("q1", a.q1)}`,
    `- Ingrédients qui irritent sa peau : ${labelsFor("q2", a.q2)}`,
    `- Actifs déjà tolérés : ${labelsFor("q3", a.q3)}`,
    `- Crème solaire (SPF) : ${singleLabel("q4", a.q4)}`,
    `- Peau a changé récemment (3 mois) : ${changed}`,
    `- Situations à signaler (contre-indications) : ${labelsFor("q7", a.q7)}`,
  ].join("\n");
}

/** Construit le prompt envoyé à l'IA avec la photo. Méthode d'examen zone par
 *  zone, grille de notation par attribut (inspirée Fitzpatrick / Baumann),
 *  et raisonnement « observer avant de noter ». */
export function buildPrompt(answers: Answers): string {
  return [
    "MISSION",
    "Tu es un expert en analyse de la peau. À partir d'une PHOTO de visage et d'un questionnaire, tu produis un bilan précis, honnête et localisé. Tu ne flattes pas : si la peau présente des problèmes, tu les nommes clairement, avec tact. Rédige TOUT en français, en tutoyant la personne, sur un ton accessible.",
    "",
    "MÉTHODE — examine la photo zone par zone, dans cet ordre :",
    "1. Front · 2. Zone T (nez + entre les sourcils) · 3. Joue gauche · 4. Joue droite · 5. Menton · 6. Contour des yeux · 7. Teint d'ensemble.",
    "Tiens compte de la lumière et de la qualité de la photo : si une zone est floue, sombre ou masquée, dis-le et reste prudent plutôt que d'inventer.",
    "",
    "ÉTAPE 1 — Remplis D'ABORD le champ `observations` : une description factuelle, zone par zone, de ce que tu vois réellement (ex. « Front : brillant, 2-3 petits boutons ; Joues : légères rougeurs diffuses ; Yeux : cernes colorés »). C'est ta base de raisonnement — fais-la AVANT toute note.",
    "",
    "ÉTAPE 2 — Note ENSUITE chaque attribut de 1 (idéal/absent) à 4 (sévère), en t'appuyant sur tes observations. Utilise EXACTEMENT ces identifiants pour attributes[].id, selon cette grille :",
    "",
    "Imperfections :",
    "- acne — 1=peau nette · 2=quelques comédons ou 1-3 petits boutons localisés · 3=plusieurs boutons inflammatoires sur ≥1 zone · 4=nombreux boutons inflammatoires ou étendus.",
    "- comedones (points noirs) — 1=aucun · 2=quelques-uns sur le nez · 3=nombreux sur la zone T · 4=très nombreux et étendus.",
    "- post_acne_marks (marques ET cicatrices post-acné) — couvre à la fois les taches plates rouges/brunes ET les petites cicatrices en creux (cratères) laissées par d'anciens boutons. 1=aucune · 4=nombreuses marques et/ou cicatrices en creux marquées.",
    "- pores — 1=invisibles · 4=nettement dilatés (joues, nez).",
    "- texture (grain de peau & relief) — 1=lisse et régulier · 4=rugueux, irrégulier, reliefs/creux visibles (cratères, micro-reliefs).",
    "- flaking (desquamation) — 1=absente · 4=présente (peau qui pèle).",
    "",
    "Teint & éclat :",
    "- tone_evenness (irrégularités du teint) — 1=très uniforme · 2=quelques variations · 3=zones nettement plus rouges/foncées · 4=très irrégulier (marbré, multi-tons).",
    "- radiance (teint terne) — 1=lumineux, frais · 4=grisâtre, fatigué, sans éclat.",
    "- dark_spots (taches) — 1=aucune · 4=taches pigmentaires marquées.",
    "- redness (rougeurs) — 1=aucune · 3=rougeurs diffuses (joues/nez) · 4=marquées, étendues.",
    "- shine (brillance) — 1=peau mate · 2=brillance sur la zone T uniquement · 4=visage globalement luisant.",
    "- visible_vessels (vaisseaux apparents) — 1=absents · 4=présents (petits vaisseaux rouges visibles).",
    "",
    "Signes d'âge (prudence : difficile sur une photo de face en lumière normale ; ne note > 1 que si nettement visible) :",
    "- fine_lines (ridules) — 1=aucune · 4=ridules marquées.",
    "- wrinkles (rides) — 1=absentes · 4=rides profondes installées.",
    "",
    "Zone yeux :",
    "- under_eye_circles (cernes) — 1=absents · 4=creux et/ou colorés marqués.",
    "- under_eye_puffiness (poches) — 1=absentes · 4=présentes (gonflement sous l'œil).",
    "",
    "Pour chaque attribut : level (1-4), tip = mot-clé court (ex. « modérées »), et situation = une phrase d'analyse concrète et LOCALISÉE (où, à quel point), avec éventuellement <b>…</b> sur les mots forts.",
    "",
    "PROFIL :",
    "- skinType (type de peau, inspiré de Baumann) : déduis-le de la brillance par zone ET du questionnaire — brillance partout = Grasse ; brillance zone T seulement = Mixte ; ni brillance ni tiraillement = Normale ; desquamation/tiraillement = Sèche. Ajoute « sensible » si rougeurs/réactivité (photo ou déclaré).",
    "- phototype (Fitzpatrick 1-6) + carnation (1-6, clair→foncé) + carnationLabel : d'après la couleur de peau visible.",
    "- undertone (sous-ton, 1-4) : 1=froid (rosé/bleuté) · 2=chaud (doré/jaune) · 3=neutre · 4=olive (verdâtre). Donne le undertoneLabel correspondant (« Plutôt froid », « Plutôt chaud », « Neutre », « Olive »).",
    "- ageRange : fourchette d'âge estimée (ex. « 25–35 ans »). phototypeSub : courte description du phototype.",
    "",
    "SCORE : score global 0-100 qui DOIT refléter tes notes — beaucoup de niveaux 3-4 = score bas ; peau nette = score haut. Donne aussi state (ex. « Bon état général ») et sub (phrase de synthèse honnête).",
    "",
    "SORTIE : réponds STRICTEMENT en JSON, sans texte autour, avec les champs : observations, score, state, sub, photoQuality{ok, issue}, profile{skinType, ageRange, carnation, carnationLabel, undertone, undertoneLabel, phototype, phototypeSub}, attributes[{id, level, tip, situation}].",
    "Si la photo est inexploitable (floue, pas de visage, trop sombre), renvoie photoQuality.ok=false avec issue, et reste prudent sur les notes.",
    "",
    "QUESTIONNAIRE de la personne (croise systématiquement le déclaré avec ce que tu vois sur la photo) :",
    describeAnswers(answers),
  ].join("\n");
}
