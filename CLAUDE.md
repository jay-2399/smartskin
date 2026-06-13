# CLAUDE.md — SmartSkin App (`app.smart-skin.ai`)

Guide projet pour Claude Code : **règles de travail** (comment coder) + **contexte projet** (quoi coder).
Compromis : ces règles privilégient la prudence à la vitesse. Pour une tâche triviale, garde du jugement.

---

## A. Règles de travail

### 1. Réfléchir avant de coder
**Ne pas supposer. Ne pas masquer une confusion. Exposer les arbitrages.**
- Énonce tes hypothèses explicitement. En cas de doute, demande.
- Si plusieurs interprétations existent, présente-les — ne choisis pas en silence.
- S'il existe une approche plus simple, dis-le. Pousse en arrière quand c'est justifié.
- Si quelque chose n'est pas clair, arrête-toi, nomme ce qui bloque, demande.

### 2. La simplicité d'abord
**Le minimum de code qui résout le problème. Rien de spéculatif.**
- Aucune fonctionnalité au-delà de ce qui est demandé.
- Aucune abstraction pour du code à usage unique.
- Aucune « flexibilité » / « configurabilité » non demandée.
- Aucune gestion d'erreur pour des scénarios impossibles.
- Si tu écris 200 lignes et que 50 suffisent, réécris. Test : *« un dev senior dirait-il que c'est sur-compliqué ? »* Si oui, simplifie.

### 3. Changements chirurgicaux
**Ne touche que ce que tu dois. Ne nettoie que tes propres dégâts.**
- N'« améliore » pas le code/les commentaires/le formatage adjacents.
- Ne refactore pas ce qui n'est pas cassé.
- Respecte le style existant, même si tu ferais autrement.
- Code mort non lié : signale-le, ne le supprime pas.
- Retire les imports/variables/fonctions que **tes** changements rendent inutiles.
- Test : chaque ligne modifiée doit se rattacher directement à la demande.

### 4. Exécution orientée objectif
**Définis un critère de succès. Boucle jusqu'à vérification.**
- « Ajoute une validation » → « écris des tests d'entrées invalides, puis fais-les passer ».
- « Corrige le bug » → « écris un test qui le reproduit, puis fais-le passer ».
- Pour une tâche multi-étapes, annonce un plan bref : `1. [étape] → vérifie : [check]`.

> Ces règles fonctionnent si : moins de changements inutiles dans les diffs, moins de réécritures pour cause de sur-complexité, et les questions de clarification arrivent **avant** l'implémentation plutôt qu'après l'erreur.

---

## B. Le projet en une phrase
La **partie analyse** de SmartSkin : questionnaire + photo de visage contrôlée en temps réel → un appel **Gemini** (photo + réponses) → **bilan** (score, métriques, type de peau, actifs conseillés) sauvegardé sur un compte. Hébergé sur **Render (EU)**, séparé de la vitrine/blog (qui restent sur **Lovable**, intouchés).

## C. Documents de référence (à lire avant de coder)
- **Spec / source de vérité :** `docs/specs/2026-06-11-app-analyse-design.md`
- **Capture live (détaillé) :** `docs/specs/live-analysis.md`
- **Capture (référence générique) :** `docs/specs/capture-generic-reference.md`
- **Charte graphique :** `docs/specs/charte-graphique.md`
- **Maquettes visuelles d'origine :** `reference/User_flow_screens/` (HTML/CSS à porter en composants — le CSS se réutilise tel quel)

## D. Stack
- **Next.js (App Router, React, TypeScript)** — front + API dans un seul service.
- **PostgreSQL + Prisma** — comptes + résultats.
- **Auth.js (NextAuth)** sans mot de passe — Google + lien magique (Resend).
- **Gemini via Vertex AI (europe-west)** — analyse multimodale.
- **MediaPipe Face Mesh** — validation photo côté client.
- **Render** (Frankfurt EU) — Web Service + Postgres.

