# Rapport 1 — Audit mécanique du moteur de notation (angle statisticien)

Périmètre : `src/lib/scan/scoring.mjs` (algoVersion `2.0.0-metier`), spec `docs/specs/scan-scoring.md` v1.1, dictionnaire (3 165 fiches), catalogue `data/scan/catalog.json`.
Jeu de mesure : **2 916 produits** (3 233 moins `hors-perimetre` et les fiches sans INCI). Tout chiffre ci-dessous est sorti d'un calcul réel sur le moteur (scripts dans `scratchpad/debat/*.mjs`). Aucun fichier du dépôt n'a été modifié.

Profils utilisés pour la note perso :
- **grasseAcne** : oily, sensibilité 0, blemishes 3 + oiliness 2, ceiling 3, besoinSolaire 2
- **secheReactive** : dry, sensibilité 3, dehydration 3 + redness 2 + barrier 2, ceiling 0
- **normaleAge** : normal, sensibilité 1, aging 3 + spots 2, ceiling 2, besoinSolaire 1

---

## Distribution mesurée de la note FORMULE par catégorie

| catégorie | n | moy | méd | p10 | p90 | min | max | % vert (≥75) | % orange | % rouge (<45) |
|---|---|---|---|---|---|---|---|---|---|---|
| cleanser | 382 | 62,7 | 63 | 46 | 78 | 28 | 85 | 18,8 | 72,5 | 8,6 |
| makeup-remover | 155 | 64,7 | 64 | 52 | 79 | 45 | 87 | 21,9 | 78,1 | 0 |
| toner | 289 | 62,5 | 66 | 41 | 82 | 18 | 92 | 27,0 | 58,5 | 14,5 |
| exfoliant | 278 | 58,4 | 59 | 37 | 79 | 26 | 87 | 19,8 | 59,4 | 20,9 |
| serum | 515 | 67,8 | 69 | 51 | 82 | 43 | 92 | 31,8 | 67,6 | 0,6 |
| treatment | 156 | 65,7 | 66 | 49 | 82 | 40 | 92 | 26,9 | 69,2 | 3,8 |
| moisturizer | 544 | 68,5 | 69 | 52 | 83 | 31 | 94 | 35,5 | 62,3 | 2,2 |
| eye-cream | 143 | 67,2 | 73 | 44 | 84 | 30 | 92 | 37,1 | 49,7 | 13,3 |
| sunscreen | 290 | 63,5 | 64,5 | 44 | 78 | 17 | 86 | 20,7 | 69,0 | 10,3 |
| mask | 164 | 65,8 | 66 | 52 | 82 | 45 | 88 | 20,1 | 79,9 | 0 |
| **TOUS** | **2 916** | **65,0** | **66** | **48** | **82** | **17** | **94** | **26,9** | **66,2** | **7,0** |

Lecture : la note ne se tasse pas entre 55 et 75 (p10 = 48, p90 = 82), les trois bandes sont atteignables. **Aucun produit du catalogue n'atteint 100** (max 94, un hydratant SPF). Structurellement, 50 + 42 = 92 est le plafond de toute famille ; seuls les non-solaires avec filtres UV peuvent dépasser (+8, ligne 533-536). Un solaire ne peut donc jamais dépasser 92, et le meilleur du catalogue fait 86.

Écart FORMULE → PERSO (catalogue entier) :

| profil | Δ moy | Δ méd | p10 | p90 | min | max | % change de bande | % vert perso | % rouge perso | % à 100 | % à 5 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| grasseAcne | +7,1 | +7 | −6 | +18 | −18 | +32 | 30,1 | 46,7 | 5,4 | 4,8 | 0 |
| secheReactive | −10,0 | −7 | −43 | +14 | −66 | +32 | 45,9 | 32,8 | 35,5 | 4,6 | **14,1** |
| normaleAge | +3,4 | +5 | −11 | +16 | −56 | +29 | 28,0 | 44,5 | 14,5 | 5,5 | 0,9 |

---

## S1 — Côté perso, parfum, huiles essentielles et sensibilisants sont facturés PAR ingrédient, sans plafond
**Gravité : bloquant.**

