# Le calcul du score formule — v2.0 « métier », tel qu'implémenté

> Ce document décrit le calcul **tel qu'il tourne dans `src/lib/scan/scoring.mjs`**
> (`CONFIG.algoVersion = "2.0.0-metier"`), constante par constante, de quoi refaire n'importe
> quelle note à la main avec un papier et l'INCI du produit.
>
> ⚠️ `docs/specs/scan-scoring.md` décrit la **v1** et n'a pas été mis à jour après le passage aux
> grilles métier du 27/08. En cas d'écart, c'est le présent document qui reflète le code.

---

## La formule maîtresse

```
note =  50            base
      + 0 → 42        le métier accompli
      −  prérequis manquants
      −  pénalités propres à la famille
      −  risques, parfum, alcool
      +  8            si filtres UV et que ce n'est pas un solaire
      puis plafonds non compensatoires, puis arrondi entre 5 et 100
```

Aucune IA n'intervient dans les chiffres. Un ingrédient absent du dictionnaire vaut **zéro
point** — jamais un malus : on ne punit pas ce qu'on ne sait pas lire.

---

## A. Avant tout : lire l'INCI

### A.1 — La position compte, c'est le poids `w`

La réglementation impose l'ordre décroissant de concentration. La position est donc un indice de
dose, et chaque point gagné ou perdu est multiplié par ce poids.

| Position dans l'INCI | poids `w` | Lecture |
|---|---:|---|
| 1 à 5 | 1,0 | le cœur de la formule |
| 6 à 10 | 0,6 | présent, mais dilué |
| 11 et au-delà | 0,3 | trace |
| après la barre des 1 % | 0,3 | ordre légalement libre |
| ingrédient marqué `lowDose` | 1,0 | exception : efficace sous 1 % |

La **barre des 1 %** se repère à l'œil : dès qu'apparaît l'un de ces six marqueurs, tout ce qui
suit est en dessous de 1 % et son ordre ne veut plus rien dire.

```
PHENOXYETHANOL · XANTHAN GUM · CARBOMER
DISODIUM EDTA · SODIUM BENZOATE · POTASSIUM SORBATE
```

> **Pourquoi.** Sans ce poids, un céramide en 38ᵉ position rapporterait autant qu'un céramide en
> 3ᵉ. C'est exactement le reproche fait à Yuka : compter la présence sans compter la dose.

### A.2 — Chaque ingrédient porte une fiche

Le dictionnaire (`data/scan/dictionnaire.json`) attribue à chaque ingrédient :

- un **rôle** : `active` ou `support`
- une **puissance de preuve** `benefitPower` de 1 à 3
- une liste de **bénéfices** : `blemishes`, `oiliness`, `dehydration`, `redness`, `aging`,
  `spots`, `barrier`
- des **fonctions** : humectant, occlusif, antioxydant, lipide-barrière, tensioactif doux ou
  agressif, filtre UVA/UVB, acide AHA/BHA/PHA, émollient, émulsifiant…
- des **drapeaux de risque** : `fragrance`, `essentialOil`, `dryingAlcohol`, gravité 1 à 3,
  comédogénicité, niveau de sensibilisation

La **puissance 3** est réservée aux actifs à preuves solides — niacinamide, acide tranexamique,
arbutine, rétinol, vitamine C.

---

## B. Les six termes du calcul, dans l'ordre

### 1 — La base : 50

Tout produit démarre à 50. Un produit qui ne fait rien de mal et rien de remarquable reste à 50.

> **Pourquoi.** L'échelle n'est pas « 100 moins les fautes ». C'est un milieu : on monte en
> faisant son métier, on descend en ayant des défauts. Partir de 100 supposerait que tout produit
> est parfait jusqu'à preuve du contraire — ce qui donne la note la plus haute au produit le plus
> vide.

### 2 — Le métier : 0 à 42 points

Le cœur du système, et le **seul endroit où l'on peut gagner des points**. Trois temps.

