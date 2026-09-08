# Rapport 2 — Débat (angle mécanique / statistique)

Méthode : copie patchée du moteur dans `scratchpad/debat/scoring-sim.mjs` (23 drapeaux de simulation, dépôt intact). À drapeaux éteints, la copie reproduit l'original à **0 écart sur 2 916 produits, formule et perso**. Chaque proposition des deux autres rapports a été jouée comme une « brique » activable, seule puis dans un paquet cumulatif. Scripts : `patch*.mjs`, `sim2.mjs` (sections F1, F2, F2B, F3, F4, F4B, F6B, ATTR, S4, PACK, FIN), `seuils.mjs`.

Profils : **sens3** (normale, sensibilité 3, rougeurs 2) · **sècheR** (sèche, sensibilité 3, déshydratation 3 + rougeurs 2 + barrière 2, plafond force 0) · **grasseAcne** · **normaleAge** (définis au rapport 1).

---

## A. Les six frictions, tranchées par la mesure

### Friction 1 — Parfum : mon S2 (retirer le mérite `sansParfum`) contre D10 (le garder × exposition)

| variante | coût d'UNE trace de parfum | % vert | écart de médiane sans/avec parfum (cleanser / démaq. / toner / yeux) | perso sens3 Δ | % à 5 | CeraVe Hydrating | Sensibio H2O | Dermallergo | Weleda (perso sens3) | sérum parfumé (perso sens3) |
|---|---|---|---|---|---|---|---|---|---|---|
| V0 actuel | −14,1 (pire −23) | 26,9 | 15 / 18 / 25,5 / 27,5 | −14,2 | 14,2 | 59 | 64 | 69 | 5 | 14 |
| V1 = mon S2 | −4 (pire −8) | 20,9 | 4 / 5 / 14,5 / 14 | −14,9 | 13,1 | **52** | **58** | **63** | 5 | 19 |
| D10 | −13,2 | 26,0 | 11 / 12 / 25,5 / 27,5 | −13,5 | 12,7 | 56 | 61 | 69 | 5 | 14 |
| D10 + S1 (perso une fois) | −13,2 | 26,0 | idem | **−8,4** | **0,3** | 56 | 61 | 69 | **30** | **38** |
| V1 + S1 | −4 | 20,9 | 4 / 5 / 14,5 / 14 | −9,1 | 0,3 | 52 | 58 | 63 | 33 | 43 |

**Verdict : je retire V1 et je me range à D10, sous condition.** La mesure me donne tort sur un point que je n'avais pas vu : sous la normalisation « part de grille », retirer une ligne de mérite fait baisser tous les produits qui la remplissaient. Les sans-parfum simples, ceux que les trois rapports veulent voir monter, perdent 5 à 7 points (CeraVe Hydrating 59 → 52, Sensibio 64 → 58, Dermallergo 69 → 63, Toleriane Purifying 75 → 70). D10 ne coûte que 2-3 points aux rincés sans parfum et rétablit l'ordre « nettoyant parfumé < crème parfumée » côté perso.
Conditions : (1) l'exposition s'applique aussi à `malusParfumSensible` côté perso (fait dans la simulation, ligne 601) ; (2) le poids total du parfum (mérite + malus fixe, 12 à 23 points) est documenté comme UN poids voulu, en une ligne du Why ; (3) S1 est indispensable : sans lui, D10 seul laisse 12,7 % du catalogue au plancher 5 pour une sensibilité 3.
Ce qui reste vrai de S2 : une trace de linalool en position 40 coûte toujours 13 points sur un produit posé, plus que toute la ligne « actifs ». C'est désormais un choix produit assumé (« sans parfum » est une allégation qui définit la catégorie), pas un bug.

### Friction 2 — Mon S5 (pas de malus irritant sur un actif power 3) + D8 (irritance côté perso)

| variante | formule moy | % vert | +Retinol en queue : Δ formule sérums / % de baisses | perso sens3 Δ | % rouge | % à 5 | nettoyants perso sens3 : médiane / % rouge | toniques alcool-menthol perso sens3 : médiane |
|---|---|---|---|---|---|---|---|---|
| V0 | 65,0 | 26,9 | −2,6 / 78 % | −14,2 | 36,9 | 14,2 | 46 / 47,4 | 12 |
| S5 seul | 66,1 | 30,3 | **+1,0 / 0 %** | −14,4 | 35,4 | 13,9 | 46 / 47,4 | 12 |
| D8 tel qu'écrit (irritant ≥ 1) | 65,0 | 26,9 | −2,6 / 78 % | **−16,2** | **39,0** | 15,3 | **45 / 48,7** | 6,5 |
| D8B = D8 restreint à irritant 2 | 65,0 | 26,9 | | −13,0 | 34,6 | 13,8 | **51 / 41,4** | 8 |
| S5 + D8B + S1 | 66,1 | 30,3 | +1,0 / 0 % | −7,9 | 27,9 | 0,4 | 52,5 / 34,0 | 20 |

