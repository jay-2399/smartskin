# Plan 4 — Auth (sans mot de passe) + Espace client — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mur d'inscription `/compte` après q7, connexion **Google + lien magique** (Auth.js, sans mot de passe), zone `(espace)` protégée avec l'historique des analyses. Après authentification → `/analyse`.

**Architecture :** Auth.js (NextAuth v5) avec **adapter Prisma** (tables Account/Session/VerificationToken). Provider **Google** + provider **Resend** (email/magic link). Le `layout.tsx` de `(espace)` exige une session. La lecture des analyses d'un user est une **fonction de repository testée** (db mockée).

**Tech Stack :** `next-auth@beta` (v5), `@auth/prisma-adapter`, `resend`, Vitest.

**Pré-requis :** Plans 1-3. (Le contenu des analyses vient du Plan 5 ; ici l'historique peut être vide.)

---

## Structure de fichiers visée

```
src/
├─ auth.ts                       ← config Auth.js (handlers, signIn, auth)
├─ app/api/auth/[...nextauth]/route.ts
├─ features/account/
│  ├─ queries.ts                 ← getUserAnalyses(userId)  (testé)
│  └─ __tests__/queries.test.ts
├─ features/auth/guard.ts        ← requireUser() (redirige si pas de session)
├─ components/screens/
│  ├─ SignupWallScreen.tsx       ← /compte
│  └─ MesAnalysesScreen.tsx
└─ app/(espace)/
   ├─ layout.tsx                 ← protège la zone
   └─ mes-analyses/page.tsx
└─ app/(funnel)/compte/page.tsx  ← mur d'inscription
```

---

## Task 1 : Étendre le schéma Prisma pour Auth.js

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1 : Ajouter les modèles Auth.js**

Modify `prisma/schema.prisma` — ajouter (et compléter `User`) :
```prisma
model User {
  id            String     @id @default(cuid())
  email         String     @unique
  name          String?
  emailVerified DateTime?
  image         String?
  createdAt     DateTime   @default(now())
  analyses      Analysis[]
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

- [ ] **Step 2 : Migration**
Run: `cd /Users/jayenbellili/Documents/smartskin-app && npx prisma migrate dev --name auth`
Expected : migration appliquée, tables Account/Session/VerificationToken créées.

- [ ] **Step 3 : Commit**
```bash
git add -A && git commit -m "feat(auth): schéma Prisma Auth.js (Account/Session/VerificationToken)"
```

---

## Task 2 : Config Auth.js (Google + lien magique Resend)

**Files:**
- Create: `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `package.json` (deps)

- [ ] **Step 1 : Installer les dépendances**
Run: `cd /Users/jayenbellili/Documents/smartskin-app && npm i next-auth@beta @auth/prisma-adapter resend`

- [ ] **Step 2 : Config Auth.js**

Create `src/auth.ts` :
```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [
    Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }),
    Resend({ apiKey: env.RESEND_API_KEY, from: "SmartSkin <bonjour@smart-skin.ai>" }),
  ],
  pages: { signIn: "/compte" },
});
```

- [ ] **Step 3 : Route handler**

Create `src/app/api/auth/[...nextauth]/route.ts` :
```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4 : Ajouter AUTH_URL/secret à `.env`** (dev)
Run:
```bash
printf 'AUTH_SECRET="%s"\n' "$(openssl rand -base64 32)" >> .env
```
> Google OAuth + Resend : renseigner les clés réelles dans `.env` (cf. `.env.example`). En dev sans clés, seul le build est vérifié ; le login réel se teste au Plan 6.

- [ ] **Step 5 : Build (type-check)**
Run: `npm run build`
Expected : compile.

- [ ] **Step 6 : Commit**
```bash
git add -A && git commit -m "feat(auth): config Auth.js (Google + lien magique Resend) + route handler"
```

---

## Task 3 : Repository des analyses (testé)

**Files:**
- Create: `src/features/account/queries.ts`
- Create: `src/features/account/__tests__/queries.test.ts`

- [ ] **Step 1 : Test (échoue)**

Create `src/features/account/__tests__/queries.test.ts` :
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
vi.mock("@/lib/db", () => ({ db: { analysis: { findMany } } }));

import { getUserAnalyses } from "@/features/account/queries";

describe("getUserAnalyses", () => {
  beforeEach(() => findMany.mockReset());

  it("interroge les analyses du user, triées par date décroissante", async () => {
    findMany.mockResolvedValue([{ id: "a1", score: 72, skinType: "mixte" }]);
    const r = await getUserAnalyses("user-1");
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      select: { id: true, score: true, skinType: true, createdAt: true },
    });
    expect(r).toHaveLength(1);
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/features/account/__tests__/queries.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter**

Create `src/features/account/queries.ts` :
```ts
import { db } from "@/lib/db";

export function getUserAnalyses(userId: string) {
  return db.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, score: true, skinType: true, createdAt: true },
  });
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/features/account/__tests__/queries.test.ts`
Expected : PASS.

- [ ] **Step 5 : Commit**
```bash
git add -A && git commit -m "feat(account): getUserAnalyses (repository testé, db mockée)"
```

---

## Task 4 : Garde de session + zone protégée

**Files:**
- Create: `src/features/auth/guard.ts`
- Create: `src/app/(espace)/layout.tsx`
- Create: `src/components/screens/MesAnalysesScreen.tsx`
- Create: `src/app/(espace)/mes-analyses/page.tsx`

- [ ] **Step 1 : Garde de session**

Create `src/features/auth/guard.ts` :
```ts
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Renvoie l'utilisateur connecté, sinon redirige vers le mur d'inscription. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/compte");
  return session.user;
}
```

- [ ] **Step 2 : Layout protégé**

Create `src/app/(espace)/layout.tsx` :
```tsx
import { requireUser } from "@/features/auth/guard";

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  await requireUser(); // redirige si pas de session
  return <div className="espace">{children}</div>;
}
```

- [ ] **Step 3 : Écran historique**

Create `src/components/screens/MesAnalysesScreen.tsx` :
```tsx
import Link from "next/link";

