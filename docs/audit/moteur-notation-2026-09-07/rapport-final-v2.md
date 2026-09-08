# SmartSkin Score — Rapport final de l'audit du moteur de notation (v2)

Rapporteur : agent « stat » (mécanique / mesure). Version 2 : intègre les deux vetos et les réserves déposés en phase 4 par le dermato et le produit. Règle de sélection : une modification entre si au moins 2 agents sur 3 la soutiennent après débat ET si aucune objection chiffrée ne reste sans réponse.

Banc de mesure : copie patchée du moteur (`scratchpad/debat/scoring-sim.mjs`, 37 interrupteurs, dépôt intact ; à interrupteurs éteints, 0 écart avec l'original sur 2 916 produits). Chaque variante a été jouée sur le catalogue entier et sur 80 produits étalons (réels, vérifiés par nom de fiche exact, + 12 formules construites). Le dépôt n'a pas été modifié. Toutes les notes « actuelles » de ce document sont celles du moteur original ; les notes « finales » sont celles du paquet v2 complet.

Profils perso : **sècheR** = peau sèche, sensibilité 3, déshydratation 3 + rougeurs 2 + barrière 2, tolérance 0 · **grasseAcne** = grasse, imperfections 3 + brillance 2, tolérance 3 · **sens3** = normale, sensibilité 3, rougeurs 2 · **normaleAge** = normale, sensibilité 1, rides 3 + taches 2 · **grasseRides** · **rougeurs** (sensibilité 2, rougeurs 3).

---

## Validation — qui a validé quoi

| modification | dermato | produit | stat | état v2 |
|---|---|---|---|---|
| B1 Solaires : filtres, spectre, stabilisants | OK, réserve (Tinosorb A2B = UVB seul) | OK | OK | réserve intégrée |
| B2 « Parfum » ≠ conservateur, alias PERFUME/AROMA | OK | OK | OK | consensus |
| B3 Dictionnaire | OK, réserve (hamamélis : power 1 + irritant 1, `redness` conservé ; propanediol/heptanediol = humectants) | OK, réserve (synonymes vrais non canonicalisés) | OK | réserves intégrées ; synonymes → D |
| B4 Bonus UV crédible, « non évaluable » | OK | OK, réserve (mot entier hors marque ; note « provisoire » si catégorie non sûre) | OK | réserves intégrées |
| B5 Perso : parfum/HE/allergènes une fois | OK, réserve (parfum rincé −13 vs posé −14 → B11) | OK | OK | réserve → D |
| B6 Nettoyants / démaquillants sans tensioactif | OK | OK | OK | consensus |
| B7 Comptage des actifs | **VETO** sur (5) ; réserve sur (3) | OK (résiduel rétinol acté) | OK | **veto intégré** : `lowDose` → w = 1 partout ; clause humectant limitée aux `lowDose` ; paquet re-mesuré |
| B8 Premier actif irritant gratuit | OK | OK, réserve (TO AHA 30 % à 75 → B11) | OK | réserve → B11 |
| B9 Plafonds (comédogène hors formule, bannis UE, cap en perso) | **VETO** sur la portée du ban | OK | OK | **veto intégré** : `banniUEPortee` « tous » / « pose » |
| B10 Perso : dose, réactivité ≠ allergie | OK | OK | OK | consensus |
| B11 Recalibration des familles (ouvert, en dernier) | OK | OK | OK | consensus ; reçoit le parfum rincé et les bandes des peels |

---

## A. Résumé

1. **Ce que le moteur fait bien** : il lit la position dans la liste d'ingrédients comme une dose (avec la barre des 1 % et l'exception des actifs efficaces à faible dose), il juge chaque produit sur son métier (un nettoyant sur sa douceur, un solaire sur ses filtres), il tient compte du rinçage, il ne punit jamais un ingrédient inconnu, il traite grossesse et allergie en tout-ou-rien, et il est robuste aux petites erreurs de lecture (un ingrédient mal lu : écart médian 0).
2. **Défaut majeur n° 1, la note perso punit la transparence** : parfum, huiles essentielles et allergènes sont facturés à chaque ingrédient, sans plafond. Une marque qui déclare ses allergènes (obligation UE) tombe à 5/100 pour une peau réactive, celle qui écrit « Parfum » reste à 57. Résultat : 14 à 15 % du catalogue au plancher 5 pour une peau sensible.
3. **Défaut majeur n° 2, des données fausses notent faux des produits de référence** : solaires « sans aucun filtre » (26, dont Anthelios à 33-39), oxyde de zinc classé UVA seul (40 minéraux privés du « large spectre »), alcool benzylique compté comme parfum (59 à 90 produits, The Ordinary Caffeine à 49), laits et eaux micellaires punis « pas d'agent lavant » (CeraVe Hydrating 59, Sensibio 64), « Adapalene USP 0.1% » illisible (LRP Effaclar Adapalene 47).
4. **Défaut majeur n° 3, le comptage des actifs récompense la liste longue** : un mono-actif prouvé est puni « trop peu d'actifs » (The Ordinary Niacinamide 66), trois traces ajoutées après le conservateur rapportent +15, un ingrédient écrit deux fois rapporte +14, et un rétinol fait baisser la note d'un sérum dans 8 cas sur 10.
5. **Effet global du paquet v2** : note formule moyenne 65,0 → 66,0, médiane 66 → 68, produits verts 26,9 → 30,9 %, rouges 7,0 → 5,9 %, 65 produits (2,2 %) passent « non évaluable » au lieu d'une fausse note. 287 produits montent d'une bande, 180 en descendent, 2 384 gardent la leur.
6. Côté perso, peau sèche réactive : écart moyen à la formule −10,2 → +0,2, produits rouges 34,8 → 18,3 %, produits au plancher 14,2 → 0,2 %. Peau grasse acnéique : +7,1 → +4,5 (les actifs à preuve faible rapportent moins).
7. Étalons corrigés : CeraVe Hydrating 59 → 72, Sensibio 64 → 77, Toleriane Eau Micellaire 70 → 82, TO Niacinamide 66 → 78, LRP Effaclar Adapalene 47 → 78, SKIN1004 Centella Ampoule 53 → 65, TO Caffeine 49 → 71, Vanicream Mineral SPF 30 68 → 82, Cetaphil Sheer Mineral 65 → 80, Avène Mineral 58 → 77, Dermalogica Retinol perso réactive 5 → 44.
8. Triches fermées : « 3 actifs après le conservateur » +15 → +3, « ingrédient en double » +14 → 0, « Perfume au lieu de Parfum » +12 → 0, « Parfum plutôt que déclarer les allergènes » côté perso +46 → +8. Résiduel accepté : « Retinol en dernière position » +4 sur TO Niacinamide, +12 sur un sérum peptides sans actif fort (mesuré, section D).
9. Monotonie vérifiée sur le paquet : ajouter un bon actif en fin de liste ne baisse jamais la note (0 cas), ajouter du parfum ne la monte jamais (0), dupliquer un ingrédient ne rapporte plus rien (0, contre 264 avant), 0 produit ne dépasse plus son plafond en perso.
10. **Ordre impératif** : corriger les données (B1-B4) avant les règles (B5-B10), et recalibrer les familles (B11) en dernier, sinon les biais de données seraient gelés dans les poids.

---

## B. Les modifications retenues, dans l'ordre d'application

Convention : « fichier:ligne » renvoie à `src/lib/scan/scoring.mjs` sauf mention. Les chiffres « V0 → final » sont mesurés avec le paquet v2 complet.

### B1 — DONNÉES · Solaires : reconnaître les filtres et le large spectre

**Pour l'utilisatrice.** Un solaire minéral à l'oxyde de zinc n'est plus noté sous un solaire chimique, et un solaire dont la liste ne contient aucun filtre lisible n'affiche plus « aucun filtre UV, mauvais » mais « non évaluable ».

**Règle.** Dictionnaire : `ZINC OXIDE` (et variantes NANO / CI 77947), Tinosorb S (`BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE`), Tinosorb M (`METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL`), Mexoryl XL (`DROMETRIZOLE TRISILOXANE`) → `["filtre-uva","filtre-uvb"]` ; ajouter `OCTISALATE` (uvb, 115 INCI), `DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE` (uva), `DIETHYLHEXYL BUTAMIDO TRIAZONE` (uvb), `TITANIUM DIOXIDE (NANO)` (uvb), `TRIS-BIPHENYL TRIAZINE` (**uvb seul**, UVB + UVA2 sans UVA1, réserve dermato). `TITANIUM DIOXIDE` reste uvb seul. `parseInci` (299-318) retire « n % » et « USP » en fin de jeton et les parenthèses vides qui en résultent. `@photostable` (375-376) lit la liste des vrais stabilisants : octocrylène, Tinosorb S/M, `ETHYLHEXYL METHOXYCRYLENE`, `BUTYLOCTYL SALICYLATE`, `POLYSILICONE-15`, `DIETHYLHEXYL 2,6-NAPHTHALATE`, `DIETHYLHEXYL SYRINGYLIDENEMALONATE`, `DIETHYLHEXYL BUTAMIDO TRIAZONE`. `@filtresUV` (377) est aussi satisfait, pour la catégorie sunscreen seulement, par le drapeau `filtresUV` du catalogue. Ligne `actifs` de la grille solaire : plafond 8 → 4 (219). Un solaire sans aucun filtre reconnu ⇒ non évaluable (B4).

**Soutien.** 3/3 (D1 = P2 + P3 = S8), réserve dermato intégrée.

