# Audit du moteur de notation — 7 septembre 2026

Audit contradictoire de `src/lib/scan/scoring.mjs` (algo 2.0.0-metier) par trois agents
(dermato-formulateur, statisticien, avocat du diable produit) : analyse isolée, débat croisé,
rapporteur, vetos, version finale. **Rien n'a été implémenté** : ce dossier est le cahier des
charges des modifications, chacune adossée à une mesure sur le catalogue (2 916 produits) et
~80 produits étalons.

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
