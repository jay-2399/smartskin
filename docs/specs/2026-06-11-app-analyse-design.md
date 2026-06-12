# SmartSkin — App d'analyse (`app.smart-skin.ai`) — Design

> **Date :** 2026-06-11
> **Statut :** Design validé (brainstorm) — à transformer en plan d'implémentation
> **Périmètre :** Phase 1 — la partie *analyse* de l'app, sur son propre sous-domaine et son propre dépôt.

---

## 1. Contexte & périmètre

SmartSkin est à la fois **un blog/vitrine skincare** et **une app d'analyse de peau par IA**.

- La **vitrine + le blog** (`smart-skin.ai` + `www`) sont **déjà hébergés sur Lovable**. **On n'y touche pas.**
- Ce projet = **uniquement la partie analyse**, hébergée séparément sur **`app.smart-skin.ai`**, dans un **dépôt dédié**, déployée sur **Render**.

### Ce que fait l'app (Phase 1)
L'utilisateur répond à un questionnaire (q1–q7), prend une **photo de visage contrôlée en temps réel**, crée un compte, et reçoit un **bilan** : score, métriques, type de peau, préoccupations, et **actifs/ingrédients conseillés** (qui renvoient vers les articles du blog Lovable).

### Non-objectifs (Phase 1 — YAGNI)
- ❌ Pas de recommandation de **produits de marque** (→ Phase 2, via flux produits + affiliation).
- ❌ Pas de suivi d'évolution entre analyses (→ plus tard).
- ❌ Pas d'app mobile native (web responsive d'abord).

### Positionnement / conformité
C'est un **bilan personnalisé, pas un diagnostic médical** (disclaimer conservé, cohérent avec les mentions légales). La photo de visage = **donnée sensible** → traitement **dans l'UE**, **jamais stockée**.

---

## 2. Stack & hébergement

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js (App Router, React, TypeScript)** | Front + back dans un seul service ; auth, pages protégées, espace client ; état du tunnel côté client sans rechargement (indispensable pour garder la photo en mémoire) |
| Base de données | **PostgreSQL + Prisma** | Comptes + résultats sauvegardés ; Prisma = schéma typé |
| Auth | **Auth.js (NextAuth)** sans mot de passe | Google one-click + lien magique email ; aucun mot de passe stocké |
| Email | **Resend** (offre EU) | Envoi des liens magiques |
| IA | **Gemini (vision) via Vertex AI, région europe-west** | Analyse multimodale photo + réponses ; traitement UE (RGPD) |
| Capture | **MediaPipe Face Mesh** (client) | Validation live de la photo |
| Hébergement | **Render** — Web Service + Postgres, région **Frankfurt (EU)** | Déploiement git, région UE |

---

## 3. Architecture & flux de données

```
            app.smart-skin.ai  (Next.js sur Render, EU)
┌──────────────────────────────────────────────────────────────┐
│ FRONT (React, CSS existant réutilisé)                          │
│  landing → q1 → capture → q2…q7 → 🔒compte → analyse → résultats│
│  état du tunnel = EN MÉMOIRE (réponses q1–q7 + photo JPEG)     │
│                       │ POST /api/analyze { answers, image }   │
│                       ▼                                        │
│ BACK (routes API Next, serveur)                                │
│  1. valide la session + l'entrée                               │
│  2. appelle Gemini (Vertex AI EU) : photo + réponses           │
│  3. reçoit un JSON structuré { score, metrics, type, actives } │
│  4. JETTE la photo (jamais stockée)                            │
│  5. sauvegarde le résultat (rattaché au user)                  │
│                       │                                        │
│                       ▼                                        │
│ POSTGRES (Render EU, via Prisma)                               │
│  User · Analysis (résultat + réponses, PAS la photo)          │
└──────────────────────────────────────────────────────────────┘
        │ Auth.js (espace client)            │ liens sortants
        ▼                                     ▼
   Espace client                         Blog Lovable
   (reconsulter ses analyses)            (fiches ingrédients)
```

**Invariants :**
- La **photo ne touche jamais la base** : en mémoire serveur le temps de l'appel Gemini, puis détruite.
- On stocke le **résultat** + les **réponses q1–q7**, rattachés à un utilisateur.
- **Tout résultat appartient à un compte** (le mur d'inscription précède l'appel IA).

---

## 4. Parcours utilisateur & mur d'inscription

