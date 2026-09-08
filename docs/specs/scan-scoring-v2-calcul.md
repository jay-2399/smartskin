# Le calcul du score formule — v2.1 « audit », tel qu'implémenté

> Ce document décrit le calcul **tel qu'il tourne dans `src/lib/scan/scoring.mjs`**
> (`CONFIG.algoVersion = "2.1.0-audit"`), constante par constante, de quoi refaire n'importe
> quelle note à la main avec un papier et l'INCI du produit.
>
> La version 2.1 est l'application du rapport d'audit du 7 septembre 2026
> (`docs/audit/moteur-notation-2026-09-07/rapport-final-v2.md`), en trois lots : les **données**
> d'abord, les **règles** ensuite, la **recalibration** en dernier. Les changements sont notés
> B1 à B11 dans le texte. La section J tient le journal de calibration.
>
> ⚠️ `docs/specs/scan-scoring.md` décrit la **v1** et n'est plus tenu à jour. En cas d'écart,
> c'est le présent document qui reflète le code.

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

**Avant tout calcul, une question préalable :** cette liste d'ingrédients est-elle notable ?
Trois cas où la note serait un mensonge, et où le moteur répond « on ne peut pas noter » plutôt
qu'un chiffre. Voir la section H.

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

### A.3 — Ce que le parseur remet d'aplomb avant de chercher la fiche

Une liste d'ingrédients est écrite par un service marketing, pas par une base de données. Sept
normalisations, toutes ajoutées par l'audit (B1, R1 et R8), sans lesquelles des références
entières étaient mal lues :

| Écrit sur l'emballage | Lu par le moteur | Ce que ça débloque |
|---|---|---|
| `Adapalene USP 0.1%` | `ADAPALENE` | l'Effaclar Adapalene était noté 47 « trop peu d'actifs » |
| `Zinc Oxide 20%` | `ZINC OXIDE` | les filtres minéraux des solaires américains |
| `Octisalate` | `ETHYLHEXYL SALICYLATE` | chaîne d'alias suivie jusqu'à la fiche (3 sauts max) |
| `Perfume`, `Aroma` | `FRAGRANCE` | le malus parfum s'appliquait à `Parfum`, pas à `Perfume` |
| `Titanium Dioxide (Nano)` | `TITANIUM DIOXIDE` | « nano » est une taille de particule, pas un ingrédient |
| `Avene Thermal Spring Water` | `WATER` | une eau de marque n'est pas un actif anti-rougeurs |
| `Zinc Oxide (  )` | `ZINC OXIDE` | parenthèse vide laissée par le nettoyage du pourcentage |

> **Ce que le parseur refuse volontairement de faire.** `Camellia Oleifera (Green Tea) Leaf
> Extract` n'est **pas** ramené à `CAMELLIA OLEIFERA`. 255 paires de ce genre coexistent au
> dictionnaire et 99 divergent sur le fond : se rabattre sur la fiche de base déplacerait 498
> produits jusqu'à 35 points, dans les deux sens. La correction est dans les données, paire par
> paire, pas dans le parseur.

Attention : « Aromatic Water » n'est pas du parfum, et `Thermal Water Ferment Extract` reste un
ferment. Les règles portent sur le jeton entier, jamais sur une sous-chaîne.

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
41,6 pour un démaquillant, 58 pour un sérum. Les points bruts ne sont donc pas comparables.

```
part = points obtenus ÷ ce que la grille peut RÉELLEMENT rapporter
```

Le dénominateur n'est pas la somme des plafonds (B11.2). Les lignes marquées `pondere`
multiplient leurs points par le poids de position, et les **cinq premières places d'une liste
INCI appartiennent au véhicule** : l'eau, le tensioactif d'un nettoyant, la phase grasse d'une
crème. Les émollients d'un nettoyant sont structurellement plus bas — leur ligne vaut 16 points
sur le papier et en paie 5 dans la vie réelle.