**Constat.** La note formule a corrigé la « prime à l'opacité » (le complexe parfumant compte UNE fois, plafonné à −12, `scoring.mjs:524-529`). La note perso la réintroduit : la ligne `if (f.fragrance && sensitivity > 0)` (`scoring.mjs:601-605`) est dans la boucle `for (const it of list)` et coûte −4 × sensibilité **à chaque ingrédient à drapeau fragrance**, sans `vusRisque` ni plafond. Même chose pour les HE (−8 chacune, `615-618`) et les sensibilisants (`593-599`).
Mesures :
- 1 371 produits (47 %) ont ≥ 1 drapeau fragrance ; 373 en ont ≥ 5 ; maximum 19.
- Oak Essentials Pure Gel Face Cleanser : 19 drapeaux → somme des malus parfum perso **−228**, formule 61 → perso 5 ; 19 lignes « Fragrance — poorly suited » dans `facts`.
- Étalon (sérum, sensibilité 3) : `Water, Glycerin, Niacinamide, Parfum` → perso **45** ; la même formule avec ses 8 allergènes déclarés (obligation UE) → perso **5**.
- Sensibilité 3 seule, sans autre préoccupation : **453 produits (15,5 %) au plancher 5** ; score non borné médian −31,6, minimum −260. Sur le profil secheReactive : 81,6 % des produits parfumés tombent en rouge, 14,1 % du catalogue entier à 5.
- Sensibilisants : jusqu'à 14 lignes « contact allergen » par produit ; les plus fréquents sont ETHYLHEXYLGLYCERIN, TOCOPHEROL, PHENOXYETHANOL (≈1 150 produits chacun), c'est-à-dire des conservateurs présents partout.

**Pourquoi c'est un problème.** La marque transparente est punie 8 à 19 fois, la marque opaque une fois : c'est exactement le bug jugé « inacceptable » côté formule. Le plancher 5 écrase 15 % du catalogue : un produit à −30 et un à −260 affichent la même note, la personnalisation ne discrimine plus rien pour les peaux réactives (le public cible du score perso).

**Proposition.** Même règle que la formule : parfum = UNE ligne (`max` des composants, pas la somme), plafond −4 × sensibilité ; HE = UNE ligne −8 ; sensibilisants : somme plafonnée à −12 × (sensibilité/3). Appliquer aussi `dejaFactures` : un ingrédient parfum ne prend pas en plus la ligne sensibilisant (déjà exclu, `594`, à garder).

**Effet mesuré (simulation V3, profil secheReactive).** Δ moyen −10 → −4,1 ; p10 −43 → −24 ; % rouge 35,5 → 27,3 ; **% à 5 : 14,1 → 1,0** ; étalon transparente 5 → 37 (opaque inchangé à 45). Effet de bord : un produit saturé de parfum et un produit à trace deviennent indiscernables côté perso ; c'est déjà le choix assumé côté formule.

---

## S2 — Le parfum est compté DEUX fois dans la note formule (mérite « sansParfum » + malus fixe), et l'exposition n'est appliquée qu'à l'un des deux
**Gravité : bloquant.**

**Constat.** Chaque grille porte un mérite `sansParfum` (12 à 18 pts bruts, `scoring.mjs:141,155,167,179,190,201,216,227,238,251,262`) ET un malus fixe par ingrédient parfumé (`511-512`, plafonné `524-529`). L'absence et la présence du même fait sont facturées par deux chemins. Coût réel d'UNE trace de parfum ajoutée en fin de liste (position ~40) sur un produit non parfumé :

| famille | coût moyen | dont mérite perdu (après ×42/max) | dont malus fixe |
|---|---|---|---|
| cleanser (rincé, exposition 0,55) | −12,2 | 10,1 | 2,2 |
| serum | −12,6 | 8,7 | 4,0 |
| toner | −16,2 | 11,3 | 4,8 |
| exfoliant | −16,0 | 11,8 | 4,4 |
| eye-cream | **−22,4** | 15,1 | 7,2 |

Médiane sans parfum vs parfumé : écart de 13,5 (treatment) à 27,5 (eye-cream). **% vert parmi les parfumés : 0 % (cleanser, démaquillant, exfoliant, yeux, solaire) à 4,2 %.**