type Item = { id: string; score: number; skinType: string; createdAt: Date };

export function MesAnalysesScreen({ items }: { items: Item[] }) {
  if (items.length === 0)
    return <p className="empty">Aucune analyse pour l'instant. Lance ton premier bilan.</p>;
  return (
    <ul className="analyses-list">
      {items.map((a) => (
        <li key={a.id}>
          <Link href={`/resultats/${a.id}`}>
            Score {a.score} · {a.skinType} ·{" "}
            {new Intl.DateTimeFormat("fr-FR").format(a.createdAt)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

Create `src/app/(espace)/mes-analyses/page.tsx` :
```tsx
import { requireUser } from "@/features/auth/guard";
import { getUserAnalyses } from "@/features/account/queries";
import { MesAnalysesScreen } from "@/components/screens/MesAnalysesScreen";

export default async function Page() {
  const user = await requireUser();
  const items = await getUserAnalyses(user.id);
  return <MesAnalysesScreen items={items} />;
}
```

- [ ] **Step 4 : Build**
Run: `npm run build`
Expected : compile.

- [ ] **Step 5 : Commit**
```bash
git add -A && git commit -m "feat(espace): garde de session + zone protégée + historique des analyses"
```

---

## Task 5 : Mur d'inscription `/compte`

**Files:**
- Create: `src/components/screens/SignupWallScreen.tsx`
- Create: `src/app/(funnel)/compte/page.tsx`

- [ ] **Step 1 : Écran du mur**

Create `src/components/screens/SignupWallScreen.tsx` :
```tsx
"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function SignupWallScreen() {
  const [email, setEmail] = useState("");
  return (
    <div className="wall">
      <h2 className="qtitle">Crée ton compte pour voir tes résultats</h2>

      <button
        type="button"
        className="cta cta-google"
        onClick={() => signIn("google", { callbackUrl: "/analyse" })}
      >
        Continuer avec Google
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          signIn("resend", { email, callbackUrl: "/analyse" });
        }}
      >
        <input
          type="email"
          required
          placeholder="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="cta">Recevoir un lien magique</button>
      </form>

      <p className="legal-note">
        Bilan personnalisé, pas un diagnostic médical. Ta photo n'est pas conservée.
      </p>
    </div>
  );
}
```

- [ ] **Step 2 : Page** (rediriger vers `/analyse` si déjà connecté)

Create `src/app/(funnel)/compte/page.tsx` :
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupWallScreen } from "@/components/screens/SignupWallScreen";

export default async function Page() {
  const session = await auth();
  if (session?.user?.id) redirect("/analyse");
  return <SignupWallScreen />;
}
```

- [ ] **Step 3 : Placeholder `/analyse`** (remplacé au Plan 5)

Create `src/app/(funnel)/analyse/page.tsx` :
```tsx
export default function Page() {
  return <div className="qscreen"><h2 className="qtitle">Analyse en cours (placeholder — Plan 5)</h2></div>;
}
```

- [ ] **Step 4 : Build + tests**
Run: `npm run build && npm test`
Expected : OK.

- [ ] **Step 5 : Commit**
```bash
git add -A && git commit -m "feat(funnel): mur d'inscription /compte (Google + lien magique) → /analyse"
```

---

## Definition of Done (Plan 4)
- q7 « Continuer » → `/compte` ; choix Google ou lien magique ; après auth → `/analyse`.
- Zone `(espace)` inaccessible sans session (redirige vers `/compte`).
- `/mes-analyses` liste les analyses du user (vide pour l'instant).
- `getUserAnalyses` testé.

## Hors périmètre
- L'appel Gemini + écran Résultats + sauvegarde d'analyse → **Plan 5**.
- OAuth consent screen Google, domaine de prod, DPA → **Plan 6**.