```
landing → q1 → capture (photo) → q2 … q7
                                   │
                                   ▼
                  🔒 « Crée ton compte pour voir tes résultats »  (signup / login)
                                   │
                                   ▼
                  analyse en cours  ← l'appel Gemini se lance ICI
                                   │
                                   ▼
                  résultats  (sauvegardés sur le compte)
  ──────────────────────────────────────────────────────────────
  plus tard : se connecter → espace client → reconsulter une analyse
```

**Conséquences (positives) :**
1. L'appel Gemini se fait **après** la création du compte → **aucun appel IA gaspillé** en cas d'abandon, et **chaque résultat est rattaché à un user** (pas de résultats orphelins).
2. La **photo vit en mémoire navigateur** depuis l'écran capture jusqu'à `/api/analyze` (elle traverse les questions *et* le formulaire d'inscription). → impose un **parcours client sans rechargement** (assuré par Next.js).

---

## 5. Structure du dépôt

Organisation **par fonctionnalité** (chaque domaine isolé, compréhensible et testable seul).

```
smartskin-app/
├─ app/                          ← ROUTAGE (Next.js App Router)
│  ├─ (funnel)/                  ← tunnel public, sans rechargement
│  │  ├─ layout.tsx              ← garde l'état en mémoire (photo + réponses)
│  │  ├─ page.tsx                ← landing
│  │  ├─ questions/[step]/       ← q1 … q7
│  │  ├─ capture/                ← prise de photo (module capture)
│  │  ├─ compte/                 ← 🔒 mur d'inscription
│  │  └─ analyse/                ← "analyse en cours" → appel analyze
│  ├─ (espace)/                  ← ESPACE CLIENT, protégé (session requise)
│  │  ├─ layout.tsx              ← redirige si non connecté
│  │  ├─ mes-analyses/           ← historique
│  │  └─ resultats/[id]/         ← détail d'une analyse
│  ├─ api/
│  │  ├─ analyze/route.ts        ← POST photo+réponses → Gemini → JSON → save
│  │  ├─ capture-metrics/route.ts← (Phase 1.5) log calibrage des seuils
│  │  └─ auth/[...nextauth]/     ← Auth.js
│  ├─ layout.tsx                 ← racine : fonts, CSS global
│  └─ globals.css                ← CSS existant (tokens, animations) réutilisé
│
├─ src/
│  ├─ features/                  ← LOGIQUE métier, isolée de l'UI
│  │  ├─ funnel/                 ← store d'état (réponses + photo), types
│  │  ├─ capture/                ← validation live (voir §6)
│  │  │  ├─ camera.ts            ← getUserMedia, flux vidéo, export JPEG 92%
│  │  │  ├─ faceMesh.ts          ← chargement + état MediaPipe
│  │  │  ├─ validationLoop.ts    ← boucle rAF (15-20 fps)
│  │  │  ├─ metrics/             ← calculateurs : faceSize, luminance, faceCount,
│  │  │  │                          orientation, stability, sharpness, centering
│  │  │  ├─ config.ts            ← VALIDATION_CONFIG (seuils + hystérésis)
│  │  │  └─ state.ts             ← état { …, canCapture }
│  │  ├─ analysis/               ← ⭐ cœur IA (voir §7)
│  │  │  ├─ gemini.ts            ← client Vertex AI (EU)
│  │  │  ├─ prompt.ts            ← construction du prompt
│  │  │  ├─ schema.ts            ← schéma JSON de sortie (zod)
│  │  │  └─ taxonomy.ts          ← concerns + actifs (+ slugs articles blog)
│  │  ├─ auth/                   ← helpers session
│  │  └─ account/                ← lecture des analyses d'un user
│  ├─ components/
│  │  ├─ ui/                     ← design system : gauge, boutons, tags, pills…
│  │  └─ screens/                ← TOUS les écrans (composants réutilisables)
│  └─ lib/
│     ├─ db.ts                   ← client Prisma
│     └─ env.ts                  ← validation des variables d'env
│
├─ prisma/schema.prisma          ← User, Analysis, CaptureMetric (Product = Phase 2)
├─ public/                       ← assets (logo, icônes, images)
├─ reference/                    ← maquettes HTML d'origine (non déployées)
├─ render.yaml                   ← web service + Postgres, région EU
├─ .env.example                  ← clés (jamais commitées)
├─ CLAUDE.md
└─ package.json
```

### Organisation des écrans — décision : **tous en composants** (`components/screens/`)
Chaque écran est un **composant réutilisable** ; les fichiers de route (`page.tsx`) sont **minces** et se contentent d'afficher le bon écran. Raison déterminante : l'écran **Résultats** est rendu à **deux endroits** (fin de tunnel `analyse/` **et** espace client `resultats/[id]/`) → un seul composant, jamais de duplication.

---

## 6. Module capture — validation photo en temps réel

> Référence détaillée : [`live-analysis.md`](./live-analysis.md) (source de vérité, taillée visage/peau).
> Référence générique complémentaire : [`capture-generic-reference.md`](./capture-generic-reference.md).

**Principe :** 100 % client. Sur le flux caméra frontale (`facingMode:'user'`), une boucle `requestAnimationFrame` (cap **15-20 fps**) évalue des critères et **guide** l'utilisateur. **Le bouton capture reste désactivé tant que TOUS les critères bloquants ne sont pas verts** (gate strict — **pas d'échappatoire « prendre quand même »**).