**Pourquoi c'est un problème.** (1) Un critère binaire, indépendant de la position, vaut plus que toute la ligne « actifs » (6 à 12 pts) : « sans parfum » est de fait l'axe dominant de la note. (2) Le mérite est normalisé et consomme 21 à 36 % du budget de la grille, il évince les autres critères. (3) L'`exposition` (produit rincé) est appliquée au malus (`515`) mais pas au mérite : un nettoyant rincé paie 12,2 pour une trace de parfum, un sérum posé 8 h en paie 12,6. C'est contraire à la règle « la dose compte » écrite en `502-504`.

**Proposition.** Un seul chemin. Recommandé : supprimer la ligne `sansParfum` de toutes les grilles et garder le malus fixe (tarif 6 × severite × exposition, plafond 12 × severite × exposition). Alternative : garder le mérite et supprimer le malus (mais alors l'exposition n'agit plus).

**Effet mesuré (simulation V1 = mérite retiré, malus inchangé).** Coût d'une trace : −4 en moyenne (min −8) ; écart de médiane parfumé/sans : 1,5 à 15 (au lieu de 13,5 à 27,5) ; % vert global 26,9 → 20,9 ; % rouge 7,0 → 6,4. Avec malus relevé à 8 (V1b) : coût −8, % vert 18,2. Effet de bord : la note globale baisse d'environ 4 pts pour les non-parfumés (la normalisation redistribue leur budget sur les autres critères, donc les formules riches en actifs remontent).

---

## S3 — Le plafond « non compensatoire » (gravité 3 → 49/69) est contourné par la note perso, et ne concerne que 4 ingrédients
**Gravité : important.**

**Constat.** `cap` est appliqué à la formule (`scoring.mjs:508, 537`) mais `scorePerso` repart de `F.score` (`552`) et additionne librement (+30 matchs, +10 solaire, +6 texture…). Seul `capAbsolu` (grossesse/allergie) borne la perso (`681`). Le dictionnaire n'a que 4 ingrédients de gravité 3 (hydroquinone, triclosan, deux graphies de l'huile de germe de blé comédogène 5) → **14 produits touchés** sur 2 916. Parmi eux, 5 dépassent le cap en perso : Paula's Choice Skin Balancing Moisturiser formule 69 → perso **88**, ELEMIS Naked Cleansing Balm 69 → 85, Estée Lauder ANR Eye 63 → 77.

**Pourquoi c'est un problème.** La recherche structure (spec §3bis-1) impose la non-compensation « quelle que soit la somme ». Une note perso verte sur un produit que la formule refuse de laisser passer au vert contredit la promesse. Et une règle qui ne s'active que sur 0,5 % du catalogue est quasi morte : elle ne protège de rien.

**Proposition.** (1) Renvoyer `cap` dans le résultat formule et l'appliquer en perso (`score = Math.min(score, capAbsolu, F.cap)`). (2) Confier au dermato la revue de la population gravité 3 (2 irritants 3 + comédogène ≥5 seulement).

**Effet.** 5 produits redescendent sous 70 ; aucun autre changement.

---

## S4 — Falaises de position : ajouter un bon actif en tête peut BAISSER la note, ajouter de l'eau peut la MONTER
**Gravité : important.**

