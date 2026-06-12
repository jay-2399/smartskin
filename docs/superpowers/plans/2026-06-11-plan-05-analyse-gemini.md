# Plan 5 — Analyse Gemini + écran Résultats — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `POST /api/analyze` qui, pour un user connecté, envoie **photo + réponses** à Gemini (Vertex AI EU), reçoit un JSON structuré, **jette la photo**, sauvegarde l'`Analysis`, puis l'affiche (écran Résultats, réutilisé dans l'espace client).

**Architecture :** Logique pure et testée : **taxonomie** (concerns + actifs avec slug blog), **schéma de sortie zod**, **construction du prompt**, **mapping résultat → données écran**. Le client Vertex AI (effet de bord) est isolé et **mocké** dans les tests de la route. L'écran **Résultats** est un composant réutilisé par `/analyse` (fin de tunnel) et `/resultats/[id]` (espace client).

**Tech Stack :** `@google-cloud/vertexai`, zod, Vitest.

**Pré-requis :** Plans 1-4. (Le user est garanti connecté à `/analyse`.)

**Spec :** `docs/specs/2026-06-11-app-analyse-design.md` §7-8. Écran cible : `reference/User_flow_screens/11-prop_1-resultats.html`.

---

## Structure de fichiers visée

```
src/features/analysis/
├─ taxonomy.ts            ← CONCERNS + ACTIVES (avec blogSlug)
├─ schema.ts             ← zod : AnalysisResult (sortie Gemini)
├─ prompt.ts             ← buildPrompt(answers)  (testé)
├─ gemini.ts             ← client Vertex AI (effet de bord)
├─ save.ts               ← saveAnalysis(userId, answers, result)  (testé, db mockée)
└─ __tests__/
src/app/api/analyze/route.ts
src/components/screens/
├─ AnalyseScreen.tsx      ← "analyse en cours" → POST → redirige vers /resultats/[id]
└─ ResultsScreen.tsx      ← port de 11-prop_1-resultats.html
src/app/(espace)/resultats/[id]/page.tsx
src/app/(funnel)/analyse/page.tsx   ← remplace le placeholder du Plan 4
```

---

## Task 1 : Taxonomie (concerns + actifs)

**Files:**
- Create: `src/features/analysis/taxonomy.ts`

- [ ] **Step 1 : Définir la taxonomie** (aligne les `concerns` sur q1 ; `blogSlug` = articles du blog Lovable)

Create `src/features/analysis/taxonomy.ts` :
```ts
export const CONCERNS = [
  "hydratation", "eclat", "imperfections", "pores", "taches",
  "ridules", "fermete", "rougeurs", "contour_yeux", "brillance", "texture",
] as const;
export type Concern = (typeof CONCERNS)[number];

export type Active = { id: string; name: string; blogSlug: string };

export const ACTIVES: Active[] = [
  { id: "niacinamide", name: "Niacinamide", blogSlug: "niacinamide" },
  { id: "retinol", name: "Rétinol", blogSlug: "retinol" },
  { id: "vitc", name: "Vitamine C", blogSlug: "vitamine-c" },
  { id: "salicylic", name: "Acide salicylique", blogSlug: "acide-salicylique" },
  { id: "glycolic", name: "Acide glycolique", blogSlug: "acide-glycolique" },
  { id: "hyaluronic", name: "Acide hyaluronique", blogSlug: "acide-hyaluronique" },
  { id: "azelaic", name: "Acide azélaïque", blogSlug: "acide-azelaique" },
  { id: "spf", name: "SPF", blogSlug: "protection-solaire" },
];

export const ACTIVE_IDS = ACTIVES.map((a) => a.id);
export const ACTIVE_BY_ID = Object.fromEntries(ACTIVES.map((a) => [a.id, a]));
```

- [ ] **Step 2 : Commit**
```bash
git add -A && git commit -m "feat(analysis): taxonomie concerns + actifs (avec slugs blog)"
```

---

## Task 2 : Schéma de sortie zod (testé)

**Files:**
- Create: `src/features/analysis/schema.ts`
- Create: `src/features/analysis/__tests__/schema.test.ts`

- [ ] **Step 1 : Test (échoue)**

