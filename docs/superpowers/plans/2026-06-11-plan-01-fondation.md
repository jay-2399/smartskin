# Plan 1 — Fondation (SmartSkin App) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place un squelette Next.js déployable et testable pour `app.smart-skin.ai` : TypeScript, chaîne de tests, validation des variables d'environnement, base Postgres via Prisma (schéma User/Analysis/CaptureMetric), CSS de la charte (tokens + fonts), et config de déploiement Render.

**Architecture :** Next.js (App Router, `src/`) en service unique sur Render (EU). Logique métier future isolée dans `src/features/*`, écrans dans `src/components/screens/`, primitives dans `src/components/ui/`, helpers dans `src/lib/`. Postgres accédé via Prisma. Aucune photo n'est jamais stockée (aucune colonne photo).

**Tech Stack :** Next.js 15 (App Router, TypeScript), React 19, Prisma + PostgreSQL, Vitest + @testing-library/react (jsdom), zod (validation env), `next/font`. Pas de Tailwind (CSS maison repris de la charte).

**Contexte repo :** dépôt déjà créé à `/Users/jayenbellili/Documents/smartskin-app` (git initialisé, contient `CLAUDE.md`, `README.md`, `.gitignore`, `docs/`, `reference/`). Le scaffold Next ne doit PAS écraser ces fichiers.

**Spec de référence :** `docs/specs/2026-06-11-app-analyse-design.md` · **Charte :** `docs/specs/charte-graphique.md`

---

## Structure de fichiers visée (fin de Plan 1)

```
smartskin-app/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx          ← layout racine (fonts + globals.css)
│  │  ├─ page.tsx            ← page d'accueil temporaire (smoke)
│  │  └─ globals.css         ← tokens charte + reset
│  ├─ lib/
│  │  ├─ env.ts              ← validation zod des variables d'env (serveur)
│  │  └─ db.ts               ← singleton client Prisma
│  └─ test/
│     └─ setup.ts            ← setup testing-library
├─ prisma/
│  └─ schema.prisma          ← User, Analysis, CaptureMetric
├─ .env.example              ← gabarit des variables (jamais de vraies clés)
├─ .env                      ← local, ignoré par git
├─ render.yaml               ← web service + Postgres (EU)
├─ vitest.config.ts
├─ next.config.ts
├─ tsconfig.json
└─ package.json
```

---

## Task 1 : Scaffolder Next.js sans écraser le dépôt existant

**Files:**
- Create: tout l'arbre Next standard (`package.json`, `next.config.ts`, `tsconfig.json`, `src/app/*`, …)
- Préserve: `CLAUDE.md`, `README.md`, `.gitignore`, `docs/`, `reference/`

- [ ] **Step 1 : Générer Next.js dans un dossier temporaire** (évite le refus de `create-next-app` sur un dossier non vide)

Run:
```bash
cd /Users/jayenbellili/Documents
npx create-next-app@latest smartskin-app-tmp \
  --ts --app --src-dir --eslint --no-tailwind --no-turbopack \
  --import-alias "@/*" --use-npm
```
Expected : un dossier `smartskin-app-tmp/` créé avec `src/app/`, `package.json`, etc.

- [ ] **Step 2 : Fusionner le scaffold dans le dépôt existant** (sans écraser README/.gitignore/docs)

Run:
```bash
cd /Users/jayenbellili/Documents
rsync -a \
  --exclude='.git' --exclude='README.md' --exclude='.gitignore' \
  smartskin-app-tmp/ smartskin-app/
rm -rf smartskin-app-tmp
```
Expected : `smartskin-app/src/app/page.tsx`, `package.json`, `next.config.ts` présents ; `CLAUDE.md`, `docs/`, `reference/` intacts.

- [ ] **Step 3 : Vérifier que le build passe**

Run:
```bash
cd /Users/jayenbellili/Documents/smartskin-app
npm run build
```
Expected : build Next réussi (« Compiled successfully »).

- [ ] **Step 4 : Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js (App Router, TS, src/) sans toucher aux docs"
```

---

## Task 2 : Chaîne de tests (Vitest + Testing Library)

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`
- Create (test témoin): `src/lib/__tests__/smoke.test.ts`
- Modify: `package.json` (scripts + devDeps)

- [ ] **Step 1 : Installer les dépendances de test**

