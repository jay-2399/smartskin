# Paywall — Variant B (dark immersive) — SmartSkin AI

Écran **paywall** alternatif pour **A/B test**. Direction visuelle : **immersif sombre, plein écran**, fond **vidéo portrait** (produits qui flottent), texte blanc, **offre unique lifetime**. Inspiré des paywalls CREME / Perplexity / Artify, décliné dans l'ADN clinique froid de SmartSkin (« dark mode »).

> **Variant A** = le paywall clair/glassmorphique existant (`checkout-package/`). **Variant B** = ce dossier. À comparer en conversion.

## Contenu

| Fichier | Rôle |
|---|---|
| `paywall.html` | La page complète — **self-contained** (HTML + CSS + un petit JS inline). Aucune dépendance de build. |
| `hero-portrait.mp4` | Fond vidéo **9:16 portrait** (produits qui flottent). Joue en boucle, `muted`, `autoplay`, `playsinline`. |
| `hero-portrait.png` | **Poster** de la vidéo (affiché avant lecture + fallback). |
| `logo-smartskin-white.png` | Logo **blanc**, centré dans la barre du haut. |
| `avatar-1…4.jpg` | Selfies de la preuve sociale (bordées blanc). |

## Ce que c'est

L'écran de **conversion** du tunnel. Position :

```
face reveal (gratuit) → PAYWALL B (cette page) → paiement → écran succès (magic link)
```

Modèle : **achat unique à vie**, **pas d'abonnement**. Le compte est créé implicitement à partir du paiement (même logique que `checkout-package/`).

- **Offre unique** : `Lifetime access — $7.95` barré `$49.95`, badge **−84%**.
- ⚠️ **Écart de prix** avec `checkout-package/` (qui affiche `$19.99 / $39.99`). À **réconcilier** : prix unique côté config / Stripe Price, partagé par les variantes.

## Stack / dépendances

- **Polices** : **Manrope** (principale) + **JetBrains Mono** (labels/mono), via Google Fonts (déjà dans le `<head>`). En Next.js, préférer `next/font` (self-host) pour la perf.
- **Aucun framework / aucune lib** : HTML + CSS purs. Animations **CSS-only** (entrée staggered + shimmer). Un **petit JS inline** uniquement pour : `prefers-reduced-motion` → fige la vidéo sur son poster.
- **Responsive** : `max-width:430px` (cible 390), `min-height:100dvh` (jamais de px fixe), `env(safe-area-inset-*)`. Mobile-first ; rendu « téléphone encadré » au-delà de 480px. **Tient sur un seul écran, sans scroll.**

## Design tokens (`:root` dans le fichier) — thème sombre

```
--ink #0E1014 (fond)        · --white #FFFFFF
--t1 .96 · --t2 .64 · --t3 .42  (blancs atténués)
--accent #BCD5E6 · --accent-soft rgba(166,195,214,.16) · --accent-line rgba(188,213,230,.85)
--green #39D286 · --green-bg rgba(57,210,134,.16)   (badge éco)
--glass rgba(255,255,255,.055) · --glass-line rgba(255,255,255,.13)
--fd 'Manrope' · --fm 'JetBrains Mono'
```

## Structure de l'écran (haut → bas)

1. **Média plein écran** : `hero-portrait.mp4` en `object-fit:cover`, **assombri** (`filter:brightness(.56)`) + **scrim** dégradé (haut léger → bas quasi-noir) + léger **grain**. `transform:translateY(-12%)` pour **remonter les produits** (centrés dans la source) au-dessus du contenu.
2. **Barre du haut** : **retour** (‹) à gauche · **logo SmartSkin** centré · **Restore** à droite.
3. **Preuve sociale** (au-dessus du titre) : 4 avatars **bordés blanc** + ★★★★★ gold + « **Loved by 1,000+ users** ».
4. **H1** : « Your protocol **is** ready. » (*« is » en léger, le reste en bold*).
5. **Sous-titre** : « Your morning & evening routine, **made specifically for your skin**. »
6. **Checklist (4 items)** : routine matin/soir · dosage façon ordonnance · rapport complet · suivi & ré-analyses.
7. **Carte offre** (verre + bordure accent) : *Lifetime access · $7.95* barré $49.95, badge **−84%**, « One-time payment · no subscription, yours forever. »
8. **CTA pilule blanc glossy** (effet « pillow » repris du hero de la landing) : « **Unlock my protocol · $7.95** » (cadenas).
9. **Trust** : « Secure payment · no subscription ».