**Constat.** Le poids de position est un escalier (1,0 / 0,6 / 0,3 aux positions 5 et 10, `scoring.mjs:19-23`) et plusieurs règles sont binaires sur « ≤ 5 » : `@actifTop5` (16-18 pts bruts = 9,7 à 14 pts finals, `372-373`), alcool top 5 (`513`), cap 49 vs 69 (`508`), `maxPos` des lignes (`142,147,160,229`). Mesures :
- **T1b** : « Niacinamide » ajouté en position 1 → la note **baisse** pour 165 produits (5,7 %, jusqu'à −5) : elle chasse un actif de la 5e à la 6e place.
- **T2** : « Water » ajouté en position 1 (neutre pur) → la note **monte** pour 143 produits (4,9 %, jusqu'à +7) : elle sort un alcool ou un risque du top 5.
- **T7** : 118 sérums/traitements/toniques/masques/solaires ont leur premier actif power-3 en position 6-7 ; le monter d'un cran vaut **+11** (The Ordinary Salicylic Acid Masque 60 → 71).
- **R4** : inverser deux voisins du top 6 déplace jusqu'à 15 pts.
- Simulation V2 (escalier plus fin 1/0,9/0,75/0,6/0,45/0,3) : **n'améliore rien** (violations T1b 5,7 → 7,9 %, T2 4,9 → 6,5 %) : le problème vient des prédicats binaires, pas de la finesse des marches.

**Pourquoi c'est un problème.** La monotonie « un bon ingrédient ne baisse jamais la note » est violée, et une erreur d'ordre d'un cran (OCR, liste multi-langue) vaut jusqu'à 11-15 pts, plus que la plupart des critères métier.

**Proposition.** Rendre `@actifTop5` gradué : pts × w(pos) du meilleur actif power-3 (1,0 / 0,6 / 0,3) au lieu de 1/0 ; idem pour l'alcool (malus × w(pos) au lieu de « top 5 sinon rien ») et pour le cap (49 si w = 1, 69 sinon, sans changement de nature). Effet attendu : les 118 produits de T7 gagnent +4 à +7 au lieu de 0/+11 ; la sensibilité R4 passe sous 5 pts. Risque : légère hausse moyenne des sérums (~+2) à recalibrer sur `budgetMetier`.

---

## S5 — Les mérites sont plafonnés, les risques ne le sont pas : un actif prouvé mais irritant devient NET NÉGATIF
**Gravité : important.**

**Constat.** `richesse`/`actifs` sont bornés par `plafond` (`scoring.mjs:168,180,193`), le malus de risque générique ne l'est pas (`505`). 509 des 671 sérums/traitements ont déjà leur ligne « richesse » saturée. Ajouter en fin de liste :

| actif ajouté (power 3) | Δ formule moyen | % de baisses |
|---|---|---|
| Retinol (irritant 2, lowDose → w = 1) | −3,3 | 85,7 % |
| Glycolic Acid | −1,0 | 83,7 % |
| Azelaic Acid | −0,7 | 61,7 % |
| Ascorbic Acid | −0,1 | 63,9 % |

Sur les 300 premiers sérums, +Retinol baisse la formule dans 81,7 % des cas ; en perso (profil aging 3) encore 67,3 %.

**Pourquoi c'est un problème.** L'ingrédient anti-âge le mieux prouvé du dictionnaire fait baisser la note d'un sérum anti-âge. La mécanique « bonus plafonné + malus libre » rend tout actif avec `irritant ≥ 2` toxique pour le score dès que la grille est pleine, alors que son irritance est déjà gérée côté perso par `strength`/`strengthCeiling` (`624-629`).

**Proposition.** Pour un ingrédient `role: active` avec `benefitPower 3`, ne pas appliquer le malus de risque générique quand `irritant ≤ 2` (l'irritance intrinsèque d'un actif est le prix de son efficacité et relève du profil, pas de la formule) ; conserver le malus pour `comedogenic` et pour les non-actifs. Effet : +3 à +4 sur les sérums rétinoïdes/AHA ; à faire valider par le dermato (un AHA en position 2 d'un tonique sans tampon reste un vrai risque, que la ligne `tampon` de l'exfoliant capture déjà).

---

## S6 — Un doublon de saisie fait MONTER la note (les mérites ne sont pas dédoublonnés)
**Gravité : important.**

**Constat.** Les risques sont dédoublonnés par nom (`scoring.mjs:491-496`), les mérites non : `evalueLigne` (`385-420`) compte chaque occurrence, `@actifs` compte un doublon comme 2e actif de la famille (`maxActifsParFamille = 2`), `@troisActifs` (`378`) compte les doublons.
- **T5** : recopier les 5 premiers ingrédients en fin de liste → gain pour 264 produits (9,1 %), jusqu'à **+15**.
- **T5b** : « Niacinamide » écrit deux fois → gain dans 12,5 % des 790 produits qui en contiennent, jusqu'à **+14** (le doublon fait passer le prérequis `@troisActifs`, −12 → 0).

**Pourquoi c'est un problème.** L'asymétrie ne joue que dans un sens : une erreur de lecture (liste bilingue « Aqua, Water », INCI répété sous deux graphies) ne peut qu'inflater. Le principe « un ingrédient = une ligne » (`473-475`) n'est appliqué qu'aux malus.

**Proposition.** Dans `evalueLigne` et dans `@troisActifs`/`@actifs`, un `Set` de noms déjà comptés (première occurrence = position la plus haute), exactement comme `vusRisque`. Effet : 264 produits perdent leur gain artificiel ; zéro perte ailleurs (mesuré : Δ ≤ 0 pour 100 % des produits sans doublon réel).

---

## S7 — La grille « indetermine » est la plus généreuse, et c'est celle du scan d'étiquette quand la catégorie est incertaine
**Gravité : important.**

**Constat.** Grille `indetermine` (`scoring.mjs:257-266`) : aucun prérequis, aucune pénalité, ligne `actifs` à 20 pts (la plus haute de toutes), max de grille 48 → facteur 0,875 (le plus favorable). Tout le catalogue rescoré sur cette grille : moyenne 69,5 (vs 65,0), **40,1 % de verts (vs 26,9 %)**, 24,7 % des produits changent de bande, écart moyen +4,5 (+9,9 pour les solaires, jusqu'à +53). L'API du scan (`src/app/api/produit/lire-inci/route.ts:49-56`) note avec la catégorie devinée par `categoriser` même quand `confiance` est « incertain » ou « aucune » (`categorise.mjs:100-104`) ; la confiance n'est que renvoyée à l'écran.
Robustesse à la lecture partielle (formule, catalogue entier) :

| perturbation | \|Δ\| moy | \|Δ\| p90 | \|Δ\| max | % change de bande |
|---|---|---|---|---|
| un ingrédient du top 10 oublié | 1,2 | 3 | 31 | 3,9 |
| un ingrédient du top 5 mal lu (→ inconnu) | 1,7 | 6 | 31 | 5,5 |
| **liste tronquée à 12 ingrédients** | **7,0** | **17** | 36 | **24,4** |
| liste tronquée à 20 | 4,3 | 14 | 35 | 14,9 |
| dernier tiers illisible | 4,9 | 14 | 38 | 16,3 |

Une liste tronquée à 12 a une `couverture` de 1,0 (`539-541`) : **le badge « analyse partielle » ne se déclenche pas**, alors qu'un produit sur quatre change de bande.

**Pourquoi c'est un problème.** Le chemin le moins sûr (photo d'étiquette, catégorie devinée) est celui qui note le plus haut et n'affiche aucune réserve. Un scan mal catégorisé a une chance sur quatre de changer de couleur.

**Proposition.** (1) Aligner `indetermine` sur la médiane des grilles : `actifs` plafond 20 → 14, ajouter le prérequis `@humectant` (−10), ou noter sur les deux grilles les mieux votées et garder le **min**. (2) `analysePartielle = true` aussi quand `nIngredients < 12` ou `lecture.partielle`, et jamais de bande verte tant que `confianceCategorie` ≠ « sur ». Effet attendu : le taux de verts en indéterminé retombe vers 27 %.

---

## S8 — Solaires : le prérequis « filtres » dépend du dictionnaire et ignore le drapeau `filtresUV` ; le plafond réel est 86
**Gravité : important.**

**Constat.** Pour un solaire, le paramètre `filtresUV` n'est jamais lu (`scoring.mjs:533` : `categorie !== "sunscreen"` seulement) ; le prérequis `@filtresUV` (−25, `211`) ne regarde que les fonctions `filtre-uva/uvb` du dictionnaire (19 fiches). **26 solaires sur 290 prennent −25**, dont **12 que le catalogue marque `filtresUV: true`** (La Roche-Posay Anthelios UV Hydra → 39, Anthelios Mineral Tinted → 33, Naturium Dew-Glow SPF 50 → 40). `ZINC OXIDE` est classé `filtre-uva` seul et `TITANIUM DIOXIDE` `filtre-uvb` seul : **40 solaires minéraux à l'oxyde de zinc seul perdent « spectre large » (−13,5 pts finals)**. Le regex `@photostable` (`375-376`) accepte `DIETHYLHEXYL CARBONATE/ADIPATE` (émollients) comme stabilisants : 5 faux positifs. Enfin la ligne `actifs` du solaire (1,5 × power × w, plafond 8) est inatteignable quand les filtres occupent le top 5 : mérite max observé 36/42, **aucun solaire ≥ 92, max 86**, % vert 20,7.

**Pourquoi c'est un problème.** Un solaire de pharmacie à 33-40 est une erreur de données présentée comme un jugement ; la famille dont « le métier est de protéger » est structurellement plafonnée sous les autres.

**Proposition.** (1) `@filtresUV` satisfait si `filtresUV === true` (donnée catalogue/catégoriseur) OU fonction dictionnaire. (2) Dermato : `ZINC OXIDE` → uva + uvb. (3) Regex `@photostable` restreint aux vrais stabilisants (`DIETHYLHEXYL SYRINGYLIDENEMALONATE`, `DIETHYLHEXYL 2,6-NAPHTHALATE`, `DIETHYLHEXYL BUTAMIDO TRIAZONE`). (4) Plafond `actifs` du solaire 8 → 4 pour que la grille soit remplissable. Effet : 12 produits +25 à +43 ; 40 produits +13,5 ; le max solaire remonte vers 92.

---

## S9 — L'« équité par construction » entre familles n'est pas tenue : médiane −50 de 9 (exfoliant) à 23 (eye-cream)
**Gravité : important.**

**Constat.** Promesse (`scoring.mjs:127-131`) : chaque grille normalisée par son propre max, donc « remplir 100 % » vaut pareil partout. Mesures : % vert de 18,8 (cleanser) à 37,1 (eye-cream) ; % rouge de 0 (makeup-remover, mask) à 20,9 (exfoliant) ; max atteint 85 (cleanser), 86 (sunscreen), 87 (makeup-remover), 88 (mask) contre 92-94 ailleurs. Mérite max observé : cleanser 34,6/42, sunscreen 36/42, makeup-remover 37,6/42. Deux causes mécaniques : (a) `maxTheorique` (`425-430`) somme les plafonds des lignes `pondere`, qui supposent w = 1 pour chaque élément compté, mais il n'y a que 5 places en top 5 (le `soutien` 2 × 8 du nettoyant exige deux lipides/émollients en top 5 EN PLUS des tensioactifs) ; (b) les prérequis et pénalités sont bruts (non normalisés) et frappent inégalement : prérequis manquant chez 25,9 % des exfoliants (−14) et 17,6 % des solaires (−25), 0 % des contours des yeux.

**Pourquoi c'est un problème.** L'app dira « tes nettoyants et tes solaires sont moins bons que tes crèmes » par construction : c'est le biais que l'offset v1.3 avait été créé pour corriger, réapparu sous une autre forme.

**Proposition.** Normaliser par un max **atteignable** : pour chaque ligne `pondere`, borner sa contribution au max théorique par `plafond × w` du meilleur placement compatible avec les autres lignes (ou, plus simple, recalibrer les plafonds `soutien`/`actifs`/`tampon` pour qu'ils soient atteignables avec 5 places) ; et exprimer les prérequis en % du budget (−12 partout, ou −25 % du budget) plutôt qu'en points bruts hétérogènes (−10 à −25). Effet attendu : max des nettoyants et solaires vers 92 ; médianes resserrées entre 63 et 70. Risque : ne pas retomber dans la normalisation sur le catalogue (dépendance aux données), donc calcul analytique, pas empirique.

---

## S10 — Allergie déclarée : test par sous-chaîne → « alcohol » plafonne 42 % du catalogue à 10
**Gravité : important (registre sécurité, très visible).**

**Constat.** `profil.allergies.some((a) => it.name.includes(a.toUpperCase()))` (`scoring.mjs:568`). Mesuré sur le catalogue : allergie « alcohol » → **1 224 produits (42 %) à 10/100** (déclencheur : CETEARYL ALCOHOL, un émollient) ; « oil » → 1 315 (45 %) ; « sulfate » → 234 (8 %, SODIUM SULFATE, MAGNESIUM SULFATE) ; « paraben » → 53 (correct).

**Pourquoi c'est un problème.** C'est le seul court-circuit « sécurité » du moteur, et il produit des faux positifs massifs avec bandeau rouge, sur des mots que n'importe qui tapera.

**Proposition.** Faire correspondre l'allergie à une liste canonique (alias `ingredients-canon.json` + familles : « alcool desséchant » = fiches `dryingAlcohol`, « sulfates » = fonction `tensioactif-agressif`, « parfum » = `fragrance`), avec égalité de token entier pour les noms INCI précis. Effet : les 1 224 faux positifs disparaissent ; un vrai allergène nommé reste bloqué.

---

## S11 — Côté perso, la dose est ignorée : force, alcool et « richesse » sont lus sans position ni rinçage
**Gravité : mineur (cumul de trois petites incohérences avec la règle « la dose compte »).**

**Constat.**
- **Force** : `strengthMax` prend le max sur toute la liste sans w(pos) (`scoring.mjs:561`, `353`, `624`). 453 produits ont leur seul actif fort au-delà de la position 10 (Ascorbic Acid en pos 28 d'un masque medicube) et perdent en moyenne **−12** pour une peau sensible ; de plus 367 exfoliants/traitements/toniques cumulent `Stronger than your comfort zone` (−5/cran, `624-629`) ET `Strong exfoliating actives` (−10, `672-675`) pour le même fait.
- **Alcool** : −6 par occurrence, sans position (`611-614`) : 97 produits ne l'ont qu'au-delà de la position 10 (la formule, elle, ne le compte que ≤ 5) ; 12 produits en ont deux graphies → −12.
- **Richesse** : `natureProduit` ignore l'exposition : **68,4 % des démaquillants** (huiles/baumes rincés) sont « riches » → −12 pour une peau grasse (118 nettoyants/démaquillants, Dermalogica Precleanse 59 → 47).

**Proposition.** `strength` et alcool pondérés par w(pos) (0 au-delà de la barre 1 % sauf `lowDose`) ; garder UNE seule des deux lignes force ; ne pas appliquer `richesse` quand `exposition < 1`. Effet : ~450 produits +10-12 pour les profils sensibles ; 118 démaquillants +12 pour les peaux grasses.

---

## Ce qui est bien fait et ne doit pas changer

1. **Monotonie sur les cas simples, vérifiée à 0 violation** : ajouter un bon actif en fin de liste ne baisse jamais la note (2 916/2 916) ; ajouter du parfum ne la monte jamais ; retirer le parfum ne la baisse jamais (764/764). La spec §4 est tenue là où elle est testable.
2. **Robustesse aux erreurs isolées** : un ingrédient oublié ou mal lu → |Δ| médian 0, deux voisins inversés → |Δ| moyen 0,2, conservateur mal lu → 0,1. La barre des 1 % par marqueurs (`321-331`) et l'exception `lowDose` sont solides : à conserver telles quelles.
3. **Dédoublonnage des risques et « un ingrédient = un malus fixe »** (`491-496`, `510-513`) et **plafond du complexe parfumant côté formule** (`524-529`) : c'est le bon modèle, il faut l'étendre à la perso (S1) et aux mérites (S6), pas le retoucher.
4. **Inconnu = 0 point, jamais un malus, mais visible** (`couverture`, `539-543`) : la couverture top 10 du catalogue est de 1,0 en moyenne, 2,5 % sous 0,7. Bon choix, à compléter par la détection de liste tronquée (S7).
5. **Prérequis comme « ticket d'entrée » et normalisation par grille** : l'idée est juste et rend la note indépendante du catalogue ; ce sont les plafonds inatteignables (S9) qui la trahissent, pas le principe.
6. **Perso = adéquation, sécurité = court-circuits binaires** (grossesse/allergie), matchs plafonnés à 10/ingrédient et 30 au total (`39-41, 581, 621`) : la partie POSITIVE de la perso est bien bornée (Δ max +32, ~5 % à 100). C'est la partie négative qui ne l'est pas (S1).