**Premier temps — la grille de la famille.** Chaque catégorie a ses propres critères. Exemple du
sérum :

| Critère | points bruts | Condition exacte |
|---|---:|---|
| `concentre` | 16 | un actif de puissance ≥ 3 en position ≤ 5 |
| `sansParfum` | 12 | aucun parfum ni huile essentielle |
| `richesse` | 16 | 2,2 × puissance × `w`, par actif — plafonné à 16 |
| `lipides` | 8 | au moins un lipide de barrière |
| `antiox` | 6 | au moins un antioxydant |
| **total de la grille** | **58** | le maximum théorique du sérum |

**Deuxième temps — la conversion en pourcentage.** Les grilles n'ont pas toutes le même total :
48 pour un démaquillant, 58 pour un sérum. Les points bruts ne sont donc pas comparables.

```
part = points obtenus ÷ total de la grille
```

**Troisième temps — la conversion en note.** Cette part est multipliée par un budget **identique
pour toutes les familles** :

```
métier = part × 42
```

> **Pourquoi cette double conversion.** Sans elle, un sérum partirait avec un avantage mécanique
> de 10 points sur un démaquillant — pas parce qu'il est meilleur, mais parce que sa grille est
> plus généreuse. Remplir 100 % de la grille nettoyant vaut désormais exactement autant que
> remplir 100 % de la grille sérum. C'est l'équité par construction, et elle ne dépend d'aucun
> catalogue — contrairement aux offsets qu'elle remplace.

**Conséquence qui surprend :** chaque critère rapporte **au prorata**. Un sérum qui ne coche que
« richesse » (16 bruts sur 58) touche `16 ÷ 58 × 42 = 11,6` points — pas 16.

### 3 — Les prérequis : ce dont l'absence coûte

Certains critères, 90 % de la famille les remplit. Les récompenser reviendrait à donner des
points au permis de conduire pour être venu en voiture. On ne paie donc plus leur présence — on
sanctionne leur absence.

| Famille | Prérequis | coût si absent |
|---|---|---:|
| sérum | au moins trois actifs | −12 |
| traitement | au moins trois actifs | −10 |
| nettoyant | un tensioactif doux | −12 |
| démaquillant | de quoi dissoudre le maquillage | −12 |
| hydratant · contour | un humectant | −12 |
| tonique | un humectant | −10 |
| exfoliant | un acide exfoliant | −14 |
| solaire | un filtre UV | −25 |
| solaire | avobenzone stabilisée | −10 |

### 4 — Les pénalités propres à la famille

Deux familles seulement en ont, parce qu'elles seules peuvent commettre ces fautes-là.

| Famille | Faute | coût |
|---|---|---:|
| nettoyant | sulfate agressif dans les 12 premiers | −9 × `w` |
| nettoyant | base savon à pH élevé | −10 |
| démaquillant | sulfate agressif dans les 10 premiers | −9 × `w` |

> **Règle « un ingrédient = une ligne ».** Ce qu'une pénalité métier facture ne reprend pas le
> malus de risque générique par-dessus. Le sulfate était compté deux fois : −18 par la faute
> métier, puis −4 par ingrédient.

### 5 — Les risques, communs à tous

Chaque ingrédient marqué à risque coûte :

```
−2 × gravité(1-3) × w(position) × sévérité(famille) × exposition(famille)
```

Deux coefficients de famille modulent tout :

| Famille | sévérité | exposition | Lecture |
|---|---:|---:|---|
| contour des yeux | 1,8 | 1,0 | peau la plus fine |
| exfoliant | 1,3 | 0,85 | barrière déjà fragilisée |
| démaquillant | 1,2 | 0,5 | part au rinçage |
| tonique | 1,2 | 1,0 | reste sur la peau |
| nettoyant | 1,0 | 0,55 | 30 secondes de contact |
| sérum · crème · solaire · masque | 1,0 | 1,0 | référence |