Le modèle de places, sans aucun recalage sur le catalogue : la tête de liste au véhicule, puis
cinq places à 0,6 et le reste à 0,3 ; chaque place va à la ligne qui en tire le plus, jusqu'à son
plafond ; une ligne non pondérée prend son plafond sans consommer de place.

| Famille | somme des plafonds | dénominateur réel | meilleur produit du catalogue |
|---|---:|---:|---:|
| nettoyant | 50 | **43,6** | 43,6 |
| démaquillant | 48 | **41,6** | 44,8 |
| exfoliant | 50 | **42,8** | 46,4 |
| masque | 54 | **48,4** | 49,1 |
| les six autres | — | inchangé | — |

> **Pourquoi ça compte.** Avant cette correction, 20,7 % des nettoyants et 21,3 % des masques
> étaient verts, contre 42 % des traitements — non parce qu'ils sont moins bons, mais parce
> qu'on les divisait par un maximum que leur chimie interdit d'atteindre. Après : 26,9 % et
> 30,6 %. `verif-paquet.mjs --grilles` réimprime ce tableau à la demande.

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
| sérum | un actif prouvé, bien placé | −12 |
| traitement · masque | un actif prouvé, bien placé | −10 |
| nettoyant | de quoi laver en douceur | −12 |
| démaquillant | de quoi dissoudre le maquillage | −12 |
| hydratant · contour | un humectant | −12 |
| tonique | un humectant | −10 |
| exfoliant | un acide exfoliant | −14 |
| solaire | un filtre UV | −25 |
| solaire | avobenzone stabilisée | −10 |

Trois de ces prérequis ont été redéfinis par l'audit, parce qu'ils comptaient des ingrédients
plutôt que de vérifier une propriété :

- **« un actif prouvé, bien placé »** (B5) remplace « au moins trois actifs ». Compter trois
  actifs récompensait la liste longue : huit extraits saupoudrés en fin de liste valaient un
  rétinol. Le prérequis demande maintenant un actif de puissance ≥ 2 en bonne position, hors
  glycols — ou un actif efficace sous 1 % (rétinol, adapalène).
- **« de quoi laver en douceur »** (B6) remplace « un tensioactif doux ». Un lait nettoyant sans
  tensioactif du tout n'en avait aucun et perdait 12 points : il nettoie par ses émollients et
  s'essuie. Le prérequis accepte désormais un tensioactif doux **ou** un corps gras, sauf si la
  formule contient un agent agressif ou une base savon.