**Effet mesuré.** Médiane des solaires 64,5 → 74, verts 20,7 → 42,6 %, rouges 10,3 → 0,4 %. Vanicream Facial Moisturizer Mineral SPF 30 68 → 82, Cetaphil Sheer Mineral 65 → 80, Avène Mineral SPF 50 58 → 77, Anthelios Melt-in Milk 74 → 74, Neutrogena Hydro Boost HA Moisturizer SPF 50 73 → 75. 11 solaires sans aucun nom de filtre dans leur INCI (listes US amputées) → non évaluables.

**Effet de bord.** Anthelios Mineral Tinted reste non évaluable (60 si noté) : son dioxyde de titane manque dans l'INCI, donnée à réparer.

### B2 — DONNÉES · « Parfum » ne veut pas dire conservateur, et « Perfume » veut dire parfum

**Pour l'utilisatrice.** Un produit conservé à l'alcool benzylique n'est plus présenté comme parfumé ; une marque qui écrit « Perfume » ou « Aroma » ne contourne plus le malus.

**Règle.** `BENZYL ALCOHOL`, `PHENETHYL ALCOHOL`, `PHENYLPROPANOL`, `4-T-BUTYLCYCLOHEXANOL`, `BENZOIC ACID` → `fragrance: false` (on garde `euFragranceAllergen` et le niveau sensibilisant). Au parsing (312-313), tout jeton contenant PARFUM | FRAGRANCE | PERFUME | AROMA (hors AROMATIC) → `FRAGRANCE`. Revue des 76 fiches `fragrance: true` qui ne sont ni allergène UE ni huile essentielle.

**Soutien.** 3/3.