> **Pourquoi l'exposition.** Un produit qui part au rinçage en trente secondes n'expose pas la
> peau comme une crème laissée huit heures. C'est le même argument que la pondération par
> position : la dose compte.

**Trois malus fixes, indépendants de la position :**

| Défaut | coût | Particularité |
|---|---:|---|
| parfum | −4 | cumulés, puis **plafonnés à −12** |
| huile essentielle | −5 | idem |
| alcool desséchant en positions 1-5 | −6 | ligne distincte |

> **Pourquoi plafonner le parfum.** Le système parfumant compte comme *une* caractéristique, pas
> comme N ingrédients. Sinon une marque qui déclare ses douze allergènes — obligation européenne
> — est punie douze fois, quand une marque opaque qui écrit « Parfum » ne l'est qu'une. Prime à
> l'opacité : inacceptable.

**Le parfum coûte deux fois** : le malus de −4, *et* les 12 points de mérite « sansParfum » qu'il
rend inaccessibles. Seul le premier apparaît dans le détail affiché à l'écran.

### 6 — Le seul bonus hors budget : +8

Un produit qui n'est pas un solaire mais porte des filtres UV gagne **+8**. Un vrai plus, mais ce
n'est pas son métier. Dans un solaire, les filtres sont déjà payés par sa grille — pas deux fois.

**C'est le seul terme additif en dehors des 42 points de métier.** Cette phrase explique tout le
plafond de l'échelle (voir section D).

### 7 — Les plafonds non compensatoires, puis l'arrondi

| Situation | note maximale |
|---|---:|
| un risque de gravité 3 en positions 1 à 5 | 49 — jamais vert |
| un risque de gravité 3 plus loin | 69 — jamais excellent |
| ingrédient déconseillé pendant la grossesse *(score perso)* | 15 |
| allergie déclarée par l'utilisatrice *(score perso)* | 10 |

Enfin, le résultat est ramené entre **5 et 100** et arrondi à l'entier.

> **Pourquoi non compensatoire.** Une moyenne laisserait un excellent actif racheter un irritant
> sévère placé en tête de formule. Sur un produit qu'on met sur le visage, certaines choses ne se
> compensent pas.

---

## C. Le calcul refait à la main

### Avène Hydrance Boost Concentrated Hydrating Serum → 58

Dix-sept ingrédients. Catégorie : sérum, donc grille sur 58 points, sévérité 1,0, exposition 1,0.

**L'INCI, lu par le moteur :**

| pos | ingrédient | rôle | puissance | `w` | ce qu'il déclenche |
|---:|---|---|---:|---:|---|
| 1 | Avène thermal spring water | active | 2 | 1,0 | actif faible |
| 2 | Propanediol | support | — | 1,0 | rien |
| 3 | Glycerin | active | 2 | 1,0 | actif faible |
| 4 | Pentylene glycol | support | — | 1,0 | rien |
| 5 | Diglycerin | active | 2 | 1,0 | actif faible |
| 6 | 1,2-Hexanediol | support | — | 0,6 | rien |
| 7 | **Niacinamide** | active | **3** | 0,6 | ⚠️ puissance 3, mais hors du top 5 |
| 8 | Sodium hyaluronate | active | 2 | 0,6 | actif faible |
| 9 | Betaine | active | 1 | 0,6 | actif faible |
| 10 | Citric acid | support | — | 0,6 | rien |
| 11 | **Fragrance** | filler | — | 0,3 | parfum |
| 12 | PCA | active | 2 | 0,3 | actif faible |

Aucun antioxydant. Aucun lipide de barrière. Sept actifs reconnus, mais un seul de puissance 3 —
et il est septième.

**La grille, critère par critère :**