- **« de quoi dissoudre le maquillage »** accepte les émulsifiants (B6) : les tensioactifs non
  ioniques d'une eau micellaire sont ce qui dissout, et ils étaient invisibles.

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
−2 × gravité × w(position) × sévérité(famille) × exposition(famille)
```

**La gravité est le niveau d'irritation, et lui seul** (B7). Elle valait auparavant
`max(irritant, ⌈comédogénicité ÷ 2⌉)` : un beurre de karité, comédogène 4 et irritant 0, était
facturé comme un irritant sévère pour tout le monde. Boucher les pores n'est un défaut que pour
les peaux qui s'en plaignent — c'est passé du côté du score perso.

**Le premier actif irritant ne coûte rien** (B7). Un rétinol, un acide, un peroxyde de benzoyle
IRRITENT : c'est leur mode d'action. Facturer cette irritation revenait à punir un produit
d'être efficace. Le premier actif de puissance ≥ 2, d'irritation 2, bien placé, passe donc sans
malus — les suivants sont facturés plein tarif, parce qu'empiler trois acides est un choix de
formulation, pas un mode d'action.

Deux coefficients de famille modulent tout :

| Famille | sévérité | exposition | Lecture |
|---|---:|---:|---|
| contour des yeux | 1,8 | 1,0 | peau la plus fine |
| exfoliant | 1,3 | 0,85 | barrière déjà fragilisée |
| démaquillant | 1,2 | 0,5 | part au rinçage |
| tonique | 1,2 | 1,0 | reste sur la peau |
| nettoyant | 1,0 | 0,55 | 30 secondes de contact |
| masque | 1,0 | 0,7 | posé, puis rincé |
| sérum · crème · solaire | 1,0 | 1,0 | référence |

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

**Deux lignes que l'audit a ajoutées, communes à tous :**

| Situation | effet |
|---|---|
| ingrédient **interdit dans l'UE**, portée « tous » (Lilial, Lyral, hydroquinone) | note plafonnée à **45**, rincé compris |
| ingrédient interdit seulement en pose (méthylisothiazolinone) | plafond 45 s'il est posé, sinon −5 × exposition |
| **sensibilisant fort hors parfum** (isothiazolinones, libérateurs de formaldéhyde) | −5 × sévérité × exposition |

> **Pourquoi le sensibilisant fort pèse sur la formule et pas seulement sur la peau réactive.**
> C'est un risque de population : la méthylisothiazolinone sensibilise des gens qui ne se
> savaient pas réactifs. Les allergènes de parfum, eux, ne concernent que les personnes déjà
> sensibilisées — ils restent du côté perso.

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
| ingrédient interdit dans l'UE, interdiction applicable | 45 |
| ingrédient déconseillé pendant la grossesse *(score perso)* | 15 |
| allergie déclarée par l'utilisatrice *(score perso)* | 10 |

**Quand un plafond mord, on le dit** (B10). Le détail affiché reçoit une ligne
`plafond` portant les points qu'il retire et sa raison — *« Capped at 45 — contains an
ingredient banned in the EU »* — au lieu de laisser une note inexpliquée. La ligne `banni` qui
la précède nomme l'ingrédient. Le score perso ne peut jamais dépasser le plafond de la formule.

Enfin, le résultat est ramené entre **5 et 100** et arrondi à l'entier.

> **Pourquoi non compensatoire.** Une moyenne laisserait un excellent actif racheter un irritant
> sévère placé en tête de formule. Sur un produit qu'on met sur le visage, certaines choses ne se
> compensent pas.

---

## C. Le calcul refait à la main

### Avène Hydrance Boost Concentrated Hydrating Serum → 62

Dix-sept ingrédients. Catégorie : sérum, donc grille sur 58 points (rien à corriger ici : la
grille du sérum est entièrement remplissable), sévérité 1,0, exposition 1,0.

**L'INCI, lu par le moteur :**

| pos | ingrédient | rôle | puissance | `w` | ce qu'il déclenche |
|---:|---|---|---:|---:|---|
| 1 | Avène thermal spring water → **`WATER`** | support | — | 1,0 | rien *(B1 : une eau de marque est de l'eau)* |
| 2 | Propanediol | support | — | 1,0 | rien |
| 3 | Glycerin | active | 2 | 1,0 | actif |
| 4 | Pentylene glycol | support | — | 1,0 | rien |
| 5 | Diglycerin | active | 2 | 1,0 | actif |
| 6 | 1,2-Hexanediol | support | — | 0,6 | rien |
| 7 | **Niacinamide** | active | **3** | 0,6 | puissance 3, hors du top 5 |
| 8 | Sodium hyaluronate | active | 2 | 0,6 | actif — mais 3ᵉ hydratant |
| 9 | Betaine | active | 1 | 0,6 | actif — 4ᵉ hydratant |
| 10 | Citric acid | support | — | 0,6 | rien |
| 11 | **Fragrance** | filler | — | 0,3 | parfum |
| 12 | PCA | active | 2 | 0,3 | actif |

Aucun antioxydant. Aucun lipide de barrière. Sept actifs reconnus, tous hydratants sauf la
niacinamide — et **deux seulement comptent** : au-delà de deux actifs de la même famille de
bénéfices, les suivants ne rapportent rien (B5, `maxActifsParFamille = 2`). Cinq humectants ne
font pas cinq bonus.

**La grille, critère par critère :**

| Critère | max | obtenu | Verdict |
|---|---:|---:|---|
| `concentre` | 16 | **9,6** | Niacinamide en 7ᵉ : `16 × 0,6`. Gradué par la position depuis B5 — l'ancien tout-ou-rien donnait 0 |
| `sansParfum` | 12 | **0** | Fragrance en 11ᵉ |
| `richesse` | 16 | **12,8** | `2,2 × puissance × w`, trois actifs retenus |
| `lipides` | 8 | **0** | aucun |
| `antiox` | 6 | **0** | aucun |
| **total brut** | **58** | **22,4** | soit 38,6 % |

**L'addition :**

```
base                                    50,0
métier      22,4 ÷ 58 × 42             + 16,2
prérequis   un actif prouvé présent     −  0
pénalités   aucune pour un sérum        −  0
parfum      4 × 1,0 × 1,0               −  4,0
filtres UV                              +  0
─────────────────────────────────────────────
                                         62,2  →  62
