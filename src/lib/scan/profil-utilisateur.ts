import { db } from "@/lib/db";
import { AnalysisResultSchema } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";
import { PROFIL_NEUTRE } from "@/lib/scan/acces";
import { versProfilPeau, type ProfilPeau } from "@/lib/scan/profil-peau";

export { cleProfil } from "@/lib/scan/profil-peau";

/* LA COUTURE : le bilan visage d'un compte → le profil du moteur de notation produit.
   C'est le seul endroit qui fait de l'I/O ; la traduction elle-même est pure et vit
   dans profil-peau.ts.

   CETTE FONCTION NE DOIT JAMAIS JETER. overview/route.ts est la seule des cinq routes
   appelantes sans try/catch : une exception y remonterait non rattrapée. */

export type EtatProfil = "ok" | "aucun-bilan" | "indisponible";

export type Resolution =
  | { etat: "ok"; profil: ProfilPeau }
  | { etat: "aucun-bilan" | "indisponible"; profil: typeof PROFIL_NEUTRE };

/* ───────────── Normalisation des réponses ───────────── */

/** `POST /api/scan` écrit `answers: answers ?? {}` et ne valide RIEN — il n'existe
 *  aucun schéma zod pour `Answers`, contrairement à `AnalysisResult`. Ce qui est
 *  stocké n'est donc pas garanti conforme au type, et `SS.visage` conserve les
 *  réponses en localStorage ENTRE les versions de l'app : une entrée écrite par un
 *  ancien schéma survit indéfiniment.
 *
 *  Un spread `{ ...EMPTY_ANSWERS, ...row.answers }` ne suffit pas. Il ne protège que
 *  le premier niveau, et seulement contre l'ABSENCE — pas contre un `null` explicite
 *  ni contre un type inattendu :
 *    { q5: { changed: true } } → q5.symptoms disparaît → .includes sur undefined
 *    { q1: "blemishes" }       → .flatMap n'est pas une fonction
 *    { q7: null }              → .includes sur null
 *  Ces trois formes traversent jusqu'ici, dans la fonction qui ne doit jamais jeter. */
export function normaliserAnswers(v: unknown): Answers {
  const a = (v ?? {}) as Partial<Answers>;
  const liste = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : [];
  const q5 = (a.q5 ?? {}) as Partial<Answers["q5"]>;
  return {
    age: typeof a.age === "string" ? a.age : null,
    q1: liste(a.q1),
    q2: liste(a.q2),
    q3: liste(a.q3),
    q4: typeof a.q4 === "string" ? a.q4 : null,
    q5: {
      changed: typeof q5.changed === "boolean" ? q5.changed : null,
      symptoms: liste(q5.symptoms),
    },
    q6: typeof a.q6 === "string" ? a.q6 : null,
    q7: liste(a.q7),
  };
}

/* ───────────── Mémo par utilisateur ───────────── */

/* Sans lui, un seul écran de fiche produit déclenche deux lectures en base (fiche puis
   alternatives). INTERDIT de ranger ça dans un singleton sans clé : ce serait une fuite
   du profil d'un compte vers les autres. */
const TTL_MS = 5 * 60 * 1000;
const MAX_MEMO = 200;
const memo = new Map<string, { r: Resolution; t: number }>();

/** Invalidation explicite, appelée par POST /api/scan après un nouveau bilan. Sur
 *  Render multi-instance, seule l'instance qui écrit oublie ; les autres expirent par
 *  le TTL. La borne de fraîcheur est donc de 5 minutes après un re-scan. */
export function oublierProfil(uid: string): void {
  memo.delete(uid);
}

function lireMemo(uid: string): Resolution | null {
  const e = memo.get(uid);
  if (!e) return null;
  if (Date.now() - e.t > TTL_MS) {
    memo.delete(uid);
    return null;
  }
  return e.r;
}

function ecrireMemo(uid: string, r: Resolution): void {
  if (memo.size >= MAX_MEMO) {
    const premier = memo.keys().next();
    if (!premier.done) memo.delete(premier.value);   // FIFO
  }
  memo.set(uid, { r, t: Date.now() });
}

/* ───────────── La résolution ───────────── */

/** Profil de peau d'UN utilisateur, depuis son dernier bilan visage.
 *
 *  Jamais de profil par défaut : servir une peau inventée à quelqu'un qui a payé pour
 *  la sienne, c'est le bug qu'on corrige, en pire. Sans bilan → profil neutre, et
 *  l'écran doit proposer le scan. */
export async function profilUtilisateur(uid: string | null): Promise<Resolution> {
  if (!uid) return { etat: "aucun-bilan", profil: PROFIL_NEUTRE };

  const enMemo = lireMemo(uid);
  if (enMemo) return enMemo;

  let row: { answers: unknown; result: unknown } | null = null;
  try {
    row = await db.analysis.findFirst({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
      // `photoData` n'est PAS sélectionné : c'est une data URL base64 en base, la
      // charger à chaque consultation de fiche produit serait absurde.
      select: { answers: true, result: true },
    });
  } catch {
    // Base en panne : on ne mémorise pas un échec transitoire.
    return { etat: "indisponible", profil: PROFIL_NEUTRE };
  }

  if (!row) {
    const r: Resolution = { etat: "aucun-bilan", profil: PROFIL_NEUTRE };
    ecrireMemo(uid, r);
    return r;
  }

  // Même garde-fou que /api/moi/bilan : un bilan corrompu ne doit pas devenir un 500.
  const parsed = AnalysisResultSchema.safeParse(row.result);
  if (!parsed.success) {
    const r: Resolution = { etat: "indisponible", profil: PROFIL_NEUTRE };
    ecrireMemo(uid, r);
    return r;
  }

  try {
    const profil = versProfilPeau(parsed.data, normaliserAnswers(row.answers));
    const r: Resolution = { etat: "ok", profil };
    ecrireMemo(uid, r);
    return r;
  } catch {
    // Ceinture et bretelles : versProfilPeau est pure et ne devrait jamais jeter.
    return { etat: "indisponible", profil: PROFIL_NEUTRE };
  }
}
