# Playbook — Construction de routine & base de données produits

> **But.** Ce document est la **source de vérité** pour :
> 1. la **structure** d'une routine de soin (jour / nuit, catégories, ordre, fréquences) ;
> 2. les **règles dermatologiques** pour choisir les bons produits selon le bilan de peau, en couvrant **tous les cas de figure** (chaque préoccupation, chaque type de peau, chaque contre-indication) ;
> 3. le **schéma de la base de données produits** à remplir — ces produits sont ceux qui seront proposés à l'étape de construction de routine (deck de swipe + protocole).
>
> Périmètre = **soin cosmétique**. Les cas médicaux (acné kystique/sévère, lésion suspecte, rosacée diagnostiquée non stabilisée, traitement type isotrétinoïne) sont des **garde-fous bloquants** → orienter vers un dermatologue, pas de routine traitante.

---

## 0 bis. Entrées — le contrat depuis l'analyse

> La routine se construit **à partir de l'output de l'analyse**. Source de vérité de ce contrat : **`docs/output-analyse-reveal.md`**. La taxonomie des préoccupations y est définie **une seule fois** ; ce playbook la **consomme** (ne jamais la redéfinir — sinon les deux divergent).

| Sortie de l'analyse | Ce qu'on en fait dans la routine |
|---|---|
| Préoccupations `attributes[].id` + **`level` 1-4** | actifs via la matrice §4 ; **le niveau module l'intensité/fréquence** (2 = doux · 3 = soutenu · **4 = garde-fou dermato** sur un concern « gros ») |
| `profile.skinType` | **texture** des soins (§5.1) |
| `profile.phototype` | prudence **PIH** + importance SPF (§5.2) |
| `redness` · `flaking` · `visible_vessels` (+ q7) | **dérivent** la **sensibilité** et l'**état de barrière** (variables clés du budget §7.2) |
| `photoQuality` (+ futur `confidence`) | **agressivité** de la routine (§8 bis-b) |
| `observations` (narratif zone par zone) | « pourquoi » **honnêtes** (ancrer dans le constat réel) |
| q1 (priorités déclarées) · q6 (budget) · q7 (sécurité) | **objectifs** & garde-fous |

**Principe directeur :** le `level` (sévérité) n'est **pas binaire** — on s'en sert pour **doser**, pas seulement pour « inclure / exclure » un actif.

---

## 1. Les règles d'or (principes dermato non négociables)

1. **3 piliers toujours présents** : **nettoyer**, **hydrater**, **protéger (SPF le matin)**. Tout le reste est conditionnel.
2. **Le SPF est le soin anti-âge & anti-taches n°1.** Indispensable dès qu'il y a un actif photosensibilisant (acides, rétinoïdes, vitamine C) ou une problématique pigmentaire.
3. **Un seul actif fort par soir.** Jamais deux acides, ni acide + rétinoïde le même soir → on **alterne**.
4. **Un actif à la fois, fréquence progressive.** On introduit, on observe 2-3 semaines, on monte en cadence. Mieux vaut lent et régulier que fort et irritant.
5. **La barrière cutanée prime.** Si la peau est abîmée (desquame, tiraille, rougeurs réactives) → on **répare d'abord** (socle seul), on ajoute les actifs ensuite.
6. **Cibler, pas empiler.** 1 sérum « actif » suffit le jour. On ne multiplie pas les produits qui font la même chose.
7. **Pas de mécanique agressif sur peau enflammée ou réactive** (gommage à grains durs, brosse) → micro-lésions, propagation des imperfections.
8. **Phototype foncé = prudence pigmentaire.** Toute irritation (acide trop fort, gommage) peut laisser une **hyperpigmentation post-inflammatoire (PIH)**. SPF d'autant plus crucial.

---

## 2. Structure de la routine

