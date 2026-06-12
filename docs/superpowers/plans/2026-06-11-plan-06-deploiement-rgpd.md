# Plan 6 — Déploiement, RGPD & finitions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre l'app en production sur `app.smart-skin.ai` (Render, EU), sécuriser l'endpoint d'analyse (rate-limit), brancher le logging de calibrage capture (Phase 1.5), et mettre la conformité à jour (DPA Vertex, mentions légales).

**Architecture :** Déploiement Render via `render.yaml` (Plan 1). Rate-limit applicatif simple en mémoire (suffisant pour un seul service ; Redis = évolution). Logging `CaptureMetric` via un endpoint dédié. Conformité = config (OAuth, DPA) + contenu (mentions légales).

**Tech Stack :** Render, Google Cloud / Vertex AI, Vitest.

**Pré-requis :** Plans 1-5 terminés (app fonctionnelle en local).

---

## Task 1 : Rate-limit de `/api/analyze` (testé)

**Files:**
- Create: `src/lib/rateLimit.ts`
- Create: `src/lib/__tests__/rateLimit.test.ts`
- Modify: `src/app/api/analyze/route.ts`

- [ ] **Step 1 : Test (échoue)**

Create `src/lib/__tests__/rateLimit.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/rateLimit";

describe("createRateLimiter", () => {
  it("autorise jusqu'à la limite puis bloque dans la fenêtre", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(rl.check("k", 0)).toBe(true);
    expect(rl.check("k", 100)).toBe(true);
    expect(rl.check("k", 200)).toBe(false); // 3e dans la fenêtre
  });
  it("réautorise après la fenêtre", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.check("k", 0)).toBe(true);
    expect(rl.check("k", 500)).toBe(false);
    expect(rl.check("k", 1500)).toBe(true);
  });
  it("isole les clés", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.check("a", 0)).toBe(true);
    expect(rl.check("b", 0)).toBe(true);
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/lib/__tests__/rateLimit.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter**

Create `src/lib/rateLimit.ts` :
```ts
type Opts = { limit: number; windowMs: number };

/** Rate-limiter en mémoire (fenêtre glissante simple). */
export function createRateLimiter({ limit, windowMs }: Opts) {
  const hits = new Map<string, number[]>();
  return {
    check(key: string, now: number = Date.now()): boolean {
      const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (arr.length >= limit) { hits.set(key, arr); return false; }
      arr.push(now);
      hits.set(key, arr);
      return true;
    },
  };
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/lib/__tests__/rateLimit.test.ts`
Expected : PASS.

- [ ] **Step 5 : Brancher sur la route**

Modify `src/app/api/analyze/route.ts` — après le check de session, ajouter (en tête de module et dans le handler) :
```ts
import { createRateLimiter } from "@/lib/rateLimit";
const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 }); // 5/min/user

// ... dans POST, juste après avoir obtenu session.user.id :
if (!limiter.check(session.user.id)) {
  return NextResponse.json({ error: "rate_limited" }, { status: 429 });
}
```

- [ ] **Step 6 : Build + tests**
Run: `npm run build && npm test`
Expected : OK.

- [ ] **Step 7 : Commit**
```bash
git add -A && git commit -m "feat(api): rate-limit de /api/analyze (5/min/user) en TDD"
```

---

## Task 2 : Endpoint de calibrage capture (Phase 1.5)

**Files:**
- Create: `src/app/api/capture-metrics/route.ts`
- Create: `src/app/api/capture-metrics/__tests__/route.test.ts`
- Modify: `src/features/capture/validationLoop.ts` (envoi best-effort à chaque tentative)

- [ ] **Step 1 : Test (échoue)**

Create `src/app/api/capture-metrics/__tests__/route.test.ts` :
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
const create = vi.fn();
vi.mock("@/lib/db", () => ({ db: { captureMetric: { create } } }));
import { POST } from "@/app/api/capture-metrics/route";

function req(body: object) {
  return new Request("http://x/api/capture-metrics", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/capture-metrics", () => {
  beforeEach(() => create.mockReset());
  it("enregistre des métriques anonymes", async () => {
    create.mockResolvedValue({ id: "m1" });
    const res = await POST(req({ passed: false, mean: 80, sharpness: 12 }));
    expect(res.status).toBe(204);
    expect(create).toHaveBeenCalled();
  });
  it("ignore un payload vide → 400, pas d'écriture", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/app/api/capture-metrics/__tests__/route.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter**

Create `src/app/api/capture-metrics/route.ts` :
```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const NUMERIC = ["mean", "stddev", "lateralDelta", "yaw", "pitch", "roll", "stability", "sharpness"] as const;

