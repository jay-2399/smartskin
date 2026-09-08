# Audit du moteur de notation — 7 septembre 2026

Audit contradictoire de `src/lib/scan/scoring.mjs` (algo 2.0.0-metier) par trois agents
(dermato-formulateur, statisticien, avocat du diable produit) : analyse isolée, débat croisé,
rapporteur, vetos, version finale. Ce dossier est le cahier des charges des modifications, chacune
adossée à une mesure sur le catalogue (2 916 produits) et ~80 produits étalons.

**L'audit est implémenté** (branche `notation-2.1`, algo `2.1.0-audit`). Voir « Implémentation »
plus bas, et `docs/specs/scan-scoring-v2-calcul.md` pour le calcul tel qu'il tourne aujourd'hui.

## Par où commencer

- **`rapport-final-v2.md`** — LE document : validation (qui a validé quoi), résumé, les 11
  modifications B1-B11 dans l'ordre d'application (données → règles → recalibration), ce qui a
  été rejeté et pourquoi, ce qui reste ouvert, tableau des étalons avant/après, annexe
  actionnable (G1 données, G2 règles avec lignes).
- `rapport-final.md` — v1, avant les vetos (pour l'historique).
- `veto-dermato.md`, `veto-produit.md` — les deux relectures finales.
- `rapport-1-*.md` — analyses isolées (phase 1) ; `rapport-2-*.md` — débat (phase 2).

## Rejouer les mesures

Les scripts vivaient dans le scratchpad de la session ; ils sont copiés ici tels quels.
Ils lisent `data/scan/` depuis la racine du dépôt : toujours lancer depuis la racine.

```bash
cd ~/dev/smartskin.app
node docs/audit/moteur-notation-2026-09-07/sim3.mjs ONE 'Hydrabio Gel Moussant'   # une fiche, V0 vs paquet
node docs/audit/moteur-notation-2026-09-07/sim3.mjs ARB1                            # un arbitrage (ARB1…ARB7)
node docs/audit/moteur-notation-2026-09-07/sim3.mjs FINAL '{"s5Mode":"first","prereqMode":"d6d","comedoMode":"produit","banMode":45,"matchScale":"p3"}' P9
node docs/audit/moteur-notation-2026-09-07/verif.mjs                                # prouve que la copie = l'original à interrupteurs éteints
```

- `scoring-sim.mjs` : copie du moteur avec 37 interrupteurs `SIM.*` (reconstruite par `patch*.mjs`).
- `sim3.mjs` : banc final ; `sim2.mjs` : phase 2 ; `lib.mjs`, `distribution.mjs`, `monotonie.mjs`,
  `perso.mjs`, `robustesse.mjs`, `seuils.mjs` : phase 1.
- `scoring-sim-dermato.mjs` (+ `build-sim-dermato.mjs`, `exp-dermato*.mjs`) et `variants/` +
  `bench.mjs` : bancs des deux autres agents.

Quand une modification est implémentée dans `scoring.mjs`, la copie `scoring-sim.mjs` devient
obsolète : reconstruire avec `patch.mjs` → `patch7.mjs`, ou refaire la mesure directement sur le
moteur.

## Implémentation

Trois lots, un seul déploiement à la fin. Chaque commit porte son numéro de modification.

| Lot | Contenu | Commits |
|---|---|---|
| 0 | oracle figé avant toute modification, tests d'invariants | — |
| 1 | données : dictionnaire, fonctions, alias, `filtresUV`, fiches réparées | B1-B4, G1 |
| 2 | règles : `parseInci`, grilles, comptage des actifs, risques, perso, texture, évaluabilité, écrans | R1 → R10 |
| 3 | recalibration | B11.2 appliqué ; B11.3 sans objet ; B11.4 rejeté ; B11.5 impossible |

### Vérifier le moteur

```bash
cd ~/dev/smartskin.app
node docs/audit/moteur-notation-2026-09-07/verif-paquet.mjs --oracle    # écarts produit par produit, par cause
node docs/audit/moteur-notation-2026-09-07/verif-paquet.mjs --stats     # distribution, perso, monotonie
node docs/audit/moteur-notation-2026-09-07/verif-paquet.mjs --grilles   # ce qu'une grille demande vs ce qu'elle peut rapporter
```

`oracle-v2.json` fige les notes que le paquet v2 devait produire. Il a servi de juge pour les
lots 1 et 2 : à la fin du lot 2, le moteur le reproduisait exactement, aux extras non simulés
près (eaux thermales, mentions « nano », alias chaînés — listés par cause). **Le lot 3 le
dépasse volontairement** : B11.2 déplace 1 035 produits, de 3,2 points en moyenne, toutes
familles rincées. L'oracle devient une référence historique ; le garde-fou vivant est désormais
la table de calibration, `src/lib/scan/__tests__/etalons.test.ts`, et son journal en section J de
la spec.

### Ce qui reste à décider

- **La dose est invisible.** Un peeling à 30 % et un exfoliant à 2 % ont la même liste, dans le
  même ordre : la concentration n'est écrite que sur la face avant. B11.5 supposait des acides de
  force 3, il n'en existe aucun.
- **Les hydratants à 27,4 % de verts**, sous les 30 % visés — parce que 27 % seulement
  contiennent des lipides de barrière, pas par défaut de barème.
- **Les trois solaires réparables** : Bioderma Photoderm Cover Touch (filtres écrits en
  français), Lierac Sunissime (après-soleil mal catégorisé), SVR Sun Secure.