| Critère | max | obtenu | Verdict |
|---|---:|---:|---|
| `concentre` | 16 | **0** | Niacinamide est en 7ᵉ, il faut ≤ 5 |
| `sansParfum` | 12 | **0** | Fragrance en 11ᵉ |
| `richesse` | 16 | **16** | plafond atteint |
| `lipides` | 8 | **0** | aucun |
| `antiox` | 6 | **0** | aucun |
| **total brut** | **58** | **16** | soit 27,6 % |

**L'addition :**

```
base                                    50,0
métier      16 ÷ 58 × 42              + 11,6
prérequis   trois actifs présents      −  0
pénalités   aucune pour un sérum       −  0
parfum      4 × 1,0 × 1,0              −  4,0
filtres UV                             +  0
─────────────────────────────────────────────
                                        57,6  →  58
```

### ANUA Niacinamide 10 TXA 4 → 92

Le meilleur sérum du catalogue. Les deux formules contiennent la même niacinamide — chez ANUA
elle est **troisième**.

| Critère | Avène (58) | ANUA (92) |
|---|---|---|
| actif fort en top 5 | ✗ pos. 7 | ✓ Niacinamide pos. 3 |
| sans parfum | ✗ | ✓ |
| liste d'actifs | ✓ plafond | ✓ plafond (tranexamic acid, arbutine…) |
| antioxydant | ✗ | ✓ thé vert, vitamine C |
| lipides de barrière | ✗ | ✓ Céramide NP, lécithine |
| **métier** | **11,6 / 42** | **42,0 / 42** |

```
base                                    50,0
métier      58 ÷ 58 × 42              + 42,0
aucune faute, aucun risque             −  0
─────────────────────────────────────────────
                                          92
```

---

## D. Pourquoi 92 et pas 100

Ce sérum accomplit **100 % de son métier**. Il n'a aucun défaut. Et il plafonne à 92, parce que
`50 + 42 = 92` et qu'aucun autre terme ne peut s'ajouter.

| Famille | plafond réel | Raison |
|---|---:|---|
| sérum, tonique, nettoyant, masque, exfoliant, contour, démaquillant, traitement | **92** | base + budget |
| solaire | **92** | ses filtres sont payés par sa grille |
| **crème avec SPF** | **100** | base + budget + le bonus de 8 |

Mesuré sur les 2 403 produits notés du catalogue : **maximum 94**, aucun à 95 ou plus. Les six
derniers points de l'échelle sont vides, et inatteignables pour huit familles sur dix.

---

## E. Toutes les grilles

Un critère n'entre dans une grille que s'il est **discriminant** : entre 25 % et 75 % des
produits de la famille le remplissent. En dessous, il est inatteignable ; au-dessus, ce n'est
plus un critère mais un ticket d'entrée — il passe alors en prérequis.

| Famille | Son métier | Critères récompensés | total |
|---|---|---|---:|
| nettoyant | nettoyer sans décaper | sans parfum 12 · tensioactifs doux 12 · barrière intacte 16 · actifs 10 | 50 |
| démaquillant | dissoudre et rincer | sans parfum 14 · rinçabilité 10 · barrière intacte 16 · actifs 8 | 48 |
| sérum | délivrer des actifs | actif fort en tête 16 · sans parfum 12 · liste d'actifs 16 · lipides 8 · antioxydant 6 | 58 |
| traitement | corriger un problème précis | actif fort en tête 18 · sans parfum 12 · liste d'actifs 16 · lipides 8 | 54 |
| hydratant | hydrater et reconstruire | lipides 16 · sans parfum 12 · occlusif 10 · antioxydant 6 · actifs 10 | 54 |
| contour des yeux | hydrater une peau fine sans irriter | sans parfum 18 · lipides 14 · occlusif 8 · actifs doux 10 | 50 |
| solaire | protéger des UV | spectre large 18 · sans parfum 12 · soin en plus 10 · lipides 8 · actifs 8 | 56 |
| exfoliant | resurfacer sans abîmer | sans parfum 14 · tamponné 18 · acide haut dans la liste 10 · actifs 8 | 50 |
| tonique | hydrater et préparer | sans parfum 14 · actif fort en tête 12 · lipides 8 · antioxydant 8 | 52 |
| masque | — | quatre critères | 54 |
| indéterminé | — | trois critères | 48 |