Create `src/features/analysis/__tests__/schema.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { AnalysisResultSchema } from "@/features/analysis/schema";

const valid = {
  score: 72,
  skinType: "mixte",
  metrics: [{ name: "Imperfections", value: 56, label: "Modéré" }],
  concerns: ["pores", "brillance"],
  actives: [{ id: "niacinamide", reason: "régule le sébum" }],
  photoQuality: { ok: true },
};

describe("AnalysisResultSchema", () => {
  it("accepte un résultat valide", () => {
    expect(() => AnalysisResultSchema.parse(valid)).not.toThrow();
  });
  it("rejette un score hors bornes", () => {
    expect(() => AnalysisResultSchema.parse({ ...valid, score: 140 })).toThrow();
  });
  it("rejette un actif hors taxonomie", () => {
    expect(() =>
      AnalysisResultSchema.parse({ ...valid, actives: [{ id: "magic", reason: "x" }] })
    ).toThrow();
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/features/analysis/__tests__/schema.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter**

Create `src/features/analysis/schema.ts` :
```ts
import { z } from "zod";
import { ACTIVE_IDS } from "./taxonomy";

export const AnalysisResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  skinType: z.string().min(1),
  metrics: z.array(z.object({
    name: z.string(), value: z.number().min(0).max(100), label: z.string(),
  })),
  concerns: z.array(z.string()),
  actives: z.array(z.object({
    id: z.enum(ACTIVE_IDS as [string, ...string[]]),
    reason: z.string(),
  })),
  photoQuality: z.object({ ok: z.boolean(), issue: z.string().optional() }),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/features/analysis/__tests__/schema.test.ts`
Expected : PASS.

- [ ] **Step 5 : Commit**
```bash
git add -A && git commit -m "feat(analysis): schéma de sortie zod (validé, actifs dans la taxonomie)"
```

---

## Task 3 : Construction du prompt (testé)

**Files:**
- Create: `src/features/analysis/prompt.ts`
- Create: `src/features/analysis/__tests__/prompt.test.ts`

- [ ] **Step 1 : Test (échoue)**

Create `src/features/analysis/__tests__/prompt.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { buildPrompt } from "@/features/analysis/prompt";
import { EMPTY_ANSWERS } from "@/features/funnel/types";