### 2.1 — Le modèle « 3 couches »
| Couche | Fréquence | Contient |
|---|---|---|
| **1 · Socle** | tous les jours (matin + soir) | Démaquillant/Nettoyant · sérum quotidien (antioxydant le matin) · Hydratant · **SPF (matin)** |
| **2 · Actifs rotatifs** | certains soirs, en alternance | Exfoliant (BHA/AHA/mécanique) · Rétinoïde · traitement ciblé fort |
| **3 · Rituel hebdo** | tissé dans la semaine | Masque · cure ; soin ciblé (spot) ; contour des yeux |

### 2.2 — Ordre d'application (du plus fin au plus couvrant)
**Matin :** Nettoyant → (Sérum antioxydant : vitamine C) → (Traitement : niacinamide/azélaïque) → Hydratant → **SPF**
**Soir :** Démaquillant → Nettoyant → (Exfoliant **ou** Rétinoïde, en alternance) → (Sérum apaisant/hydratant) → Hydratant/occlusif

Règle : **eau → huile**, du plus liquide au plus épais. SPF toujours en dernier le matin.

### 2.3 — Catégories de la routine actuelle (app)
- **Jour** : Nettoyant · Sérum (0-1) · Crème · SPF
- **Nuit** : Nettoyant · Exfoliant *(rotatif)* · Masque *(rituel hebdo)* · Crème
- *À étendre* : Démaquillant, Rétinoïde (soir), Contour des yeux, Soin ciblé (spot).

---

## 3. Taxonomie des catégories de produits

| Catégorie | Rôle | Moment | Fréquence type | Obligatoire ? |
|---|---|---|---|---|
| **Démaquillant** (huile/baume/eau micellaire) | retirer maquillage, SPF, sébum | soir | quotidien si maquillage/SPF | conditionnel |
| **Nettoyant** (gel, mousse, crème, baume) | nettoyer sans décaper | matin & soir | quotidien | **toujours** |
| **Exfoliant — BHA** (ac. salicylique) | désincruster le pore (lipophile) | soir | 2-3×/sem | conditionnel |
| **Exfoliant — AHA** (glycolique, lactique, mandélique, PHA) | renouveler la surface | soir | 1-3×/sem | conditionnel |
| **Exfoliant — mécanique/enzymatique** (gommage billes rondes, poudre, enzymes papaïne/bromélaïne) | lisser/raviver en douceur | soir | 1×/sem | conditionnel |
| **Sérum/Traitement** (par actif, cf. §4) | cibler une préoccupation | matin et/ou soir | selon actif | conditionnel |
| **Hydratant / Crème** | sceller l'eau, réparer la barrière | matin & soir | quotidien | **toujours** |
| **Protection solaire (SPF)** (chimique/minéral) | UV → anti-taches & anti-âge | matin | quotidien | **toujours (matin)** |
| **Masque** (purifiant argile · hydratant · exfoliant/peeling · apaisant) | rituel ciblé | soir | 1×/sem | conditionnel |
| **Contour des yeux** | cernes/poches/ridules | matin et/ou soir | quotidien | conditionnel |
| **Soin ciblé (spot)** | bouton localisé | ponctuel | au besoin | conditionnel |

---

## 4. Matrice préoccupation → actifs → catégories (TOUS les cas)

> Pour chaque préoccupation (ids alignés sur `src/features/analysis/attributes.ts`) : **actif(s) de 1ʳᵉ intention** puis **alternatives**, et la **catégorie** où le produit se range.

