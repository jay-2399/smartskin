# Checkout Package — SmartSkin AI

Tout le nécessaire pour intégrer la page **checkout / paywall** telle quelle.

## Contenu

| Fichier | Rôle |
|---|---|
| `checkout.html` | La page complète — **self-contained** (HTML + CSS + un petit JS inline). Aucune dépendance de build. |
| `logo-smartskin.png` | Logo, posé centré en haut du hero. |
| `hero-products.png` | Image de fond du hero (produits qui flottent). |

## Ce que c'est

L'écran de **paiement** du tunnel. Position dans le funnel :

```
face reveal (gratuit) → CHECKOUT (cette page) → paiement → écran succès (magic link)
```

Modèle : **achat unique à vie ($19.99)**, **pas d'abonnement**. Le **compte est créé implicitement à partir du paiement** (voir « À brancher »).

## Stack / dépendances

- **Polices** : **Manrope** (principale) + JetBrains Mono, chargées via Google Fonts (déjà dans le `<head>`). En Next.js, préférer `next/font` (self-host) pour la perf.
- **Aucun framework / aucune lib** : HTML + CSS purs, animations **CSS-only** (load staggered + shimmer).
- **Responsive** : `max-width:430px`, `min-height:100dvh`, `env(safe-area-inset-*)`. Mobile-first ; rendu « téléphone encadré » au-delà de 480px.
- **Glassmorphisme** : `backdrop-filter:blur(...)` (préfixe `-webkit-` présent pour Safari) sur la sheet, la carte plan, le bouton X.

## Design tokens (`:root` dans le fichier)

```
--bg #F1F3F6 · --ink #1A1D21 · --accent #A6C3D6 · --accent-d #7FA6BE
--card #FFF · --cloud #EDEFF7 · --graphite #6E7180 · --keep #3A8F6F (vert trust)
--gold #F5A623 / --gold-d #E08A00 (badge offre)
--glass rgba(255,255,255,0.66) · --glass-blur blur(22px) saturate(1.18)
--fd 'Manrope' · --fm 'JetBrains Mono'
```

## Structure de l'écran (haut → bas)

1. **Hero** : `hero-products.png` en plein cadre (`object-fit:cover`) + barre du haut (**X** close à gauche, **logo** centré).
2. **Sheet glassmorphique** (remonte par-dessus le hero, coins arrondis, petit grip) :
   - **Preuve sociale** : 4 avatars + ★★★★★ gold + « Already 1,000+ users ».
   - **H1** « Unlock your protocol. »
   - Sous-titre.
   - **Checklist (4 items)** débloqués : routine matin/soir · doses & ordre · rapport complet · suivi.
   - **Carte plan sélectionnée** (verre + bordure accent + ✓) : *Lifetime access · $19.99* barré $39.99, badge **−50% launch**.
   - **CTA pilule** « Unlock my protocol · Pay once, keep forever » + flèche ronde (shimmer).
   - Trust : « Secured by Stripe ».
   - Terms / Privacy.

## Intégration Next.js

1. Déplacer `logo-smartskin.png` + `hero-products.png` dans **`/public`** (adapter les `src`).
2. Convertir `checkout.html` en **composant React** : `class`→`className`, balises auto-fermées, déplacer le `<style>` en CSS module / global. (Ou l'utiliser tel quel dans une page statique pour un test rapide.)
3. Brancher les parties dynamiques ci-dessous.

## ⚠️ À brancher (placeholders)

1. **Paiement — le CTA « Unlock my protocol ».** Ouvre **Stripe** (Payment Element ou Checkout) avec **Apple Pay / Google Pay** express + carte. Logique décidée :
   - **Paiement d'abord, compte implicite.**
   - À la réussite, un **webhook Stripe** (`checkout.session.completed`) : crée le compte depuis l'email du paiement → pose le flag **`lifetimeAccess = true`** → **rattache le diagnostic** → envoie un **magic link**.
   - Passer **`diagnosisId`** (+ id anonyme) dans les **`metadata`** de la Checkout Session pour relier paiement ↔ diagnostic ↔ compte.
   - **Découpler l'accès du moyen de paiement** : stocker `lifetimeAccess` comme simple *entitlement*, pour qu'un futur **IAP natif** pose le même flag sans refonte.
   - **Réaccès** = magic link (Auth.js + Resend) sur le même email.
2. **Prix** ($19.99 / $39.99 / −50%) → depuis la config / un Stripe Price.
3. **`hero-products.png`** → c'est un **mockup IA** montrant *Dr Dennis Gross + Vichy* (PAS la vraie routine TruSkin + EltaMD). À remplacer par le visuel de la vraie sélection (vrais produits compositer) ou assumer comme illustratif.
4. **Preuve sociale** → les avatars sont des **dégradés placeholder** (mettre de vraies selfies) ; « 1,000+ users » → vrai chiffre.
5. **Checklist (4 items)** → copie statique, à adapter si l'offre change.
6. **X (close)** → câbler le retour vers la face reveal.
7. **Terms / Privacy** → vraies URLs.

## Notes / gotchas

- Un `<button>` **n'hérite pas** de la font → `font-family:var(--fd)` est déjà posé sur `.cta` (sinon le CTA repasse en font système).
- `hero-products.png` ≈ **1,7 Mo** → **convertir en WebP / optimiser** avant prod.
- Le hero est en `object-fit:cover; object-position:center 45%` → les bords sont légèrement rognés selon la largeur ; ajuster si besoin.
- Tout est statique : le seul runtime, c'est le **paiement Stripe** (CTA) + le **flux webhook/magic link** ci-dessus.

## Contexte produit (pour cohérence)

- C'est la suite de la **face reveal** (gratuite) : la valeur a déjà été démontrée, ici on convertit.
- Le badge **−50% launch** et « Pay once, keep forever » jouent l'ancrage + l'absence d'abonnement.
- Trafic **100% TikTok** au lancement → un **code gate** précède la reveal (voir `reference/User_flow_screens/code-gate.html`).
