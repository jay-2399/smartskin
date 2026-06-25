# Moteur de recommandation SmartSkin — Spécification d'implémentation

> **But de ce document.** Brief technique auto-suffisant destiné au LLM (ou au dev) qui va **coder** le moteur. Il décrit : les données d'entrée réelles, le pipeline étape par étape, ce qui est **règle déterministe** vs **appel LLM**, les schémas d'entrée/sortie, et les cas limites. Tout ce qui est nommé ici (`champ`, `valeur`) existe vraiment dans les fichiers de données.

---

## 0. Contexte en 30 secondes

SmartSkin recommande une **routine skincare personnalisée** à partir d'un **catalogue de 140 produits réels** (Amazon, affiliation) et d'un **profil utilisateur** (questionnaire).

- Ce moteur = **backend affiliation** (catalogue de 140 produits de marque). À ne pas confondre avec l'ancien `recommend.ts`/`personalize.ts` in-app qui tourne sur un petit catalogue d'actifs génériques.
- **Principe directeur** : *amener la preuve et la contrainte AVANT la décision, jamais « décide puis refais ».* Les filtres de sécurité et de budget passent en amont ; le LLM ne choisit que sur un terrain déjà sûr.
- **Pas de vector DB / pas de RAG.** Tout est relationnel. Les « avis » sont déjà digérés hors-ligne dans un champ structuré (`byProfile`) lu en simple lookup.

---

## 1. Vue d'ensemble du pipeline

```
PROFIL (JSON, mécanique)
   │
   ▼
[Étape 1] GARDE MÉDICALE  ── scan léger (règles + LLM court) → contraintes dures
   │
   ▼   ┌─────────────────── POUR CHAQUE CATÉGORIE de la routine ───────────────────┐
   │   │                                                                            │
   │   │  [Étape 2] FILTRES DURS   (sécurité + conditions médicales + budget +      │
   │   │                            byProfile==negative)  → on ÉLIMINE              │
   │   │            │                                                               │
   │   │            ▼                                                               │
   │   │  [Étape 3] SCORING DÉTERMINISTE  (match concerns, byProfile, preuve,       │
   │   │                            sentiment, social proof…)  → on CLASSE          │
   │   │            │                                                               │
   │   │            ▼                                                               │
   │   │  [Étape 4] SHORTLIST top-N (~5, configurable)  ← AUCUN LLM ici             │
   │   │            │                                                               │
   │   │            ▼                                                               │
   │   │  [Étape 5] IA CHOIX + « POURQUOI »  ← LLM, uniquement sur les ~5           │
   │   └────────────────────────────────────────────────────────────────────────────┘
   │            │
   ▼            ▼
[Étape 6] RÉCONCILIATION PANIER (GLOBAL : Σ prix ≤ budget ET Σ irritation ≤ tolérance peau)
   │
   ▼
[Étape 7] SORTIE : routine MATIN / SOIR + posologie + pourquoi
```