| Préoccupation (id) | Actifs 1ʳᵉ intention | Alternatives | Catégories porteuses |
|---|---|---|---|
| **Imperfections / acné** (`acne`) | acide salicylique (BHA), acide azélaïque | rétinoïde, peroxyde de benzoyle (spot), niacinamide, soufre | Nettoyant BHA, Exfoliant BHA, Sérum, Traitement, Soin ciblé |
| **Points noirs** (`comedones`) | BHA, rétinoïde | argile (masque), niacinamide | Exfoliant BHA, Masque purifiant, Sérum |
| **Marques post-acné** (`post_acne_marks`) | niacinamide, acide azélaïque, vitamine C *(rouges/PIE)* | AHA, rétinoïde *(brunes/PIH)*, SPF | Sérum, Traitement, SPF |
| **Pores dilatés** (`pores`) | niacinamide, BHA | rétinoïde, argile | Sérum, Exfoliant BHA, Masque |
| **Grain irrégulier / texture** (`texture`) | AHA, rétinoïde | exfoliant mécanique/enzymatique doux, PHA | Exfoliant AHA/mécanique, Traitement |
| **Sécheresse / desquamation** (`flaking`) | acide hyaluronique, céramides, squalane | glycérine, panthénol, crème riche/baume | Sérum hydratant, Crème, Masque hydratant |
| **Teint irrégulier** (`tone_evenness`) | niacinamide, vitamine C, acide azélaïque | AHA | Sérum, Traitement |
| **Teint terne** (`radiance`) | vitamine C, AHA | exfoliation douce, niacinamide | Sérum antioxydant, Exfoliant |
| **Taches / hyperpigmentation** (`dark_spots`) | vitamine C, acide azélaïque, niacinamide, **SPF** | AHA, rétinoïde, arbutine, acide tranexamique, acide kojique | Sérum, Traitement, SPF |
| **Rougeurs** (`redness`) | acide azélaïque, centella, niacinamide | panthénol, allantoïne, eau thermale ; *(rosacée → dermato)* | Sérum apaisant, Crème apaisante, Masque apaisant |
| **Brillance / sébum** (`shine`) | niacinamide, BHA | argile (masque), hydratant gel non comédogène | Sérum, Exfoliant BHA, Masque purifiant |
| **Vaisseaux apparents** (`visible_vessels`) | acide azélaïque, apaisants, **SPF** | centella ; *(couperose/rosacée → dermato/laser)* | Sérum apaisant, SPF |
| **Ridules** (`fine_lines`) | rétinoïde, peptides | vitamine C, hydratation, AHA | Traitement (soir), Sérum, Contour yeux |
| **Rides installées** (`wrinkles`) | rétinoïde, peptides | (acte esthétique = hors cosmétique) | Traitement (soir), Crème riche |
| **Cernes** (`under_eye_circles`) | selon type — **pigmentaire** : vitamine C, niacinamide ; **vasculaire** : caféine, vitamine K ; **creux** : hydratation/AH | rétinoïde contour, SPF | Contour des yeux |
| **Poches** (`under_eye_puffiness`) | caféine, contour décongestionnant | froid, hygiène de vie ; *(si chronique → médical)* | Contour des yeux |