```

> **Ce qui a bougé depuis la v2.0** *(58 → 62)*. L'eau thermale de marque ne compte plus comme un
> actif anti-rougeurs (−), mais la niacinamide en 7ᵉ position rapporte désormais 9,6 points au
> lieu de 0 (+). Le second l'emporte : une bonne molécule un peu diluée vaut mieux que rien.

### ANUA Niacinamide 10 TXA 4 → 86

Le meilleur sérum du catalogue. Les deux formules contiennent la même niacinamide — chez ANUA
elle est **troisième**.

| Critère | max | Avène (62) | ANUA (86) |
|---|---:|---|---|
| actif fort en tête | 16 | 9,6 — pos. 7 | **16** — Niacinamide pos. 3 |
| sans parfum | 12 | 0 | **12** |
| liste d'actifs | 16 | 12,8 | **16** — plafond (acide tranexamique, arbutine…) |
| antioxydant | 6 | 0 | **3,6** — thé vert, à faible dose |
| lipides de barrière | 8 | 0 | **2,3** — un seul, en fin de liste |
| **total brut** | **58** | **22,4** | **50,0** |

```
base                                    50,0
métier      50 ÷ 58 × 42               + 36,2
aucune faute, aucun risque              −  0
─────────────────────────────────────────────
                                         86,2  →  86