## Le titre (H1) — en cours d'arbitrage

Actuel : **« Your protocol is ready. »**. Variantes shortlistées (brainstorm) si tu veux un ton plus *élan / aspirationnel* :

- *Élan* : **You're one step away from clearer skin.** (« one step **away** » = il reste une seule étape ; pas « closer »).
- *Aspirationnel* : **Your best skin is one step away.** · **The best version of your skin is waiting.** · **Wake up to skin you love.**

## Intégration Next.js

1. Déplacer les assets (`hero-portrait.mp4`, `hero-portrait.png`, `logo-smartskin-white.png`, `avatar-*.jpg`) dans **`/public`** (adapter les `src`).
2. Convertir `paywall.html` en **composant React** : `class`→`className`, balises auto-fermées, `<style>` → CSS module / global, le JS inline → `useEffect`. (Ou l'utiliser tel quel dans une page statique pour un test rapide.)
3. Brancher les parties dynamiques ci-dessous.

## ⚠️ À brancher (placeholders)

1. **Paiement — CTA « Unlock my protocol ».** Actuellement `→ checkout.html`. Cible : ouvrir **Stripe** (Payment Element / Checkout, Apple Pay / Google Pay express) **OU** router vers l'étape paiement existante. Logique identique au funnel : paiement d'abord → compte implicite (webhook `checkout.session.completed`) → `lifetimeAccess = true` → rattache le diagnostic (`diagnosisId` en metadata) → magic link. Découpler l'accès du moyen de paiement (entitlement) pour un futur IAP natif.
2. **Prix** ($7.95 / $49.95 / −84%) → depuis la config / un **Stripe Price** unique (et réconcilier avec Variant A).
3. **`hero-portrait.mp4`** → c'est un **mockup IA** (La Roche-Posay, Paula's Choice, Vichy, CeraVe, Dr Dennis Gross) — **pas la vraie routine**. À remplacer par le visuel de la vraie sélection, ou assumer comme illustratif. Format **9:16 portrait** requis pour remplir l'écran sans rogner.
4. **Preuve sociale** → avatars = vraies selfies (déjà des vrais visages ici) ; « 1,000+ users » → **vrai chiffre**.
5. **Retour (‹)** → câbler vers la **face reveal**. **Restore** → flux « restore purchase » (magic link même email).
6. **Checklist / titre / sous-titre** → copie statique, à figer selon l'offre + le résultat du brainstorm titre ci-dessus.

## Notes / gotchas

- **Codec vidéo** : `hero-portrait.mp4` est en H.264 → certains navigateurs *headless* ne le décodent pas (le **poster** s'affiche alors). En vrai navigateur (Safari/Chrome iOS) : OK, autoplay `muted playsinline`.
- **`prefers-reduced-motion`** : le JS inline retire `autoplay` et `pause()` la vidéo (poster figé). Respecté.
- **Cadrage produits** : réglés via `object-position:center center` + `transform:translateY(-12%)`. Si tu changes la vidéo, réajuste le `translateY` (-8% plus bas / -18% plus haut) et `filter:brightness()`.
- **Poids** : `hero-portrait.mp4` ≈ **7,5 Mo** + poster ≈ **0,7 Mo** → **compresser / WebM + poster WebP** avant prod (preload `metadata`, lazy si hors écran).
- Un `<button>` **n'hérite pas** de la font → `font-family:var(--fd)` est déjà posé sur `.cta`.
- **CTA glossy** : effet via dégradé + `box-shadow` inset (reflet haut + ombre interne bas) + un `::before` reflet bombé. Tout est en blanc, sur fond sombre.
- Tout est statique : le seul runtime, c'est le **paiement** (CTA) + le flux **webhook / magic link**.

## Contexte produit (pour cohérence)

- Suite de la **face reveal** (gratuite) : la valeur est déjà démontrée, ici on convertit.
- Le badge **−84%** + « pay once, no subscription » jouent l'ancrage + l'absence d'abonnement.
- Trafic **100% TikTok** au lancement → un **code gate** précède la reveal (`reference/User_flow_screens/`).
- **But du A/B** : tester l'immersif sombre vidéo (B) contre le clair glassmorphique (A, `checkout-package/`).