Étalons (formule / perso sens3 / perso sècheR) : LRP Effaclar Clarifying Solution (alcool pos 2, acide salicylique pos 4, glycolique pos 5, menthol en queue) V0 **45 / 22 / 6** → S5+D8 **54 / 17 / 5** ; Effaclar astringent alcoolisé 37 / 22 / 14 → 37 / 15 / 7 ; Dermalogica Dynamic Skin Retinol 56 / 5 / 5 → S5+D8+S1 **60 / 31 / 37** ; Paula's Choice rétinol 75 / 73 / 73 → 79 / 70 / 71 ; Effaclar Adapalene 62 / 42 / 25 → 66 / 42 / 25.

**Verdict : S5 confirmé, D8 accepté SEULEMENT restreint au niveau irritant 2.** La combinaison fait ce qu'on lui demande : un sérum rétinol ne baisse plus en formule (0 % de baisses, +4 sur les rétinoïdes), le tonique alcool-acides baisse pour la peau réactive (22 → 17, 6 → 5) tout en montant de 9 en formule. Mais D8 tel qu'écrit **aggrave** la note des sensibles (Δ −14,2 → −16,2) et fait **baisser** les nettoyants doux (46 → 45) : la ligne « irritant 1 » frappe 432 fiches (cocamidopropyl bétaïne, alcool benzylique, phénoxyéthanol…) et annule le gain de la ligne sensibilisants réduite. Avec D8B (irritant 2 seulement : alcool, acides, menthol, SLS, PG), les nettoyants doux remontent (46 → 51, rouge 47 → 41 %) et les solaires aussi (56 → 63, l'octocrylène cessant de coûter −6). La prédiction de D8 « les nettoyants doux remontent » n'est vraie que sous cette restriction.
Effet de bord de S5 à arbitrer par le dermato : +9 sur les toniques acides alcoolisés (54 = orange) ; la perso continue d'alerter la peau réactive.

### Friction 3 — D4 : sortir la comédogénicité de la gravité

- **299 produits changent (10,3 %)**, Δ moyen +2,6, max +12, **0 baisse**. Répartition : +1/+2 pour 178, +3/+4 pour 91, ≥ +5 pour 30. Hydratants 92, nettoyants 51, solaires 39, démaquillants 32, sérums 28.
- Plafonnés gravité 3 : **14 → 4**. Libérés : ELEMIS Naked Cleansing Balm 69 → 81, Paula's Choice Skin Balancing 69 → 80 (×2), ELEMIS Glow Boost 32 → 36. Toleriane Double Repair 83 → 87 (isocetyl stearate). Global : % vert 26,9 → 27,8. Perso grasseAcne : médiane 73 → 73 (la ligne perso −3 × w reste).
- Plafond résiduel : 4 produits (hydroquinone, triclosan). Candidats à un plafond étendu selon D2 : **banniUE 29 produits, sensibilisant 3 hors parfum 22, libérateurs de formaldéhyde 13**.

**Verdict : d'accord.** Et le plafond non compensatoire, quasi mort après D4 (4 produits), doit être réaffecté au registre où il a un sens : `banniUE` → plafond 45 (D2), appliqué en perso aussi (mon S3, mesuré : 0 produit ne dépasse plus son cap dans le paquet).

### Friction 4 — Comptage des actifs : une règle unique (P6 / D6 / S6)

Règle simulée : actifs comptés seulement si w ≥ 0,6 ou `lowDose` (P6a), dédoublonnés par nom (S6), prérequis « 3 actifs » satisfait aussi par UN actif power 3 en top 5 ou lowDose (P6b), `@actifTop5` accepte lowDose (D5), lignes `antiox`/`lipides` pondérées (nouveau, voir ci-dessous), lowDose sous la barre → w 0,6 (P6d).

| variante | TO Niacinamide | +3 actifs après le conservateur | +Retinol en queue | +8 extraits en queue | +Ceramide NP + Tocophérol en queue | 13 sérums à 90-92 | Paula's Resist | Adapalene | sérum méd / % vert |
|---|---|---|---|---|---|---|---|---|---|
| V0 | 66 | 81 | 78 | 86 | 90 | 90-92 | 72 | 62 | 69 / 31,8 |
| U1 = w ≥ 0,6 + dédoublonné | 66 | 66 | 78 | 71 | | 88-92 | 69 | 62 | 67 / 25,6 (**prérequis manquant 4 → 19 %**) |
| U2 = U1 + P6b + D5 | **78** | 78 | 78 | 83 | 88 | 88-92 | 81 | 72 | 69 / 32,2 |
| U2 + POND (antiox/lipides pondérés) | 78 | 78 | 78 | **80** | **81** | **83-92** | 79 | 72 | 67 / 27,4 |
| U2 + POND + P6d + S5 | 78 | 78 | 81 | 80 | 81 | 84-92 | **83** | **76** | 68 / 30,3 |

Sérums K-beauty : VT PDRN 92 → 86, COSRX Blue Peptide 91 → 84, Dr. Althea 91 → 86-87 ; ANUA 92 → 88, SKIN1004 92 → 85, numbuzin 90 → 84, Curology 90 → 83. Bubble Day Dream reste 92 (ses actifs sont réellement en tête). Rétinols : Dermalogica 56 → 71, Paula's 75 → 88.

Deux découvertes en cours de route :
1. **La triche se déplace.** Avec U2 seul, « +8 extraits en queue » vaut encore +5 et « +céramide + tocophérol en queue » +10 : les lignes `antiox` (sérum, hydratant, tonique) et `lipides` (sérum, traitement, solaire, tonique) ne sont **pas pondérées** par la position (`scoring.mjs:169-170, 181, 192, 218, 240-241`), alors que la même ligne `lipides` l'est dans la grille hydratant (`189`). Incohérence entre grilles ; POND la corrige et ramène les deux triches à +2 / +3.
2. **U1 seul est trop dur** : 19 % des sérums et 37 % des traitements tombent en « trop peu d'actifs ». P6b (mono-actif fort) est obligatoire, pas optionnel.

Coût mesuré (brique par brique, cumulatif) : ACTW −1,9 de moyenne et **masques 66,5 → 59 de médiane** (les masques ont leurs actifs sous la barre) ; POND −0,9 (toniques 65 → 61) ; S5 +1,1. Correctif masques mesuré : prérequis masque 10 → 5 ramène le % rouge des masques de 6,1 à 1,2 (médiane 66).

**Verdict : d'accord avec la règle unique, à trois conditions** : P6b inclus, POND inclus, prérequis masque abaissé (ou « 2 actifs » pour les masques). Contre D6 sur un point : son seuil « un actif power ≥ 2 à w ≥ 0,6 » est **trivial** : 93,7 % des sérums/traitements/masques le passent (la glycérine est power 2), 76 % même hors humectants ; « power 3 en top 5 ou lowDose » n'en laisse passer que 42 % et discrimine réellement.

### Friction 5 — « Non évaluable » : seuils chiffrés

Sur 2 916 produits notés (105 autres n'ont déjà pas d'INCI exploitable) :

| critère | produits | % | note moyenne actuelle de ces produits | verts parmi eux |
|---|---|---|---|---|
| n ingrédients < 4 | 40 | 1,4 | 50,9 | 0 |
| n < 6 | 51 | 1,7 | 53,2 | 2 |
| n < 8 | 86 | 2,9 | 56,3 | 7 |
| n < 10 | 153 | 5,2 | 59,3 | 22 |
| n < 12 | 234 | 8,0 | 61,5 | 41 |
| couverture top 10 < 0,7 | 72 | 2,5 | | |
| couverture < 0,8 | 131 | 4,5 | | |
| tête implausible (rien d'un solvant/huile/tensio/actif majeur en pos 1-3) | 43 | 1,5 | | |
| solaire sans filtre reconnu par le dictionnaire | 26 | | | |
| dont sans AUCUN nom de filtre connu (vraie donnée manquante) | **11** | | | |
| catégorie incertaine dans le catalogue | **0** (toutes arbitrées : sûr 1 153, sûr-agent 504, probable 559, probable-agent 309, non renseigné 391) | | | |

Règles combinées : **A** (n < 6 ∨ couverture < 0,7 ∨ solaire sans aucun filtre) = 101 hors note (3,5 %, moyenne 52,4, 2 verts) ; **B** (A ∨ n < 8) = **128 (4,4 %, 7 verts)** ; **C** (B ∨ tête implausible) = 163 (5,6 %, 14 verts).
**Proposition : règle B pour le catalogue**, badge « analyse partielle » (sans exclusion) pour n < 12 ou couverture < 0,8, et pour le scan d'étiquette : `confianceCategorie ≠ sûr` ou `lecture.partielle` → jamais de bande verte. Les 15 solaires « sans filtre » restants sont récupérables par le dictionnaire (D1/P2a), pas par l'exclusion. P10 comptait 149 produits à < 4 ingrédients : c'est 40 + les 105 sans INCI exploitable, déjà hors note.

### Friction 6 — P9 : faux bonus UV sur des non-solaires

92 non-solaires ont `filtresUV = true`. Décomposition : **48** ont un filtre organique reconnu en position ≤ 8 (crèmes de jour SPF : bonus légitime), 2 l'ont au-delà de la position 8, **43** portent SPF/UV dans le nom, **32 n'ont ni filtre organique ni SPF au nom** : 13 avec ZnO/TiO2 seulement en queue (pigment ou trace, faux bonus certain : 7 masques, dont Effaclar Clarifying Clay Mask 81, DERMA E Vitamin C mask 79) et 19 avec ZnO/TiO2 en position ≤ 6 sans SPF au nom (le cas Cicalfate). 4 des 13 certains reçoivent la phrase perso « you say you skip sunscreen ».
**Verdict : P9 vérifié dans son principe, surestimé dans son chiffre (32 douteux, 13 certains, pas 92), et sa règle est insuffisante** : accepter « ZnO/TiO2 en positions 1-6 sans pigment » conserve le bonus des 19 du type Cicalfate. Règle proposée : hors solaire, `filtresUV` seulement si filtre organique reconnu en position ≤ 8 OU SPF dans le nom ; l'oxyde de zinc seul n'est jamais un SPF déclaré.

---

## A'. Position sur chaque observation des deux autres rapports

| ID | verdict | argument et chiffre |
|---|---|---|
| **D1** solaires : filtres, spectre, photostable | **d'accord** | = mon S8 + P2 + P3. ZnO en uva+uvb seul : médiane solaire 62,5 → **70**, 40 produits +13,5. 26 « sans filtre » : 15 récupérables par le dictionnaire, 11 vraies données manquantes → non évaluable (F5). |
| **D2** sensibilisants 3 / bannis en formule | **d'accord sous condition** | Populations mesurées : banniUE 29, sensibilisant 3 hors parfum 22, formaldéhyde 13. Le cap 45 doit être renvoyé par `scoreFormule` et appliqué en perso (S3), sinon il est contourné comme l'actuel (5 produits sur 14 le dépassaient). |
| **D3** alcool benzylique ≠ parfum | **d'accord** | Mesuré dans le paquet : +0,5 de moyenne, % vert +1,5, TO Caffeine 51 → 74, LRP Effaclar Clarifying 54 → 70 (son seul « parfum » était le benzyl alcohol), toniques +2 de médiane. = P7. |
| **D4** comédogène hors formule | **d'accord** | 299 produits +2,6 (max +12), 0 baisse, cap 14 → 4 (F3). |
| **D5** `@actifTop5` accepte lowDose | **d'accord** | Paula's Resist 69 → 81 dans le paquet (+12), sérums +1 de médiane. Devient redondant si `@actifTop5` est gradué par w (mon S4 : lowDose a déjà w = 1). |
| **D6** prérequis sérum « un actif power ≥ 2 » | **pas d'accord sur le seuil** | 93,7 % des sérums/traitements/masques passent (glycérine = power 2) : le prérequis ne filtre plus rien. Power 3 en top 5 ou lowDose : 42 %. La ligne richesse à w ≥ 0,6 : d'accord (F4). |
| **D7** force et alcool sans position | **d'accord** | = mon S11. Paquet : perso sens3 Δ −7,1 → −6,8 ; pour sècheR (plafond 0) ~450 produits +10-12 (rapport 1). |
| **D8** irritant × réactivité | **d'accord sous condition** | Restreint à irritant 2 (D8B). Tel qu'écrit, il aggrave les sensibles (Δ −14,2 → −16,2) et baisse les nettoyants doux (46 → 45) ; restreint, nettoyants 46 → 51, solaires 56 → 63, toniques alcool 12 → 8 (F2). |
| **D9** richesse par classes | **d'accord sous condition** | Simulé : % « riche » hydratants 24,6 → 4,8, démaquillants 68,4 → 26,5 ; 249 hydratants remontent de +7,2 pour la peau grasse. MAIS Toleriane Sensitive Riche passe de 10,3 à 4,5 (plus « riche »), CeraVe PM 4,3 → 1,2 (devient « légère »), Weleda 9 → 9. Il faut abaisser `seuilRiche` vers 4-5 et `seuilLegere` vers 1, puis revalider ; sinon la crème riche de référence perd son +6 sèche. |
| **D10** exposition sur le parfum | **d'accord** | Adopté à la place de mon V1 (F1). |
| **D11** doublons du dictionnaire | **d'accord** | = mon T9 (THAYERS 51 → 65 selon la graphie de la glycérine). PG irritant 1 : +0,2 de moyenne, Sensibio +2, Adapalene +2, 267 produits. |
| **D12** grossesse × dose | **pas d'accord dans sa forme** | Les 9 fiches `pregnancyFlag` sont toutes `lowDose` sauf adapalène et hydroquinone → « w ≥ 0,6 ou lowDose » est toujours vrai : sur 226 produits plafonnés à 15, **219 resteraient à 15**, alors que 171 ont le déclencheur au-delà de la position 10. Si l'intention est la dose, le test doit lire la position brute (≤ 10 ou au-dessus de la barre), pas w. |
| **P1** perso parfum × N | **d'accord** | = S1. Mesuré : % à 5 pour sens3 14,2 → 0,4, Δ −14,2 → −9,1 ; transparente 5 → 37 (rapport 1, V3). |
| **P2** solaires notés « sans filtre » | **d'accord** | = D1/S8. (b) « pas de note » : oui pour les 11 sans aucun nom de filtre (F5) ; (a) normalisation `n %` / `USP` : appliquée dans toutes mes simulations (Adapalene devient lisible : 62 → 78 dans le paquet). |
| **P3** ZnO large spectre | **d'accord** | Médiane solaire +7,5 à lui seul. |
| **P4** nettoyants sans tensioactif | **d'accord** | Simulé (prérequis douceur satisfait par émollient/émulsifiant) : CeraVe Hydrating 53 → **65** dans le paquet, médiane nettoyants +1 ; 35 produits. La condition « pas de tensioactif agressif » est déjà portée par la pénalité sulfate. |
| **P5** eaux micellaires | **d'accord** | Simulé (`emulsifiant` accepté dans `dissout`) : Sensibio 63 → **75**, 12 produits, médiane démaquillants +1. |
| **P6** mono-actif puni, saupoudrage récompensé | **d'accord sous condition** | (a)(b)(d) retenus et mesurés (F4) ; (c) « décroissance au-delà de 4 » inutile une fois les traces exclues ; il manquait la pondération des lignes antiox/lipides, sans laquelle la triche survit (+5 / +10). |
| **P7** conservateurs comptés parfum | **d'accord** | = D3. |
| **P8** « légère » sur les rincés | **d'accord** | = S11. Non simulé isolément ; borné par construction (−7 sur tous les rincés/aqueux pour la peau sèche). |
| **P9** faux bonus UV | **d'accord sous condition** | 32 douteux dont 13 certains, pas 92 ; la clause ZnO/TiO2 ≤ 6 doit sauter (F6). |
| **P10** INCI vide/tronquée | **d'accord** | = S7 ; seuils chiffrés en F5 : règle B = 128 produits (4,4 %). |
| **P11** graphies | **d'accord, sauf le fuzzy** | Normalisation (parenthèses, USP, n %, NANO, PERFUME/AROMA) : oui. Levenshtein ≤ 2 : non, retinol/retinal et 8 autres paires à 1 lettre dans le dictionnaire ; une faute OCR doit donner « inconnu + badge », pas une autre molécule. |
| **P12** explication ≠ chiffre | **d'accord sur a, b, c, e ; sous condition sur d** | (d) matchs × power/3 mesuré : normaleAge Δ +3,4 → **+0,3**, % vert 44,5 → 39,3 ; grasseAcne 7,1 → 6,0. Il écrase les profils âge/rougeurs dont les actifs sont surtout power 1-2. Préférer × (1 + power)/4 (0,5 / 0,75 / 1). (e) alcool linéaire = mon S4. |

---

## B. Mes observations, révisées

| ID | décision | motif |
|---|---|---|
| S1 perso parfum/HE/sensibilisants par ingrédient | **maintenu** (= P1) | Brique la plus rentable du paquet : % à 5 14,2 → 0,4 sans toucher à la formule. |
| S2 parfum compté deux fois en formule | **modifié** | Je retire la suppression du mérite (V1) : elle coûte 5-7 points aux sans-parfum simples. Je garde le constat (13-23 points pour une trace, poids dominant) et j'adopte D10 + documentation du poids total en une ligne. |
| S3 cap contourné en perso, quasi mort | **maintenu, élargi** | Après D4 il ne reste 4 produits ; le réaffecter à `banniUE` (29 produits, D2) et l'appliquer en perso : 0 dépassement dans le paquet. |
| S4 falaises de position | **maintenu** | `@actifTop5` gradué par w mesuré (GRAD) : gain « monter d'un cran » 10,9 → 4,0 (max 16 → 8), inversion de voisins max 14 → 8 ; dans le paquet 29 → 13 ; +0,8 de moyenne. Ne corrige pas T1b/T2 (166/142), qui viennent des marches w et de l'alcool ≤ 5 : à traiter par un malus alcool × w (P12e). Attention : ACTW crée une nouvelle falaise en 10/11 (R4 max 29 sans GRAD). |
| S5 actif prouvé net négatif | **maintenu** | Mesuré : % vert +3,4, +Retinol 0 % de baisses ; effet de bord +9 sur les toniques acides alcoolisés (F2). |
| S6 doublons non dédoublonnés | **maintenu** (= P6 partiel) | Paquet : T5 « doublon top 5 en queue » 264 → **0** produit gagnant. |
| S7 grille indéterminée + troncature non signalée | **maintenu** (= P10 + P2b) | Seuils chiffrés (F5). Le catalogue n'a plus de catégorie incertaine ; le risque est sur le scan. |
| S8 solaires | **fusionné** dans D1 + P2 + P3 | Mêmes constats, mesures alignées (ZnO +7,5 de médiane). |
| S9 équité entre familles | **maintenu, ouvert** | Le paquet ne le résout pas : médianes de 60 (exfoliant, masque) à 74 (yeux), même amplitude que V0 (59-73). ACTW aggrave les masques (66,5 → 59 avant correctif). Reste à faire : max de grille atteignable et prérequis en % du budget. |
| S10 allergie par sous-chaîne | **maintenu** (unique) | « alcohol » plafonne 42 % du catalogue à 10 ; aucun des deux autres rapports ne l'a vu. |
| S11 dose ignorée en perso | **fusionné** dans D7 + P8 + D9 | Mêmes constats. |

Recouvrements : S1 = P1 · S8 = D1 + P2 + P3 · S11 = D7 + P8 (+ D9) · S7 = P10 + P2b · S6 ⊂ P6 · S5 ↔ D8 (complémentaires) · S4 ↔ P12e + D5.

---

## C. Vote final

### Le paquet (mesuré cumulativement, ordre d'application = ordre ci-dessous)

Distribution obtenue avec les dix modifications (formule) :

| | moy | méd | % vert | % rouge | max | cleanser | démaq. | toner | exfoliant | sérum | traitement | hydratant | yeux | solaire | masque |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V0 | 65,0 | 66 | 26,9 | 7,0 | 94 | 63 | 64 | 66 | 59 | 69 | 66 | 69 | 73 | 64,5 | 66 |
| paquet | 65,9 | 67 | 29,8 | 6,5 | 92 | 63 | 65 | 65 | 60 | 70 | 70,5 | 68 | 74 | 71 | 65,5 |

Perso : sens3 Δ −14,2 → **−6,3**, % rouge 36,9 → 25,4, % à 5 14,2 → **0,1** · sècheR Δ −10 → **+1,0**, % vert 32,8 → 41,7, % rouge 35,5 → 18,6 · grasseAcne Δ 7,1 → 7,0 · normaleAge Δ 3,4 → 7,9, % rouge 14,5 → 5,3. Plafonnés 4, dépassements en perso 0. Monotonie : niacinamide en queue 0 violation, parfum en queue 0 violation, doublons 0 gain, eau en tête 143 → 50 hausses. Robustesse R3 (un ingrédient du top 5 mal lu) : |Δ| moyen 1,7 → 1,9, max 31 → 39 (la falaise 10/11 d'ACTW).

Étalons, formule → (perso sens3 / sècheR / grasseAcne / normaleAge) :

| produit | V0 | paquet |
|---|---|---|
| CeraVe Hydrating Cleanser | 59 (53 / 59 / 64 / 60) | **65** (63 / 73 / 70 / 68) |
| Toleriane Purifying Foaming | 75 (71 / 71 / 83 / 80) | 70 (69 / 74 / 78 / 76) |
| Toleriane Double Repair | 83 (82 / 84 / 95 / 96) | 84 (84 / 91 / 96 / 97) |
| Toleriane Dermallergo | 69 (76 / 100 / 54 / 69) | 72 (79 / 100 / 57 / 72) |
| Bioderma Sensibio H2O | 64 (66 / 59 / 69 / 70) | **75** (79 / 72 / 80 / 81) |
| Weleda Skin Food (US, parfum) | 42 (5 / 5 / 32 / 18) | 42 (**26 / 32** / 32 / 37) |
| Estée Lauder ANR (sérum parfumé) | 51 (14 / 22 / 56 / 55) | 45 (29 / 36 / 50 / 56) |
| The Ordinary Niacinamide 10 % | 66 (64 / 57 / 88 / 75) | **78** (77 / 70 / 100 / 88) |
| Effaclar Adapalene 0,1 % | 62 (42 / 25 / 77 / 65) | **78** (57 / 40 / 93 / 82) |
| VT PDRN / COSRX Blue Peptide / Dr. Althea | 92 / 91 / 91 | 86 / 84 / 87 |
| Paula's Choice Resist (sérum) | 72 (74 / 69 / 83 / 90) | 83 (83 / 78 / 94 / 100) |
| Dermalogica Dynamic Skin Retinol | 56 (5 / 5 / 56 / 39) | 64 (41 / 46 / 64 / 79) |
| Paula's Choice rétinol | 75 (73 / 73 / 81 / 88) | 84 (82 / 83 / 90 / 98) |
| LRP Effaclar Clarifying Solution (alcool + acides) | 45 (22 / 6 / 70 / 50) | 70 (48 / 31 / 95 / 76) |
| The Ordinary Caffeine 5 % (yeux) | 49 (45 / 46 / 54 / 63) | **74** (83 / 89 / 79 / 93) |
| Vanicream Moisturizing Cream | 66 (60 / 67 / 66 / 64) | 70 (68 / 75 / 70 / 70) |
| Anthelios UV Hydra (filtres absents de l'INCI) | 39 | 38 → **non évaluable** (F5) |

Deux étalons méritent l'arbitrage du dermato : Toleriane Purifying 75 → 70 (perd 3 sur D10, 2 sur ACTW : ses actifs sont en queue) et Effaclar Clarifying 45 → 70 (D3 +16 : son seul « parfum » était l'alcool benzylique ; S5 +9).

### Les dix modifications retenues, classées

1. **Perso : parfum, HE et sensibilisants une seule fois** (S1 = P1). Règle : ligne parfum = −4 × sensibilité, une fois par produit ; HE −8 une fois ; sensibilisants Σ ≥ −12 × sensibilité/3. Effet : % à 5 (sens3) 14,2 → 0,4 ; Δ −14,2 → −9,1 ; transparente 5 → 37.
2. **Solaires** (D1 + P2 + P3 + S8). Règle : ZnO, Tinosorb S/M, Mexoryl XL → uva+uvb ; Uvinul A+, Iscotrizinol, octisalate, « (NANO) » au dictionnaire ; `@photostable` par fonction ; `@filtresUV` satisfait aussi par le drapeau `filtresUV` ; solaire sans aucun filtre lisible → non évaluable. Effet : médiane solaire 64,5 → 71 (ZnO seul), 40 produits +13,5, 15 « sans filtre » récupérés, 11 sortis.
3. **Actifs : règle unique** (P6 + D6 + S6 + D5 + POND). Règle : comptés si w ≥ 0,6 ou lowDose, dédoublonnés ; prérequis = 3 tels actifs OU un power 3 en top 5 / lowDose (pas power 2) ; `antiox`/`lipides` pondérés partout ; lowDose sous la barre → 0,6 ; prérequis masque 10 → 5. Effet : TO Niacinamide 66 → 78, Adapalene 62 → 72, sérums 90-92 → 83-89, triches +15/+12/+20 → 0/+1/+3, doublons 264 → 0. Coût : −1 à −2 de moyenne, repris par 5 et 6.
4. **Parfum en formule : qui est parfum, et exposition** (D3/P7 + D10). Règle : benzyl alcohol, phenethyl alcohol, 4-t-butylcyclohexanol, phenylpropanol → `fragrance: false` (allergène UE conservé) ; mérite `sansParfum` × exposition dans les grilles rincées ; `malusParfumSensible` × exposition. Effet : +0,5 de moyenne, TO Caffeine 51 → 74, écart médiane nettoyants 15 → 11 ; V1 rejeté.
5. **Plafonds** (D4 + D2 + S3). Règle : `grav = irritant` seul ; cap 45 si `banniUE` ; `cap` renvoyé par la formule et appliqué en perso (`min(score, capAbsolu, F.cap)`). Effet : 299 produits +2,6, 0 baisse ; 14 → 4 plafonnés gravité, +29 plafonnés bannis ; 0 dépassement perso.
6. **Actif prouvé mais irritant** (S5 + D8B). Règle : pas de malus irritant générique en formule pour un actif power 3 à irritant ≤ 2 ; en perso, ligne −2 × irritant × S/3 × w pour irritant 2 seulement ; sensibilisants 1-2 à −1 × w seulement à sensibilité 3. Effet : % vert +3,4, +Retinol 0 % de baisses, nettoyants doux perso sens3 46 → 51, toniques alcool 12 → 8. D8 tel qu'écrit rejeté (aggrave : 46 → 45).
7. **Nettoyants et démaquillants sans tensioactif** (P4 + P5). Règle : prérequis `douceur` satisfait par émollient/émulsifiant ; `dissout` accepte `emulsifiant` ; `tensioactif-doux` sur les non-ioniques micellaires. Effet : CeraVe Hydrating 53 → 65, Sensibio 63 → 75, 47 produits.
8. **`@actifTop5` gradué** (S4 + D5 + P12e). Règle : pts × w(pos) du meilleur actif power 3 (1 / 0,6 / 0,3) au lieu de 1/0 ; même traitement pour l'alcool (malus × w) et le cap (49 à w = 1, 69 sinon). Effet : falaise « monter d'un cran » 10,9 → 4,0, inversion de voisins max 14 → 8 (paquet 29 → 13), +0,8 de moyenne. Condition d'implémentation : le prérequis mono-actif doit tester `pos ≤ 5 ∨ lowDose`, pas « w > 0 » (ma simulation laissait passer un power 3 en queue).
9. **Dose côté perso** (D7 + P8 + D9). Règle : `strength` et alcool × w (0 sous la barre sauf lowDose), une seule ligne force ; `legere` seulement sur hydratant/contour des yeux ; `riche` jamais sur `exposition < 1` ; richesse par classes avec `seuilRiche` recalé à 4-5 (Toleriane Riche doit rester riche : 4,5 ; CeraVe PM 1,2). Effet : ~450 produits +10-12 (sensibles), 118 démaquillants +12 (grasses), 249 hydratants +7 (grasses).
10. **Garde-fous** (P10/S7 + S10 + P11). Règle : non évaluable si n < 8 ∨ couverture < 0,7 ∨ solaire sans filtre lisible (128 produits, 4,4 %) ; badge partiel si n < 12 ou couverture < 0,8 ; scan : catégorie non « sûre » ou lecture partielle → jamais vert ; allergies par liste canonique (1 224 faux positifs « alcohol » supprimés) ; normalisation des graphies sans fuzzy.

### Ce que je rejette, et pourquoi

- **V1 (ma propre S2)** : retirer le mérite `sansParfum` coûte 5-7 points aux sans-parfum simples (CeraVe 59 → 52, Sensibio 64 → 58) par effet de normalisation. Mesuré, retiré.
- **D8 tel qu'écrit (irritant ≥ 1)** : aggrave les sensibles (Δ −14,2 → −16,2) et baisse les nettoyants doux (46 → 45). Retenu seulement pour irritant 2.
- **D6 « power ≥ 2 »** comme prérequis : 93,7 % des sérums passent, la glycérine étant power 2. Retenu avec power 3.
- **D12 tel qu'écrit** : « w ≥ 0,6 ou lowDose » ne change rien à 219 des 226 produits plafonnés (tous les rétinoïdes sont lowDose). À réécrire sur la position brute si l'intention est la dose.
- **P9 clause « ZnO/TiO2 en positions 1-6 »** : conserve le bonus de 19 produits du type Cicalfate. Filtre organique ou SPF au nom, sinon rien.
- **P6(c) décroissance au-delà de 4 actifs** : inutile une fois les traces exclues (les 13 sérums à 90-92 redescendent à 83-89 par POND seul) et créerait une non-monotonie.
- **P11 rapprochement fuzzy (Levenshtein ≤ 2)** : retinol/retinal à distance 1 ; une faute OCR doit rester « inconnu + badge ».
- **P12(d) × power/3 tel quel** : écrase les profils âge/rougeurs (Δ +3,4 → +0,3). Préférer × (1 + power)/4.
- **Une normalisation « par le catalogue »** pour S9 : le paquet laisse les familles entre 60 et 74 de médiane ; la correction doit rester analytique (plafonds atteignables avec 5 places en top 5, prérequis en % du budget), pas empirique.