## E. Principes d'organisation
- **Par fonctionnalité** : `src/features/{funnel,capture,analysis,auth,account}` = logique métier isolée.
- **Écrans = composants** dans `src/components/screens/` ; les routes (`app/.../page.tsx`) sont **minces**. (L'écran Résultats sert à 2 endroits → jamais le dupliquer.)
- **Design system** dans `src/components/ui/` (gauge, tags, boutons…), alimenté par le CSS existant (`app/globals.css`).
- `app/(funnel)` = public ; `app/(espace)` = protégé (session requise).

## F. Contraintes NON négociables
- **La photo n'est JAMAIS stockée.** Elle vit en mémoire (navigateur puis serveur le temps de l'appel Gemini), puis détruite. Aucune colonne photo en base.
- **Tout traitement de la photo dans l'UE** (Vertex AI europe-west + DPA). Photo de visage = donnée sensible.
- **Clé Gemini côté serveur uniquement** (jamais exposée au navigateur). `/api/analyze` rate-limité.
- **Le bouton capture est désactivé tant que TOUS les critères bloquants ne sont pas verts** (6 bloquants + modèle chargé ; centrage = soft). Pas d'échappatoire « prendre quand même ».
- **L'appel Gemini se fait APRÈS la création du compte** (mur d'inscription avant les résultats) → tout résultat appartient à un user.
- C'est un **bilan, pas un diagnostic médical** (disclaimer à conserver).
- **Ne jamais toucher** à la vitrine/blog Lovable depuis ce dépôt.

## G. État
**Plans 1, 2, 3 et 5 exécutés** (Plan 4 Auth volontairement reporté pour tester sans compte). Tunnel complet : landing → q1 → capture (auto 3 s + aperçu) → q2…q7 → /analyse → /resultats, fidèle aux maquettes, responsive, état Zustand en mémoire.
- **Plan 5 (analyse IA + résultats)** : sortie alignée sur la maquette 11 (score, profil, 16 attributs/4 sections — `src/features/analysis/attributes.ts`). **Analyse = OpenAI gpt-5.5 vision** (`OPENAI_API_KEY`), via le dispatcher `analyze.ts` basculable **OpenAI > Gemini > démo**. **Sans clé → bilan d'exemple** (`sample.ts`). `/api/analyze` sans auth ni DB (résultat en mémoire `resultStore`). Démo testeurs : **`/resultats?demo=1`**. Latence réelle ~25-27 s (gpt-5.5).
- **Décisions produit** : capture AUTOMATIQUE après 3 s de tout-vert (pas de bouton) ; écran d'aperçu photo (reprendre/continuer) ; q7 → `/analyse` (le mur `/compte` s'intercalera au Plan 4).
- **À reprendre plus tard** : Plan 4 (auth — l'utilisateur veut **email + mot de passe**, PAS Google ni Resend pour l'instant) ; passage Vertex AI EU pour la prod (RGPD ; swap 1 ligne dans `gemini.ts`) ; persistance DB des analyses.
- **rAF gelé dans la preview headless** : l'animation du compteur de score ne se voit pas en preview, mais marche en vrai navigateur (onglet visible).
- **Les maquettes `reference/User_flow_screens/` sont la source de vérité visuelle** (libellés, icônes, max 3 sur q1, flux q1→capture→q2). En cas d'écart plan/maquette, suivre la maquette — **SAUF le cadre « faux téléphone »** (fond gris, 430×932 figé) : c'était un artifice de présentation. **L'app est responsive** (exigence utilisateur) : plein viewport sur mobile, colonne centrée max 480px sur tablette/desktop, hauteur fluide (100dvh), landing en colonne flexible (zone héro extensible, cartes produits en % de la zone).
Notes d'implémentation :
- **Prisma 7** (décision validée) : URL de connexion dans `prisma.config.ts` (plus dans le schéma), client généré dans `src/generated/prisma/` (gitignoré, régénéré au `postinstall`), connexion via `@prisma/adapter-pg` dans `src/lib/db.ts`.
- **Pas de Postgres local** (ni Docker) : la migration init a été générée hors-ligne (`prisma migrate diff`) ; Render l'applique via `migrate deploy`.
- **Next.js 16** (pas 15) : lire `node_modules/next/dist/docs/` en cas de doute sur une API (cf. AGENTS.md).

## H. Commandes
- `npm run dev` / `npm run build` / `npm start`
- `npm test` (Vitest, run) / `npm run test:watch`
- `npm run lint`
- `npx prisma generate` (aussi au `postinstall`) · migrations : `npx prisma migrate diff` (hors-ligne) puis `migrate deploy` (Render)
- Déploiement : push git → Render (région Frankfurt EU, cf. `render.yaml`)