---

## F. La seconde note, « My skin »

Le score perso **part du score formule** et le corrige. Il ne le recalcule pas.

| Correction | valeur | Déclencheur |
|---|---:|---|
| actif qui vise un problème déclaré | +3,5 × sévérité × `w` | max 10 par ingrédient, 30 au total |
| allergène de contact | −3 × niveau × (sensibilité ÷ 3) × `w` | seulement si peau réactive déclarée |
| parfum sur peau sensible | −4 × sensibilité | fusionné avec la ligne formule |
| comédogène ≥ 3 | −3 × `w` | peau grasse ou mixte |
| alcool desséchant | −6 | peau sèche |
| huile essentielle | −8 | peau réactive |
| actif trop puissant | −5 par cran | au-delà du seuil de tolérance |
| texture riche | −12 grasse · −7 mixte · +6 sèche | déduite de la composition |
| texture légère | +5 grasse · +3 mixte · −7 sèche | déduite de la composition |
| sulfates | −8 sèche · −8 réactive · −3 mixte | dans les 8 premiers |
| exfoliant puissant | −10 | peau réactive |
| filtres minéraux | +4 | solaire sur peau sensible |

> **Allergie n'est pas irritation.** L'irritation abîme la barrière de tout le monde : elle reste
> dans la note formule. La sensibilisation ne touche que les personnes concernées : elle ne pèse
> que sur la note perso, proportionnellement à la réactivité déclarée. Un profil non sensible ne
> paie rien pour un allergène — sinon on pénaliserait le decyl glucoside, l'agent lavant le plus
> doux du marché, pour quelqu'un qui n'y est pas allergique.

C'est pourquoi la note perso peut **dépasser** la note formule : l'Avène est à 58 en formule et
65 pour une peau mixte, parce que sa texture légère lui convient et que sa niacinamide vise ses
imperfections.

La **richesse** du produit est déduite de la composition, pas du libellé de catégorie : chaque
ingrédient « riche » ajoute un poids selon sa position (4 en positions 1-3, 2,5 en 4-6, 1 en
7-10, 0,3 au-delà). Au-delà de 8 le produit est « riche », en dessous de 2 il est « léger ».

---

## G. Les seuils d'affichage

| Note | Couleur | Verdict formule |
|---:|---|---|
| 75 à 100 | vert | *A well-built formula* |
| 45 à 74 | orange | *An average formula* |
| 5 à 44 | rouge | *A weak formula* |

Sur les 2 403 produits notés : médiane **66**, neuvième décile 82, minimum 17.

---

## H. Deux points restés ouverts

Relevés en relisant le moteur pour ce document, **non corrigés** :

1. **`borne: [5, 100]` avec le commentaire « 100 ATTEIGNABLE : réservé au sans-faute »** — or un
   sérum sans faute plafonne à 92. Le commentaire décrit une intention que le calcul n'applique
   pas. Le seuil vert a été relevé à 75 « parce que 100 existe », alors que 100 n'existe pas pour
   la plupart des familles.

2. **`bonusFiltresUV: 22` n'est plus appelée nulle part** depuis la correction du double comptage
   des filtres UV sur les solaires (27/08). Code mort qui témoigne d'une échelle qui a bougé sans
   être refermée derrière.

Deux façons de refermer, au choix :

- **Rendre 100 atteignable partout** — porter `budgetMetier` à 50 pour que `50 + 50 = 100`.
  Toutes les notes montent d'environ 20 %, les seuils vert/orange sont à revoir.
- **Assumer 92 comme le maximum** — corriger le commentaire et supprimer `bonusFiltresUV`. Rien
  ne bouge à l'écran, mais la crème avec SPF garde son avantage structurel de 8 points sur toutes
  les autres familles.