```

> **Pourquoi 86 et plus 92** *(v2.0 : 92)*. Ce sérum n'accomplit pas 100 % de son métier : ses
> antioxydants et son unique lipide de barrière sont en fin de liste, à dose de trace. La v2.0
> les payait plein tarif parce que la ligne n'était pas pondérée par la position, et parce que
> ses onze extraits végétaux saturaient la liste d'actifs. Les deux triches sont fermées (B5) :
> saupoudrer huit extraits en fin de liste rapporte moins de 5 points, et un ingrédient écrit
> deux fois n'est compté qu'une. **Aucun produit du catalogue ne remplit sa grille à 100 %.**

---

## D. Pourquoi 92 et pas 100

Un produit qui accomplirait **100 % de son métier** sans aucun défaut plafonnerait à 92, parce
que `50 + 42 = 92` et qu'aucun autre terme ne peut s'ajouter.

| Famille | plafond réel | Raison |
|---|---:|---|
| sérum, tonique, nettoyant, masque, exfoliant, contour, démaquillant, traitement | **92** | base + budget |
| solaire | **92** | ses filtres sont payés par sa grille |
| **crème avec SPF** | **100** | base + budget + le bonus de 8 |

Mesuré sur les 2 863 produits notables des dix familles : **maximum 92**, aucun à 93 ou plus
(95 sur l'ensemble du catalogue, un seul produit, une crème hors périmètre portant un SPF). Les
huit derniers points de l'échelle sont vides pour neuf familles sur dix.

---

## E. Toutes les grilles

Un critère n'entre dans une grille que s'il est **discriminant** : entre 25 % et 75 % des
produits de la famille le remplissent. En dessous, il est inatteignable ; au-dessus, ce n'est
plus un critère mais un ticket d'entrée — il passe alors en prérequis.

Deux colonnes de total : la somme des plafonds, et le **dénominateur réellement utilisé** (B11.2,
section B.2). Quand les deux diffèrent, c'est que la grille demandait des points que la chimie de
la famille ne peut pas produire.

| Famille | Son métier | Critères récompensés | plafonds | dénominateur |
|---|---|---|---:|---:|
| nettoyant | nettoyer sans décaper | sans parfum 12 · tensioactifs doux 12 · barrière intacte 16 · actifs 10 | 50 | **43,6** |
| démaquillant | dissoudre et rincer | sans parfum 14 · rinçabilité 10 · barrière intacte 16 · actifs 8 | 48 | **41,6** |
| exfoliant | resurfacer sans abîmer | sans parfum 14 · tamponné 18 · acide haut dans la liste 10 · actifs 8 | 50 | **42,8** |
| masque | agir en une pose | actif fort en tête 14 · sans parfum 12 · liste d'actifs 14 · confort 14 | 54 | **48,4** |
| sérum | délivrer des actifs | actif fort en tête 16 · sans parfum 12 · liste d'actifs 16 · antioxydant 6 · lipides 8 | 58 | 58 |
| traitement | corriger un problème précis | actif fort en tête 18 · sans parfum 12 · liste d'actifs 16 · lipides 8 | 54 | 54 |
| hydratant | hydrater et reconstruire | lipides 16 · sans parfum 12 · occlusif 10 · antioxydant 6 · actifs 10 | 54 | 54 |
| contour des yeux | hydrater une peau fine sans irriter | sans parfum 18 · lipides 14 · occlusif 8 · actifs 10 | 50 | 50 |
| solaire | protéger des UV | spectre large 18 · sans parfum 12 · soin en plus 10 · lipides 8 · actifs 4 | 52 | 52 |
| tonique | hydrater et préparer | sans parfum 14 · actif fort en tête 12 · lipides 8 · antioxydant 8 · actifs 10 | 52 | 52 |
| indéterminé | — | actifs 14 · sans parfum 12 · soutien 16 | 42 | **35** |

Deux plafonds ont été corrigés par l'audit : la liste d'actifs d'un **solaire** tombe de 8 à 4
(un solaire n'est pas un sérum : sa vitamine C est un bonus, pas son métier), et celle de la
grille **indéterminée** de 20 à 14 (elle servait de voiture-balai et notait trop haut ce qu'on
n'avait pas su classer).

---

## F. La seconde note, « My skin »

Le score perso **part du score formule** et le corrige. Il ne le recalcule pas.

| Correction | valeur | Déclencheur |
|---|---:|---|
| actif qui vise un problème déclaré | +3,5 × sévérité × `w` × (preuve ÷ 3) | max 10 par ingrédient, 30 au total, 2 actifs par famille |
| allergène de contact niveau 1-2 | −1 × niveau × (sensibilité ÷ 3) × `w` × exposition | plafonné à −8 × (sensibilité ÷ 3) |
| ingrédient qui pique, irritation 2 | −2 × 2 × (sensibilité ÷ 3) × `w` × exposition | plafonné à −10 × (sensibilité ÷ 3) |
| parfum sur peau sensible | −4 × sensibilité × exposition | **une seule ligne par produit** |
| huiles essentielles | −8 | sensibilité ≥ 2, une seule ligne |
| comédogène ≥ 4, ou ≥ 3 dans le top 5 | −3 × `w` | peau grasse/mixte ou qui déclare imperfections/brillance ; plafond −6 |
| alcool desséchant | −6 × `w` | peau sèche ou sensibilité ≥ 2 |
| actif trop puissant | −5 par cran (−5 de plus si acide posé sur peau réactive) | **une seule ligne** |
| texture riche | −12 grasse · −7 mixte · +6 sèche | déduite de la composition, produits posés seulement |
| texture légère | +5 grasse · +3 mixte · −7 sèche | hydratant et contour des yeux seulement |
| sulfates | −8 sèche · −8 réactive · −3 mixte · −2 normale | déduits de la composition |
| filtres UV sur un produit posé | +3,5 × besoin déclaré | plafonné à 10 |
| filtres minéraux dans un solaire | +4 | peau réactive |
| déconseillé pendant la grossesse | note plafonnée à 15 | drapeau de fiche |
| allergie déclarée par l'utilisatrice | note plafonnée à 10 | **nom entier**, jamais sous-chaîne |

Sept de ces lignes ont été refaites par l'audit, et toutes dans le même sens : **cesser de
facturer N fois le même fait**.

- **Le parfum, les huiles essentielles, l'irritation et les allergènes ne comptent plus qu'une
  fois par produit** (B5, B10). Une crème déclarant ses douze allergènes de parfum — obligation
  européenne — perdait douze lignes de malus quand une marque opaque écrivant « Parfum » n'en
  perdait qu'une. 15 % du catalogue tombait au plancher pour une peau réactive.
- **L'allergène ne se cherche plus par sous-chaîne** (B8). « CAMPHOR » attrapait le Mexoryl SX
  (*terephthalylidene dicamphor sulfonic acid*), « LIMONENE » attrapait le D-limonène.
  Comparaison sur le jeton entier, et l'exclusion bricolée qui compensait a été retirée.
- **L'irritation ne compte plus qu'au niveau 2** (B8). Le niveau 1 frappait 432 fiches, dont les
  tensioactifs les plus doux du marché.
- **La force d'un actif ne compte que bien dosée** : un acide en position 30 ne rend pas un
  produit « trop fort ».
- **Un produit rincé n'a pas de texture à juger** (B9) : une huile démaquillante n'est pas
  « lourde » pour une peau grasse, elle part à l'eau. Et « pas assez nourrissant » ne s'applique
  qu'à ce qui est censé nourrir — pas à une eau micellaire.
- **La note perso ne dépasse jamais le plafond posé par la formule** (B10). Il était contourné :
  Paula's Choice Skin Balancing passait de 69 en formule à 88 en perso.

> **Allergie n'est pas irritation.** L'irritation abîme la barrière de tout le monde : elle reste
> dans la note formule. La sensibilisation ne touche que les personnes concernées : elle ne pèse
> que sur la note perso, proportionnellement à la réactivité déclarée. Un profil non sensible ne
> paie rien pour un allergène — sinon on pénaliserait le decyl glucoside, l'agent lavant le plus
> doux du marché, pour quelqu'un qui n'y est pas allergique.

C'est pourquoi la note perso peut **dépasser** la note formule : l'Avène est à 62 en formule et
plus haut pour une peau mixte, parce que sa texture légère lui convient et que sa niacinamide
vise ses imperfections.

La **richesse** du produit est déduite de la nature du corps gras, pas d'un mot-clé (B9) :
beurres, cires, pétrolatum et lanoline comptent 1 ; les huiles végétales 0,7 ; les esters courts,
le squalane et les triglycérides caprylique/caprique 0,3 ; un glycéryl ou PEG-100 stéarate compte
**0**, parce que c'est un émulsifiant dosé à 1-3 %, pas un corps gras. Chaque valeur est
multipliée par le poids de position. Au-delà de 4 le produit est riche, en dessous de 1,5 il est
léger. Avant cette correction, une lotion au glycéryl stéarate était « heavy for your oily
skin ».

---

## G. Les seuils d'affichage

| Note | Couleur | Verdict formule |
|---:|---|---|
| 75 à 100 | vert | *A well-built formula* |
| 45 à 74 | orange | *An average formula* |
| 5 à 44 | rouge | *A weak formula* |

Mesuré sur les 2 863 produits notables des dix familles : moyenne **67**, médiane **68**,
maximum 92 ; **33,1 % de verts**, 5,6 % de rouges.

| Famille | médiane | % verts | % rouges |
|---|---:|---:|---:|
| contour des yeux | 74 | 44,8 | 10,5 |
| solaire | 74 | 41,3 | 0,4 |
| traitement | 70 | 42,0 | 3,5 |
| sérum | 70 | 36,8 | 3,5 |
| masque | 70 | 30,6 | 0,6 |
| démaquillant | 68 | 36,1 | 0,0 |
| hydratant | 68 | 27,4 | 2,4 |
| nettoyant | 66 | 26,9 | 4,5 |
| tonique | 64,5 | 25,4 | 15,7 |
| exfoliant | 63 | 35,1 | 16,3 |

> Les seuils 75 / 45 n'ont **pas** bougé avec l'audit. Ce sont les grilles qui ont été recalées
> pour que les produits tombent dans la bonne bande, pas les bandes qu'on a déplacées autour des
> produits. Les seuils sont dupliqués dans neuf fonctions `teinte()` côté écrans : c'est un point
> ouvert, pas une décision (section H).

---

## H. Ce qu'on ne note pas

Trois cas où une note serait un mensonge (B4). Le moteur répond alors « on ne peut pas noter »,
et les deux fiches produit affichent le produit, ses ingrédients lus, et la raison — jamais un
chiffre.

| Raison | Condition exacte | Ce qu'on dit |
|---|---|---|
| `solaire-sans-filtre` | catégorie solaire, aucun filtre UVA/UVB dans la liste | *No UV filter in this ingredient list — a sunscreen always has one, so the list is incomplete.* |
| `liste-courte` | 5 ingrédients ou moins, **et** un inconnu ou pas de base en tête | *This ingredient list is too short to be complete.* |
| `lecture-partielle` | le modèle de vision dit avoir lu l'étiquette en partie | *Part of the label was cut off. Retake the photo.* |

**83 produits du catalogue** sur 3 152 sont concernés : 69 pour liste courte — dont 36 patchs
anti-boutons, qui n'ont pas de formule à juger — et 14 solaires dont la liste américaine a perdu
ses filtres. C'est la famille « traitement » qui en porte le plus (37 fiches sur 180, soit 20,6 %),
pas les solaires (14 sur 290, soit 4,8 %).

> **Pourquoi refuser plutôt qu'estimer.** Un Anthelios SPF 50 dont les filtres manquent à la liste
> était noté comme un hydratant quelconque : de la crème, de la glycérine, pas de protection. Il
> sortait autour de 70 et pouvait être recommandé comme solaire.

**Deux réserves, sur des produits qu'on note quand même :**

| Badge | Condition | Affiché |
|---|---|---|
| `minimaliste` | 3 ingrédients ou moins, tous connus, base en tête | *Very short list — there's little to judge.* |
| `partielle` | moins de 80 % des dix premiers ingrédients connus, ou pas de base en tête | *Partial analysis — some ingredients unknown.* |

Une **catégorie devinée** (lecture d'étiquette sans identité catalogue) est notée avec la plus
basse des deux grilles les mieux votées, et la fiche le dit : *Category guessed from the formula
— change it above if it's wrong.* Le métier décide de toute la grille, donc une erreur de
catégorie fausse toute la note.

---

## I. Points restés ouverts

Relevés en relisant le moteur, **non corrigés** :

1. **Le moteur ne voit pas la dose.** Un peeling à 30 % d'acide glycolique et un exfoliant
   quotidien à 2 % d'acide salicylique ont la même liste d'ingrédients, dans le même ordre. La
   concentration n'est écrite que sur la face avant du flacon, jamais dans l'INCI. Le
   *The Ordinary AHA 30 % + BHA 2 %* sort donc à 80 en formule et 76 pour une peau sèche
   réactive. Le levier B11.5 du protocole de recalibration supposait des acides de force 3 : il
   n'en existe aucun au dictionnaire, la force maximale est 2. **Décision en attente.**

2. **Les hydratants restent à 27,4 % de verts**, en dessous des 30 % visés par le protocole. Ce
   n'est pas un défaut de dénominateur : leur grille est entièrement remplissable, et le meilleur
   hydratant du catalogue l'atteint. C'est que 27 % seulement des hydratants contiennent des
   lipides de barrière — l'hydratant moyen hydrate sans réparer. Baisser l'exigence ferait dire
   moins à la note. **Décision en attente.**

3. **`borne: [5, 100]` avec le commentaire « 100 ATTEIGNABLE »** — or seule une crème avec SPF
   peut y arriver, et aucune n'y arrive. Le maximum mesuré est 92 sur les dix familles.

4. **Les neuf seuils 75 / 45 dupliqués** dans les fonctions `teinte()` des écrans. Les changer
   demanderait de les modifier à neuf endroits sans en oublier.

5. **`bonusFiltresUV: 22` n'est plus appelée nulle part** depuis la correction du double comptage
   des filtres UV sur les solaires (27/08). Code mort, signalé et laissé en place.

6. **Les paires botaniques parenthésées** (section A.3) : 255 au dictionnaire, 99 divergent sur
   le fond. À trancher paire par paire, avec un dermatologue.

7. **Onze solaires américains** dont le re-scrape a échoué restent non notables.

8. **Le prérequis « humectant » pour une liste de 3 ingrédients** : le Serozinc (eau, sulfate de
   zinc) perd 10 points faute d'humectant, alors qu'il ne prétend pas hydrater.

---

## J. Journal de calibration

Les valeurs de `src/lib/scan/__tests__/etalons.test.ts` sont la mémoire de ce qui a été mesuré.
Elles ne se modifient qu'avec une entrée ici.

### 2026-09-08 — B11.2, le dénominateur devient atteignable

**Ce qui a été mesuré.** Chaque grille était divisée par la somme de ses plafonds. Les lignes
pondérées se disputent les mêmes places, et les cinq premières positions d'une liste INCI
appartiennent au véhicule. Résultat : le meilleur nettoyant du catalogue atteignait 43,6 points
d'une grille qui en demandait 50, le meilleur masque 49 sur 54, le meilleur exfoliant 46 sur 50.

**Ce qui a changé.** `maxAtteignable(R)` remplace la somme des plafonds. Modèle de places, sans
recalage sur le catalogue. Le modèle retombe sur le maximum réellement observé à 0-8 % près,
famille par famille (`verif-paquet.mjs --grilles`).

**Effet mesuré.**

| | avant | après | critère |
|---|---:|---:|---|
| verts, global | 30,8 % | **33,1 %** | 28-35 % ✓ |
| rouges, global | 5,9 % | **5,6 %** | 4-8 % ✓ |
| nettoyants verts | 20,7 % | **26,9 %** | ≥ 25 % ✓ |
| masques verts | 21,3 % | **30,6 %** | ≥ 25 % ✓ |
| médiane exfoliants | 59 | **63** | 63-75 ✓ |
| hydratants verts | 28,0 % | 27,4 % | ≥ 30 % ✗ |

**Étalons déplacés.** Cinq, tous rincés, et eux seuls. CeraVe Hydrating 72 → 75 (orange → vert,
ce que le rapport d'audit attendait), Toleriane Purifying 72 → 75, Cetaphil Gentle 70 → 73,
Sensibio 77 → 82, savon Urban Hydration 32 → 33. Les neuf autres n'ont pas bougé.

### 2026-09-08 — B11.4 mesuré puis REJETÉ

**L'idée.** Un nettoyant parfumé est facturé deux fois : il perd les 12 points de mérite
« sansParfum », et son malus de risque parfum — déjà multiplié par l'exposition. Le levier mettait
la ligne de mérite à l'échelle de l'exposition (12 → 6,6) et réaffectait les points libérés à une
autre ligne de la même grille.

**Pourquoi c'est rejeté.** Testé avec trois lignes de compensation différentes, il dégrade tout
ce qu'il touche : les démaquillants verts tombent de 36,1 % à 21,9 %, le CeraVe Hydrating de 75 à
70-73, le Sensibio de 82 à 74. Raison mécanique : relever le plafond d'une ligne pondérée relève
le dénominateur plus vite que les produits ne peuvent l'exploiter. Tout le monde perd cinq points
de mérite garanti, seuls les produits très parfumés y gagnent. C'est l'inverse de ce qu'un score
de soin doit faire.

### 2026-09-08 — B11.3 non appliqué

Exprimer les prérequis en part du budget plutôt qu'en points absolus est, par construction, une
transformation neutre : `12` et `0,286 × 42` donnent le même chiffre. Aucun effet mesurable, donc
aucune raison de toucher au code.