describe("buildPrompt", () => {
  const p = buildPrompt({ ...EMPTY_ANSWERS, q1: ["pores"], q4: "never" });

  it("contient la consigne de bilan non médical", () => {
    expect(p).toMatch(/bilan/i);
    expect(p).toMatch(/pas un diagnostic médical/i);
  });
  it("injecte les réponses du questionnaire", () => {
    expect(p).toContain("pores");
    expect(p).toContain("never");
  });
  it("borne le vocabulaire aux actifs de la taxonomie", () => {
    expect(p).toContain("niacinamide");
    expect(p).toContain("retinol");
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/features/analysis/__tests__/prompt.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter**

Create `src/features/analysis/prompt.ts` :
```ts
import type { Answers } from "@/features/funnel/types";
import { ACTIVE_IDS, CONCERNS } from "./taxonomy";

export function buildPrompt(answers: Answers): string {
  return [
    "Tu es l'assistant d'analyse de peau de SmartSkin.",
    "Tu produis un BILAN personnalisé à partir d'une PHOTO de visage et d'un questionnaire.",
    "Ce n'est PAS un diagnostic médical — reste sur une estimation visuelle prudente.",
    "",
    "Croise le visible (photo : rougeurs, brillance, pores, taches, texture) avec",
    "l'invisible (questionnaire ci-dessous).",
    "",
    `Préoccupations autorisées : ${CONCERNS.join(", ")}.`,
    `Actifs autorisés (identifiants EXACTS) : ${ACTIVE_IDS.join(", ")}.`,
    "N'utilise QUE ces identifiants pour le champ actives[].id.",
    "",
    "Réponds STRICTEMENT au format JSON imposé par le schéma fourni.",
    "",
    "Questionnaire de l'utilisateur :",
    JSON.stringify(answers, null, 2),
  ].join("\n");
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/features/analysis/__tests__/prompt.test.ts`
Expected : PASS.

- [ ] **Step 5 : Commit**
```bash
git add -A && git commit -m "feat(analysis): buildPrompt (vocabulaire cadré, bilan non médical) en TDD"
```

---

## Task 4 : Client Vertex AI (effet de bord) + sauvegarde (testée)

**Files:**
- Create: `src/features/analysis/gemini.ts`
- Create: `src/features/analysis/save.ts`
- Create: `src/features/analysis/__tests__/save.test.ts`
- Modify: `package.json` (dep `@google-cloud/vertexai`)

- [ ] **Step 1 : Installer Vertex AI**
Run: `cd /Users/jayenbellili/Documents/smartskin-app && npm i @google-cloud/vertexai`

- [ ] **Step 2 : Client Gemini** (région EU, sortie JSON)

Create `src/features/analysis/gemini.ts` :
```ts
import { VertexAI } from "@google-cloud/vertexai";
import { env } from "@/lib/env";
import { buildPrompt } from "./prompt";
import { AnalysisResultSchema, type AnalysisResult } from "./schema";
import type { Answers } from "@/features/funnel/types";

/** Envoie photo (JPEG) + réponses à Gemini ; renvoie un résultat validé. */
export async function analyzeWithGemini(
  imageJpeg: Buffer,
  answers: Answers
): Promise<AnalysisResult> {
  const vertex = new VertexAI({
    project: env.GOOGLE_CLOUD_PROJECT,
    location: env.GOOGLE_CLOUD_LOCATION, // europe-west*
  });
  const model = vertex.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(answers) },
          { inlineData: { mimeType: "image/jpeg", data: imageJpeg.toString("base64") } },
        ],
      },
    ],
  });

  const raw = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return AnalysisResultSchema.parse(JSON.parse(raw));
}
```

> Le modèle exact (`gemini-2.5-pro` ou version supérieure) est à confirmer côté Vertex (Phase de calibrage). La photo (`imageJpeg`) n'est jamais persistée : utilisée ici, puis garbage-collectée.

- [ ] **Step 3 : Test de sauvegarde (échoue)**

Create `src/features/analysis/__tests__/save.test.ts` :
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
vi.mock("@/lib/db", () => ({ db: { analysis: { create } } }));

import { saveAnalysis } from "@/features/analysis/save";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import type { AnalysisResult } from "@/features/analysis/schema";

const result: AnalysisResult = {
  score: 72, skinType: "mixte",
  metrics: [{ name: "Pores", value: 60, label: "Visibles" }],
  concerns: ["pores"],
  actives: [{ id: "niacinamide", reason: "sébum" }],
  photoQuality: { ok: true },
};

describe("saveAnalysis", () => {
  beforeEach(() => create.mockReset());
  it("persiste score/skinType + JSON, SANS aucune photo", async () => {
    create.mockResolvedValue({ id: "an-1" });
    const id = await saveAnalysis("user-1", EMPTY_ANSWERS, result);
    expect(id).toBe("an-1");
    const arg = create.mock.calls[0][0].data;
    expect(arg.userId).toBe("user-1");
    expect(arg.score).toBe(72);
    expect(JSON.stringify(arg)).not.toMatch(/image|photo|base64/i);
  });
});
```

- [ ] **Step 4 : Lancer, vérifier l'échec**
Run: `npm test src/features/analysis/__tests__/save.test.ts`
Expected : FAIL.

- [ ] **Step 5 : Implémenter `save.ts`**

Create `src/features/analysis/save.ts` :
```ts
import { db } from "@/lib/db";
import type { Answers } from "@/features/funnel/types";
import type { AnalysisResult } from "./schema";

export async function saveAnalysis(
  userId: string,
  answers: Answers,
  result: AnalysisResult
): Promise<string> {
  const row = await db.analysis.create({
    data: {
      userId,
      score: result.score,
      skinType: result.skinType,
      answers: answers as object,
      metrics: result.metrics as object,
      concerns: result.concerns as object,
      actives: result.actives as object,
      // aucune photo — jamais stockée
    },
    select: { id: true },
  });
  return row.id;
}
```

- [ ] **Step 6 : Lancer, vérifier le succès**
Run: `npm test src/features/analysis/__tests__/save.test.ts`
Expected : PASS.

- [ ] **Step 7 : Commit**
```bash
git add -A && git commit -m "feat(analysis): client Gemini (Vertex EU) + saveAnalysis (testé, sans photo)"
```

---

## Task 5 : Route `POST /api/analyze` (testée, gemini+db mockés)

**Files:**
- Create: `src/app/api/analyze/route.ts`
- Create: `src/app/api/analyze/__tests__/route.test.ts`

- [ ] **Step 1 : Test (échoue)**

Create `src/app/api/analyze/__tests__/route.test.ts` :
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const analyzeMock = vi.fn();
const saveMock = vi.fn();
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/features/analysis/gemini", () => ({ analyzeWithGemini: analyzeMock }));
vi.mock("@/features/analysis/save", () => ({ saveAnalysis: saveMock }));

import { POST } from "@/app/api/analyze/route";

function req(body: object) {
  return new Request("http://x/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const payload = {
  answers: { q1: ["pores"] },
  image: Buffer.from("x").toString("base64"),
};

describe("POST /api/analyze", () => {
  beforeEach(() => { authMock.mockReset(); analyzeMock.mockReset(); saveMock.mockReset(); });

  it("401 si non connecté", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(req(payload));
    expect(res.status).toBe(401);
  });

  it("connecté → analyse, sauvegarde, renvoie l'id", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    analyzeMock.mockResolvedValue({ score: 72, photoQuality: { ok: true } });
    saveMock.mockResolvedValue("an-1");
    const res = await POST(req(payload));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "an-1" });
    expect(saveMock).toHaveBeenCalled();
  });

  it("photo inexploitable → 422, pas de sauvegarde", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    analyzeMock.mockResolvedValue({ photoQuality: { ok: false, issue: "blurry" } });
    const res = await POST(req(payload));
    expect(res.status).toBe(422);
    expect(saveMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/app/api/analyze/__tests__/route.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter la route**

Create `src/app/api/analyze/route.ts` :
```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeWithGemini } from "@/features/analysis/gemini";
import { saveAnalysis } from "@/features/analysis/save";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { answers, image } = await request.json();
  if (!answers || !image)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const jpeg = Buffer.from(image, "base64");
  const result = await analyzeWithGemini(jpeg, answers);

  if (!result.photoQuality.ok)
    return NextResponse.json({ error: "photo_quality", issue: result.photoQuality.issue }, { status: 422 });

  const id = await saveAnalysis(session.user.id, answers, result);
  return NextResponse.json({ id });
  // jpeg sort de portée ici → jamais stocké
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/app/api/analyze/__tests__/route.test.ts`
Expected : PASS (3 tests).

- [ ] **Step 5 : Commit**
```bash
git add -A && git commit -m "feat(api): POST /api/analyze (auth, gemini, save, 422 photo) en TDD"
```

---

## Task 6 : Écran « Analyse en cours » (déclenche l'appel)

**Files:**
- Create: `src/components/screens/AnalyseScreen.tsx`
- Modify: `src/app/(funnel)/analyse/page.tsx` (remplace le placeholder du Plan 4)

- [ ] **Step 1 : `AnalyseScreen`** — au montage : lit `useFunnel` (answers + photo), encode la photo en base64, `POST /api/analyze`, puis `router.replace("/resultats/" + id)`. Gère 422 (photo) → retour `/capture` ; autres erreurs → message + relance. Anime le scan (reprendre l'animation de `reference/User_flow_screens/10-analyse.html`).

Create `src/components/screens/AnalyseScreen.tsx` :
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/features/funnel/store";

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

export function AnalyseScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const { answers, photo } = useFunnel.getState();
      if (!photo) { router.replace("/capture"); return; }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, image: await blobToBase64(photo) }),
      });
      if (res.status === 422) { router.replace("/capture"); return; }
      if (!res.ok) { setError("L'analyse a échoué. Réessaie."); return; }
      const { id } = await res.json();
      useFunnel.getState().reset(); // libère la photo de la mémoire
      router.replace(`/resultats/${id}`);
    })();
  }, [router]);

  return (
    <div className="analyse-screen">
      {error ? <p className="err">{error}</p> : <p>Analyse de ta peau en cours…</p>}
    </div>
  );
}
```

- [ ] **Step 2 : Brancher la route**

Overwrite `src/app/(funnel)/analyse/page.tsx` :
```tsx
import { AnalyseScreen } from "@/components/screens/AnalyseScreen";
export default function Page() { return <AnalyseScreen />; }
```

- [ ] **Step 3 : Build**
Run: `npm run build`
Expected : compile.

- [ ] **Step 4 : Commit**
```bash
git add -A && git commit -m "feat(funnel): écran analyse en cours (POST /api/analyze → résultats)"
```

---

## Task 7 : Écran Résultats (réutilisé tunnel + espace client)

**Files:**
- Create: `src/components/screens/ResultsScreen.tsx`
- Create: `src/features/analysis/format.ts` + test (mapping Analysis → props écran)
- Create: `src/app/(espace)/resultats/[id]/page.tsx`

- [ ] **Step 1 : Test du mapping (échoue)**

Create `src/features/analysis/__tests__/format.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { toResultsView } from "@/features/analysis/format";

describe("toResultsView", () => {
  it("attache les liens blog aux actifs via la taxonomie", () => {
    const v = toResultsView({
      score: 72, skinType: "mixte",
      metrics: [], concerns: ["pores"],
      actives: [{ id: "niacinamide", reason: "sébum" }],
    });
    expect(v.actives[0]).toMatchObject({
      name: "Niacinamide", blogSlug: "niacinamide", reason: "sébum",
    });
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/features/analysis/__tests__/format.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter le mapping**

Create `src/features/analysis/format.ts` :
```ts
import { ACTIVE_BY_ID } from "./taxonomy";

type StoredAnalysis = {
  score: number; skinType: string;
  metrics: { name: string; value: number; label: string }[];
  concerns: string[];
  actives: { id: string; reason: string }[];
};

export function toResultsView(a: StoredAnalysis) {
  return {
    score: a.score,
    skinType: a.skinType,
    metrics: a.metrics,
    concerns: a.concerns,
    actives: a.actives.map((x) => ({
      name: ACTIVE_BY_ID[x.id]?.name ?? x.id,
      blogSlug: ACTIVE_BY_ID[x.id]?.blogSlug ?? "",
      reason: x.reason,
    })),
  };
}
export type ResultsView = ReturnType<typeof toResultsView>;
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/features/analysis/__tests__/format.test.ts`
Expected : PASS.

- [ ] **Step 5 : `ResultsScreen`** — porter `reference/User_flow_screens/11-prop_1-resultats.html` (jauge demi-cercle, métriques, type de peau, tuiles concerns avec les 4 icônes existantes + `onerror` qui masque les manquantes, actifs avec liens vers `https://smart-skin.ai/blog/[blogSlug]`). Reçoit `view: ResultsView`.

Create `src/app/(espace)/resultats/[id]/page.tsx` :
```tsx
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/guard";
import { db } from "@/lib/db";
import { toResultsView } from "@/features/analysis/format";
import { ResultsScreen } from "@/components/screens/ResultsScreen";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const a = await db.analysis.findFirst({ where: { id, userId: user.id } });
  if (!a) notFound();
  return <ResultsScreen view={toResultsView(a as never)} />;
}
```

- [ ] **Step 6 : Build + tests**
Run: `npm run build && npm test`
Expected : OK.

- [ ] **Step 7 : Commit**
```bash
git add -A && git commit -m "feat(analysis): écran Résultats (mapping testé) réutilisé tunnel + espace client"
```

---

## Definition of Done (Plan 5)
- Parcours complet : capture → q2…q7 → /compte → auth → /analyse → **appel Gemini réel** → /resultats/[id].
- Photo envoyée à Gemini puis **jamais stockée** (vérifié par test de `saveAnalysis`).
- Sortie Gemini validée par schéma zod ; actifs cadrés sur la taxonomie, liens vers le blog.
- Écran Résultats réutilisé à l'identique dans l'espace client.
- Logique pure testée : taxonomie/schéma/prompt/save/format/route.

## Hors périmètre
- Rate-limit, logging calibrage, DPA, déploiement réel, DNS, mentions légales → **Plan 6**.
- Finition pixel de l'écran Résultats (port complet de prop_1) à soigner à l'exécution.