Run:
```bash
cd /Users/jayenbellili/Documents/smartskin-app
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
Expected : ajout dans `devDependencies`.

- [ ] **Step 2 : Créer la config Vitest**

Create `vitest.config.ts` :
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3 : Créer le setup Testing Library**

Create `src/test/setup.ts` :
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4 : Ajouter les scripts de test**

Modify `package.json` — dans `"scripts"`, ajouter :
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5 : Écrire un test témoin qui échoue**

Create `src/lib/__tests__/smoke.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { ping } from "@/lib/smoke";

describe("ping", () => {
  it("retourne pong", () => {
    expect(ping()).toBe("pong");
  });
});
```

- [ ] **Step 6 : Lancer le test, vérifier l'échec**

Run: `npm test`
Expected : FAIL — `Cannot find module '@/lib/smoke'`.

- [ ] **Step 7 : Implémentation minimale**

Create `src/lib/smoke.ts` :
```ts
export function ping(): string {
  return "pong";
}
```

- [ ] **Step 8 : Relancer, vérifier le succès**

Run: `npm test`
Expected : PASS (1 test).

- [ ] **Step 9 : Commit**

```bash
git add -A
git commit -m "test: configure Vitest + Testing Library (test témoin)"
```

---

## Task 3 : Validation des variables d'environnement (zod)

**Files:**
- Create: `src/lib/env.ts`, `src/lib/__tests__/env.test.ts`
- Create: `.env.example`
- Modify: `package.json` (dep zod)

- [ ] **Step 1 : Installer zod**

Run:
```bash
cd /Users/jayenbellili/Documents/smartskin-app
npm i zod
```

- [ ] **Step 2 : Écrire le test qui échoue**

Create `src/lib/__tests__/env.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  AUTH_SECRET: "x".repeat(32),
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  RESEND_API_KEY: "re_test",
  GOOGLE_CLOUD_PROJECT: "ss-app",
  GOOGLE_CLOUD_LOCATION: "europe-west1",
};

describe("parseEnv", () => {
  it("accepte un environnement valide", () => {
    expect(() => parseEnv(valid)).not.toThrow();
  });

  it("rejette une DATABASE_URL absente", () => {
    const { DATABASE_URL, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow();
  });

  it("rejette un AUTH_SECRET trop court", () => {
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "court" })).toThrow();
  });
});
```

- [ ] **Step 3 : Lancer, vérifier l'échec**

Run: `npm test src/lib/__tests__/env.test.ts`
Expected : FAIL — `Cannot find module '@/lib/env'`.

- [ ] **Step 4 : Implémenter `env.ts`**

Create `src/lib/env.ts` :
```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  GOOGLE_CLOUD_LOCATION: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/** Valide un objet d'environnement. Lève si invalide. */
export function parseEnv(source: Record<string, unknown>): Env {
  return envSchema.parse(source);
}

/** Environnement validé du process (serveur uniquement).
 *  En contexte de test (Vitest), on NE valide PAS process.env :
 *  les tests appellent parseEnv() avec leurs propres objets. */
export const env: Env =
  process.env.VITEST || process.env.NODE_ENV === "test"
    ? ({} as Env)
    : parseEnv(process.env as Record<string, unknown>);
```

> ⚠️ `env.ts` ne doit JAMAIS être importé depuis un composant client (clés serveur). Il sera importé par les routes API et la config Prisma/Auth.

- [ ] **Step 5 : Relancer, vérifier le succès**

Run: `npm test src/lib/__tests__/env.test.ts`
Expected : PASS (3 tests).

- [ ] **Step 6 : Créer le gabarit `.env.example`**

Create `.env.example` :
```bash
# Base de données (Render Postgres EU)
DATABASE_URL="postgresql://user:password@host:5432/smartskin"

# Auth.js
AUTH_SECRET="genere-avec: openssl rand -base64 32"

# Google OAuth (connexion un clic)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Resend (liens magiques par email)
RESEND_API_KEY=""

# Vertex AI (Gemini) — région UE
GOOGLE_CLOUD_PROJECT=""
GOOGLE_CLOUD_LOCATION="europe-west1"
# Chemin du fichier de credentials de service (jamais commité)
GOOGLE_APPLICATION_CREDENTIALS="./gcloud-key.json"
```

- [ ] **Step 7 : Commit**

```bash
git add -A
git commit -m "feat: validation zod des variables d'environnement + .env.example"
```

---

## Task 4 : Prisma + schéma de base (User / Analysis / CaptureMetric)

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`
- Create: `src/lib/__tests__/db.test.ts`
- Modify: `package.json` (deps prisma)

