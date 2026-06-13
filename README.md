# SmartSkin App — `app.smart-skin.ai`

La **partie analyse** de SmartSkin : questionnaire + photo de visage contrôlée en temps réel → analyse IA (Gemini) → bilan personnalisé (score, métriques, type de peau, actifs conseillés), sauvegardé sur un compte.

> Séparé de la vitrine + blog (`smart-skin.ai`, hébergés sur Lovable). Déployé sur **Render (EU)**.

## Statut
🟢 **Plans 1, 2, 3 et 5 terminés** (Plan 4 Auth reporté). Parcours complet landing → questions → capture live → analyse Gemini → résultats, fidèle aux maquettes et responsive.

- **Analyse** : `@google/genai` + clé Google AI Studio (`GEMINI_API_KEY`). Sans clé → bilan d'exemple (mode démo, sans compte).
- **Démo résultats** sans webcam : `/resultats?demo=1`.
- Reste : Plan 4 (compte email + mot de passe), Vertex AI EU pour la prod, persistance des analyses.

## Documents
- **Spec :** [`docs/specs/2026-06-11-app-analyse-design.md`](docs/specs/2026-06-11-app-analyse-design.md)
- **Guide projet (Claude Code) :** [`CLAUDE.md`](CLAUDE.md)
- **Capture live :** [`docs/specs/live-analysis.md`](docs/specs/live-analysis.md)
- **Charte :** [`docs/specs/charte-graphique.md`](docs/specs/charte-graphique.md)
- **Maquettes :** [`reference/User_flow_screens/`](reference/User_flow_screens/)

## Stack
Next.js · Postgres/Prisma · Auth.js · Gemini (Vertex AI EU) · MediaPipe · Render

## Plans d'implémentation
Découpés en 6 plans séquentiels (chacun livre du logiciel testable) — `docs/superpowers/plans/` :

1. **Fondation** — scaffold Next.js, tests, env, Prisma, charte, Render
2. **Tunnel** — landing + q1–q7, état en mémoire (réponses + photo)
3. **Capture live** — MediaPipe, 6 critères bloquants (TDD), gate du bouton
4. **Auth + espace client** — Auth.js (Google + lien magique), zone protégée
5. **Analyse Gemini** — `/api/analyze` (photo jetée), écrans analyse & Résultats
6. **Déploiement & RGPD** — Render EU, rate-limit, calibrage, DPA, mentions légales

## Prochaine étape
Exécuter le **Plan 1** (`docs/superpowers/plans/2026-06-11-plan-01-fondation.md`).