export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body?.passed !== "boolean")
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const data: Record<string, unknown> = { passed: body.passed };
  for (const k of NUMERIC) if (typeof body[k] === "number") data[k] = body[k];

  await db.captureMetric.create({ data: data as never });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/app/api/capture-metrics/__tests__/route.test.ts`
Expected : PASS.

- [ ] **Step 5 : Envoyer depuis la boucle de capture** (best-effort)

Modify `src/features/capture/validationLoop.ts` — à chaque déclenchement (ou échec marquant), envoyer les métriques :
```ts
// best-effort, ne bloque jamais l'UX
fetch("/api/capture-metrics", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ passed, mean, stddev, lateralDelta, yaw, pitch, roll, stability, sharpness }),
}).catch(() => {});
```

- [ ] **Step 6 : Commit**
```bash
git add -A && git commit -m "feat(capture): endpoint + logging calibrage des seuils (CaptureMetric, Phase 1.5)"
```

---

## Task 3 : Configurer Google Cloud / Vertex AI (EU) + DPA

> Étapes console (pas de code). À faire une fois.

- [ ] **Step 1 :** Créer un projet Google Cloud, noter l'ID → `GOOGLE_CLOUD_PROJECT`.
- [ ] **Step 2 :** Activer l'API **Vertex AI**. Choisir la région **`europe-west1`** (ou `europe-west4`).
- [ ] **Step 3 :** Créer un **compte de service** avec le rôle *Vertex AI User* ; générer une clé JSON. Ne PAS la commiter (cf. `.gitignore`).
- [ ] **Step 4 :** Accepter/signer le **DPA Google Cloud** (Data Processing Addendum) dans la console (Compliance) — couvre le traitement UE de la photo.
- [ ] **Step 5 :** Vérifier l'accès au modèle Gemini dans Vertex (Model Garden) pour la région choisie ; ajuster `model` dans `gemini.ts` si l'identifiant diffère.
- [ ] **Step 6 :** Tester un appel réel en local (`npm run dev`, parcours complet jusqu'à `/analyse`) → un résultat s'affiche.

---

## Task 4 : Configurer Google OAuth + Resend

> Étapes console (pas de code).

- [ ] **Step 1 :** Console Google → *OAuth consent screen* (External, infos SmartSkin), scopes email/profil.
- [ ] **Step 2 :** Créer des *OAuth credentials* (Web). **Redirect URIs** :
  - `http://localhost:3000/api/auth/callback/google` (dev)
  - `https://app.smart-skin.ai/api/auth/callback/google` (prod)
  → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- [ ] **Step 3 :** Resend → vérifier le domaine d'envoi (`smart-skin.ai`), créer une clé → `RESEND_API_KEY`. Configurer l'expéditeur `bonjour@smart-skin.ai`.
- [ ] **Step 4 :** Tester le lien magique en local (login via email).

---

## Task 5 : Déploiement Render + domaine

> Étapes console / git.

- [ ] **Step 1 :** Pousser le dépôt sur GitHub :
```bash
cd /Users/jayenbellili/Documents/smartskin-app
git remote add origin git@github.com:<compte>/smartskin-app.git
git push -u origin main
```
- [ ] **Step 2 :** Render → *New > Blueprint* → sélectionner le repo (lit `render.yaml`) → crée le Web Service + Postgres en **Frankfurt**.
- [ ] **Step 3 :** Renseigner les variables `sync:false` dans le dashboard : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `GOOGLE_CLOUD_PROJECT`, et la clé de service Vertex (en *Secret File* monté → `GOOGLE_APPLICATION_CREDENTIALS`).
- [ ] **Step 4 :** Ajouter `AUTH_URL=https://app.smart-skin.ai` dans les env Render.
- [ ] **Step 5 :** Domaine : Render → *Custom Domain* `app.smart-skin.ai` → ajouter le **CNAME** indiqué chez le registrar du domaine (le reste de `smart-skin.ai` reste sur Lovable, intouché).
- [ ] **Step 6 :** Vérifier le déploiement : `https://app.smart-skin.ai` répond, parcours complet fonctionne (login, analyse, résultats, espace client).

---

## Task 6 : Mentions légales & conformité (contenu)

**Files:**
- Create: `src/app/mentions-legales/page.tsx` (ou lien vers la page Lovable)

- [ ] **Step 1 :** Mettre à jour les mentions légales pour refléter **deux hébergeurs** :
  - Vitrine/blog : **Lovable Labs Incorporated** (serveurs UE).
  - App `app.smart-skin.ai` : **Render** (région Frankfurt, UE).
  - Mentionner le **sous-traitant Vertex AI / Google Cloud (UE, DPA signé)** pour le traitement de la photo, et la phrase **« la photo de visage n'est pas conservée »**.
- [ ] **Step 2 :** Lier les mentions légales depuis le mur d'inscription et le footer de l'espace client.
- [ ] **Step 3 :** Commit
```bash
git add -A && git commit -m "docs(legal): mentions légales app (Render EU + Vertex AI DPA + photo non conservée)"
```

---

## Task 7 : Vérification finale de bout en bout

- [ ] **Step 1 : Suite complète** — Run: `npm test` → tous les plans verts.
- [ ] **Step 2 : Build prod** — Run: `npm run build` → OK.
- [ ] **Step 3 : Parcours prod** sur `https://app.smart-skin.ai` :
  landing → q1 → capture (gate strict) → q2…q7 → /compte → login → analyse (Gemini réel) → résultats → /mes-analyses → reconsulter une analyse.
- [ ] **Step 4 : Contrôle RGPD** — vérifier qu'aucune table ne contient d'image (inspecter `Analysis` et `CaptureMetric` via `npx prisma studio`).

## Definition of Done (Plan 6)
- App en ligne sur `app.smart-skin.ai` (Render Frankfurt), domaine branché sans toucher Lovable.
- `/api/analyze` rate-limité ; logging de calibrage capture actif.
- Vertex AI EU + DPA ; OAuth Google + Resend opérationnels.
- Mentions légales à jour ; aucune photo stockée (vérifié).

## Phase 2 (hors de ces 6 plans)
- Flux produits → table `Product` + reco produits (catalogue interne) + affiliation.
- Suivi d'évolution entre analyses.
- Génération des 12 icônes de métriques manquantes.