- [ ] **Step 1 : Installer Prisma**

Run:
```bash
cd /Users/jayenbellili/Documents/smartskin-app
npm i -D prisma
npm i @prisma/client
```

- [ ] **Step 2 : Écrire le schéma Prisma**

Create `prisma/schema.prisma` :
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Auth.js gère Account / Session / VerificationToken (ajoutés au Plan 4) ──

model User {
  id        String     @id @default(cuid())
  email     String     @unique
  name      String?
  createdAt DateTime   @default(now())
  analyses  Analysis[]
}

model Analysis {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  score    Int      // ex. 72
  skinType String   // ex. "mixte"

  // Détails lus d'un bloc → JSON (PAS la photo, jamais stockée)
  answers  Json     // réponses q1–q7
  metrics  Json     // [{ name, value, label }]
  concerns Json     // string[]
  actives  Json     // [{ name, blogSlug, reason }]

  @@index([userId, createdAt])
}

// Calibrage des seuils de capture (Phase 1.5) — métriques anonymes, pas d'image
model CaptureMetric {
  id           String   @id @default(cuid())
  createdAt    DateTime @default(now())
  passed       Boolean
  mean         Float?
  stddev       Float?
  lateralDelta Float?
  yaw          Float?
  pitch        Float?
  roll         Float?
  stability    Float?
  sharpness    Float?
}
```

- [ ] **Step 3 : Démarrer un Postgres local pour le dev** (Docker ; sinon Postgres natif)

Run:
```bash
docker run --name smartskin-pg -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=smartskin -p 5432:5432 -d postgres:16
```
Puis créer `.env` local :
```bash
printf 'DATABASE_URL="postgresql://postgres:dev@localhost:5432/smartskin"\n' >> .env
```
Expected : conteneur `smartskin-pg` en cours (`docker ps`).

- [ ] **Step 4 : Créer la première migration**

Run:
```bash
npx prisma migrate dev --name init
```
Expected : dossier `prisma/migrations/<timestamp>_init/` créé ; tables `User`, `Analysis`, `CaptureMetric` créées ; client Prisma généré.

- [ ] **Step 5 : Écrire le singleton client + son test**

Create `src/lib/db.ts` :
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

Create `src/lib/__tests__/db.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("db", () => {
  it("expose les modèles attendus", () => {
    expect(db).toHaveProperty("user");
    expect(db).toHaveProperty("analysis");
    expect(db).toHaveProperty("captureMetric");
  });
});
```

- [ ] **Step 6 : Lancer le test, vérifier le succès**

Run: `npm test src/lib/__tests__/db.test.ts`
Expected : PASS (1 test, 3 assertions).

- [ ] **Step 7 : Commit**

```bash
git add -A
git commit -m "feat: schéma Prisma (User/Analysis/CaptureMetric) + client db + migration init"
```

---

## Task 5 : CSS de la charte (tokens + fonts) et layout racine

**Files:**
- Modify: `src/app/globals.css` (remplacer le CSS par défaut par les tokens charte)
- Modify: `src/app/layout.tsx` (fonts via `next/font`, lang fr)
- Modify: `src/app/page.tsx` (page de smoke utilisant les tokens)

- [ ] **Step 1 : Remplacer `globals.css` par les tokens de la charte**

Overwrite `src/app/globals.css` :
```css
:root {
  /* base & encre */
  --bg:#F1F3F6; --ink:#1A1D21; --card:#FFFFFF;
  --cloud:#EDEFF7; --smoke:#D3D6E0; --steel:#BCBFCC;
  --space:#9DA2B3; --graphite:#6E7180; --arsenic:#40424D;
  /* accent bleu */
  --accent:#A6C3D6; --accent-d:#7FA6BE; --accent-bg:rgba(166,195,214,0.16);
  /* sémantiques */
  --green:#1FC977; --green-d:#13A35F; --green-bg:rgba(31,201,119,0.14);
  /* fonts (variables alimentées par next/font) */
  --fd: var(--font-manrope), system-ui, sans-serif;
  --fm: var(--font-jetbrains), ui-monospace, monospace;
}

*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

html, body {
  background:var(--bg);
  color:var(--ink);
  font-family:var(--fd);
  -webkit-font-smoothing:antialiased;
}
```

- [ ] **Step 2 : Charger les fonts dans le layout racine**

Overwrite `src/app/layout.tsx` :
```tsx
import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "SmartSkin — Analyse de peau",
  description: "Bilan de peau personnalisé par IA. Pas un diagnostic médical.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${manrope.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3 : Page de smoke utilisant les tokens**