**Effet mesuré.** TO Caffeine 5 % 49 → 71, Cicalfate+ sérum 54 → 67, Effaclar Clarifying 45 → 62 (son seul « parfum » était l'alcool benzylique). Triche « + Perfume » sur TO Niacinamide : 78 → 66 (fermée).

### B3 — DONNÉES · Dictionnaire : les fiches qui faussent la mécanique

**Pour l'utilisatrice.** La même molécule écrite de deux façons reçoit la même note ; le propylène glycol cesse d'être compté comme un irritant fort ; le rétinoïde de l'Effaclar Adapalene est reconnu ; l'hamamélis n'est plus un actif anti-rougeurs de premier rang.

**Règle.** `PROPYLENE GLYCOL` irritant 2 → 1, sensibilisant 1 → 2 ; `TRICLOSAN` irritant 3 → 1 + `restreintUE` ; `ADAPALENE` `lowDose: true` ; `MENTHOL` strength 1 → 0 + `lowDose: true` ; `NIACINAMIDE` benefits complétés (spots, redness, barrier) ; `AZELAIC ACID` + redness ; les 13 fiches hamamélis (`HAMAMELIS VIRGINIANA …`, `WITCH HAZEL`) : **power 1, irritant 1, `redness` conservé** (effet anti-érythème modeste documenté ; réserve dermato) ; hyaluronates (`SODIUM HYALURONATE`, `HYALURONIC ACID`, hydrolysés, cross-polymères, 15 fiches) : `lowDose: true` ; `LECITHIN`, `HYDROGENATED LECITHIN`, `DILINOLEIC ACID/BUTANEDIOL COPOLYMER` sortent de `lipide-barriere` (→ emollient) ; `GLYCERIN (VEGETABLE …)` power 3 → 2 ; `1,3-PROPANEDIOL` et `1,2-HEPTANEDIOL` : role `support` **et** fonction `humectant` (réserve dermato) ; entrée inversée `ETANORULAYH MUIDOS` supprimée ; canonicalisation au parsing des parenthèses botaniques (« (GREEN TEA) », « (NANO) ») vers la fiche de base (92 doublons divergents). Pas de rapprochement flou.

**Soutien.** 3/3, réserves intégrées. Les synonymes vrais (Ceramide NP / Ceramide 3, Tocopherol / Vitamin E, Hyaluronic Acid / Sodium Hyaluronate) ne sont pas couverts par cette canonicalisation : section D.

**Effet mesuré.** PG : 267 produits, Vanicream Moisturizing Cream 66 → 70. Adapalène reconnu : LRP Effaclar Adapalene 47 → 78, Differin 62 → 78. Thayers, profil rougeurs : 87 → 79 (hamamélis +10 → +3,5). Hyaluronate `lowDose` : CeraVe Hydrating 69 → 72, effet de bord en D.

### B4 — DONNÉES · Catalogue : bonus UV crédible seulement, et « non évaluable » plutôt qu'une fausse note

**Pour l'utilisatrice.** Une crème qui ne contient pas de vrai filtre solaire ne lui dit plus « ça vous protège des UV » ; une liste d'ingrédients trop courte ou tronquée ne reçoit pas une note rassurante ; une catégorie devinée par le scan donne une note marquée « provisoire ».

**Règle.** (a) Hors catégorie sunscreen, `filtresUV` seulement si un filtre organique reconnu est en position ≤ 8 OU si le nom, **débarrassé de la marque, contient SPF / FPS / UV / Sun comme mot entier** (SUNDAY RILEY, SUNGBOON, « with Sunflower » ne comptent pas — réserve produit) ; l'oxyde de zinc ou le dioxyde de titane seuls ne valent jamais un SPF (`categorise.mjs:105`, champ `filtresUV`). (b) Non évaluable si : solaire sans aucun filtre reconnu ; OU liste de 5 ingrédients ou moins avec un ingrédient inconnu ou sans base en position 1 (eau, huile, beurre, cire, alcool, glycol, silicone, squalane, tensioactif, argile, actif OTC américain…) ; OU `lecture.partielle` renvoyée par la vision. Une liste de 1 à 3 ingrédients tous connus avec une base en tête est notée avec le badge « formule minimaliste ». Badge « analyse partielle » (sans exclusion) si la couverture dictionnaire du top 10 est < 0,8 ou si la position 1 n'est pas une base. Scan avec catégorie non « sûre » : **note affichée comme provisoire, non modifiée** (réserve produit). Grille `indetermine` : ligne `actifs` 20 → 14 ; catégorie incertaine au scan : noter sur les deux grilles les mieux votées et garder le minimum.

**Soutien.** 3/3, réserves produit intégrées.

**Arbitrage des seuils (mesuré).** Règle « n < 8 ∨ couverture < 0,7 » (stat) excluait 126 produits dont Serozinc, les patchs Effaclar et Drunk Elephant A-Gloei (92) : rejetée. Les règles produit et dermato convergent : 65 produits (2,2 %), moyenne actuelle 50,7, 6 verts ; 4 étalons exclus, tous légitimes (Avène Tolérance Foaming à la liste amputée, Anthelios UV Hydra et Mineral Tinted sans filtre dans l'INCI, le spray Avène Thermal Spring Water au jeton non reconnu → alias G1).

**Effet mesuré.** (a) 92 non-solaires portaient le drapeau : 48 ont un vrai filtre organique haut placé, 43 portent SPF au nom, **32 n'ont ni l'un ni l'autre** (13 avec ZnO/TiO2 en traces, 19 du type Cicalfate) et perdent +8 et la phrase « you skip sunscreen ». Cicalfate+ crème 77 → 70. (b) 65 produits sortent de la notation, 2 851 restent notés.

### B5 — RÈGLE · Perso : parfum, huiles essentielles et allergènes comptés une seule fois

**Pour l'utilisatrice.** Une peau réactive voit une seule ligne « parfum » par produit, et une marque transparente n'est plus punie huit fois quand une marque opaque l'est une fois.

**Règle.** Dans `scorePerso`, sortir de la boucle par ingrédient (601-605, 615-618) : une ligne parfum = −4 × sensibilité × exposition, une ligne HE = −8, une fois par produit. Exposition appliquée au malus perso, pas au mérite formule (arbitrage 6). Le mérite `sansParfum` et le malus fixe formule (511-529) sont conservés, et leur somme (12 à 23 points) est documentée comme UN poids voulu, affiché en une ligne du Why.

**Soutien.** 3/3. Réserve dermato : le coût formule du parfum reste −13 en rincé contre −14 en posé alors que les seuils UE de déclaration sont ×10 ; l'exposition sur le mérite (D10 initial) a été rejetée par la mesure (nettoyants sans parfum −2 à −3, verts des nettoyants 19,6 → 14,9 %) ; le point est reporté à B11 avec compensation de budget (section D).

**Effet mesuré.** Sensibilité 3 : produits au plancher 5 : 15,2 → 0,2 %, écart moyen −15,9 → −6,6. Crème + 6 allergènes déclarés, perso sens3 : 5 → 49 (opaque « Parfum » : 57). Weleda Skin Food Face Care (US, 4 allergènes), perso sèche réactive : 19 → 51. Dermalogica Retinol Serum (7 drapeaux parfum) : 5 → 44.

### B6 — RÈGLE · Nettoyants et démaquillants : la douceur n'est pas un tensioactif

**Pour l'utilisatrice.** Un lait, une crème lavante ou une eau micellaire ne sont plus punis « pas d'agent lavant doux ».

**Règle.** Prérequis `douceur` du nettoyant (139) : satisfait si `tensioactif-doux`, OU (émollient / émulsifiant / occlusif présents ET aucun `tensioactif-agressif` ET pas `@savon`). Prérequis `dissout` du démaquillant (153) accepte `emulsifiant`. Fonction `tensioactif-doux` ajoutée à `PEG-6 CAPRYLIC/CAPRIC GLYCERIDES`, `POLOXAMER 184/188`, `PEG-40 HYDROGENATED CASTOR OIL`, `SODIUM LAUROYL LACTYLATE`, `POLYSORBATE 20`, `DISODIUM COCOAMPHODIACETATE`.

**Soutien.** 3/3.

**Effet mesuré.** CeraVe Hydrating 59 → 72 (perso sèche réactive 59 → 88), Toleriane Milky 58 → 70, Sensibio H2O 64 → 77, Toleriane Eau Micellaire (fiche FR) 70 → 82, Cetaphil Cleansing Milk 37 → 39 (garde son SLS), savon Urban Hydration 29 → 32 (garde `douceur` manquante et `@savon`). Triche « un glucoside à 0,5 % pour +12 » fermée.

**Effet de bord.** Toleriane Purifying Foaming 75 → 72 (redistribution de la grille, voir B11).

### B7 — RÈGLE · Une seule règle de comptage des actifs

**Pour l'utilisatrice.** Un sérum est jugé sur ses actifs réellement dosés ; un mono-actif concentré n'est plus « trop peu », quinze traces ne valent plus quinze actifs, un ingrédient écrit deux fois ne compte qu'une fois, et un rétinol compte à plein tarif quelle que soit sa place dans la liste.

**Règle.** (1) Dédoublonnage par nom, première occurrence gardée, dans `evalueLigne` (385-420), `@actifs` et `@troisActifs` (378). (2) Un actif compte dans `@actifs`, `richesse` et le prérequis s'il est **bien placé** : w(pos) ≥ 0,6 (positions 1-10 au-dessus de la barre des 1 %) ou `lowDose`. (3) Prérequis sérum / traitement : « au moins UN actif power ≥ 2 bien placé, hors glycols de base (glycérine, butylène/propylène/pentylène glycol, propanediol, hexanediol…), OU un humectant actif **`lowDose`** (hyaluronates) à toute position » — panthénol et bétaïne, dosés 1-5 %, ne comptent que bien placés (réserve dermato) ; masques : règle actuelle. (4) `@actifTop5` (372-373) = meilleur actif power 3, **gradué par w(pos)** (1 / 0,6 / 0,3) au lieu de 1/0. (5) **`lowDose` → w = 1 quelle que soit la position** (326-331 inchangé) : veto dermato intégré, la clause « 0,6 au-delà de la position 10 ou de la barre » est retirée. (6) Lignes `antiox` et `lipides` pondérées par la position dans toutes les grilles (169-170, 181, 192, 218, 240-241), comme dans la grille hydratant (189).

**Soutien.** (1), (2), (4), (6) : 3/3. (3) : arbitrage 2 puis réserve dermato intégrée. (5) : veto dermato, accepté par les deux autres.

**Arbitrage 2 (mesuré).** « Power 3 en top 5 ou lowDose » (stat) fait échouer Vichy Minéral 89 (63 → 51) et 32 % des masques : rejeté. « Power ≥ 2 à w ≥ 0,6 » (dermato, littéral) est satisfait par la glycérine dans 93,7 % des sérums : rejeté. La variante du produit (hors glycols, ou humectant actif), restreinte aux humectants `lowDose` : Vichy Minéral 89 63 → 63 (ok), Drunk Elephant B-Hydra 67 → 68 (ok), TO Niacinamide 66 → 78, échecs sérum 4,3 → 5,5 %, masques inchangés, « eau + glycérine + gomme » reste en échec (50).

**Veto (5), mesuré.** Sur les 252 occurrences de rétinoïdes `lowDose` du catalogue, 198 (79 %) sont au-delà de la position 10 ou de la barre : la clause 0,6 rétrogradait le cas normal. Re-mesure v2 : les 175 produits notés dont le rétinoïde est au-delà de la position 10 ou de la barre passent de 69,2 (clause 0,6) à 69,9 (w = 1 partout), +0,7 en moyenne, +8 au maximum, 48 produits changent. Estée Lauder ANR 64 → 67, Paula's Choice 1 % Retinol 84 → 86.

**Effet mesuré.** TO Niacinamide 66 → 78, LRP Effaclar Adapalene 47 → 78, PC 1 % Retinol 76 → 86, sérum rétinol en position 8 (construit) 68 → 82, Paula's Choice Resist Pure Radiance 92 → 90, SKIN1004 Centella Ampoule (7 ingrédients) 53 → 65. Sérums « soupe » : ANUA 92 → 86, VT PDRN 92 → 86 ; Bubble Day Dream reste 92 (ses actifs sont en tête). Triches sur TO Niacinamide : « +3 actifs après le conservateur » 81 → 81 (+3 au lieu de +15 : le hyaluronate `lowDose` compte à plein), « +8 extraits en queue » 86 → 83 (+5), « +céramide + tocophérol en queue » 90 → 81 (+3) — sans (6), ces deux dernières valaient +5 et +10. Doublons : 264 produits gagnants → 0. Falaise « monter un actif de la position 6 à la 5 » : gain moyen 10,9 → 4,0 points.

**Effet de bord.** Résiduel « Retinol en dernière position » : +4 sur TO Niacinamide (78 → 82), **+12 sur un sérum peptides sans actif fort en top 5 (70 → 82 = un rétinol honnête en position 4)** ; accepté par les trois, chiffré en D. Le hyaluronate `lowDose` rouvre une trace à +3 (D).

### B8 — RÈGLE · Le premier actif irritant bien dosé ne coûte rien, les suivants coûtent plein tarif

**Pour l'utilisatrice.** Un sérum au rétinol ou un exfoliant à l'acide n'est plus puni pour l'irritation normale de son actif, mais empiler plusieurs actifs irritants sans tampon reste sanctionné.

**Règle.** Dans la boucle des risques (497-509), pour `role: active`, `benefitPower ≥ 2`, `irritant = 2` et bien placé (w ≥ 0,6 ou `lowDose`) : le premier de la liste ne prend pas le malus générique ; à partir du deuxième, malus plein. Le malus comédogène et les non-actifs sont inchangés.

**Soutien.** Arbitrage 1 (trois versions) :

| variante | peel sans tampon (construit) | TO AHA 30 % + BHA 2 % | PC 25 % AHA peel | Dr Dennis Gross Extra Strength | PC 2 % BHA | rétinol pos 8 | Adapalène | 136 produits à ≥ 2 actifs irritants dosés : % verts |
|---|---|---|---|---|---|---|---|---|
| aucune exemption | 64 | 70 | 62 | 27 | 80 | 78 | 74 | 22,8 |
| S5 plein (stat) | **77 vert** (grasse 97) | 80 | 77 | 44 | 84 | 82 | 78 | **53,7** |
| demi-tarif (produit) | 70 | 75 | 69 | 35 | 82 | 80 | 76 | 41,2 |
| **premier gratuit (dermato)** | **68** (grasse 88) | 75 | 66 | 32 | 84 | 82 | 78 | 39,7 |

S5 plein rendait le peel sans tampon vert et faisait passer les 136 formules à empilement de 23 à 54 % de verts. Le demi-tarif laissait un rétinol seul facturé −2. « Premier gratuit » donne le même résultat que S5 plein sur les mono-actifs et garde la sanction de l'empilement. La ligne `tampon` de la grille exfoliant fait déjà son travail (peel avec tampon 82 contre sans 68).

**Effet mesuré.** Ajouter du rétinol à un sérum ne baisse plus la note que dans 14 % des cas (un autre actif irritant déjà présent) contre 78 % avant ; exfoliants verts 19,8 → 28,3 %.

**Effet de bord.** The Ordinary AHA 30 % + BHA 2 % passe à 75, vert de justesse : un peel à 30 % ne devrait pas être vert. Réserve produit acceptée : à traiter aux bandes (B11), pas en rouvrant B8. Effaclar Clarifying (alcool en position 2, deux acides) : 45 → 62 ; peau grasse non sensible 82 (section D).

### B9 — RÈGLE · Les plafonds : comédogénicité hors formule, ingrédients interdits plafonnés selon leur portée, plafond respecté en perso

**Pour l'utilisatrice.** Une huile en trace ne bloque plus une crème sous « jamais vert » ; un produit contenant un ingrédient interdit dans l'Union européenne ne peut plus être noté comme acceptable, rincé ou non quand l'interdiction est totale ; et la note perso ne peut plus dépasser un plafond posé par la formule.

**Règle.** `grav = irritant` seul (497), la comédogénicité ne pèse plus en formule. Nouveau champ dictionnaire **`banniUEPortee: "tous" | "pose"`** (veto dermato) : Lilial (`BUTYLPHENYL METHYLPROPIONAL`, CMR 1B, Règl. (UE) 2021/1902, interdit partout depuis le 1er mars 2022), Lyral (`HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE`, Règl. (UE) 2017/1410) et hydroquinone → **plafond 45 quelle que soit l'exposition** ; méthylisothiazolinone (Règl. (UE) 2016/1198 posé, 2017/1224 rincé 15 ppm) → plafond 45 si `exposition ≥ 1`, sinon malus −5 × exposition. `sensibilisant 3` hors parfum/HE → −5 × sévérité × exposition en formule. `scoreFormule` renvoie `cap` et `scorePerso` applique `min(score, capAbsolu, F.cap)` (681). Une ligne `{type: "plafond"}` dans `details` explique l'écart.

**Soutien.** D4 3/3 ; S3 3/3 ; niveau 45 : arbitrage 5 (sur les 15 produits bannis posés, aucun n'est au-dessus de 69, un plafond 69 était une règle sans effet ; 45 en abaisse 10) ; portée : veto dermato intégré, accepté par le produit (l'exception rincé pour la MI répond à son objection).

**Effet mesuré.** D4 : 299 produits +2,6 en moyenne (max +12), 0 baisse ; plafonnés par la comédogénicité 14 → 0 ; ELEMIS Naked Cleansing Balm 69 → 81, Paula's Choice Skin Balancing 69 → 80. Bannis : 19 produits plafonnés (14 posés + 5 rincés à portée « tous »), 0 dépassement en perso. Les 5 rincés cités par le dermato : Jack Black Face Buff 31 (déjà sous 45), Lancôme Galatée Confort 55 → 45, Jack Black All-Over Wash 49 → 45, Nip + Fab Glycolic Night Pads 55 → 45, Paula's Choice Triple-Action Dark Spot (exfoliant, hydroquinone) 49 → 45. Clinique For Men Face Scrub (MI, rincé) 73 → 63, pas 45.

### B10 — RÈGLE · La note perso lit la dose et distingue « peau réactive » d'« allergie »

**Pour l'utilisatrice.** Une peau réactive est avertie de ce qui pique (menthol, alcool, acides mal dosés), pas des allergènes rares ; un acide en position 30 ne déclenche plus « trop fort pour vous » ; une eau micellaire n'est plus « pas assez nourrissante » ; et les actifs à preuve faible rapportent moins de points.

**Règle.** (a) Canal irritant, sensibilité S > 0 : −2 × irritant × S/3 × w × exposition, **irritant 2 seulement**, hors actifs à `strength ≥ 1`, alcool, parfum, HE et sulfates, plafond −10 × S/3, libellé « may sting on reactive skin ». Sensibilisants 1-2 : −1 × niveau × S/3 × w × exposition, plafond −8 × S/3, libellé gradué (« listed contact allergen ») ; plein tarif seulement sur allergie déclarée. Alcool desséchant : ligne aussi pour S ≥ 2. (b) Comédogène : ≥ 4 partout ou ≥ 3 en top 5, si `skinType` grasse/mixte OU préoccupation imperfections/brillance, −3 × w, plafond −6. (c) `strengthMax` / `forceMax` (561, 353) sur les seuls ingrédients à w ≥ 0,6 ou `lowDose` ; alcool × w(pos) (611) ; les deux lignes force (624-629 et 672-675) fusionnées : −5 par cran, +5 si acide posé et S ≥ 2. (d) Texture : aucune adéquation si `exposition < 1` ; « légère » seulement sur hydratant et contour des yeux ; richesse par classes (beurre/cire/pétrolatum/lanoline 1, huile 0,7, ester/CCT/squalane/alcane 0,3, stéarates d'émulsifiants 0) avec `seuilRiche` 8 → 4 et `seuilLegere` 2 → 1,5 (336-357, 63-68). (e) Matchs perso × benefitPower/3 (581). (f) Allergies déclarées : correspondance par famille canonique et jeton entier, jamais par sous-chaîne (568) ; sortir alcool benzylique, benzoate de benzyle, acide benzoïque et menthol du groupe « parfum » du quiz.

**Soutien.** 3/3 sur chaque point après arbitrages : (a) D8 restreint à irritant 2 (tel qu'écrit, il aggravait les sensibles, −14,2 → −16,2, et baissait les nettoyants doux 46 → 45 ; restreint : 46 → 51) ; (b) variante produit (la version « préoccupation seule » supprimait 304 → 0 lignes pour une peau grasse sans préoccupation ; Mixa 51, Effaclar Duo+M 94 au lieu de 97) ; (e) × power/3 (écart 0,8 point avec la variante du stat).

**Effet mesuré.** Peau sèche réactive : écart −10,2 → +0,2, rouges 34,8 → 18,3 %, verts 33,5 → 41,8 %. Sensibio, sèche réactive 59 → 78 ; Effaclar Duo+M 74 → 98 ; Dermalogica Precleanse, peau grasse 47 → 59 ; 249 hydratants légers cessent d'être « heavy for your oily skin » ; Thayers, profil rougeurs 87 → 79 ; profil âge, produits à 100 : 6,3 → 3,2 %.

**Effet de bord.** Peau grasse acnéique : écart +7,1 → +4,5, verts 47,6 → 41,7 % ; voulu.

### B11 — RECALIBRATION · Équité entre familles, parfum rincé, bandes des peels (ouvert, en dernier)

**Pour l'utilisatrice.** Ses nettoyants ne doivent pas paraître « moins bons » que ses sérums par construction ; un parfum dans un produit rincé doit coûter moins que dans une crème posée ; un peel à 30 % ne doit pas être vert.

**Constat après paquet v2.** Verts par famille : nettoyants 20,8 %, masques 21,3 %, toniques 25,4 %, hydratants 27,6 % contre solaires 42,6 %, traitements 42,0 %, contour des yeux 44,8 %. Les hydratants perdent 8 points de verts. Cause mécanique (S9) : la normalisation par la somme des plafonds suppose un poids de position 1 pour chaque élément, mais il n'y a que 5 places en top 5 ; les prérequis sont en points bruts (−10 à −25) alors que les mérites sont normalisés. Parfum : −13 en rincé contre −14 en posé (mérite `sansParfum` non pondéré par l'exposition), contraire aux seuils UE ×10. TO AHA 30 % + BHA 2 % à 75.

**Prochaine étape.** Après B1-B10 : max de grille **atteignable** (calcul analytique, pas empirique), prérequis exprimés en part du budget, mérite `sansParfum` pondéré par `exposition` **avec compensation du budget de la grille** (pour ne pas reproduire la baisse des nettoyants sans parfum qui a fait rejeter D10), puis bandes / `budgetMetier` revus sur les étalons, dont les peels à ≥ 25 %. 3/3.

---

## C. Ce qui a été rejeté, avec le chiffre qui l'a tué

| proposition | rejetée par | le chiffre |
|---|---|---|
| **S2 / V1** — supprimer le mérite `sansParfum` (stat) | produit + stat (retirée par son auteur) | Références sans parfum en baisse par normalisation : CeraVe Hydrating 59 → 52, Sensibio 64 → 58, Dermallergo 69 → 63 ; parfumés verts 1,8 → 10,4 % ; traitements rouges 3 → 23 %. |
| **D10 côté formule** — mérite `sansParfum` × exposition | produit + stat (dermato l'avait retirée) | Verts des nettoyants 19,6 → 14,9 % ; CeraVe −3, Cetaphil Gentle −3, Sensibio −2. Reporté à B11 avec compensation de budget. |
| **S5 plein** — aucun malus d'irritance sur un actif power 3 | dermato + produit | Peel sans tampon 64 → 77 (vert), 97 pour une peau grasse ; 136 formules à empilement 23 → 54 % de verts. |
| **S5 demi-tarif** | dermato + stat | Un rétinol seul reste facturé −2 ; ajouter du rétinol baisse encore 25 % des sérums. |
| **D6 littéral** — prérequis « power ≥ 2 à w ≥ 0,6 » | produit + stat | 93,7 % des sérums le passent grâce à la glycérine (power 2). |
| **MONO** — prérequis « power 3 en top 5 ou lowDose » (stat) | produit + dermato | Vichy Minéral 89 63 → 51 ; 32 % des masques en échec. |
| **Clause humectant « à toute position » sans `lowDose`** (produit, D6d littéral) | dermato | Panthénol et bétaïne sont dosés 1-5 % ; sous la barre, ce sont des traces. Restreinte aux hyaluronates `lowDose` : Vichy et B-Hydra passent toujours, échecs sérum 4,7 → 5,5 %. |
| **`lowDose` à w = 0,6 au-delà de la position 10 ou de la barre** (produit LD10, stat P6d) | **veto dermato** | 198 des 252 rétinoïdes du catalogue sont là ; 175 produits notés perdaient 0,7 en moyenne et jusqu'à 8. |
| **D8 tel qu'écrit** — canal irritant dès le niveau 1 | produit + stat | Sensibles : écart −14,2 → −16,2 ; nettoyants doux 46 → 45 ; « Butylene glycol may sting » sur Dermallergo. |
| **D4 perso « préoccupation seule »** | produit + stat | 304 → 0 ligne comédogène pour une peau grasse sans préoccupation cochée ; Mixa (IPP + IPM en top 5) +6 sans avertissement. |
| **Plafond 69 sur banni UE** (produit) | dermato + stat | 0 des 15 produits bannis posés n'est au-dessus de 69 : règle sans effet. |
| **Ban traité « posé seulement » pour tous les ingrédients** (v1 du rapport) | **veto dermato** | Lilial, Lyral, hydroquinone sont interdits rincés compris ; 5 produits rincés prenaient −2,75 à −4,25 au lieu du plafond. |
| **Règle « non évaluable » n < 8 ∨ couverture < 0,7** (stat) | produit + dermato | 126 produits exclus dont Serozinc, patchs Effaclar, Drunk Elephant A-Gloei (92). |
| **S7 « n < 12 ⇒ analyse partielle »** (stat) | produit + dermato | 15 étalons complets et courts sur 49 marqués partiels. |
| **« Jamais vert si catégorie non sûre »** (stat, v1) | produit | Modifier la note masque l'incertitude ; afficher « provisoire » l'expose. |
| **S7 prérequis `@humectant` sur la grille indéterminée** (stat) | dermato + produit | Une huile pure ou un baume anhydre n'en ont pas. |
| **S8(1)** — drapeau `filtresUV` du catalogue accepté hors solaire | dermato + stat | Faux sur 32 non-solaires. |
| **P9 clause « ZnO/TiO2 en positions 1-6 »** | dermato + stat | Conserve le bonus de 19 produits du type Cicalfate. |
| **« SPF/UV/Sun » par sous-chaîne dans le nom** (v1) | produit | SUNDAY RILEY, SUNGBOON, « with Sunflower » ; mot entier hors marque. |
| **P6(c)** — décroissance au-delà de 4 actifs | dermato + stat | Inutile après pondération des lignes ; créerait une non-monotonie. |
| **P11 rapprochement flou** (Levenshtein ≤ 2) | dermato + stat | retinol / retinal à distance 1. |
| **× (1+power)/4** (stat) | produit + dermato | Écart 0,8 point avec × power/3. |
| **Hamamélis sans `redness`** (stat, v1) | dermato | Effet anti-érythème modeste documenté ; power 1 + irritant 1 suffisent (Thayers rougeurs 87 → 79). |
| **`TRIS-BIPHENYL TRIAZINE` uva + uvb** (v1) | dermato | Tinosorb A2B couvre UVB + UVA2, pas l'UVA1. |
| **D12 tel qu'écrit** — cap grossesse seulement si w ≥ 0,6 ou lowDose | stat (mesure) | Tous les rétinoïdes sont `lowDose` : 219 des 226 produits plafonnés resteraient à 15. |
| **Recalibrer B11 avant les données** | 3/3 | Les biais de données seraient gelés dans les poids. |
| **S10 chiffré « alcohol → 42 % du catalogue »** (stat) | produit | Le profil v1 n'a pas de texte libre ; le vrai chiffre est 44 % via le groupe « parfum » du quiz, dont 68 à tort. |

---

## D. Ce qui reste ouvert, et la prochaine étape

| sujet | état mesuré (paquet v2) | prochaine étape |
|---|---|---|
| **B11 — équité entre familles** | verts : nettoyants 20,8 %, masques 21,3 %, toniques 25,4 %, hydratants 27,6 % vs yeux 44,8 %, solaires 42,6 %, traitements 42,0 % | Max atteignable par grille (analytique), prérequis en part du budget, bandes revues sur les étalons. |
| **Parfum en rincé −13 contre posé −14** (dermato) | mérite `sansParfum` non pondéré ; seuils UE ×10 | B11 : mérite × `exposition` avec compensation du budget de la grille. |
| **Résiduel « Retinol en dernière position »** (veto B7-5) | TO Niacinamide 78 → 82 (+4) ; sérum peptides sans actif fort en top 5 70 → 82 (+12 = un rétinol honnête en position 4). Prix inverse de la clause retirée : 175 rétinols réels +0,7 en moyenne, +8 max | Accepté par les trois. Surveiller ; lire le % déclaré quand il figure sur l'étiquette. |
| **Hyaluronate `lowDose` rouvre une trace** (réserve dermato B7-3) | « +3 actifs après le conservateur » sur TO Niacinamide : 0 → +3 (le hyaluronate ajouté compte à plein) | Accepté (même logique que le rétinol) ; à surveiller avec le résiduel ci-dessus. |
| **Portée des bans documentée au dictionnaire** (dermato) | 4 fiches `banniUE` sans champ de portée | `banniUEPortee` + référence réglementaire et date : Lilial 2021/1902 (2022), Lyral 2017/1410 (2021), MI 2016/1198 posé (2017) / 2017/1224 rincé 15 ppm (2018), hydroquinone annexe II. |
| **Triche « catégorie par le nom » au catalogue** (produit) | même INCI : CeraVe Hydrating 72 en nettoyant / **87** en démaquillant / 76 en indéterminé ; Vanicream Moisturizing Cream 70 en hydratant / **82** en démaquillant / 76 en indéterminé | Le « min des deux grilles » ne vaut que pour le scan ; au catalogue, le nom vote avec le poids 3 (`categorise.mjs`). Règle à définir : catégorie contredite par la composition (crème sans tensioactif classée démaquillant) → min des deux grilles ou badge. |
| **Eau thermale de marque en position 1 comptée comme actif** (produit) | sérum « Avene Thermal Spring Water (Avene Aqua) + glycérine + gomme » : **65** (prérequis satisfait par l'eau, power 2) contre 50 avec alias → WATER ; perso rougeurs 72 → 50 | Alias G1 : toutes les graphies et marques d'eau thermale (Avène, La Roche-Posay, Uriage, Vichy) → base eau, avant lecture. |
| **Synonymes vrais non canonicalisés** (produit) | Ceramide NP + Ceramide 3 : +3 mesuré par le produit sur une crème dont la ligne `lipides` n'est pas pleine ; 0 sur mon étalon (ligne saturée) | Table de synonymes (Ceramide 3 = NP, Vitamin E = Tocopherol, Hyaluronic Acid ≈ Sodium Hyaluronate) appliquée avant le dédoublonnage. |
| **Alcool dénaturé en position 2 d'un tonique** | Effaclar Clarifying 45 → 62 ; peau grasse non sensible 82 ; le malus alcool (6 × 1,2) pèse peu face aux acides | Relever `malusAlcoolTop5` à 8-10 en positions 1-3, ou malus × w(pos) continu ; mesurer. |
| **Falaises de position résiduelles** | « niacinamide ajoutée en tête » fait baisser 169 produits (165 avant) ; « eau en tête » en fait monter 98 (143 avant) | Le seuil w ≥ 0,6 (positions 10/11) est la nouvelle marche ; passer à un poids continu par position pour les actifs. |
| **Estée Lauder ANR 76 → 67** | actifs (ferment, extraits) sous la barre ; les peptides `lowDose` comptent désormais | Relecture dermato de `BIFIDA FERMENT LYSATE` (power 1 en position 2). |
| **Thayers Witch Hazel** | 69 → 69 ; profil rougeurs 87 → 79 après hamamélis power 1 | Réglé pour la note ; le libellé perso « targets your redness » sur un power 1 reste à modérer (B10 e). |
| **Weleda Skin Food** | fiche FR (sans « Parfum » dans l'INCI) 76 → 73 ; fiche US « Face Care Nourishing Day Cream » (4 allergènes, INCI avec fautes OCR « Cilycerin ») 55 → 49 ; fiche « Travel Size Clear 40 Count » corrompue (42) | Données : compléter la fiche FR, corriger l'OCR de la fiche US, retirer la fiche corrompue. |
| **Anthelios UV Hydra, Mineral Tinted, 11 solaires** | non évaluables (filtres absents des listes US) | Re-scraper la section « Active ingredients » des fiches US. |
| **Minimalistes : Serozinc, TO 100 % Squalane, eaux thermales** | Serozinc 53 avec « nothing here hydrates » (prérequis humectant du tonique) ; TO 100 % Plant-Derived Squalane (n = 1) non évaluable car le jeton « Pure Plant-derived Squalane » est inconnu, et resterait à 47 avec « nothing here draws in water » une fois reconnu ; spray Avène non évaluable (jeton eau thermale) | Alias (squalane, eaux thermales) ; badge « minimaliste » **et** prérequis `@humectant` levé quand n ≤ 3 ; grille « huile » pour les huiles pures. |
| **Hydratants −8 points de verts** | 35,5 → 27,6 % | Partie de B11 ; vérifier que la ligne `actifs` (plafond 10, pondérée) de la grille hydratant reste atteignable. |
| **D12 grossesse × dose** | 226 produits à 15, 171 avec le rétinoïde au-delà de la position 10 | Réécrire sur la position brute ; `pregnancyLevel 3` en fait informatif. |
| **Grille indéterminée « min des deux grilles »** | non simulée (votes du catégoriseur) | Implémenter puis mesurer sur le scan. |
| **Libellés du Why** | « a known contact allergen » pour un niveau 1 ; sept lignes « Fragrance » | Libellés gradués (B10) et fusion des lignes (B5) : à vérifier à l'écran. |

---

## E. Tableau final des étalons (v2)

Note actuelle (moteur original) → note sous le paquet v2 (formule | perso peau sèche réactive | perso peau grasse acnéique). Chaque ligne a été vérifiée contre le nom exact de la fiche du catalogue. « Attendu » = réputation dermatologique du rapport produit (formule). NE = non évaluable (entre parenthèses, la note qu'il aurait eue). [F] = formule construite.

| étalon (fiche exacte) | cat. | formule | sèche réactive | grasse acnéique | attendu | verdict |
|---|---|---|---|---|---|---|
| CeraVe Hydrating Facial Cleanser | nettoyant | 59 → **72** | 59 → 88 | 64 → 72 | 75-80 | mieux ; 3 pts sous l'attendu (B11) |
| LRP Toleriane Purifying Foaming | nettoyant | 75 → 72 | 71 → 82 | 83 → 75 | 75 | ok ; derrière CeraVe Hydrating pour la peau sèche, ordre attendu |
| LRP Toleriane Moisturizing Milky Cleanser | nettoyant | 58 → **70** | 67 → 77 | 58 → 70 | ~70 | corrigé |
| Cetaphil Gentle Skin Cleanser | nettoyant | 70 → 70 | 80 → 90 | 85 → 80 | 70 | ok |
| Cetaphil Cleansing Milk (SLS + parabènes) | nettoyant | 37 → 39 | 14 → 29 | 42 → 39 | 45-55 | sévère, défendable (SLS conservé) |
| Avène Tolerance Foaming Facial Cleanser (liste amputée) | nettoyant | 54 → **NE** (53) | | | — | données : INCI tronquée |
| NIVEA MEN Maximum Hydration Face Wash | nettoyant | 53 → 52 | 16 → 40 | 58 → 52 | 50 | ok ; plus de plancher pour la peau réactive |
| Urban Hydration Aloe Vera Face & Body Bar Soap | nettoyant | 29 → 32 | 27 → 33 | 28 → 31 | 30-40 | ok (savon et `douceur` conservés) |
| Oak Essentials Pure Gel Face Cleanser (19 composants parfumés) | nettoyant | 61 → 58 | 5 → 52 | 66 → 58 | 55 | corrigé côté perso |
| Clinique For Men Face Scrub (MI, rincé) | exfoliant | 73 → 63 | 45 → 43 | 79 → 69 | — | malus −5 rincé, pas de plafond : portée « pose » |
| Clinique For Men Charcoal Face Wash (MI, rincé) | nettoyant | 73 → 64 | 53 → 66 | 80 → 65 | — | idem |
| Bioderma Sensibio H2O | démaquillant | 64 → **77** | 59 → 78 | 69 → 77 | 75-80 | corrigé |
| LRP Toleriane Eau Micellaire Démaquillant (fiche FR) | démaquillant | 70 → **82** | 72 → 89 | 75 → 82 | 75-80 | corrigé |
| LRP Toleriane Micellar Cleansing Water (fiche US) | démaquillant | 58 → 58 | 44 → 58 | 63 → 58 | — | fiche US différente (poloxamer 184 sans fonction dans cette liste) : à vérifier |
| Dermalogica Precleanse Cleansing Oil | démaquillant | 59 → 59 | 5 → 49 | 47 → 59 | — | plus de « riche » sur un rincé |
| LRP Toleriane Double Repair | hydratant | 83 → 84 | 84 → 94 | 95 → 99 | 80 | ok |
| LRP Toleriane Dermallergo | hydratant | 69 → 72 | 100 → 89 | 54 → 57 | 80 | ok (le perso fait le reste) |
| LRP Toleriane Sensitive Riche | hydratant | 68 → 71 | 89 → 87 | 56 → 59 | — | reste « riche » (+6 sèche) après recalage des seuils |
| Avène Cicalfate+ Restorative Protective Cream | hydratant | 77 → 70 | 99 → 88 | 77 → 60 | 75-80 | perd le faux bonus UV (−8) ; 5 pts sous l'attendu |
| Avène Cicalfate+ Intensive Restorative Serum | sérum | 54 → **67** | 58 → 82 | 59 → 67 | 70 | corrigé (SymSitive ≠ parfum) |
| Vanicream Moisturizing Cream | hydratant | 66 → 70 | 67 → 78 | 66 → 58 | 75 | mieux (PG) ; « riche » pour la peau grasse : juste |
| VANICREAM Enhanced Moisturizer (HA + céramides) | hydratant | 87 → 87 | 100 → 100 | 87 → 92 | 85 | ok |
| Weleda Skin Food Face Care Nourishing Day Cream (US, 4 allergènes) | hydratant | 55 → 49 | 19 → 51 | 43 → 37 | 50-60 | ok côté perso ; formule −6 (POND, matchs) |
| Weleda Skin Food Crème de Jour nourrissante (FR, parfum absent de la fiche) | hydratant | 76 → 73 | 91 → 92 | 64 → 61 | 55 | **données** : compléter la fiche FR |
| Neutrogena Hydro Boost Water Gel | hydratant | 60 → 60 | 55 → 58 | 65 → 65 | 65 | ok |
| Mixa Soin Visage Nourrissant (IPP + IPM en top 5) | hydratant | 55 → 58 | 62 → 64 | 39 → 43 | — | peau grasse toujours avertie (plafond −6) |
| SimplyVital Face Moisturizer | hydratant | 61 → 69 | 73 → 71 | 44 → 52 | — | idem |
| CeraVe PM Facial Moisturizing Lotion | hydratant | 82 → 82 | 99 → 100 | 92 → 97 | — | ok |
| CeraVe Moisturizing Cream | hydratant | 91 → 88 | 100 → 100 | 91 → 88 | — | ok |
| Paula's Choice Skin Perfecting 2 % BHA Liquid | exfoliant | 80 → 84 | 53 → 69 | 95 → 94 | 80 | ok |
| The Ordinary AHA 30 % + BHA 2 % | exfoliant | 70 → 75 | 59 → 71 | 91 → 91 | 65-70 | vert de justesse → bandes (B11) |
| Paula's Choice 25 % AHA + 2 % BHA peel | exfoliant | 64 → 66 | 53 → 70 | 89 → 86 | — | ok |
| Dr. Dennis Gross Alpha Beta Extra Strength | exfoliant | 28 → 30 | 5 → 5 | 54 → 48 | — | rouge : 7 acides + alcool + rétinol |
| RoC Retinol Correxion 2-Step Peel Pads | exfoliant | 49 → 57 | 30 → 52 | 70 → 73 | — | ok |
| [F] peel sans tampon | exfoliant | 64 → 68 | 46 → 63 | 89 → 88 | < 75 | orange : objection produit levée |
| [F] peel avec tampon | exfoliant | 77 → 82 | 73 → 84 | 98 → 98 | — | la ligne `tampon` fait +14 |
| **LRP Effaclar Adapalene Gel 0,1 %** | traitement | **47 → 78** | 35 → 56 | 52 → 88 | 85 | corrigé (« USP 0.1% » normalisé, `lowDose`, premier irritant gratuit) |
| Differin Adapalene 0,1 % Gel (adapalène déjà lisible) | traitement | 62 → 78 | 25 → 56 | 77 → 88 | 85 | corrigé |
| LRP Effaclar Duo+M | traitement | 79 → 82 | 74 → 98 | 90 → 93 | 80 | ok |
| LRP Effaclar BPO | traitement | 79 → 82 | 57 → 73 | 94 → 92 | 80 | ok |
| LRP Effaclar Multi-Target Blemish Patches | traitement | 53 → 63 | 53 → 68 | 58 → 63 | — | noté (minimaliste), pas exclu |
| LRP Effaclar Micro-Exfoliating Astringent Toner (alcool) | tonique | 37 → 41 | 14 → 28 | 45 → 43 | 35 | ok |
| LRP Effaclar Clarifying Solution (alcool pos 2 + acides + menthol) | tonique | 45 → 62 | 6 → 38 | 70 → 82 | 55 | **à surveiller** : alcool en position 2 sous-pesé (D) |
| Thayers Alcohol-Free Witch Hazel Facial Toner | tonique | 69 → 69 | 86 → 84 | 81 → 71 | 60 | profil rougeurs 87 → 79 (hamamélis power 1) ; formule inchangée |
| LRP Serozinc | tonique | 53 → 53 | 46 → 53 | 65 → 55 | — | « minimaliste » ; prérequis humectant à lever (D) |
| Avène Thermal Spring Water (spray, n = 2) | tonique | 51 → **NE** (51) | | | — | jeton « (Avène Thermal Spring Water) » inconnu → alias (D) |
| The Ordinary Niacinamide 10 % + Zinc 1 % | sérum | 66 → **78** | 57 → 84 | 88 → 93 | 75 | corrigé |
| Vichy Minéral 89 | sérum | 63 → 63 | 75 → 73 | 68 → 63 | 65 | ok (hyaluronate `lowDose`) |
| Drunk Elephant B-Hydra | sérum | 67 → 68 | 83 → 81 | 82 → 74 | — | ok |
| Drunk Elephant A-Gloei Marula + Retinol Oil (5 ingrédients) | sérum | 88 → 92 | 100 → 99 | 76 → 80 | — | noté, pas exclu |
| Estée Lauder Advanced Night Repair | sérum | 76 → 67 | 85 → 78 | 83 → 68 | — | **à relire** (actifs sous la barre, D) |
| **SKIN1004 Madagascar Centella Ampoule (7 ingrédients)** | sérum | **53 → 65** | 61 → 76 | 58 → 65 | 65 | corrigé |
| SKIN1004 Centella Tea-Trica Relief Ampoule (23 ingrédients) | sérum | 49 → 48 | 22 → 39 | 57 → 50 | — | ok (cocktail de traces) |
| Dermalogica Dynamic Skin Retinol Serum | sérum | 56 → 64 | 5 → 44 | 56 → 64 | 70 | mieux ; 7 composants parfumés |
| Paula's Choice 1 % Retinol Treatment | sérum | 76 → 86 | 85 → 94 | 79 → 87 | — | corrigé (rétinol w = 1) |
| [F] sérum rétinol en position 8 | sérum | 68 → 82 | 64 → 78 | 68 → 82 | — | le rétinol ne coûte plus rien |
| [F] sérum peptides sans rétinol | sérum | 70 → 70 | 83 → 87 | 75 → 70 | — | référence du résiduel |
| [F] sérum peptides + Retinol en dernière position | sérum | 66 → 82 | 69 → 89 | 71 → 82 | — | résiduel +12 accepté (D) |
| ANUA Niacinamide 10 TXA 4 / VT PDRN Glow Ampoule / PC Resist Pure Radiance | sérum | 92 → 86 / 86 / 90 | 100 → 100 | 100 → 97-100 | 80-85 | mieux ; Bubble Day Dream reste 92 (actifs en tête) |
| [F] eau + glycérine + gomme | sérum | 50 → 50 | 52 → 57 | 55 → 50 | < 55 | échec du prérequis conservé |
| [F] sérum eau thermale de marque + glycérine + gomme | sérum | 53 → 65 | 62 → 76 | 58 → 65 | < 55 | **triche ouverte** (D) : 50 avec l'alias |
| The Ordinary Caffeine Solution 5 % + EGCG | contour des yeux | 49 → **71** | 46 → 77 | 54 → 76 | 70 | corrigé |
| The Ordinary 100 % Plant-Derived Squalane (n = 1) | hydratant | 47 → **NE** (47) | | | 65 | jeton « Pure Plant-derived Squalane » inconnu ; resterait à 47 (« nothing here draws in water ») → D |
| The Ordinary Squalane Cleanser (20 ingrédients) | démaquillant | 74 → 72 | 78 → 79 | 74 → 72 | — | ok |
| LRP Anthelios UV Hydra SPF 50 | solaire | 39 → **NE** (38) | | | 80+ | **données** : filtres absents de la liste US |
| LRP Anthelios Mineral Tinted Ultra Fluid SPF 50 | solaire | 33 → **NE** (60) | | | 75 | **données** : TiO2 absent de la liste |
| LRP Anthelios Melt-in Milk SPF 100 | solaire | 74 → 74 | 60 → 75 | 89 → 82 | 75 | ok |
| VANICREAM Facial Moisturizer Broad Spectrum Mineral SPF 30 | solaire | 68 → **82** | 82 → 93 | 75 → 89 | 80 | corrigé |
| Cetaphil Sheer Mineral Face Liquid Drops SPF 50 | solaire | 65 → **80** | 67 → 94 | 80 → 90 | 75 | corrigé |
| Avène Mineral Sunscreen SPF 50 | solaire | 58 → **77** | 64 → 94 | 65 → 84 | 75 | corrigé |
| Neutrogena Hydro Boost Hyaluronic Acid Moisturizer SPF 50 (sans parfum) | solaire | 73 → 75 | 60 → 79 | 85 → 82 | — | ok |
| Neutrogena Hydro Boost Water Gel Lotion Sunscreen SPF 50 (parfum + alcool) | solaire | 59 → 61 | 25 → 50 | 71 → 68 | 60 | ok |
| [F] gel nettoyant parfumé (SLES + 2 allergènes) | nettoyant | 42 → 42 | 5 → 33 | 47 → 42 | — | perso : une ligne parfum |
| [F] crème + « Parfum » (opaque) | hydratant | 66 → 64 | 64 → 59 | 76 → 79 | — | |
| [F] crème + Parfum + 6 allergènes (transparente) | hydratant | 58 → 56 | 5 → 51 | 68 → 71 | — | prime à l'opacité côté perso : 59 → 8 points |
| [F] crème Ceramide NP seul / + Ceramide 3 (synonyme) | hydratant | 80 / 80 | 100 → 90 | 80 → 85 | — | 0 ici (ligne `lipides` saturée) ; +3 sur une crème non saturée (mesure produit) → D |

Lecture : 17 étalons « corrigés », 5 en « données » (non évaluables ou fiche à compléter), 4 « à surveiller / relire » (Effaclar Clarifying, ANR, Weleda US, eau thermale), le reste stable et proche de l'attendu.

---

## F. Distribution finale (v2), monotonie, robustesse, plafonds

### Note formule, avant / après (2 916 produits avant ; 2 851 notés après, 65 non évaluables)

| | moy | méd | % vert (≥ 75) | % rouge (< 45) | max | nettoyant | démaq. | tonique | exfoliant | sérum | traitement | hydratant | yeux | solaire | masque |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **V0** | 65,0 | 66 | 26,9 | 7,0 | 94 | 63 | 64 | 66 | 59 | 69 | 66 | 69 | 73 | 64,5 | 66 |
| **final v2** | 66,0 | 68 | 30,9 | 5,9 | 92 | 63 | 65 | 65 | 59 | 70 | 70 | 68 | 74 | 74 | 67,5 |

Verts par famille, V0 → final : nettoyants 18,8 → 20,8 · démaquillants 21,9 → 29,0 · toniques 27,0 → 25,4 · exfoliants 19,8 → 28,3 · sérums 31,8 → 36,8 · traitements 26,9 → 42,0 · hydratants 35,5 → 27,6 · contour des yeux 37,1 → 44,8 · solaires 20,7 → 42,6 · masques 20,1 → 21,3.
Rouges par famille : nettoyants 8,6 → 5,5 · toniques 14,5 → 15,8 · exfoliants 20,9 → 18,1 · sérums 0,6 → 3,3 · traitements 3,8 → 3,5 · contour des yeux 13,3 → 10,5 · solaires 10,3 → 0,4 · masques 0 → 1,3 · démaquillants 0 → 0 · hydratants 2,2 → 2,6.
**Bandes** : 287 produits montent d'une bande, 180 en descendent, 2 384 gardent la leur (16,4 % changent de bande). **Notes** : 1 165 montent, 1 193 baissent, 493 sont inchangées ; écart moyen +0,6 ; 12,1 % bougent de 10 points ou plus. Aucun produit à 100 (max 92).

### Note perso, avant / après (produits notés)

| profil | écart moyen à la formule | p10 | % vert | % rouge | % au plancher 5 |
|---|---|---|---|---|---|
| sens3 (normale, sensibilité 3) | −15,9 → **−6,6** | −45 → −19 | 20,3 → 29,3 | 38,7 → 27,2 | 15,2 → **0,2** |
| sèche réactive | −10,2 → **+0,2** | −44 → −15 | 33,5 → 41,8 | 34,8 → 18,3 | 14,2 → **0,2** |
| grasse acnéique | +7,1 → +4,5 | −6 → 0 | 47,6 → 41,7 | 5,0 → 5,6 | 0 → 0 |
| normale, rides + taches | +3,4 → +5,1 | −11 → −2 | 45,4 → 45,1 | 14,2 → 6,4 | 0,9 → 0 |
| grasse, rides | +9,0 → +5,0 | −2 → 0 | 51,4 → 43,6 | 4,0 → 5,3 | 0 → 0 |
| rougeurs (sensibilité 2) | −11,0 → **−3,2** | −39 → −14 | 27,0 → 33,4 | 31,3 → 19,2 | 10,5 → 0,1 |

### Monotonie et robustesse (paquet v2, catalogue entier)

| test | V0 | final v2 |
|---|---|---|
| ajouter la niacinamide en fin de liste : produits dont la note baisse | 0 | **0** |
| ajouter « Parfum » en fin de liste : produits dont la note monte | 0 | **0** (coût moyen −14,2) |
| recopier les 5 premiers ingrédients en fin de liste (doublon) : produits qui gagnent | 264 | **0** |
| ajouter de l'eau en position 1 : produits qui montent | 143 | 98 |
| ajouter la niacinamide en position 1 : produits qui baissent | 165 | 169 (falaise 10/11, section D) |
| un ingrédient du top 5 mal lu : écart moyen / p90 / max | 1,7 / 6 / 31 | 1,5 / 4 / 32 |
| deux voisins inversés : écart moyen / max | 0,2 / 14 | **0,1 / 9** |

### Plafonds et triches

- Plafonnés : 19 produits — 14 posés (Lilial, Lyral, MI, hydroquinone) et 5 rincés à portée « tous » (Lilial, Lyral, hydroquinone), tous à 45 ou moins ; **0 note perso au-dessus de son plafond** (5 avant). La comédogénicité ne plafonne plus rien (14 avant).
- Triches sur The Ordinary Niacinamide (base 78) : +3 actifs après le conservateur **81** (+3 au lieu de +15 : le hyaluronate `lowDose`) · +8 extraits en queue **83** (+5 au lieu de +20) · +céramide + tocophérol en queue **81** (+3 au lieu de +24) · +Retinol en queue **82** (+4, résiduel accepté) · « Perfume » au lieu de « Parfum » **66** (78 avant : la triche coûte enfin autant que le parfum).
- Prime à l'opacité : crème « Parfum » vs même crème + 6 allergènes déclarés, perso sensibilité 3 : 57 / 49 (avant : 64 / 5).
- Résiduel rétinol (veto B7-5) : TO Niacinamide 78 → 82 ; sérum peptides sans actif fort 70 → 82 ; 175 rétinols réels au-delà de la position 10 ou de la barre : +0,7 en moyenne, +8 max, 48 produits changent.

---

## G. Annexe actionnable

### G1 — Correctifs de DONNÉES (`data/scan/dictionnaire.json`, `data/scan/ingredients-canon.json`, `data/scan/catalog.json`)

Dictionnaire — fonctions :
- `ZINC OXIDE`, `ZINC OXIDE (NANO)`, `ZINC OXIDE (CI 77947)`, `BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE`, `METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL` (+ NANO), `DROMETRIZOLE TRISILOXANE` → `["filtre-uva","filtre-uvb"]`. `TRIS-BIPHENYL TRIAZINE` → `["filtre-uvb"]`.
- Nouvelles fiches : `OCTISALATE` (uvb, alias de `ETHYLHEXYL SALICYLATE`), `DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE` (uva), `DIETHYLHEXYL BUTAMIDO TRIAZONE` (uvb), `TITANIUM DIOXIDE (NANO)` (uvb).
- Fonction `stabilisant-avobenzone` (nouvelle) sur : `OCTOCRYLENE`, Tinosorb S, Tinosorb M, `ETHYLHEXYL METHOXYCRYLENE`, `BUTYLOCTYL SALICYLATE`, `POLYSILICONE-15`, `DIETHYLHEXYL 2,6-NAPHTHALATE`, `DIETHYLHEXYL SYRINGYLIDENEMALONATE`, `DIETHYLHEXYL BUTAMIDO TRIAZONE`.
- `tensioactif-doux` ajouté à : `PEG-6 CAPRYLIC/CAPRIC GLYCERIDES`, `POLOXAMER 184`, `POLOXAMER 188`, `PEG-40 HYDROGENATED CASTOR OIL`, `SODIUM LAUROYL LACTYLATE`, `POLYSORBATE 20`, `DISODIUM COCOAMPHODIACETATE`.
- `LECITHIN`, `HYDROGENATED LECITHIN`, `DILINOLEIC ACID/BUTANEDIOL COPOLYMER` : retirer `lipide-barriere`, mettre `emollient`.
- `1,3-PROPANEDIOL`, `1,2-HEPTANEDIOL` : `role: "support"` **et** `fonctions: ["humectant"]`.

Dictionnaire — drapeaux et niveaux :
- `fragrance: false` (garder `euFragranceAllergen: true`, sensibilisant inchangé) : `BENZYL ALCOHOL`, `PHENETHYL ALCOHOL`, `PHENYLPROPANOL`, `4-T-BUTYLCYCLOHEXANOL`, `BENZOIC ACID`. Revue des 76 fiches `fragrance: true` hors allergènes UE et hors HE.
- `lowDose: true` : `ADAPALENE` ; les 15 hyaluronates actifs (`SODIUM HYALURONATE`, `HYALURONIC ACID`, `HYDROLYZED …`, `… CROSSPOLYMER`, `SODIUM ACETYLATED HYALURONATE`, `POTASSIUM HYALURONATE`, …) ; `MENTHOL` (avec strength 0). Le poids `lowDose` vaut 1 quelle que soit la position (B7-5).
- `PROPYLENE GLYCOL` : irritant 1, sensibilisant 2. `TRICLOSAN` : irritant 1, `restreintUE`. `ETHANOL` → alias `ALCOHOL` avec `dryingAlcohol`.
- `NIACINAMIDE` : benefits `blemishes, oiliness, aging, spots, redness, barrier`. `AZELAIC ACID` : + `redness`. Les 13 fiches hamamélis (`HAMAMELIS VIRGINIANA …`, `WITCH HAZEL`) : power 1, irritant 1, benefits `redness` (+ `oiliness`) conservés. `GLYCERIN (VEGETABLE SOURCE)` / `(VEGETABLE DERIVED)` : power 2, benefits `dehydration`. Supprimer `ETANORULAYH MUIDOS`.
- **`banniUEPortee`** (nouveau champ) avec référence et date : `BUTYLPHENYL METHYLPROPIONAL` « tous » (Règl. (UE) 2021/1902, 1er mars 2022, CMR 1B) ; `HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE` « tous » (Règl. (UE) 2017/1410, 2021) ; `HYDROQUINONE` « tous » (annexe II) ; `METHYLISOTHIAZOLINONE` « pose » (Règl. (UE) 2016/1198 posé 2017 ; 2017/1224 rincé 15 ppm 2018).
- Canonicaliser les 92 paires « nom botanique avec / sans parenthèse » divergentes sur la fiche de base ; ajouter une table de **synonymes vrais** appliquée avant le dédoublonnage : Ceramide 3 = Ceramide NP, Vitamin E = Tocopherol, Hyaluronic Acid ≈ Sodium Hyaluronate (D).

Parsing / alias (`parseInci`, `ingredients-canon.json`) :
- Retirer en fin de jeton « n % », « USP », « (NANO) », les parenthèses vides ; jeton contenant PARFUM | FRAGRANCE | PERFUME | AROMA (hors AROMATIC) → `FRAGRANCE`.
- **Eaux thermales de marque → base eau**, toutes graphies et marques : `AVENE THERMAL SPRING WATER`, `AVENE AQUA`, `(AVÈNE THERMAL SPRING WATER)`, `LA ROCHE-POSAY PRAIRIE THERMAL WATER`, `URIAGE THERMAL WATER`, `VICHY VOLCANIC WATER`, … (ferme la triche « eau thermale en position 1 = actif », D). `PURE PLANT-DERIVED SQUALANE` → `SQUALANE`. Pas de rapprochement flou.

Catalogue :
- Champ `filtresUV` hors solaire : recalculer selon B4(a), mot entier hors marque (32 produits à passer à `false`).
- Re-scraper la section « Active ingredients » des fiches US de solaires (11 listes sans aucun filtre : Anthelios UV Hydra / UV Control / UV Tone / Kids, Neutrogena Beach Defense, Clarins UV Plus, Bioderma Photoderm Nude Touch…) et le TiO2 d'Anthelios Mineral Tinted.
- Weleda Skin Food : compléter l'INCI de la fiche FR (parfum + allergènes), corriger l'OCR de la fiche US « Face Care Nourishing Day Cream » (« Cilycerin », « lsoam… »), retirer la fiche « Travel Size Clear 40 Count » (INCI corrompue) ; réparer Avène Tolérance Foaming (liste amputée) ; marquer les 65 « non évaluables » plutôt que les noter.
- Catégorie au catalogue : quand le nom vote « démaquillant » ou « indéterminé » pour une composition sans tensioactif ni émulsifiant démaquillant (CeraVe Hydrating 87 en démaquillant contre 72, Vanicream 82 contre 70), noter au minimum des deux grilles ou marquer la catégorie « à confirmer » (D).
- Quiz allergies (`profil-peau.ts:324`, `allergiesDe()`) : sortir `BENZYL ALCOHOL`, `BENZYL BENZOATE`, `BENZOIC ACID`, `MENTHOL` du groupe « parfum » ; correspondance par jeton entier et familles canoniques.

### G2 — Correctifs de RÈGLES (`src/lib/scan/scoring.mjs`, lignes de la version auditée)

| # | où | quoi |
|---|---|---|
| 1 | 299-318 `parseInci` | normalisations ci-dessus (n %, USP, NANO, parenthèses vides, PERFUME/AROMA, eaux thermales, synonymes) |
| 2 | 372-373 `@actifTop5` | gradué par w(pos) du meilleur actif power 3 ; `lowDose` → w = 1 |
| 3 | 375-377 `@photostable`, `@filtresUV` | lecture de la fonction `stabilisant-avobenzone` ; drapeau `filtresUV` accepté pour sunscreen seulement |
| 4 | 378 `@troisActifs` | remplacé par « un actif power ≥ 2 bien placé hors glycols OU humectant actif `lowDose` » (sérum, traitement) ; masques inchangés |
| 5 | 385-420 `evalueLigne` | dédoublonnage par nom ; `@actifs` ne compte que w ≥ 0,6 ou `lowDose` |
| 6 | 139, 153 | prérequis `douceur` (nouveau prédicat `@douceur`) et `dissout` (+ `emulsifiant`) |
| 7 | 169-170, 181, 192, 218, 240-241 | `pondere: true` sur `antiox` et `lipides` ; 219 : plafond `actifs` solaire 8 → 4 ; 257-266 : `indetermine.actifs` 20 → 14 |
| 8 | 326-331 `wPos` | **inchangé** : `lowDose` → 1,0 quelle que soit la position (veto B7-5) |
| 9 | 497 | `grav = irritant` (comédogène retiré) |
| 10 | 497-509 boucle risques | premier actif irritant (power ≥ 2, irritant 2, bien placé) sans malus générique ; suivants plein tarif |
| 11 | 510-518 | `banniUE` : si `banniUEPortee === "tous"` **ou** `exposition ≥ 1` → cap 45 ; sinon (« pose » en rincé) −5 × exposition ; `sensibilisant 3` hors parfum → −5 × sévérité × exposition |
| 12 | 537-545 | renvoyer `cap` et une ligne `plafond` dans `details` |
| 13 | 552, 681 `scorePerso` | `score = min(score, capAbsolu, F.cap)` |
| 14 | 568 | allergies : jeton entier + familles canoniques |
| 15 | 581 | matchs × `benefitPower/3` |
| 16 | 593-618 | parfum et HE : une ligne, × exposition ; sensibilisants 1-2 : −1 × niveau × S/3 × w × exposition, plafond −8 × S/3 ; canal irritant (irritant 2 seulement, exclusions, plafond −10 × S/3) ; alcool aussi pour S ≥ 2 |
| 17 | 606-610 | comédogène : ≥ 4, ou ≥ 3 en top 5 ; peau grasse/mixte OU préoccupation ; plafond −6 |
| 18 | 561, 353, 611-614, 624-629, 672-675 | force et alcool × w(pos) ; une seule ligne force (−5/cran, +5 si acide posé et S ≥ 2) |
| 19 | 336-357, 63-68, 635-643 | richesse par classes ; `seuilRiche` 4, `seuilLegere` 1,5 ; rien sur `exposition < 1` ; « légère » seulement hydratant / yeux |
| 20 | `lire-inci/route.ts:49-56`, `fiche/route.ts:46`, `categorise.mjs` | garde « non évaluable », badges « minimaliste » / « partielle », note **provisoire** si catégorie non sûre ; min des deux grilles si catégorie incertaine |
| 21 | (dernier) grilles | B11 : max atteignable, prérequis en part du budget, mérite `sansParfum` × exposition avec compensation de budget, bandes (peels ≥ 25 %) |

### G3 — Scripts de simulation à conserver (`scratchpad/debat/`)

- `scoring-sim.mjs` : copie du moteur avec 37 interrupteurs (`SIM.*`) ; `patch.mjs` → `patch7.mjs` la reconstruisent depuis `src/lib/scan/scoring.mjs` ; `verif.mjs` prouve l'identité à interrupteurs éteints.
- `sim3.mjs` : banc final — `ARB1` … `ARB7` (les sept arbitrages), `FINAL '<knobs>' P9` (paquet v2 : `{"s5Mode":"first","prereqMode":"d6d","comedoMode":"produit","banMode":45,"matchScale":"p3"}`, consensus sans `LD10`, avec `HUMLD`), `ONE '<regex>'` (score d'une fiche, V0 par le moteur original).
- `sim2.mjs` : phase 2 (F1-F4, ATTR, S4, PACK) ; `lib.mjs`, `distribution.mjs`, `monotonie.mjs`, `perso.mjs`, `robustesse.mjs`, `complements.mjs`, `simul.mjs`, `seuils.mjs`, `liste.mjs` : phases 1 et 5.
- Rapports : `rapport-1-*.md`, `rapport-2-*.md`, `veto-*.md`, `rapport-final.md` (v1), `rapport-final-v2.md`.
- Usage : `cd <dépôt> && node <script>` ; le moteur lit `data/scan/` depuis la racine du dépôt. Les scripts des deux autres agents (`scoring-sim-dermato.mjs`, `variants/`, `bench.mjs`) sont dans le même dossier.