### Critères BLOQUANTS (tous doivent être verts)
| # | Critère | Mesure | Seuils (défaut, à calibrer) |
|---|---|---|---|
| 1 | Taille du visage | bounding box / ovale | proj ≥ 800px ; ratio 0.60–0.90 |
| 2 | Luminosité | luminance zone visage (mean, stddev, gauche/droite) | mean 100–200 ; stddev < 50 ; **lateralDelta < 30** (anti contre-jour) |
| 3 | Présence | nb de visages | exactement 1 |
| 4 | Orientation | yaw / pitch / roll (pose MediaPipe) | yaw ±15° ; pitch ±10° ; roll ±20° |
| 5 | Stabilité | déplacement du centre entre frames | delta < 1.5% largeur, **500 ms continus** |
| 6 | **Netteté** *(nouveau)* | **variance Laplacien** sur zone visage | seuil à calibrer (essentiel pour texture/pores) |

### Critère SOFT (warning, **non bloquant**)
| 7 | Centrage | offset centre visage / ovale | warning si offset > 15% — **n'empêche pas la capture** |

### Préconditions & règles
- **`isModelLoading`** : le bouton est bloqué tant que MediaPipe n'est pas chargé (1-3 s). Overlay « Initialisation de l'IA… ». Fallback gracieux si échec de chargement.
- **Hystérésis** sur chaque seuil *(repris du fichier générique)* → éviter le clignotement vert/rouge quand une valeur oscille.
- **Un seul message** d'aide à la fois, par ordre de priorité (1 → 6).
- **Option capture auto** *(repris du fichier générique)* : déclenchement automatique dès que tout est vert **et** stable ~1 s (en plus du bouton manuel).
- **Accessibilité** *(repris du fichier générique)* : couleur **toujours doublée d'un texte/icône** ; **retour haptique** à la capture ; explication claire de la permission caméra.
- **Export** : photo finale en **JPEG 92 %**, dé-mirroring, gardée **en mémoire** (pas d'upload tant qu'on n'atteint pas `/api/analyze`).

### Performance
Down-scale frame → 320×240 pour MediaPipe ; zone visage → 64×64 pour la luminance ; boucle 15-20 fps ; throttle des updates UI à 5-10 fps.

### Calibrage des seuils (Phase 1.5)
Les seuils sont des **valeurs par défaut** à **calibrer empiriquement**. On logge les métriques (succès/échec) via `POST /api/capture-metrics` → table `CaptureMetric`. Après 50-100 captures, ajuster `VALIDATION_CONFIG`. *(La spec d'origine disait « Supabase » → adapté à notre Postgres.)*

---

## 7. Module analyse — l'appel Gemini

**Un seul appel multimodal** : Gemini reçoit **la photo + les réponses q1–q7 ensemble**, raisonne sur les deux, renvoie un résultat structuré.

- **La photo** apporte le visible (rougeurs, brillance, pores, taches, texture, cernes).
- **Les questions** apportent l'invisible (sensibilité, ingrédients qui irritent, actifs déjà utilisés, changements récents, budget, sécurité).

### Sortie structurée imposée (schéma JSON strict, validé par zod)
```ts
{
  score: number,                 // ex. 72
  skinType: string,              // ex. "mixte"
  metrics: { name: string, value: number, label: string }[],
  concerns: string[],            // dans la taxonomie SmartSkin
  actives: { name: string, blogSlug: string, reason: string }[],
  photoQuality: { ok: boolean, issue?: string }  // ex. "blurry" → écran reprise
}
```

### Cadrage
- **Vocabulaire imposé** : on fournit à Gemini la **taxonomie SmartSkin** (liste des préoccupations + actifs ayant une fiche blog). Il reste dans l'univers de la marque ; chaque actif conseillé porte un **`blogSlug`** → lien vers l'article.
- **Pas de diagnostic médical** : prompt + sortie cadrés « bilan, estimation visuelle ».
- **Détection qualité** : si la photo est inexploitable malgré la capture, Gemini le signale (`photoQuality.ok=false`) → écran « reprends la photo ».

---

## 8. Modèle de données (Prisma)

```
User                         Analysis                       CaptureMetric (Phase 1.5)
────────                     ─────────────                  ─────────────
id                           id                             id
email                        userId  ──► User               createdAt
name? (optionnel)            createdAt                      passed: bool
createdAt                    score        (Int)             mean, stddev, lateralDelta
(tables Auth.js auto:        skinType     (String)          yaw, pitch, roll
 Account, Session, …)        answers   ▸ Json   (q1–q7)     stability, sharpness
                             metrics   ▸ Json               (→ calibrage seuils)
                             concerns  ▸ Json
                             actives   ▸ Json
                             ⚠️ PAS de photo
```

**Partis pris :**
- On stocke le **résultat + les réponses** (jamais la photo).
- Détails (`metrics`, `concerns`, `actives`) en **colonnes JSON** : une analyse se lit d'un bloc, on ne requête pas dedans. `score` et `skinType` en colonnes simples pour **lister/trier** dans l'espace client.
- **Phase 2** : table `Product` (vraie table, car on filtrera/cherchera) + lien `Analysis → produits recommandés`.

---

## 9. Auth (Auth.js, sans mot de passe)

- **Google one-click** (friction minimale au mur d'inscription) + **lien magique email** (via Resend).
- **Aucun mot de passe stocké** (sécurité + RGPD).
- Adapter Prisma (tables `Account`/`Session`/`VerificationToken` gérées automatiquement).
- Le `layout.tsx` de `(espace)` impose la session ; redirection vers login si absent.

---

## 10. Déploiement & RGPD

- **Render** : Web Service (Next.js) + Postgres, région **Frankfurt (EU)**. `render.yaml` décrit les deux services.
- **Gemini via Vertex AI** région **europe-west** + **DPA Google Cloud signé** → photo traitée dans l'UE.
- **Variables d'environnement** (jamais commitées, dans `.env.example` en gabarit) : `DATABASE_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, creds Vertex (`GOOGLE_APPLICATION_CREDENTIALS` / projet / région).
- **Mentions légales** : ajouter l'hébergeur `app.smart-skin.ai` (Render) en plus de Lovable, et préciser que la photo n'est pas conservée.

---

## 11. Gestion des erreurs

| Cas | Comportement |
|---|---|
| Gemini échoue / timeout | 1 nouvelle tentative ; sinon message clair, réponses conservées (en mémoire) |
| Photo inexploitable (`photoQuality.ok=false`) | Écran « reprends la photo » |
| MediaPipe ne charge pas | Fallback « recharge la page » ; bouton capture reste bloqué |
| Permission caméra refusée | Explication + instruction pour réautoriser |
| Abus de `/api/analyze` | Rate-limit (protège la clé Gemini) |
| Utilisateur abandonne au mur d'inscription | Aucun appel IA effectué (il se fait après signup) |

---

## 12. Phasage

- **Phase 1 (ce spec)** : tunnel + capture live + analyse Gemini + auth + espace client + bilan avec actifs (liens blog).
- **Phase 1.5** : logging `CaptureMetric` + calibrage empirique des seuils.
- **Phase 2** : flux produits → table `Product` + reco produits par l'IA (catalogue interne) + affiliation.

---

## 13. Points ouverts / à calibrer

- Seuils de capture (dont **netteté Laplacien**) : à caler après premiers tests réels.
- Modèle Gemini exact (version) + coût par analyse à mesurer.
- Stratégie de relance email (Resend) si lien magique non cliqué.
- Détail du contenu de l'écran Résultats à partir de `prop_1` (mapping métriques → affichage).