**Le LLM n'intervient qu'à 2 endroits** : la garde médicale (scan court d'un texte libre) et le choix final sur ~5 candidats déjà présélectionnés. **Il ne voit jamais les 140 fiches.** Tout le tri lourd est déterministe.

---

## 2. Données d'entrée n°1 : le catalogue produit

**Fichier : `data/catalog-final.json`** — tableau de 140 objets produit. (Équivalent lisible : `data/catalog-final.csv`.)

### 2.1 Schéma d'un produit (champs réels)

```jsonc
{
  "num": 52,                       // identifiant interne stable (1..141, le 137 n'existe pas)
  "asin": "B0C3PCJ6SD",            // identifiant Amazon (lien d'affiliation)
  "name": "The Ordinary Salicylic Acid 2% Solution",
  "brand": "DECIEM",
  "category": "exfoliant",         // voir §2.2
  "price": 6.7,                    // USD (number) — peut servir au filtre budget
  "rating": 4.7,                   // note Amazon /5
  "reviews": 10914,                // nb d'avis (social proof)
  "bsr": 231,                      // Best Sellers Rank Amazon — PLUS BAS = MIEUX vendu
  "bought": "40K+ bought in past month",  // texte libre, indicatif

  // ── COUCHE 2 : classification dermato (dérivée par règles) ──
  "keyActives": "BHA",             // actif principal (lisible)
  "targets": ["acne","comedones","fine_lines","flaking","pores","shine"],  // ConcernIds traités, voir §2.3
  "skinTypes": ["grasse","mixte","normale","seche"],  // types de peau adaptés (indicatif)
  "moment": "pm",                  // "am" | "pm" | "both" — quand l'appliquer
  "frequency": "3x/sem",           // "daily" | "3x/sem" | "1-2x/sem"
  "unsafePregnancy": true,         // ⛔ déconseillé grossesse (FILTRE DUR si enceinte)
  "unsafeSensitive": true,         // ⚠ déconseillé peau sensible (FILTRE DUR si sensible)
  "irritationCost": 2,             // 0..5 — agressivité (sert au budget irritation)
  "activeStrength": 3,             // 1..5 — puissance de l'actif
  "evidenceLevel": 5,              // 1..5 — niveau de preuve scientifique
  "fragranceFree": null,           // true | false | null(inconnu) — bonus si sensible
  "alcoholFree": null,             // true | false | null
  "ingredients": null,             // INCI si dispo, sinon null

  // ── visuel ──
  "image": "https://yitigxyfibpqvhkrwuiz.supabase.co/storage/v1/object/public/product-images/052_B0C3PCJ6SD.png",
  "image_amazon": "https://m.media-amazon.com/...jpg",  // backup, ne pas afficher

  // ── COUCHE 3 : avis digérés (peut être absent → dégradation gracieuse, voir §5.2) ──
  "couche3": {
    "sentiment": 0.83,             // 0..1 — sentiment global des avis
    "byProfile": {                 // ⭐ CŒUR DU MATCHING — verdict PAR TYPE DE PEAU
      "grasse":  "positive",       // "positive" | "caution" | "negative" | "unknown"
      "seche":   "caution",
      "mixte":   "positive",
      "sensible":"caution",
      "normale": "positive"
    },
    "note": "BHA top acné/grasse/filaments; prudence sèche/sensible",  // résumé court
    "customers_say": "Customers find the salicylic acid solution effective for acne…",  // agrégat Amazon
    "aspects": { "Effectiveness": 387, "Value for money": 127, … },    // aspects + compteurs
    "quotes": ["…", "…"]           // 0-2 verbatims courts
  }
}
```

### 2.2 Les 10 catégories (`category`)

`nettoyant`, `démaquillant`, `hydratant`, `spf`, `serum`, `exfoliant`, `traitement`, `masque`, `contour_yeux`, `soin_cible`.

### 2.3 Les 16 « ConcernIds » (`targets` et concerns du profil)

Source : `src/features/analysis/attributes.ts`. **C'est le vocabulaire commun** entre les besoins du user et les `targets` produit.

```
acne, comedones, post_acne_marks, pores, texture, flaking, tone_evenness,
radiance, dark_spots, redness, shine, visible_vessels,
fine_lines, wrinkles, under_eye_circles, under_eye_puffiness
```

### 2.4 `byProfile` — à lire absolument

`byProfile` est **pré-calculé hors-ligne** (digestion des avis Amazon « Customers say »). Au runtime, le moteur fait un **lookup déterministe** `couche3.byProfile[typeDePeauDuUser]` :

| Valeur | Sens | Effet moteur |
|---|---|---|
| `positive` | les gens de ce type de peau l'ont bien vécu | bonus de score |
| `caution` | mitigé / à surveiller pour ce type | malus de score |
| `negative` | a posé problème à ce type (ex. boutons) | **FILTRE DUR : on élimine** |
| `unknown` | pas assez de signal | neutre |

> **Règle d'or (insight produit)** : si un produit a causé des soucis aux gens de la même peau que l'utilisateur (`negative`), **on ne le recommande pas**, même s'il matche techniquement les besoins.

---

## 3. Données d'entrée n°2 : le profil utilisateur

Produit par le questionnaire. Schéma proposé (à figer côté front) :

```jsonc
{
  "skinType": "grasse",            // UN parmi: grasse | seche | mixte | sensible | normale
  "sensitive": true,               // déclare une peau réactive (déclencheur du filtre unsafeSensitive)
  "concerns": ["acne","pores","post_acne_marks"],  // ConcernIds, ORDONNÉS par priorité (1er = +important)
  "pregnant": false,               // déclencheur du filtre unsafePregnancy
  "breastfeeding": false,          // mêmes contraintes que pregnant par prudence
  "medicalConditions": [],         // cases à cocher: "rosacee","eczema","traitement_retinoide_prescrit", …
  "budget": "30-60",               // 1 des 4 PALIERS de la Q6 (voir §3bis) : "<30" | "30-60" | "60-100" | ">100"
  "routineScope": "complete",      // "essential" (socle court) | "complete" (routine étendue)
  "freeText": ""                   // champ libre optionnel → lu par la garde médicale (Étape 1)
}
```

**Notes :**
- `skinType` (un seul) sert au lookup `byProfile`. `sensitive` est **séparé** : on peut être « mixte **et** sensible ».
- `concerns` est **ordonné** : la priorité pondère le score (voir §4.3).
- `budget` est un **filtre dur** sauf le palier `">100"` (mode sans contrainte, badge « recommandé »).

### 3bis. Le budget — 4 paliers (Q6 du questionnaire)

Le budget est le **montant total que l'utilisateur est prêt à mettre pour TOUTE sa routine** (le Σ des prix des produits retenus) — **il n'y a pas de notion mensuelle**. La question est **« Ton budget pour ta routine skincare ? »** avec **4 paliers** :

| Palier (valeur `budget`) | Libellé questionnaire | Mode moteur | Enveloppe Σ prix |
|---|---|---|---|
| `"<30"` | Moins de $30 — l'essentiel, malin | borné | **≤ 30 $** |
| `"30-60"` | $30-60 — bon équilibre prix/actifs | borné | **≤ 60 $** |
| `"60-100"` | $60-100 — une routine complète | borné | **≤ 100 $** |
| `">100"` | **« Laisse l'IA composer »** · badge ★ Recommandé · *la meilleure routine, sans plafond de prix* | **no_limit** | aucun plafond |

> **Enveloppe = borne haute de la tranche.** `enveloppe(budget)` renvoie directement ce plafond Σ prix (30 / 60 / 100, ou `∞` pour `">100"`). Pas de facteur de conversion — le palier EST le budget de la routine. Si le catalogue ne permet pas de tenir sous le plafond pour un profil donné, la réconciliation (Étape 6) fait au mieux et l'UI l'affiche honnêtement (« légèrement au-dessus »).
>
> `cap_prix_categorie(profile)` (Étape 2) = borne **par produit** dérivée de l'enveloppe (ex. `enveloppe / nb_categories_routine`), pour éviter qu'un seul produit mange tout le budget avant la réconciliation globale (Étape 6).

---

## 4. Le pipeline, étape par étape

### Étape 1 — Garde médicale (règles + LLM court)

**But :** transformer cases médicales + `freeText` en **contraintes dures** AVANT tout le reste. Ne jamais laisser le LLM décider seul de la sécurité.

- **Règles (déterministes) sur les cases** : `pregnant`/`breastfeeding` → active le filtre `unsafePregnancy`. `sensitive` ou `rosacee`/`eczema` → active `unsafeSensitive` + plafonne `irritationCost`. `traitement_retinoide_prescrit` → exclure les rétinoïdes OTC (catégorie `traitement` à base de rétinol/rétinal/adapalène).
- **LLM court (optionnel)** : scanne `freeText` pour des signaux non couverts par les cases (ex. « je suis sous Roaccutane », « allergie à l'aspirine » → BHA/salicylique). Sortie **structurée** : `{ extraExclusions: [...], flags: [...], adviseDoctor: bool }`. **Le LLM ne lit ici que le texte libre**, pas le catalogue.
- **Défaut prudent** : en cas de doute → exclure / avertir, jamais inclure.

**Sortie de l'étape :** un objet `constraints` = `{ excludePregnancyUnsafe, excludeSensitiveUnsafe, maxIrritationPerProduct, excludeActives: [...], adviseDoctor }`.

---

### Étape 2 — Filtres durs, PAR CATÉGORIE (déterministe)

Pour chaque catégorie nécessaire à la routine (voir §4.6), partir des produits `category == X` puis **éliminer** :

```python
def passe_filtres(p, profile, constraints):
    if constraints.excludePregnancyUnsafe and p["unsafePregnancy"]: return False
    if constraints.excludeSensitiveUnsafe and p["unsafeSensitive"]: return False
    if p["irritationCost"] > constraints.maxIrritationPerProduct:   return False
    if any(a in p["keyActives"].lower() for a in constraints.excludeActives): return False
    # byProfile == negative pour la peau du user → éliminé
    bp = (p.get("couche3") or {}).get("byProfile", {})
    if bp.get(profile.skinType) == "negative":                     return False
    # budget : filtre dur sauf no_limit (cap par produit dérivé du budget total, voir §4.5)
    if profile.budget != "no_limit" and p["price"] > cap_prix_categorie(profile): return False
    return True
```

Le résultat est un **plateau de candidats sûrs** par catégorie.

---

### Étape 3 — Scoring déterministe (le tri lourd, SANS LLM)

Classe les survivants. **Formule de départ proposée** (chaque terme est tunable ; commenter le pourquoi) :

```python
def score(p, profile):
    c3 = p.get("couche3") or {}
    bp = (c3.get("byProfile") or {}).get(profile.skinType, "unknown")

    # 1) PERTINENCE — combien des besoins du user ce produit traite-t-il,
    #    pondéré par la priorité (1er concern = poids le plus fort)
    match = 0.0
    for i, concern in enumerate(profile.concerns):
        if concern in p["targets"]:
            match += 1.0 / (i + 1)        # 1, 1/2, 1/3, …

    # 2) byProfile (negative déjà filtré en amont)
    bp_score = {"positive": 1.0, "unknown": 0.0, "caution": -0.7}.get(bp, 0.0)

    # 3) preuve scientifique (1..5 → 0..1)
    evidence = (p["evidenceLevel"] - 1) / 4

    # 4) sentiment des avis (0..1), neutre si couche3 absente
    sentiment = c3.get("sentiment", 0.5)

    # 5) social proof (note × log(nb avis)), borné
    import math
    social = (p["rating"] / 5) * min(math.log10(max(p["reviews"], 1)) / 5, 1.0)

    # 6) douceur : pénalise l'irritation surtout si peau sensible
    sens_factor = 1.6 if profile.sensitive else 1.0
    irritation_pen = (p["irritationCost"] / 5) * sens_factor

    # 7) bonus sans parfum si sensible
    ff_bonus = 0.3 if (profile.sensitive and p.get("fragranceFree") is True) else 0.0

    # 8) best-seller (BSR bas = mieux), petit poids
    bsr_bonus = 0.0
    if p.get("bsr"): bsr_bonus = max(0, 1 - math.log10(p["bsr"]) / 6) * 0.5

    return (
        4.0 * match
      + 2.0 * bp_score
      + 1.5 * evidence
      + 2.0 * sentiment
      + 1.5 * social
      - 1.5 * irritation_pen
      + ff_bonus
      + bsr_bonus
    )
```

> Les **poids** ci-dessus sont un point de départ raisonnable. À calibrer sur des cas réels. Garder la pertinence (`match`) comme moteur principal et `byProfile`/sentiment juste derrière.

---

### Étape 4 — Shortlist top-N (déterministe)

`shortlist = sorted(survivants, key=score, desc)[:N]` avec **N = 5 par défaut, configurable**, et en pratique `N = min(5, len(survivants))`. Certaines catégories pauvres après filtres (ex. `traitement` pour une femme enceinte) peuvent n'avoir que 2-3 candidats : c'est normal (voir §5).

**Aucun appel LLM à cette étape.**

---

### Étape 5 — IA choix + « pourquoi » (LLM, uniquement sur les ~5)

On donne au LLM **uniquement la shortlist** (~5 fiches allégées) + le profil. Il :
1. **choisit** 1 produit (ou 1-3 si on veut proposer éco/équilibré/premium par catégorie — décision ouverte, voir §7) ;
2. rédige un **« pourquoi ce produit »** court, en s'appuyant sur `couche3.customers_say` / `note` / `byProfile` pour un langage client authentique.

Fiche allégée envoyée au LLM (par candidat) :
```jsonc
{ "num","name","brand","price","keyActives","targets","irritationCost",
  "byProfile_user": "positive",          // déjà résolu pour la peau du user
  "note": "…", "customers_say": "…" }
```
Le LLM **ne fait PAS le matching** (déjà fait) et **ne voit pas les 140**. Garde-fous : §6.

---

### Étape 6 — Réconciliation panier (déterministe, GLOBAL)

Une fois 1 produit retenu par catégorie, vérifier les contraintes **globales** :
- **Budget** : `Σ price ≤ profile.budget` (si pas `no_limit`).
- **Budget irritation** : `Σ irritationCost ≤ tolérance` (dérivée du type/sensibilité — ex. sensible = plafond bas). Évite d'empiler 4 actifs agressifs.

Si dépassement → **swap** : remplacer le produit le plus cher / le plus irritant par le candidat suivant de SA shortlist, itérer jusqu'à respecter les budgets. Garder une trace des swaps pour l'explication.

---

### Étape 7 — Sortie : assemblage de la routine MATIN / SOIR

Assembler les produits retenus en routine, en respectant `moment` et `frequency`.

- **Ordre MATIN** : `nettoyant` → `serum`/`traitement` (si `moment ∈ {am,both}`) → `contour_yeux` → `hydratant` → `spf`.
- **Ordre SOIR** : `démaquillant` → `nettoyant` → `exfoliant`/`traitement` (selon `frequency`, en alternance) → `serum` → `contour_yeux` → `hydratant` → `soin_cible` (au besoin).
- **Posologie** : traduire `frequency` en consigne lisible. Ex. un exfoliant `3x/sem` → *« 3 soirs/semaine ; les autres soirs, juste l'hydratant »*. Gérer la non-superposition de 2 actifs forts le même soir (alterner exfoliant et traitement).

Schéma de sortie : §7bis.

---

### 4.6 — Composition de la routine & tolérance d'irritation globale

> Cette section comble les renvois `§4.6` (Étapes 2, 6, 7) et `§4.5` (cap budget,
> déjà traité au §3bis). Elle définit **quelles catégories** entrent dans la routine,
> et **le plafond d'irritation** de l'ensemble.

#### A. Quelles catégories composent la routine — STRUCTURE FIXE (9 étapes)

**Décision produit : la routine a TOUJOURS la même taille (9 étapes). Seuls les PRODUITS
s'adaptent au profil.** Pas de mode « essentielle/complète », pas de longueur variable.

| | Étapes |
|---|---|
| **Matin (4)** | `nettoyant` · `serum` · **crème jour** (légère) · `spf` |
| **Soir (5)** | `démaquillant` · **soin traitant** · **bonus** · **crème nuit** (riche) · `masque` |

**Les 2 seuls slots qui varient** (le reste est identique pour tout le monde) :
- **`soin traitant`** = la catégorie de soin (hors sérum) la plus adaptée à la **préoccupation n°1** :
  acné/rides → `traitement` ; taches/rougeurs/desquamation → `soin_cible` ; pores/brillance/texture → `exfoliant`.
- **`bonus`** = `exfoliant` si peau grasse/texture (ou entretien si peau calme), sinon la catégorie
  de la **préoccupation n°2** — toujours **distinct** du soin traitant. Repli automatique si la
  catégorie visée est vide après filtres (grossesse, etc.), pour garder les 9 étapes.

> ⚠️ **Contour des yeux : retiré** du moteur (décision produit).
>
> **Crème = 2 produits distincts** : **crème jour légère** (matin, sous le SPF) + **crème nuit riche**
> (soir). Le catalogue ne tague pas jour/nuit → texture classée par mots-clés (gel/eau/lotion = légère ;
> crème/baume/repair = riche). C'est la **seule** catégorie à 2 produits. Le **nettoyant** du matin
> est réutilisé le soir (non reproposé). Le **masque** est un rituel hebdo (1×/sem), toujours présent.

#### B. Tolérance d'irritation globale (le plafond Σ de l'Étape 6)

Le budget d'irritation **de toute la routine** (`Σ irritation_jour ≤ plafond`) dépend de **2 axes
dérivés** (pas du type de peau grasse/sèche).

> **L'irritation est pondérée par la FRÉQUENCE.** Un produit ne s'applique pas forcément tous
> les jours : on calcule l'**irritation moyenne par jour** = `irritationCost × (doses/sem) ÷ 7`
> (daily → ×1 ; `3x/sem` → ×3/7 ; `1-2x/sem` → ×1.5/7). Ainsi un **exfoliant 1-2×/sem** pèse
> ~5× moins qu'un soin quotidien de même coût, et un **masque 1×/sem** ~7× moins. Le socle
> quotidien (coût 0) ne pèse rien.

**Axe 1 — `bucket` de sensibilité/barrière** (réutiliser `deriveBucket` de
`src/features/routine/recommend.ts`) :

| bucket | déclenché par |
|---|---|
| `fragile` | desquamation ≥ 2 **ET** (rougeurs ≥ 3 **ou** rosacée/eczéma) |
| `sensible` | rosacée/eczéma · rougeurs ≥ 3 · vaisseaux ≥ 2 · ≥ 2 irritants (q2) · peau déclarée réactive |
| `tolerante` | utilise déjà rétinol/acides **et** peu de rougeurs/desquamation |
| `normale` | tout le reste |

**Axe 2 — `phase` d'introduction** (réutiliser `derivePhase`, déduit de q3 = expérience actifs) :
`1` débutant · `2` utilise vit. C / niacinamide · `3` utilise rétinol / acides.

**Chiffres** (source `recommend.ts`, alignés `actives.ts` ; recopiés localement dans `recommendation/`) :

```
BASE_CEILING = { fragile: 2, sensible: 6, normale: 12, tolerante: 16 }
PHASE_FACTOR = { 1: 0.5, 2: 0.75, 3: 1 }
plafond = round(BASE_CEILING[bucket] * PHASE_FACTOR[phase])
```

**Matrice de tolérance résultante (`plafond`)** :

| bucket \ phase | 1 (×0.5) | 2 (×0.75) | 3 (×1) |
|---|---|---|---|
| **fragile** (2) | 1 | 2 | 2 |
| **sensible** (6) | 3 | 5 | 6 |
| **normale** (12) | 6 | 9 | 12 |
| **tolerante** (16) | 8 | 12 | 16 |

Lecture : peau **fragile débutante** → plafond **1** (≈ un seul actif très doux, le socle étant à coût 0) ;
peau **tolérante expérimentée** → plafond **16** (encaisse plusieurs actifs forts).

**Comportement en réconciliation (Étape 6)** : tant que `Σ irritation_jour > plafond`, on
**swappe** d'abord le produit le plus irritant (en irritation/jour) vers le candidat plus doux
suivant de SA shortlist ; si le swap ne suffit pas, on **retire** l'actif le plus irritant
(jamais le socle), jusqu'à repasser sous le plafond. La pondération par fréquence fait que les
produits occasionnels (exfoliant, masque) sont rarement la cause d'un dépassement.

> ⚠️ **Recalibrage à prévoir.** Les plafonds (1→16) viennent de `recommend.ts` (somme de
> **coûts d'ACTIFS**). Ici on somme l'**irritation/jour de PRODUITS** (socle à 0, actifs
> pondérés par fréquence) : l'ordre de grandeur est plus faible → les plafonds sont désormais
> **permissifs** (peu de retraits). À calibrer sur cas réels avant de figer (cf. §7).

---

## 5. Règles métier spéciales

### 5.1 Top-up grossesse × traitement
Pour une femme enceinte, la catégorie `traitement` est **structurellement maigre** (rétinoïdes interdits). **Ne pas planter** : autoriser le moteur à **emprunter** les actifs sûrs grossesse rangés ailleurs pour remplir le créneau « traitement » — notamment **azélaïque** (`#77`, `#78`, `#103`), **BPO** (`#101`), **niacinamide** (`#70`, `#71`). C'est une **règle moteur**, pas un manque de données.

### 5.2 Dégradation gracieuse (couche3 absente)
Si `couche3 == null` : le produit reste utilisable sur la couche 1+2. Dans le scoring, `sentiment → 0.5` (neutre), `byProfile → unknown` (0), et bien sûr pas de filtre `negative`. **Ne jamais exclure un produit pour absence de couche 3.** (À ce jour les 140 ont leur couche 3, mais le code doit tenir.)

### 5.3 Catégories fines après filtres
Pour un profil très contraint (enceinte + sensible + petit budget), certaines catégories tombent à 2-4 candidats (`exfoliant` doux, `traitement`, `soin_cible`). Le moteur doit savoir présenter **moins de 5** sans erreur, et la réconciliation ne doit pas exiger un minimum impossible.

### 5.4 Budget « no_limit » (palier `">100"`)
Le 4ᵉ palier de la Q6 — affiché **« Let AI create the best routine »** avec **badge ★ Recommended** et le sous-titre *« Our AI builds your ideal routine — no price limit »* — désactive le filtre prix (Étape 2) et la contrainte budget (Étape 6). C'est positionné comme **l'option intelligente** (pas « la plus chère ») : on propose le meilleur match sans plafond. Le moins cher peut quand même gagner si c'est le meilleur match — le tri reste sur la **qualité**, jamais le prix.

---

## 6. Garde-fous du LLM (Étape 5)

- Le LLM **choisit uniquement parmi la shortlist** fournie. Il ne peut pas inventer un produit ni en proposer un hors-liste.
- Il **ne refait pas** la sécurité ni le matching (déjà verrouillés en amont).
- Sortie **strictement structurée** (JSON : `{num_choisi, pourquoi}`), validée : si le `num` n'est pas dans la shortlist → rejet + fallback sur le top-score déterministe.
- Le « pourquoi » ne doit pas contredire `byProfile`/`note` (ex. ne pas vanter pour peau sensible un produit en `caution` sensible).

---

## 7. Décisions ouvertes (à acter avant de coder)

1. **1 produit ou 3 par catégorie** (éco / équilibré / premium) ? Impacte Étape 5 + sortie. Reco : commencer à **1**, garder l'archi extensible.
2. **N de la shortlist** : figé à 5, exposé en config.
3. **Pondérations du score** (§4.3) : à calibrer.
4. ~~Tolérance d'irritation globale par type de peau~~ **(acté §4.6)** : matrice `bucket × phase` (recopiée de `recommend.ts`), 1→16. À recalibrer sur cas réels (granularité produit ≠ actif).
5. **LLM de l'Étape 5** : modèle + budget tokens (ne traite que ~5 fiches → peu coûteux).
6. ~~Seuils d'enveloppe budget~~ **(acté)** : le budget = montant total de la routine → l'enveloppe Σ prix = la **borne haute de la tranche** (30 / 60 / 100 / ∞). Pas de conversion « mensuel ». Cf. §3bis.

---

## 7bis. Schéma de sortie (contrat d'API)

```jsonc
{
  "profileEcho": { "skinType": "grasse", "sensitive": true, "budget": 80 },
  "routine": {
    "am": [
      { "step": 1, "category": "nettoyant",
        "product": { "num": 1, "name": "...", "brand": "...", "price": 12.99,
                     "asin": "B0...", "image": "https://…/001_B0...png" },
        "posologie": "Matin, masser puis rincer.",
        "pourquoi": "…" }
      // … serum, hydratant, spf
    ],
    "pm": [ /* … */ ]
  },
  "totaux": { "prix": 74.20, "irritation": 6, "budget": 80, "dansLeBudget": true },
  "swaps": [ /* produits remplacés en réconciliation, pour transparence */ ],
  "avertissements": [ "adviseDoctor: …" ]   // issus de la garde médicale
}
```

---

## 8. Ce qui est déterministe vs LLM (récap)

| Étape | Type | Pourquoi |
|---|---|---|
| 1. Garde médicale | Règles + **LLM court** (texte libre) | sécurité d'abord ; LLM seulement pour le non structuré |
| 2. Filtres durs | **Règles** | sécurité/budget non négociables |
| 3. Scoring | **Règles** | rapide, reproductible, pas cher, sur 140 |
| 4. Shortlist | **Règles** | simple tri |
| 5. Choix + pourquoi | **LLM** (sur ~5) | jugement fin + rédaction, coût maîtrisé |
| 6. Réconciliation | **Règles** | optimisation budget globale |
| 7. Assemblage routine | **Règles** | ordre/posologie déterministes |

---

## 9. Fichiers de référence

| Fichier | Rôle |
|---|---|
| `data/catalog-final.json` | **LE catalogue** (140 produits, 3 couches) — entrée du moteur |
| `data/catalog-final.csv` | même contenu, lisible tableur |
| `src/features/analysis/attributes.ts` | définition des 16 ConcernIds (vocabulaire commun) |
| `data/derive_couche2.py` | comment la couche 2 (targets, sécurité, coûts) est dérivée — utile pour comprendre la sémantique des champs |
| `docs/architecture-moteur-recommandation.md` | note de conception/décisions (le « pourquoi » historique) |

---

## 10. Ordre d'implémentation suggéré

1. Charger + typer le catalogue (`catalog-final.json`) et le profil.
2. Étape 2 (filtres) + Étape 3 (scoring) + Étape 4 (shortlist) — **100 % testable sans LLM**, c'est le cœur.
3. Étape 7 (assemblage routine) sur le top-score déterministe → routine déjà fonctionnelle **sans aucun LLM**.
4. Étape 6 (réconciliation budget).
5. Brancher l'Étape 1 (garde médicale) puis l'Étape 5 (choix LLM) **en dernier**, par-dessus une base déjà solide.

> Recommandation : le moteur doit **fonctionner entièrement en mode déterministe** (sans LLM) comme socle ; les 2 appels LLM ne font qu'**améliorer** le choix final et la rédaction. Ne jamais rendre la sécurité ou le matching dépendants du LLM.