Overwrite `src/app/page.tsx` :
```tsx
export default function Home() {
  return (
    <main style={{ padding: 48 }}>
      <p
        style={{
          fontFamily: "var(--fm)",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--accent-d)",
        }}
      >
        SmartSkin · App
      </p>
      <h1 style={{ fontWeight: 800, letterSpacing: "-0.035em", marginTop: 8 }}>
        Fondation prête.
      </h1>
    </main>
  );
}
```

- [ ] **Step 4 : Vérifier le rendu en dev**

Run: `npm run dev` puis ouvrir `http://localhost:3000`
Expected : fond gris `#F1F3F6`, eyebrow bleu en JetBrains Mono, titre Manrope gras. (Ctrl-C pour arrêter.)

- [ ] **Step 5 : Vérifier que le build passe toujours**

Run: `npm run build`
Expected : « Compiled successfully ».

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat: CSS charte (tokens + fonts Manrope/JetBrains) + layout racine fr"
```

---

## Task 6 : Config de déploiement Render

**Files:**
- Create: `render.yaml`
- Modify: `package.json` (script `postinstall` pour `prisma generate`)

- [ ] **Step 1 : Ajouter `prisma generate` au postinstall**

Modify `package.json` — dans `"scripts"`, ajouter :
```json
"postinstall": "prisma generate"
```

- [ ] **Step 2 : Écrire `render.yaml`** (web service + Postgres, région Frankfurt)

Create `render.yaml` :
```yaml
databases:
  - name: smartskin-db
    region: frankfurt
    plan: basic-256mb
    postgresMajorVersion: "16"

services:
  - type: web
    name: smartskin-app
    runtime: node
    region: frankfurt
    plan: starter
    buildCommand: npm ci && npm run build && npx prisma migrate deploy
    startCommand: npm run start
    healthCheckPath: /
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: smartskin-db
          property: connectionString
      - key: AUTH_SECRET
        generateValue: true
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: RESEND_API_KEY
        sync: false
      - key: GOOGLE_CLOUD_PROJECT
        sync: false
      - key: GOOGLE_CLOUD_LOCATION
        value: europe-west1
```

> Note : `migrate deploy` (et non `migrate dev`) en build de prod — applique les migrations existantes sans en générer. Les secrets `sync: false` se renseignent dans le dashboard Render.

- [ ] **Step 3 : Vérifier la syntaxe YAML**

Run: `npx --yes js-yaml render.yaml > /dev/null && echo "YAML OK"`
Expected : `YAML OK`.

- [ ] **Step 4 : Commit**

```bash
git add -A
git commit -m "chore: config de déploiement Render (web + Postgres EU) + prisma generate au postinstall"
```

---

## Task 7 : Vérification finale de la fondation

- [ ] **Step 1 : Suite de tests verte**

Run: `npm test`
Expected : tous les tests passent (smoke, env ×3, db).

- [ ] **Step 2 : Build de production**

Run: `npm run build`
Expected : « Compiled successfully », aucune erreur de type.

- [ ] **Step 3 : Lint**

Run: `npm run lint`
Expected : aucune erreur.

- [ ] **Step 4 : Vérifier l'intégrité du dépôt** (docs/reference toujours là)

Run: `ls CLAUDE.md docs/specs reference/User_flow_screens && git status`
Expected : fichiers présents, arbre propre (tout committé).

---

## Definition of Done (Plan 1)
- `npm run dev` sert une page aux couleurs/fonts de la charte.
- `npm test`, `npm run build`, `npm run lint` passent.
- Base Postgres migrée avec `User`, `Analysis`, `CaptureMetric` (aucune colonne photo).
- `env.ts` valide les variables au démarrage serveur ; `.env.example` documente les clés.
- `render.yaml` prêt pour un déploiement EU.
- `CLAUDE.md`, `docs/`, `reference/` intacts.

## Hors périmètre (plans suivants)
- Écrans du tunnel & store d'état → **Plan 2**
- Capture MediaPipe → **Plan 3**
- Auth.js + espace client → **Plan 4**
- Gemini / `/api/analyze` → **Plan 5**
- Déploiement réel, DPA, rate-limit, mentions légales → **Plan 6**