**Glossaire actifs (résumé) :**
- **Niacinamide** : polyvalent (sébum, pores, rougeurs, marques, barrière). Très bien toléré, matin ou soir. Coût d'irritation ~0.
- **Acide salicylique (BHA)** : lipophile, désincruste le pore → acné/points noirs/peau grasse. Soir. Photosensibilisant léger.
- **AHA** (glycolique > lactique > mandélique > **PHA** le plus doux) : surface → grain, éclat, taches. Soir. Photosensibilisant (SPF ++).
- **Exfoliant mécanique/enzymatique** : billes **rondes/biodégradables** ou poudres/enzymes (papaïne) → lissage doux pour qui ne tolère pas les acides. **Jamais** sur acné enflammée ni peau réactive ; pas de grains abrasifs (noyaux).
- **Rétinoïde** (rétinol < rétinal < trétinoïne ; **adapalène** pour l'acné) : renouvellement cellulaire → âge, texture, acné, marques. **Soir uniquement**, montée progressive, **déconseillé grossesse**.
- **Vitamine C** (L-ascorbique > dérivés) : antioxydant, éclat, taches, marques rouges. **Matin** sous SPF.
- **Acide azélaïque** : doux et polyvalent (acné, rougeurs, marques, taches). Toléré grossesse & peau réactive.
- **Acide hyaluronique / céramides / squalane / panthénol** : hydratation & barrière. Coût ~0, tout le monde.
- **Apaisants** (centella/cica, allantoïne, panthénol, madécassoside) : rougeurs, peau réactive.
- **Peptides** : signaux anti-âge, doux, cumulables.
- **SPF** : minéral (oxyde de zinc/titane — peaux réactives) ou chimique (fini léger). 30-50.

---

## 5. Modulation par type de peau & phototype

### 5.1 — Type de peau (oriente la TEXTURE et la douceur, pas la cible)
| Type | Nettoyant | Hydratant | Notes |
|---|---|---|---|
| **Grasse** | gel/mousse | gel léger non comédogène | tolère mieux BHA/acides ; matifier |
| **Mixte** | gel doux | fluide | cibler la zone T |
| **Sèche** | crème/baume sans sulfate | crème riche/baume, céramides | actifs hydratants ++, acides doux (lactique/PHA) |
| **Normale** | au choix doux | fluide/crème | large tolérance |
| **Sensible / réactive** | crème sans parfum | apaisant, barrière | **exclure** acides forts, gommage mécanique, parfum, alcool |

### 5.2 — Phototype (Fitzpatrick)
- **I-II** (clairs) : risque coup de soleil → SPF, vigilance taches solaires.
- **III-IV** : bronzage, PIH possible.
- **V-VI** (foncés) : **risque élevé de PIH** → introduire les actifs forts très progressivement, privilégier azélaïque/niacinamide, **SPF impératif**, prudence avec AHA fort et gommage.

---

## 6. Sécurité & contre-indications (garde-fous)

| Situation (q7 / bilan) | On EXCLUT | On PRIVILÉGIE |
|---|---|---|
| **Grossesse / allaitement** | rétinoïdes, acide salicylique fort/leave-on, hydroquinone, peroxyde de benzoyle (prudence) | acide azélaïque, niacinamide, vitamine C, acide hyaluronique, AHA doux ponctuel |
| **Rosacée / eczéma / peau réactive** | acides forts, gommage mécanique, parfum, alcool dénaturé, huiles essentielles | apaisants (centella, azélaïque), barrière (céramides), SPF minéral |
| **Acné sévère / kystique** (niveau 4) | routine cosmétique traitante | **orienter dermatologue** + socle doux + SPF |
| **Traitement dermato en cours** (isotrétinoïne, prescription) | tout actif fort | socle minimal (nettoyant doux, hydratant réparateur, SPF) + valider avec le médecin |
| **Barrière fragilisée** (desquame + rougeurs) | actifs, exfoliants | réparation : nettoyant doux, céramides/HA, SPF ; réintroduire après 2-3 sem |
| **Irritants déclarés (q2)** | parfum / alcool / huiles essentielles / sulfates selon le cas | versions « fragrance-free / alcohol-free » |

---

## 7. Compatibilités, alternance & introduction

### 7.1 — Incompatibilités (ne pas le même soir)
- **2 acides** (BHA + AHA) ✗ · **acide fort + rétinoïde** ✗ · **rétinoïde + peroxyde de benzoyle** ✗ (s'annulent/irritent).
- **Vitamine C** plutôt le **matin** ; **rétinoïde/exfoliant** le **soir**.
- Gommage mécanique **+** acide/rétinoïde le même soir ✗.

### 7.2 — Budget de tolérance (dose d'irritation hebdomadaire)
Coût indicatif par application : SPF/HA/niacinamide/azélaïque/apaisants **0** · vitamine C **1** · BHA / AHA doux **2** · AHA fort (glycolique) / peroxyde de benzoyle **3** · rétinol **4** (rétinal/trétinoïne **5**) · masque argile **1** · gommage mécanique **2** · peeling masque **3**.
**Plafond hebdo** selon sensibilité/barrière : fragile **0-3** · sensible **~6** · normale **~12** · tolérante **~16**.
→ La somme des coûts de la semaine doit rester **≤ plafond** ; sinon on baisse une fréquence.

### 7.3 — Phases d'introduction (le plafond monte avec l'expérience)
| Phase | Durée | Plafond | On introduit |
|---|---|---|---|
| 0 — Stabiliser | sem. 1-2 | socle seul | nettoyant + hydratant + SPF |
| 1 — 1ᵉʳ actif | sem. 3-5 | ~50 % | **un** actif rotatif, basse fréquence |
| 2 — Cadence + rituel | sem. 6+ | ~75 % | monter la fréquence, 2ᵉ actif en alternance, masques |
| 3 — Optimisation | continu | 100 % | routine pleine, ajustée aux résultats |

---

## 8. Logique de sélection (comment l'algorithme choisit)

1. **Garde-fou (bloquant)** : red flags (§6) → socle seul + orientation. Sinon on continue.
2. **Lire le bilan** : préoccupations (niveau ≥ 2, triées par priorité), type de peau, phototype, sensibilité/barrière, réponses q2/q7.
3. **Socle** (toujours) : Nettoyant + Hydratant adaptés au TYPE de peau + SPF (matin).
4. **Sérum quotidien** (≤ 1 le jour) : choisi par préoccupation dominante (vitamine C si taches/éclat ; niacinamide si sébum/pores/rougeurs ; hydratant si peau sèche).
5. **Actif rotatif (soir)** : par préoccupation dominante — BHA (acné/points noirs), AHA ou mécanique (grain/éclat sans acné), rétinoïde (âge/texture, hors grossesse). **Un seul.**
6. **Rituel** : masque par besoin (purifiant si gras non réactif, hydratant si sec, apaisant si rougeurs) ; contour des yeux si cernes/poches ; spot si besoin.
7. **Filtre sécurité** : retirer les produits `unsafePregnancy` / `unsafeSensitive` selon q7 ; retirer les irritants q2.
8. **Budget** : calculer la charge hebdo, baisser les fréquences si > plafond (§7.2).
9. **Recommandé + alternatives** : pour chaque catégorie, le **recommandé** = meilleur match (préoccupation × type de peau × tier) ; les **alternatives** = autres produits/approches du même besoin (ex. pour « exfoliant » : BHA recommandé + AHA + mécanique en alternatives), pour laisser le choix au swipe.
10. **Justification honnête** : ne mentionner un constat que s'il est dans le bilan.

---

## 8 bis. Moteur de décision — intelligence, incertitude & explicabilité

> Intègre un feedback externe. **On ne garde que ce qui apporte de la valeur sans exiger de données qu'on n'a pas encore** ; le reste est noté « à venir » avec sa dépendance.

### a) Hiérarchie décisionnelle (la barrière prime)
1. **Sécurité** (garde-fous §6) — bloquant
2. **État de la barrière** — réparer avant de traiter
3. **Préoccupations prioritaires** (niveau × poids)
4. **Sensibilité**
5. **Type de peau** (texture)
6. **Objectif & préférences** utilisateur
> Deux peaux grasses *identiques* peuvent recevoir des routines opposées selon leur barrière/sensibilité : c'est pour ça que ces deux variables passent **avant** le type de peau.

### b) Gérer l'incertitude (confiance dans l'analyse)
- **Aujourd'hui** : `photoQuality.ok` = confiance **globale**. Photo limite (sombre, maquillage, flou, visage partiel) → **approche conservatrice** : socle + actifs doux, **pas d'actif fort**.
- **À venir** *(dépend de l'IA)* : un **`confidenceScore` par préoccupation**. Confiance faible sur un concern → on n'agit **pas agressivement** dessus.
- **Règle d'or : incertitude → prudence** (jamais l'inverse).

### c) Interactions graduées (remplace le binaire compatible/incompatible)
| Combinaison (même soir) | Niveau |
|---|---|
| Vitamine C (matin) + rétinoïde (soir) | **safe** |
| Azélaïque + niacinamide | **safe** |
| Rétinoïde + AHA/BHA | **caution** (→ alterner les soirs) |
| AHA fort + BHA | **avoid** |
| Rétinoïde + peroxyde de benzoyle | **avoid** |
→ modèle `interactionLevel: "safe" | "caution" | "avoid"` plutôt qu'un simple booléen.

### d) Puissance & preuve des actifs
Deux produits du même actif ne se valent pas (L-AA 15 % vs SAP/MAP ; rétinol < rétinal < trétinoïne).
- **`activeStrength` (1-5)** : choisir l'intensité selon la **tolérance** (débutant/sensible → basse ; tolérant → haute).
- **`evidenceLevel` (1-5)** : niveau de preuve, pour départager à puissance égale. *(utile mais secondaire.)*

### e) Scores explicatifs *(CALCULÉS à la sélection, pas stockés)*
Pour chaque produit candidat :
- **`matchScore`** = recouvrement `targets` × priorité des concerns présents.
- **`irritationRisk`** = `irritationCost` × sensibilité (− tolérance).
- **`expectedBenefit`** = `matchScore` × `activeStrength` (pondéré par `evidenceLevel`).
→ Permet une **justification transparente** : *« On recommande l'acide azélaïque plutôt qu'un rétinoïde : ton risque d'irritation est élevé alors que le bénéfice attendu est similaire. »* C'est l'application directe de la règle « justification honnête ».

### f) Objectifs utilisateur *(dépend d'une nouvelle question)*
Même peau, attentes différentes : **minimaliste** (routine courte, observance) · **résultats rapides** (actifs + puissants, tolérance au risque) · **petit budget** (rapport efficacité/prix) · **tolérance max** (priorité absolue à la douceur). → module le **nombre d'étapes**, l'**agressivité** et le **tier de prix**.

### g) Sous-typage des préoccupations *(priorité basse)*
L'acné a des formes (inflammatoire / comédonienne / hormonale…) qui n'appellent pas les mêmes actifs. **Partiellement déjà géré** : `acne` et `comedones` sont **deux attributs distincts**. Mais l'**hormonal n'est pas détectable sur une photo** → relèverait du questionnaire. À garder pour plus tard.

### Ce qu'on intègre — par priorité
| Priorité | Élément | Coût / dépendance |
|---|---|---|
| **Haute** | hiérarchie « barrière d'abord » (a) · confiance globale (b) · scores explicatifs (e) | calculable avec l'existant |
| **Haute** | interactions graduées (c) | donnée DB à remplir |
| **Moyenne** | `activeStrength` (d) · objectifs utilisateur (f) | **f = nouvelle question** |
| **Basse / à venir** | `confidenceScore` par concern (b) · sous-types (g) · `evidenceLevel` (d) | **b = changement contrat IA** |

---

## 9. Schéma de la base de données produits

> Chaque produit du catalogue suit ce modèle. C'est ce qui permet à l'algo de choisir et au deck d'afficher recommandé + alternatives.

```ts
type Product = {
  id: string;                 // slug unique, ex. "lrp-effaclar-gel"
  brand: string;              // "La Roche-Posay"
  name: string;               // "Effaclar Gel Cleanser"
  category: Category;         // cf. enum ci-dessous
  type?: string;              // sous-type : exfoliant → "bha"|"aha"|"pha"|"mecanique"|"enzymatique" ; spf → "mineral"|"chimique" ; nettoyant → "gel"|"mousse"|"creme"|"baume"|"huile"
  keyActives: { name: string; percent?: number }[]; // [{name:"acide salicylique", percent:2}]
  targets: ConcernId[];       // ids d'attributs adressés (cf. §4)
  skinTypes: SkinType[];      // ["grasse","mixte"] ou ["tous"]
  moment: "am" | "pm" | "both";
  frequency: string;          // "quotidien" | "2-3×/sem" | "1×/sem"…
  tier: "eco" | "moyen" | "premium";
  price: string;              // "$18.99"
  image?: string;             // /public ; sinon flacon générique
  url: string;                // lien marque (affilié)
  // Sécurité / compatibilité / puissance
  unsafePregnancy?: boolean;
  unsafeSensitive?: boolean;
  irritationCost?: number;    // 0..5 (cf. §7.2) pour le budget de tolérance
  activeStrength?: 1|2|3|4|5; // puissance réelle de l'actif (cf. §8 bis-d)
  evidenceLevel?: 1|2|3|4|5;  // niveau de preuve (optionnel ; départage à puissance égale)
  // NB : les incompatibilités ne sont PLUS un booléen par produit mais une table
  // d'interactions GRADUÉES : { activeA, activeB, level: "safe"|"caution"|"avoid" } (§8 bis-c).
  // matchScore / irritationRisk / expectedBenefit = CALCULÉS à la sélection, pas stockés (§8 bis-e).
  // Filtres « à éviter » (q2)
  fragranceFree?: boolean;
  alcoholFree?: boolean;
  // Affichage
  why: string;                // justification reliée au bilan (HTML <b> autorisé)
  recommendedRank?: number;   // ordre dans sa catégorie/famille
};

type Category =
  | "demaquillant" | "nettoyant" | "exfoliant" | "serum" | "traitement"
  | "hydratant" | "spf" | "masque" | "contour_yeux" | "soin_cible";

type SkinType = "seche" | "grasse" | "mixte" | "normale" | "sensible" | "tous";

type ConcernId =  // = ids de attributes.ts
  | "acne" | "comedones" | "post_acne_marks" | "pores" | "texture" | "flaking"
  | "tone_evenness" | "radiance" | "dark_spots" | "redness" | "shine"
  | "visible_vessels" | "fine_lines" | "wrinkles" | "under_eye_circles" | "under_eye_puffiness";
```

### Conseils de remplissage de la base
- **Couvrir chaque catégorie sur 3 tiers de budget** (éco / moyen / premium) → permet d'adapter à `q6` (budget).
- **Au moins 1 recommandé + 3 alternatives** par (catégorie × besoin) pour alimenter le deck de swipe.
- **Renseigner `unsafePregnancy` / `unsafeSensitive` / `incompatible` / `irritationCost`** systématiquement : c'est ce qui garantit la sécurité et le budget.
- **`targets` précis** : un produit ne doit s'afficher que si ses cibles croisent le bilan (justification honnête).
- **Variété de textures** par type de peau (gel pour grasse, baume pour sèche…).
- **Vérifier les liens et prix** (données affiliées) ; flag « disponible » si rupture fréquente.

---

## 10. Exemples de profils → routine (cas de figure)

| Profil | Jour | Nuit |
|---|---|---|
| **Mixte, acné légère, sébum** | Nettoyant gel · Sérum niacinamide · Crème fluide · SPF | Nettoyant · **Exfoliant BHA** (2-3×/sem) · **Masque argile** (1×/sem) · Crème |
| **Sèche, terne, taches** | Nettoyant crème · Sérum vitamine C · Crème riche · SPF | Nettoyant · **Exfoliant AHA doux/lactique** (1-2×/sem) · **Masque hydratant** · Crème/baume |
| **Mature, rides, texture** | Nettoyant doux · Sérum vitamine C/peptides · Crème · SPF | Nettoyant · **Rétinoïde** (2-3×/sem) · Sérum apaisant · Crème riche |
| **Rosacée / réactive** | Nettoyant sans parfum · Sérum azélaïque/centella · Crème apaisante · **SPF minéral** | Nettoyant doux · *(pas d'acide/gommage)* · **Masque apaisant** · Crème barrière |
| **Grossesse + acné** | Nettoyant · Sérum niacinamide/azélaïque · Crème · SPF | Nettoyant · *(pas de BHA/rétinoïde)* · Crème *(azélaïque en traitement)* |
| **Hyperpigmentation, phototype V-VI** | Nettoyant · Sérum vitamine C + azélaïque · Crème · **SPF élevé** | Nettoyant · AHA **doux** progressif · niacinamide · Crème |
| **Débutant, peau « normale »** | Nettoyant · (Sérum hydratant) · Crème · SPF | Nettoyant · *(rien au début)* · Crème |

---

### Annexe — alignement avec le code actuel
- Préoccupations = `src/features/analysis/attributes.ts` (16 attributs).
- Sélection actuelle = `src/features/routine/personalize.ts` + catalogue `src/features/routine/products.ts`.
- Budget/phases = repris de `docs/superpowers/…` (playbook v2) — à brancher quand la base produits sera étoffée.
- **Phase B (extension)** : ajouter les catégories/actifs manquants (Démaquillant, Exfoliant AHA & mécanique, Rétinoïde, Vitamine C, Azélaïque, Contour yeux, Soin ciblé) et remplir la base selon le schéma §9.
