# Code-gate — version claire / givrée

Refonte du **code-gate viral TikTok** : l'overlay qui se pose par-dessus le reveal (`/resultats`) et demande le **code de la vidéo TikTok** avant de révéler le scan + le score. Cette version passe d'un voile **sombre dramatique** à un **givre clair**, raccord avec l'ADN clair de l'app.

## Contenu du dossier
| Fichier | Rôle |
|---|---|
| `code-gate.html` | Aperçu **standalone** (HTML/CSS/JS) — le gate posé sur un **faux reveal flouté**, pour voir l'effet hors de l'app. |
| `logo-smartskin.png`, `capture-face.jpg` | Assets du faux reveal. |

> ⚠️ La **vraie** implémentation vit dans l'app Next.js (voir plus bas) ; ce HTML est une **maquette fidèle** du rendu pour design/review.

---

## Le concept (rappel)

Tout le trafic vient de **TikTok**. Le gate est la « carotte » virale : après le scan, le reveal (visage + score) est **verrouillé** derrière un overlay ; il faut saisir le **code épinglé sous la vidéo TikTok** pour le révéler. Pas un login, pas un paywall — juste un code (validé **côté serveur**).

## Ce qui change dans cette version (clair / givré)

| Élément | Avant | Maintenant |
|---|---|---|
| **Voile de l'overlay** | sombre `rgba(18,20,24,0.52)` (assombrit le résultat) | **clair** `rgba(238,241,245,0.58)` + halo bleu en haut + **kiss doré** en bas → le résultat transparaît, *givré et clair* |
| **Carte** | blanc quasi opaque | **verre dépoli** : translucide + `backdrop-filter:blur(28px)` → on **devine le résultat flouté derrière** la carte |
| **Ombre carte** | ombre noire dramatique | **ombre douce bleu-grise** (flotte sur le clair) |
| **Emblème** | cercle noir plat + étoile | **« sceau de révélation »** : dégradé + **halo bleu**, **étoile qui pulse** (glow), **anneau pointillé** qui tourne (motif de scan) |
| **Statut** | bleu clair (peu lisible) | bleu plus foncé (`--accent-d`) pour la lisibilité sur clair |

→ Le « wow » (voir son résultat givré derrière la vitre) n'apparaît **qu'en contexte**, posé sur `/resultats`. Sur la page de test isolée, un **faux reveal** est placé derrière pour le simuler.

## Anatomie de la carte
Statut « Analyse terminée » (point qui pulse) → emblème sceau → titre **« Tes résultats t'attendent. »** → sous-titre → **5 cellules de code** → CTA **« Révéler mes résultats »** (sombre, reflet animé) → réassurance *« 100% gratuit · sans inscription »* → hint *« Le code est épinglé sous la vidéo sur TikTok »*.

---

## Implémentation réelle (app Next.js)

- **Composant** : `src/components/ui/CodeGate.tsx` (client component).
- **Styles** : `src/components/screens/funnel.css` (bloc `.codegate` / `.cg-*`).
- **Route de test** : `/dev/codegate` → `src/app/dev/codegate/page.tsx` (jetable).
- **Validation CÔTÉ SERVEUR** : `POST /api/gate` avec `{ code }` → `{ ok: true|false }`. **Le code n'est jamais dans le bundle client.**
- **Persistance** : succès → `sessionStorage["smartskin_gate_unlocked"]="1"` → le gate ne réapparaît pas de la session.
- **Bypass démo** : `?demo=1` contourne le gate (sauf `?gate=1` qui le force) — pour développer le reveal sans code.
- **Saisie** : 5 cellules `A–Z0–9`, auto-avance, **coller** réparti sur les cellules, Entrée = valider, secousse `cgShake` + reset si code invalide.
- **Unlock** : `setUnlocking` → fondu de l'overlay (`.codegate.unlocked { opacity:0 }`) puis démontage.

> Dans le HTML standalone, la validation est **mockée** (n'importe quel code à 5 caractères débloque) — uniquement pour la démo visuelle.

## Pistes suivantes
- **B — « le givre se dissout »** : à l'unlock, animer le flou de l'overlay de `blur → 0` (le givre se lève sur le résultat net) plutôt qu'un simple fondu. Plus satisfaisant, surtout avec cette version claire.
- Tester le rendu **par-dessus le vrai `/resultats`** (pas la page isolée) pour valider la transparence du verre.
- Régler l'opacité du voile (`0.58`) selon la quantité de résultat qu'on veut laisser transparaître.
