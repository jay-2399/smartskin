# Architecture du moteur de recommandation — SmartSkin

> **Statut :** stable (v4 + corrections feedback) — 2026-06-23
> **Compagnon de :** [`playbook-routine-produits.md`](./playbook-routine-produits.md) (règles dermato + schéma BDD §9)
> **Périmètre :** comment, à partir d'un profil utilisateur, on produit **3 produits par catégorie** + une routine équilibrée.

---

## 1. En une phrase

On transforme l'utilisateur en **profil** → on **enlève le dangereux et le trop cher** → l'**IA classe** ce qui reste (en s'appuyant sur les avis) → on **équilibre la routine entière** → on affiche.

## 2. Principe directeur

> **On amène la preuve / la contrainte AVANT la décision, jamais « décide puis refais ».**

La sécurité, le budget et les avis sont tous traités **en amont** du choix. C'est ce qui évite les boucles « choisis → invalide → re-choisis » et garantit un résultat informé et complet.

---

## 3. Le pipeline (v4)

```
Entrée → profil                      ← 1 fois (mécanique : JSON cases + texte brut)
   │
Garde médicale ?  ──oui──▶  STOP · consulte un dermatologue
   │ non                              ← IA : scanne le texte (check léger)
   │
   ├─ POUR CHAQUE CATÉGORIE (nettoyant, sérum, hydratant, SPF, traitement…) :
   │     Filtres (budget + sécurité)        → plateau de candidats sûrs   [règles]
   │        └─ si < 3 : élargir le budget (jamais la sécurité)
   │     Rassembler les preuves             → byProfile + avis similaires  [mécanique]
   │        └─ récupère les avis « gens comme toi » via pgvector
   │     Shortlist (~5)                      → tri par MATCH, sans LLM       [mécanique]
   │     IA · choix + pourquoi               → classe + explique les 5      [LLM]
   │     ⇒ 3 produits VARIÉS (pas de quasi-doublons)
   │
   ▼
Réconciliation panier               ← 1 fois (le point de jonction)        [règles]
   • prend le n°1 de chaque catégorie
   • Σ prix ≤ budget ?              sinon → swap pour le n°2 moins cher
   • Σ irritation ≤ budget peau/sem ? sinon → swap plus doux / espacer fréquence
   │
   ▼
Prix & stock à jour                 ← re-scrape périodique (pas d'API par requête)
   │
   ▼
Sortie : 3 produits/catégorie + routine équilibrée + verbatims + pourquoi
```

### Global vs par catégorie

| Portée | Étapes |
|---|---|
| **1 fois (global, l'utilisateur)** | Entrée → profil · Garde médicale |
| **Par catégorie (en boucle)** | Filtres → Rassembler → Shortlist → IA choix |
| **1 fois (global, le join)** | Réconciliation panier |

La réconciliation est **le seul** moment cross-catégories, **parce que** le budget et l'irritation sont **partagés par toute la routine** — on ne peut pas les régler catégorie par catégorie.

---

## 4. Qui fait quoi : IA vs règles

### En direct (par utilisateur)

| Étape | Acteur | Rôle |
|---|---|---|
| Entrée → profil | **Mécanique** | assembler un JSON (cases + texte brut). **Pas d'IA** : assembler ≠ comprendre. |
| Garde médicale | **cases + IA** | cases explicites (condition/traitement déclarés) **+** l'IA scanne le texte comme **filet** → off-ramp dermato |
| Filtres | **Règles** | retirer non-sûr (sécurité) + hors-budget → le « plateau » |
| Rassembler les preuves | **Mécanique** | lookup `byProfile` + récup vectorielle des avis (pgvector) |
| Shortlist | **Règles** | tri par **qualité de match** (evidence, byProfile, targets) — « pas cher » = peu coûteux en calcul, **jamais par prix** → garder ~5 |
| IA · choix | **IA (LLM, lourd)** | classer les 5 + rédiger le « pourquoi » |
| Réconciliation / Prix-stock | **Règles** | arithmétique sur les totaux + fraîcheur |

→ Le **gros LLM ne tourne qu'à « IA · choix »**, et seulement sur **5 candidats** par catégorie (rapide + pas cher à l'échelle).

### Hors ligne (préparation de la base, une fois)

| Tâche | Sortie |
|---|---|
| **Minage des avis** (IA) | `reviewInsights` : sentiment, `byProfile`, citations |
| **Embeddings des avis** (IA) | vecteurs stockés dans **pgvector** (pour la récup « gens comme toi ») |
| **Classification** (IA) | catégorie, actifs, cibles, **flags sécurité** (ensuite **validés**, défaut prudent) |

---

## 5. Modèle de données — la fiche produit

3 couches par produit (schéma de base : playbook §9) :

```
// Couche 1 — Commerciale (scrapée Amazon)
brand, name, category, tier, price, image, url
rating, reviewCount

// Couche 2 — Classification (dérivée playbook + INCI, validée)
type, keyActives[{name, percent}], targets[ConcernId], skinTypes,
moment(am/pm/both), frequency,
unsafePregnancy, unsafeSensitive, irritationCost(0-5),
activeStrength(1-5), evidenceLevel(1-5), fragranceFree, alcoholFree

// Couche 3 — Avis minés (reviewInsights) — OPTIONNEL (dégradation gracieuse)
reviewInsights: {
  minedAt, sampleSize, sentiment,
  confirmedBenefits[], reportedIssues[],
  byProfile: { <skinType|ConcernId>: { verdict, n, note } },  // le pont avec le matching
  quotes: [ { text, profile, rating } ]                       // 2 à 6, affichage
}

// + embeddings des avis → colonne vecteur (pgvector)
```

**Règle clé :** les clés de `byProfile` réutilisent **à la lettre** la nomenclature de `attributes.ts` (skinTypes + les 16 ConcernIds), sinon la jointure avec le profil casse.

---

## 6. Décisions clés (et pourquoi)

- **Budget = filtre dur**, pas un « tier » choisi par l'utilisateur. Sinon, en refusant le 1er choix, les alternatives seraient dans des prix incohérents.
- **2 modes budget :** *borné* (filtre sur l'enveloppe) et *« no limit »* avec badge **recommandé** (pas de filtre prix → l'IA optimise le match sans contrainte ; le moins cher peut gagner).
- **Sécurité = règle déterministe en amont**, jamais l'IA seule. Vient des **cases à cocher** (booléens fiables). **Défaut prudent** : un produit dont la sécurité grossesse est inconnue est traité comme **risqué**.
- **L'IA classe** (pas un score rigide), **mais sur un plateau déjà sûr** (« le plateau ») → elle peut être audacieuse, tout ce qu'elle voit est sûr.
- **Réconciliation panier** : le budget **et** l'irritation sont des contraintes **de routine**, pas de produit → un point global qui équilibre par **swaps** (promotion du n°2 déjà classé). **Heuristique gloutonne assumée « assez bon »**, pas l'optimum (mini sac-à-dos) — l'espace est minuscule (~3⁵ combinaisons) → force brute possible si besoin. Le **budget irritation/semaine** vient de la **sensibilité** (déclarée + dérivée de rougeurs/desquamation) **× phase** (playbook §7.2, déjà implémenté dans `recommend.ts`).
- **Repli si < 3 produits** dans une catégorie : on **élargit le budget** (préférence), **jamais la sécurité**, et on l'affiche honnêtement.
- **Shortlist = tri par MATCH, pas par prix.** Le LLM ne voit que les ~5 shortlistés → tri par **qualité de match** (evidence, `byProfile`, targets). Trier par prix biaiserait vers le bas de gamme et rendrait invisible un meilleur match « 6ᵉ en prix mais dans le budget ». Le prix est **déjà** géré au filtre + à la réconciliation.
- **Diversité des « 3 produits »** : une contrainte empêche 3 quasi-doublons (3 sérums vit. C similaires) → max 1 par actif/marque dominante, ou varier actif/gamme.
- **Avis = minage structuré** (`byProfile`) **+ récup vectorielle** (pgvector). Pas de pure similarité cosinus : profil semblable ≠ bon produit (un avis « même profil mais ça m'a fait des boutons » est ultra-similaire mais c'est une raison de fuir).
- **RAG : le vecteur RÉCUPÈRE, le LLM JUGE.** Le vecteur sort les avis « gens comme toi », le LLM lit s'ils sont positifs. Règle proprement le sentiment.
- **Pas de vector DB séparée.** `pgvector` = extension de Postgres → tout dans **un seul système** (Postgres + Prisma).
- **Profil = simple JSON** (cases déjà structurées + texte brut). L'IA ne « parse » pas en amont ; elle lit le texte **seulement** au scan médical et au choix (4c).
- **Garde médicale en amont** : protège l'utilisateur **et** juridiquement (off-ramp vers dermato).
- **Prix lu depuis la BDD** (zéro API par requête) ; fraîcheur via **re-scrape périodique** en arrière-plan.
- **Tracking dès la v1** (clics + conversions + satisfaction) : sinon impossible de savoir si les recos sont bonnes.
- **Dégradation gracieuse** : `reviewInsights` optionnel → l'app tourne avant d'avoir miné tous les avis.

### Garde-fous du LLM (étape choix)
Température basse (reproductibilité) · obligation de **citer** l'avis/champ qui justifie (anti-hallucination) · **cache sur le profil STRUCTURÉ seul** — jamais le texte libre (sinon ~0 réutilisation : chaque texte est unique). Du coup seules les parties pilotées par le structuré sont cachées ; la **récup vectorielle** et le **« pourquoi » perso** (qui utilisent le texte) restent par-utilisateur.

---

## 7. Stack technique

**Postgres + pgvector + Prisma.** Un seul système. Le catalogue, la sécurité, le budget et le matching sont **structurés (relationnel)** ; la dimension « avis semblables » utilise une **colonne vecteur** (pgvector). Aucun service vectoriel séparé.

---

## 8. Risques connus & parades (stress-test)

| # | Risque | Statut / parade |
|---|---|---|
| 1 | Sécurité via texte libre | ✅ cases à cocher (booléens) ; côté produit = défaut prudent |
| 2 | Plateau < 3 produits | échelle de repli : élargir le budget, jamais la sécurité |
| 3 | Budget + irritation = panier | réconciliation globale (le seul cross-catégories) |
| 4 | Catalogue = plafond + cold-start avis | **risque pratique n°1** → auditer la couverture **tôt (avant de coder le moteur)** + compléter ; `byProfile` vide → on retombe sur la classif |
| 5 | Fiabilité IA | garde-fous (temp basse, citer, cache) |
| 6 | Données périmées | re-scrape périodique + check stock à l'affichage |
| 7 | Drapeaux médicaux | garde médicale → dermato + disclaimer |
| 8 | Géo (trafic mondial, catalogue US) | US d'abord + OneLink ; autres marchés plus tard |
| 9 | Aucune mesure | tracking dès la v1 |

---

## 9. Reste à faire

1. **Remplir la base** (chemin critique) :
   - finir le **scrapping métadonnées** des 141 produits (5/15 nettoyants faits) — **d'abord fiabiliser le prix** (bug variantes/buy-box type Cetaphil)
   - **classer** + **valider** les flags sécurité (défaut prudent)
   - **miner les avis** → `reviewInsights` + **embeddings** (pgvector)
   - **auditer la couverture TÔT** (avant de coder le moteur) : ≥ 3 produits sûrs par (catégorie × budget × concern × flags) — c'est probablement là que ça coincera → compléter les trous
2. **Finaliser le questionnaire** (cases sécurité **+ cases conditions/traitements médicaux** + budget + champ texte libre).
3. **Brancher le tracking**.
4. **Coder le moteur** (filtres, réconciliation, appels IA) — une fois la base remplie.

> Note : les 3 substitutions à résoudre (SkinCeuticals ×2, LRP Effaclar A.I.) sont dans [`../smartskin-produits-amazon.md`](../smartskin-produits-amazon.md) — fichier à la racine de `~/dev`.
