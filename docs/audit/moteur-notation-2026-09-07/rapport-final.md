# SmartSkin Score — Rapport final de l'audit du moteur de notation

Rapporteur : agent « stat » (mécanique / mesure), à partir des trois audits (dermato, produit, stat) et des trois débats. Règle de sélection : une modification entre si au moins 2 agents sur 3 la soutiennent après débat ET si aucune objection chiffrée ne reste sans réponse. Quand trois versions d'une même règle existaient, une seule a été choisie, par la mesure.

Banc de mesure : copie patchée du moteur (`scratchpad/debat/scoring-sim.mjs`, 36 interrupteurs, dépôt intact ; à interrupteurs éteints, 0 écart avec l'original sur 2 916 produits). Chaque variante a été jouée sur le catalogue entier et sur 70 produits étalons (réels + 8 formules construites). Le dépôt n'a pas été modifié.

Profils perso utilisés : **sècheR** = peau sèche, sensibilité 3, déshydratation 3 + rougeurs 2 + barrière 2, tolérance 0 · **grasseAcne** = grasse, imperfections 3 + brillance 2, tolérance 3 · **sens3** = normale, sensibilité 3, rougeurs 2 · **normaleAge** = normale, sensibilité 1, rides 3 + taches 2 · **grasseRides** · **rougeurs**.

---

## A. Résumé

1. **Ce que le moteur fait bien** : il lit la position dans la liste d'ingrédients comme une dose (avec la barre des 1 % et l'exception des actifs efficaces à faible dose), il juge chaque produit sur son métier (un nettoyant sur sa douceur, un solaire sur ses filtres), il tient compte du rinçage, il ne punit jamais un ingrédient inconnu, il traite grossesse et allergie en tout-ou-rien, et il est robuste aux petites erreurs de lecture (un ingrédient mal lu : écart médian 0).
2. **Défaut majeur n° 1, la note perso punit la transparence** : parfum, huiles essentielles et allergènes sont facturés à chaque ingrédient, sans plafond. Une marque qui déclare ses 8 allergènes (obligation UE) tombe à 5/100 pour une peau réactive, celle qui écrit « Parfum » reste à 45-59. Résultat : 14 à 15 % du catalogue au plancher 5 pour une peau sensible.
3. **Défaut majeur n° 2, des données fausses notent faux des produits de référence** : solaires « sans aucun filtre » (26, dont Anthelios à 33-39), oxyde de zinc classé UVA seul (40 minéraux privés du « large spectre »), alcool benzylique compté comme parfum (59 à 90 produits, The Ordinary Caffeine à 49), laits et eaux micellaires punis « pas d'agent lavant » (CeraVe Hydrating 59, Sensibio 64).
4. **Défaut majeur n° 3, le comptage des actifs récompense la liste longue** : un mono-actif prouvé est puni « trop peu d'actifs » (The Ordinary Niacinamide 66, Effaclar Adapalene 62), trois traces ajoutées après le conservateur rapportent +15, un ingrédient écrit deux fois rapporte +14, et un rétinol fait baisser la note d'un sérum dans 8 cas sur 10.
5. **Effet global du paquet retenu** : note formule moyenne 65,0 → 65,6, produits verts 26,9 → 29,4 %, rouges 7,0 → 6,1 %, 65 produits (2,2 %) passent « non évaluable » au lieu d'une fausse note.
6. Côté perso, peau sèche réactive : écart moyen à la formule −10 → −0,3, produits rouges 35 → 20 %, produits au plancher 14 % → 0,2 %. Peau grasse acnéique : +7 → +4,5 (les actifs à preuve faible rapportent moins).
7. Étalons corrigés : CeraVe Hydrating 59 → 69, Sensibio 64 → 77, TO Niacinamide 66 → 78, Effaclar Adapalene 62 → 78, TO Caffeine 49 → 71, Vanicream Mineral SPF 68 → 82, Cetaphil Sheer Mineral 65 → 80, Avène Mineral 58 → 77, Dermalogica Retinol perso réactive 5 → 44.
8. Triches fermées : « 3 actifs après le conservateur » +15 → 0, « ingrédient en double » +14 → 0, « Perfume au lieu de Parfum » +12 → 0, « Parfum plutôt que déclarer les allergènes » côté perso +48 → +8.
9. Monotonie vérifiée sur le paquet : ajouter un bon actif en fin de liste ne baisse jamais la note (0 cas), ajouter du parfum ne la monte jamais (0), dupliquer un ingrédient ne rapporte plus rien (0, contre 264 avant), 0 produit ne dépasse plus son plafond en perso.
10. **Ordre impératif** : corriger les données (B1-B4) avant les règles (B5-B10), et recalibrer les familles (B11) en dernier, sinon les biais de données seraient gelés dans les poids.

---

## B. Les modifications retenues, dans l'ordre d'application

Convention : « fichier:ligne » renvoie à `src/lib/scan/scoring.mjs` sauf mention. Les chiffres « V0 → final » sont mesurés avec le paquet complet.

### B1 — DONNÉES · Solaires : reconnaître les filtres et le large spectre

**Pour l'utilisatrice.** Un solaire minéral à l'oxyde de zinc n'est plus noté sous un solaire chimique, et un solaire dont la liste ne contient aucun filtre lisible n'affiche plus « aucun filtre UV, mauvais » mais « non évaluable ».

**Règle.** Dictionnaire : `ZINC OXIDE` (et variantes NANO / CI 77947), Tinosorb S (`BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE`), Tinosorb M (`METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL`), Mexoryl XL (`DROMETRIZOLE TRISILOXANE`), `TRIS-BIPHENYL TRIAZINE` → `["filtre-uva","filtre-uvb"]` ; ajouter `OCTISALATE` (uvb, 115 INCI), `DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE` (uva), `DIETHYLHEXYL BUTAMIDO TRIAZONE` (uvb), `TITANIUM DIOXIDE (NANO)` (uvb). `TITANIUM DIOXIDE` reste uvb seul (UVB + UVA2, pas UVA1). `parseInci` (299-318) retire « n % » et « USP » en fin de jeton et les parenthèses vides qui en résultent. `@photostable` (375-376) ne lit plus des noms commerciaux mais la liste des vrais stabilisants : octocrylène, Tinosorb S/M, `ETHYLHEXYL METHOXYCRYLENE`, `BUTYLOCTYL SALICYLATE`, `POLYSILICONE-15`, `DIETHYLHEXYL 2,6-NAPHTHALATE`, `DIETHYLHEXYL SYRINGYLIDENEMALONATE`, `DIETHYLHEXYL BUTAMIDO TRIAZONE`. `@filtresUV` (377) est aussi satisfait, pour la catégorie sunscreen seulement, par le drapeau `filtresUV` du catalogue. Ligne `actifs` de la grille solaire : plafond 8 → 4 (219). Un solaire sans aucun filtre reconnu ⇒ non évaluable (B4).

**Soutien.** 3/3 (D1 = P2 + P3 = S8). Objection levée : le dermato refusait le drapeau catalogue hors sunscreen (faux sur 32 non-solaires, cf. B4) ; il est restreint aux solaires.

**Effet mesuré.** Médiane des solaires 64,5 → 74, verts 20,7 → 39,2 %, rouges 10,3 → 0,4 %. Vanicream Mineral SPF 30 68 → 82, Cetaphil Sheer Mineral 65 → 80, Avène Mineral SPF 50 58 → 77, Anthelios Melt-in Milk 74 → 74. Solaires « sans filtre » : 26 → 25 avant la règle de garde ; 11 n'ont aucun nom de filtre dans leur INCI (listes US amputées de la section « Active ingredients ») → non évaluables.

**Effet de bord.** Anthelios Mineral Tinted reste non évaluable (60 si noté) : son dioxyde de titane manque dans l'INCI, c'est une donnée à réparer, pas une règle.

### B2 — DONNÉES · « Parfum » ne veut pas dire conservateur, et « Perfume » veut dire parfum

**Pour l'utilisatrice.** Un produit conservé à l'alcool benzylique n'est plus présenté comme parfumé ; une marque qui écrit « Perfume » ou « Aroma » ne contourne plus le malus.

**Règle.** `BENZYL ALCOHOL`, `PHENETHYL ALCOHOL`, `PHENYLPROPANOL`, `4-T-BUTYLCYCLOHEXANOL`, `BENZOIC ACID` → `fragrance: false` (on garde `euFragranceAllergen` et le niveau sensibilisant). Au parsing (312-313), tout jeton contenant PARFUM | FRAGRANCE | PERFUME | AROMA (hors AROMATIC) → `FRAGRANCE`. Revue des 76 fiches `fragrance: true` qui ne sont ni allergène UE ni huile essentielle.

**Soutien.** 3/3 (D3 = P7).

**Effet mesuré.** +0,5 de moyenne, +1,5 point de verts. TO Caffeine 5 % 49 → 71, Cicalfate+ sérum 54 → 67, Effaclar Clarifying 45 → 64 (son seul « parfum » était l'alcool benzylique). Triche « + Perfume » sur TO Niacinamide : 78 → 66 (fermée).

**Effet de bord.** Aucun mesuré ; l'alcool benzylique reste facturé comme allergène déclaré côté perso, à sa juste place.

### B3 — DONNÉES · Dictionnaire : les fiches qui faussent la mécanique

**Pour l'utilisatrice.** La même molécule écrite de deux façons reçoit la même note ; le propylène glycol cesse d'être compté comme un irritant fort ; le rétinoïde de l'Effaclar Adapalene est enfin reconnu.

**Règle.** `PROPYLENE GLYCOL` irritant 2 → 1, sensibilisant 1 → 2 (ACDS 2018) ; `TRICLOSAN` irritant 3 → 1 + `restreintUE` ; `ADAPALENE` `lowDose: true` ; `MENTHOL` strength 1 → 0 + `lowDose: true` ; `NIACINAMIDE` benefits complétés (spots, redness, barrier) ; `AZELAIC ACID` + redness ; `LECITHIN`, `HYDROGENATED LECITHIN`, `DILINOLEIC ACID/BUTANEDIOL COPOLYMER` sortent de `lipide-barriere` (→ emollient) ; `GLYCERIN (VEGETABLE …)` power 3 → 2 ; entrée inversée `ETANORULAYH MUIDOS` supprimée ; canonicalisation au parsing des parenthèses botaniques (« (GREEN TEA) », « (NANO) », « USP », « n % ») vers la fiche de base (92 doublons divergents, 348 alias seulement aujourd'hui). Pas de rapprochement flou (Levenshtein) : retinol/retinal sont à distance 1.

**Soutien.** 3/3 (D11 = P11 = P12c ; T9 du stat). Le dermato a cédé sur le PG (sensibilisant 2, pas 1).

**Effet mesuré.** PG : 267 produits, +0,2 de moyenne, Vanicream Moisturizing Cream 66 → 70, Sensibio +2, Adapalene +2. Adapalene reconnu : 62 → 78 (avec B7-B8). THAYERS 51 vs 65 selon la graphie de la glycérine : disparaît.

### B4 — DONNÉES · Catalogue : bonus UV crédible seulement, et « non évaluable » plutôt qu'une fausse note

**Pour l'utilisatrice.** Une crème qui ne contient pas de vrai filtre solaire ne lui dit plus « ça vous protège des UV » ; une liste d'ingrédients trop courte ou tronquée ne reçoit pas une note rassurante.

**Règle.** (a) Hors catégorie sunscreen, `filtresUV` seulement si un filtre organique reconnu est en position ≤ 8 OU si le nom porte SPF/UV/Sun ; l'oxyde de zinc ou le dioxyde de titane seuls ne valent jamais un SPF (`categorise.mjs:105`, champ `filtresUV` du catalogue). (b) Non évaluable si : solaire sans aucun filtre reconnu ; OU liste de 5 ingrédients ou moins avec un ingrédient inconnu ou sans base en position 1 (eau, huile, beurre, cire, alcool, glycol, silicone, squalane, tensioactif, argile, actif OTC américain…) ; OU `lecture.partielle` renvoyée par la vision (scan). Une liste de 1 à 3 ingrédients tous connus avec une base en tête est notée avec le badge « formule minimaliste ». Badge « analyse partielle » (sans exclusion) si la couverture dictionnaire du top 10 est < 0,8, si la position 1 n'est pas une base, ou si le scan renvoie une catégorie non « sûre » (alors jamais de bande verte). Grille `indetermine` : ligne `actifs` 20 → 14, et quand la catégorie est incertaine, noter sur les deux grilles les mieux votées et garder le minimum.

**Soutien.** 3/3 sur (a) (P9 durci par le dermato et le stat) et (b) (P10 = S7 = friction 6 du dermato), après arbitrage des seuils.

**Arbitrage des seuils (mesuré).** Règle B du stat (n < 8 ∨ couverture < 0,7) excluait 126 produits dont Serozinc, les patchs Effaclar et Drunk Elephant A-Gloei (noté 90 à raison) : rejetée. Les règles produit et dermato convergent : 63 à 65 produits (2,2 %), moyenne actuelle 50,7, 6 verts ; 4 étalons exclus, tous légitimes (Avène Tolérance Foaming à la liste amputée, Anthelios UV Hydra et Mineral Tinted sans filtre dans l'INCI, un spray d'eau thermale au jeton non reconnu → alias à ajouter).

**Effet mesuré.** (a) 92 non-solaires portaient le drapeau : 48 ont un vrai filtre organique haut placé, 43 portent SPF au nom, **32 n'ont ni l'un ni l'autre** (13 avec ZnO/TiO2 en traces, 19 du type Cicalfate) et perdent +8 et la phrase « you skip sunscreen ». Cicalfate+ crème 77 → 70. (b) 65 produits sortent de la notation, 2 851 restent notés.

**Effet de bord.** Aucun étalon complet et court n'est exclu (Paula's Choice 2 % BHA à 8 ingrédients, Sensibio à 10, Adapalene à 8 restent notés).

### B5 — RÈGLE · Perso : parfum, huiles essentielles et allergènes comptés une seule fois

**Pour l'utilisatrice.** Une peau réactive voit une seule ligne « parfum » par produit, et une marque transparente n'est plus punie huit fois quand une marque opaque l'est une fois.

**Règle.** Dans `scorePerso`, sortir de la boucle par ingrédient (601-605, 615-618) : une ligne parfum = −4 × sensibilité × exposition, une ligne HE = −8, une fois par produit. Exposition (`RUBRIQUES[cat].exposition`) appliquée au malus perso, pas au mérite formule (arbitrage 6). Le mérite `sansParfum` et le malus fixe formule (511-529) sont conservés tels quels, et leur somme (12 à 23 points) est documentée comme UN poids voulu, affiché en une ligne du Why.

**Soutien.** 3/3 (S1 = P1, dermato d'accord). Arbitrage 6 : l'exposition sur le mérite formule (D10 initial) fait baisser tous les nettoyants sans parfum (CeraVe −3, Cetaphil Gentle −3, Sensibio −2, verts des nettoyants 19,6 → 14,9 %) pour un gain de cohérence de 1 point ; rejetée par produit et stat, le dermato ayant lui-même retiré D10. La suppression complète du mérite (S2 du stat) est rejetée (section C).

**Effet mesuré.** Sensibilité 3 : produits au plancher 5 : 15,2 → 0,3 %, écart moyen −15,9 → −6,6. Crème + 6 allergènes déclarés, perso sens3 : 5 → 51 (opaque « Parfum » : 57). Weleda Skin Food US, perso sèche réactive : 5 → 34. Dermalogica Retinol Serum (7 drapeaux parfum) : 5 → 44.

**Effet de bord.** Un parfum très chargé et un parfum à trace deviennent indiscernables côté perso ; l'information reste dans la liste (« allergène déclaré »).

### B6 — RÈGLE · Nettoyants et démaquillants : la douceur n'est pas un tensioactif

**Pour l'utilisatrice.** Un lait, une crème lavante ou une eau micellaire, formes les plus douces qui existent, ne sont plus punis « pas d'agent lavant doux ».

**Règle.** Prérequis `douceur` du nettoyant (139) : satisfait si `tensioactif-doux`, OU (émollient / émulsifiant / occlusif présents ET aucun `tensioactif-agressif` ET pas `@savon`). Prérequis `dissout` du démaquillant (153) accepte `emulsifiant`. Fonction `tensioactif-doux` ajoutée à `PEG-6 CAPRYLIC/CAPRIC GLYCERIDES`, `POLOXAMER 184/188`, `PEG-40 HYDROGENATED CASTOR OIL`, `SODIUM LAUROYL LACTYLATE`, `POLYSORBATE 20`, `DISODIUM COCOAMPHODIACETATE`.

**Soutien.** 3/3 (P4 + P5, endossés par le dermato et le stat).

**Effet mesuré.** CeraVe Hydrating 59 → 69 (perso sèche réactive 59 → 80), Toleriane Milky 58 → 70, Sensibio H2O 64 → 77, Cetaphil Cleansing Milk 37 → 39 (garde son SLS). 35 nettoyants + 12 démaquillants concernés. Triche « un glucoside à 0,5 % pour +12 » fermée.

**Effet de bord.** Toleriane Purifying Foaming 75 → 72 : sa part de grille se redistribue (voir S9, section D).

### B7 — RÈGLE · Une seule règle de comptage des actifs

**Pour l'utilisatrice.** Un sérum est jugé sur ses actifs réellement dosés ; un mono-actif concentré n'est plus « trop peu », quinze traces ne valent plus quinze actifs, et un ingrédient écrit deux fois ne compte qu'une fois.

**Règle.** (1) Dédoublonnage par nom, première occurrence gardée, dans `evalueLigne` (385-420), `@actifs` et `@troisActifs` (378), comme `vusRisque` (491-496). (2) Un actif compte dans `@actifs`, `richesse` et le prérequis s'il est **bien placé** : w(pos) ≥ 0,6 (positions 1-10 au-dessus de la barre des 1 %) ou `lowDose`. (3) Prérequis sérum / traitement : « au moins UN actif power ≥ 2 bien placé, hors glycols de base (glycérine, butylène/propylène/pentylène glycol, propanediol, hexanediol…), OU un humectant actif (hyaluronate, panthénol, bétaïne…) à toute position » ; masques : règle actuelle. (4) `@actifTop5` (372-373) = meilleur actif power 3, **gradué par w(pos)** (1 / 0,6 / 0,3) au lieu de 1/0, `lowDose` donnant w = 1. (5) `lowDose` : w = 1 en positions 1-10 ou avant la barre, 0,6 au-delà (326-331). (6) Lignes `antiox` et `lipides` pondérées par la position dans toutes les grilles (169-170, 181, 192, 218, 240-241), comme elles le sont déjà dans la grille hydratant (189).

**Soutien.** 3/3 sur (1), (2), (4) ; arbitrage 2 sur (3) ; (5) 2/3 (produit + stat, le dermato préférait w = 1 partout) ; (6) proposée par le stat, non contestée, indispensable (voir ci-dessous).

**Arbitrage 2 (mesuré).** « Power 3 en top 5 ou lowDose » (stat) fait échouer Vichy Minéral 89 (63 → 51) et 32 % des masques : rejeté. « Power ≥ 2 à w ≥ 0,6 » (dermato, littéral) est satisfait par la glycérine dans 93,7 % des sérums : rejeté. La variante D6d du produit (hors glycols, ou humectant actif) garde Vichy à 63, Drunk Elephant B-Hydra 68, Estée Lauder ANR 64, fait passer TO Niacinamide 78 et Adapalene 76, échecs sérum 4,3 → 4,7 %, masques inchangés (5,5 %), et « eau + glycérine + gomme » reste en échec (50).

**Effet mesuré.** TO Niacinamide 66 → 78, Effaclar Adapalene 62 → 78 (avec B8), PC 1 % Retinol 76 → 86, sérum rétinol en position 8 (construit) 68 → 82, Paula's Choice Resist 72 → 83. Sérums « soupe » : ANUA 92 → 86, VT PDRN 92 → 86, PC Resist Pure Radiance 92 → 89 ; Bubble Day Dream reste 92 (ses actifs sont vraiment en tête). Triches sur TO Niacinamide : « +3 actifs après le conservateur » 81 → 78 (0 gain), « +8 extraits en queue » 86 → 80 (+2), « +céramide + tocophérol en queue » 90 → 81 (+3) — sans (6), ces deux dernières valaient encore +5 et +10 : la triche se déplaçait vers les lignes non pondérées. Doublons : 264 produits gagnants → 0. Falaise « monter un actif de la position 6 à la 5 » : gain moyen 10,9 → 4,0 points.

**Effet de bord.** Résiduel accepté : « Retinol en dernière position » vaut encore +3 (78 → 81) — la position ne distingue pas 0,3 % de 0,01 %. Estée Lauder ANR 76 → 64 (actifs sous la barre) : à faire relire par le dermato (section D).

### B8 — RÈGLE · Le premier actif irritant bien dosé ne coûte rien, les suivants coûtent plein tarif

**Pour l'utilisatrice.** Un sérum au rétinol ou un exfoliant à l'acide n'est plus puni pour l'irritation normale de son actif, mais empiler plusieurs actifs irritants sans tampon reste sanctionné.

**Règle.** Dans la boucle des risques (497-509), pour `role: active`, `benefitPower ≥ 2`, `irritant = 2` et bien placé (w ≥ 0,6 ou lowDose) : le premier de la liste ne prend pas le malus générique ; à partir du deuxième, malus plein. Le malus comédogène et les non-actifs sont inchangés.

**Soutien.** Arbitrage 1 : trois versions (S5 plein du stat, demi-tarif du produit, « premier gratuit » du dermato). Mesure sur les étalons :

| variante | peel sans tampon (construit) | TO AHA 30 % + BHA 2 % | PC 25 % AHA peel | Dr Dennis Gross Extra Strength | PC 2 % BHA | rétinol pos 8 | Adapalene | 136 produits à ≥ 2 actifs irritants dosés : % verts |
|---|---|---|---|---|---|---|---|---|
| aucune exemption | 64 | 70 | 62 | 27 | 80 | 78 | 74 | 22,8 |
| S5 plein | **77 vert** (grasse 97) | 80 | 77 | 44 | 84 | 82 | 78 | **53,7** |
| demi-tarif | 70 | 75 | 69 | 35 | 82 | 80 | 76 | 41,2 |
| **premier gratuit** | **68** (grasse 88) | 75 | 66 | 32 | 84 | 82 | 78 | 39,7 |

S5 plein est rejeté par la mesure : le peel sans tampon devient vert et les 136 formules à empilement passent de 23 à 54 % de verts. Le demi-tarif laisse un rétinol seul facturé −2 (le sérum au rétinol baisse encore dans 25 % des cas). « Premier gratuit » donne le même résultat que S5 plein sur les mono-actifs (PC 2 % BHA 84, rétinol 82, Adapalene 78) et garde la sanction de l'empilement. La ligne `tampon` de la grille exfoliant fait déjà son travail (peel avec tampon +12,1, sans tampon 0 : 68 contre 82).

**Effet mesuré.** Ajouter du rétinol à un sérum ne baisse plus la note que dans 14 % des cas (un autre actif irritant déjà présent) contre 78 % avant ; exfoliants verts 20,9 → 27,7 %.

**Effet de bord.** Effaclar Clarifying (alcool en position 2, deux acides) : 45 → 64 ; pour une peau grasse non sensible 84 (section D).

### B9 — RÈGLE · Les plafonds : comédogénicité hors formule, ingrédients interdits plafonnés, plafond respecté en perso

**Pour l'utilisatrice.** Une huile en trace ne bloque plus une crème sous « jamais vert » ; un produit contenant un ingrédient interdit dans l'Union européenne ne peut plus être noté comme acceptable ; et la note perso ne peut plus dépasser un plafond posé par la formule.

**Règle.** `grav = irritant` seul (497), la comédogénicité ne pèse plus en formule. `banniUE` en produit posé (`exposition ≥ 1`) → plafond **45** ; en produit rincé → malus −5 × exposition (la méthylisothiazolinone reste légale en rincé). `sensibilisant 3` hors parfum/HE → −5 × sévérité × exposition en formule. `scoreFormule` renvoie `cap` et `scorePerso` applique `min(score, capAbsolu, F.cap)` (681). Une ligne `{type: "plafond"}` dans `details` explique l'écart (P12a).

**Soutien.** D4 3/3 ; S3 3/3 ; D2 amendé 3/3 (portée « posé » concédée par le dermato). Arbitrage 5 sur le niveau : sur les 15 produits bannis posés du catalogue, **aucun n'est au-dessus de 69** → un plafond à 69 est une règle sans effet ; 45 en abaisse 10 (Sun Bum Face Lotion 69 → 45, Perricone 58 → 45, Neutrogena Age Shield 56 → 45). Un produit interdit à la vente dans l'UE ne peut pas être « acceptable » pour une utilisatrice européenne : 45 retenu. L'objection du produit (le lilial est interdit comme CMR, pas pour la peau) est traitée par la ligne d'explication et par la portée rincé.

**Effet mesuré.** D4 : 299 produits +2,6 en moyenne (max +12), 0 baisse ; plafonnés par la comédogénicité 14 → 0. ELEMIS Naked Cleansing Balm 69 → 81, Paula's Choice Skin Balancing 69 → 80, Toleriane Double Repair 83 → 84. Plafonnés finaux : 15 (bannis posés + hydroquinone), 0 dépassement en perso (5 avant). Clinique For Men Scrub (MI, rincé) 73 → 63, pas 45.

### B10 — RÈGLE · La note perso lit la dose et distingue « peau réactive » d'« allergie »

**Pour l'utilisatrice.** Une peau réactive est avertie de ce qui pique (menthol, alcool, acides mal dosés), pas des allergènes rares ; un acide en position 30 ne déclenche plus « trop fort pour vous » ; une eau micellaire n'est plus « pas assez nourrissante » ; et les actifs à preuve faible rapportent moins de points.

**Règle.** (a) Canal irritant, sensibilité S > 0 : −2 × irritant × S/3 × w × exposition, **irritant 2 seulement**, hors actifs à `strength ≥ 1`, alcool, parfum, HE et sulfates (chacun a sa ligne), plafond −10 × S/3, libellé « may sting on reactive skin ». Sensibilisants 1-2 : −1 × niveau × S/3 × w × exposition, plafond −8 × S/3, libellé gradué (« listed contact allergen »), jamais « your skin reacts easily » ; plein tarif seulement sur allergie déclarée. Alcool desséchant : ligne aussi pour S ≥ 2. (b) Comédogène : ≥ 4 partout ou ≥ 3 en top 5, si `skinType` grasse/mixte OU préoccupation imperfections/brillance, −3 × w, plafond −6. (c) `strengthMax` / `forceMax` (561, 353) sur les seuls ingrédients à w ≥ 0,6 ou lowDose ; alcool × w(pos) (611) ; les deux lignes force (624-629 et 672-675) fusionnées : −5 par cran, +5 si acide posé (exfoliant/traitement/tonique) et S ≥ 2. (d) Texture : aucune adéquation si `exposition < 1` ; « légère » seulement sur hydratant et contour des yeux ; richesse par classes (beurre/cire/pétrolatum/lanoline 1, huile 0,7, ester/CCT/squalane/alcane 0,3, stéarates d'émulsifiants 0) avec `seuilRiche` 8 → 4 et `seuilLegere` 2 → 1,5 (336-357, 63-68). (e) Matchs perso × benefitPower/3 (581). (f) Allergies déclarées : correspondance par famille canonique et jeton entier, jamais par sous-chaîne (568) ; sortir alcool benzylique, benzoate de benzyle, acide benzoïque et menthol du groupe « parfum » du quiz.

**Soutien.** (a) D8 3/3 après restriction (arbitrage du stat : tel qu'écrit, D8 aggravait les sensibles, écart −14,2 → −16,2, et baissait les nettoyants doux 46 → 45 ; restreint à irritant 2, nettoyants doux 46 → 51, toniques alcool-menthol 12 → 8, solaires 56 → 63). (b) arbitrage 4 : la version « préoccupation seule » du dermato supprime toute ligne comédogène pour une peau grasse sans préoccupation déclarée (304 → 0 produits) ; la version produit en garde 208 avec un plafond −6 (Mixa 51, SimplyVital 63, Effaclar Duo+M testé non comédogène 94 au lieu de 97). (c) D7 = S11 = P8 3/3. (d) D9 + P8 3/3, seuils recalés par le stat (sans recalage, Toleriane Sensitive Riche cessait d'être « riche » : 10,3 → 4,5). (e) arbitrage 7 : × power/3 (produit + dermato) contre × (1+power)/4 (stat) : écart mesuré 0,8 point sur le profil âge (Δ 5,1 contre 5,9), 2/3 pour power/3, retenu. (f) S10 + produit (le profil v1 n'a pas de texte libre : c'est le groupe « parfum » du quiz qui plafonne 44 % du catalogue à 10, dont 68 à cause du seul alcool benzylique).

**Effet mesuré.** Peau sèche réactive : écart −10,2 → −0,3, rouges 34,8 → 19,9 %, verts 33,5 → 40,2 %. Sensibio, sèche réactive 59 → 78 (plus de « not nourishing enough ») ; Effaclar Duo+M 74 → 98 (acide salicylique en position 34 ne déclenche plus « stronger than your comfort zone ») ; Dermalogica Precleanse, peau grasse 47 → 59 (huile rincée) ; 249 hydratants légers cessent d'être « heavy for your oily skin » (+7,2) ; Thayers, profil rougeurs 88 → 79 (hamamélis +10 → +3,5) ; profil âge, produits à 100 : 6,3 → 3,2 %.

**Effet de bord.** Peau grasse acnéique : écart +7,1 → +4,5, verts 47,6 → 40,5 % (les extraits à preuve faible ne rapportent plus 10 points) ; c'est voulu.

### B11 — RECALIBRATION · Équité entre familles (à faire en dernier, ouvert)

**Pour l'utilisatrice.** Ses nettoyants ne doivent pas paraître « moins bons » que ses sérums par construction.

**Constat après paquet.** Verts par famille : nettoyants 19,5 %, masques 19,4 %, toniques 24,4 %, hydratants 26,1 % contre solaires 39,2 %, traitements 40,6 %, contour des yeux 42,7 %. Les hydratants perdent 9 points de verts (les traces d'actifs et d'antioxydants ne comptent plus). Cause mécanique (S9) : la normalisation par la somme des plafonds suppose un poids de position 1 pour chaque élément, mais il n'y a que 5 places en top 5 ; les prérequis sont en points bruts (−10 à −25) alors que les mérites sont normalisés.

**Prochaine étape.** Après B1-B10 : max de grille **atteignable** (calcul analytique, pas empirique sur le catalogue), prérequis exprimés en part du budget, puis bandes / `budgetMetier` revus sur les étalons. 3/3 sur le diagnostic et sur l'ordre « données → règles → recalibration ».

---

## C. Ce qui a été rejeté, avec le chiffre qui l'a tué

| proposition | rejetée par | le chiffre |
|---|---|---|
| **S2 / V1** — supprimer le mérite `sansParfum` (stat) | produit + stat (retirée par son auteur) | Les références sans parfum baissent par normalisation : CeraVe Hydrating 59 → 52, Sensibio 64 → 58, Dermallergo 69 → 63 ; parfumés verts 1,8 → 10,4 % ; traitements rouges 3 → 23 %. |
| **D10 côté formule** — mérite `sansParfum` × exposition | produit + stat (dermato l'avait retirée) | Verts des nettoyants 19,6 → 14,9 % ; CeraVe −3, Cetaphil Gentle −3, Sensibio −2 ; gain de cohérence 1 point. |
| **S5 plein** — aucun malus d'irritance sur un actif power 3 | dermato + produit | Peel sans tampon 64 → 77 (vert), 100 pour une peau grasse ; 136 formules à empilement 23 → 54 % de verts. |
| **S5 demi-tarif** | dermato + stat | Un rétinol seul reste facturé −2 ; ajouter du rétinol baisse encore 25 % des sérums. |
| **D6 littéral** — prérequis « power ≥ 2 à w ≥ 0,6 » | produit + stat | 93,7 % des sérums le passent grâce à la glycérine (power 2) : prérequis mort. |
| **MONO** — prérequis « power 3 en top 5 ou lowDose » (stat) | produit + dermato | Vichy Minéral 89 63 → 51 ; 32 % des masques en échec. |
| **D8 tel qu'écrit** — canal irritant dès le niveau 1 | produit + stat | Sensibles : écart −14,2 → −16,2 ; nettoyants doux 46 → 45 ; « Butylene glycol may sting » sur Dermallergo, « Homosalate may sting » sur un solaire. |
| **D4 perso « préoccupation seule »** | produit + stat | 304 → 0 ligne comédogène pour une peau grasse sans préoccupation cochée ; Mixa (IPP + IPM en top 5) +6 sans avertissement. |
| **Plafond 69 sur banni UE** (produit) | dermato + stat | 0 des 15 produits bannis posés n'est au-dessus de 69 : règle sans effet. |
| **Règle B « non évaluable »** (n < 8 ∨ couverture < 0,7) (stat) | produit + dermato | 126 produits exclus dont Serozinc, patchs Effaclar, Drunk Elephant A-Gloei (90). |
| **S7 « n < 12 ⇒ analyse partielle »** (stat) | produit + dermato | 15 étalons complets et courts sur 49 marqués partiels (PC 2 % BHA, Sensibio, Adapalene, Vanicream…). |
| **S7 prérequis `@humectant` sur la grille indéterminée** (stat) | dermato + produit | Une huile pure ou un baume anhydre n'en ont pas et sont légitimes. |
| **S8(1)** — drapeau `filtresUV` du catalogue accepté hors solaire | dermato + stat | Faux sur 32 non-solaires (P9). |
| **P9 clause « ZnO/TiO2 en positions 1-6 »** | dermato + stat | Conserve le bonus de 19 produits du type Cicalfate (ZnO cicatrisant, aucun SPF). |
| **P6(c)** — décroissance au-delà de 4 actifs | dermato + stat | Inutile : la pondération des lignes ramène les sérums à 92 vers 86-89, et créerait une non-monotonie. |
| **P11 rapprochement flou** (Levenshtein ≤ 2) | dermato + stat | retinol / retinal à distance 1 ; une faute OCR doit rester « inconnu + badge ». |
| **× (1+power)/4** (stat) | produit + dermato | Écart mesuré 0,8 point avec × power/3 ; 2/3 pour power/3. |
| **D12 tel qu'écrit** — cap grossesse seulement si w ≥ 0,6 ou lowDose | stat (mesure) | Tous les rétinoïdes sont `lowDose` : 219 des 226 produits plafonnés resteraient à 15. À réécrire sur la position brute (section D). |
| **Recalibrer S9 avant les données** | 3/3 | Les biais de données (nettoyants, yeux, solaires) seraient gelés dans les poids. |
| **S10 chiffré « alcohol → 42 % du catalogue »** (stat) | produit | Le profil v1 n'accepte aucun texte libre ; le vrai chiffre est 44 % via le groupe « parfum » du quiz, dont 68 à tort. Mécanique retenue, chiffre corrigé. |

---

## D. Ce qui reste ouvert, et la prochaine étape

| sujet | état mesuré | prochaine étape |
|---|---|---|
| **S9 — équité entre familles** | verts : nettoyants 19,5 %, masques 19,4 %, hydratants 26,1 % vs contour des yeux 42,7 %, traitements 40,6 %, solaires 39,2 % | Après B1-B10 : max atteignable par grille (analytique), prérequis en part du budget, bandes revues sur les étalons. |
| **Résiduel rétinol en dernière position** | +3 sur TO Niacinamide (78 → 81) ; sérum peptides + rétinol en queue 82 = rétinol honnête en position 4 | Accepté : la position ne distingue pas 0,3 % de 0,01 %. Surveiller ; un jour, lire le % déclaré quand il est sur l'étiquette. |
| **Alcool dénaturé en position 2 d'un tonique** | Effaclar Clarifying 45 → 64 ; peau grasse non sensible 84 ; le malus alcool (6 × 1,2) pèse peu face aux acides | Relever `malusAlcoolTop5` à 8-10 en positions 1-3, ou malus × w(pos) continu (P12e) ; mesurer. |
| **Falaises de position résiduelles** | « Niacinamide ajouté en tête » fait baisser 167 produits (165 avant) ; « eau en tête » en fait monter 80 (143 avant) | Le seuil w ≥ 0,6 (positions 10/11) est la nouvelle marche ; passer à un poids continu par position pour les actifs. |
| **Estée Lauder ANR 76 → 64** | actifs (ferment, peptides) sous la barre des 1 % ou après la position 10 | Relecture dermato : si `BIFIDA FERMENT LYSATE` en position 2 est un actif prouvé, la fiche (power 1) est à revoir, pas la règle. |
| **SKIN1004 Centella Ampoule 48** | prérequis satisfait, mais actifs comptés faibles | Vérifier la fiche `CENTELLA ASIATICA EXTRACT` (power) et la barre des 1 % de cette liste. |
| **Thayers Witch Hazel** | 69 ; profil rougeurs 79 (88 avant), hamamélis toujours « redness, power 2 » | Fiche D11 : hamamélis n'est pas un apaisant pour peau réactive (tanins) → power 1, benefits sans redness. |
| **Weleda Skin Food FR 73 / US 42** | même produit, fiche FR sans « Parfum » | Donnée : compléter l'INCI de la fiche FR (parfum + allergènes déclarés). |
| **Anthelios UV Hydra, Mineral Tinted, 11 solaires** | non évaluables (filtres absents des listes US) | Re-scraper la section « Active ingredients » des fiches US. |
| **Serozinc, eaux thermales, minimalistes** | Serozinc 53 avec « nothing here hydrates » (prérequis humectant du tonique) ; spray Avène non évaluable (jeton eau thermale non reconnu) | Alias `AVENE THERMAL SPRING WATER` → base eau ; grille « minimaliste » ou prérequis levé quand n ≤ 3. |
| **Hydratants −9 points de verts** | 35,5 → 26,1 % | Partie de S9 ; vérifier que la ligne `actifs` (plafond 10, pondérée) de la grille hydratant n'est pas devenue inatteignable. |
| **D12 grossesse × dose** | 226 produits à 15, 171 avec le rétinoïde au-delà de la position 10 | Réécrire sur la position brute (≤ 10 ou avant la barre) ; `pregnancyLevel 3` en fait informatif. |
| **Grille indéterminée « min des deux grilles »** | non simulée (nécessite les votes du catégoriseur) | Implémenter puis mesurer sur le scan. |
| **Libellés du Why** | « a known contact allergen » pour un niveau 1 ; sept lignes « Fragrance » | Libellés gradués (B10) et fusion des lignes (B5) : à vérifier à l'écran. |

---

## E. Tableau final des étalons

Note actuelle → note sous le paquet final (formule | perso peau sèche réactive | perso peau grasse acnéique). « Attendu » = réputation dermatologique du rapport produit (formule). NE = non évaluable (la note entre parenthèses est celle qu'il aurait eue). [F] = formule construite pour le test.

| étalon | cat. | formule | sèche réactive | grasse acnéique | attendu | verdict |
|---|---|---|---|---|---|---|
| CeraVe Hydrating Facial Cleanser | nettoyant | 59 → **69** | 59 → 80 | 64 → 69 | 75-80 | mieux ; reste 6 pts sous l'attendu (S9, grille nettoyant) |
| LRP Toleriane Purifying Foaming | nettoyant | 75 → 72 | 71 → 82 | 83 → 75 | 75 | ok ; passe désormais derrière CeraVe Hydrating pour la peau sèche |
| LRP Toleriane Milky Cleanser | nettoyant | 58 → **70** | 67 → 77 | 58 → 70 | ~70 | corrigé |
| Cetaphil Gentle Skin Cleanser | nettoyant | 70 → 70 | 80 → 90 | 85 → 80 | 70 | ok |
| Cetaphil Cleansing Milk (SLS + parabènes) | nettoyant | 37 → 39 | 14 → 29 | 42 → 39 | 45-55 | sévère, défendable (SLS conservé) |
| Avène Tolérance Foaming (liste amputée) | nettoyant | 54 → **NE** (53) | | | — | données : INCI tronquée sur la fiche |
| Nivea Men Face Wash | nettoyant | 53 → 52 | 16 → 40 | 58 → 52 | 50 | ok ; la peau réactive n'est plus au plancher |
| Oak Essentials Gel Cleanser (19 composants parfumés) | nettoyant | 61 → 58 | 5 → 52 | 66 → 58 | 55 | corrigé côté perso |
| Clinique For Men Face Scrub (MI, rincé) | exfoliant | 73 → 63 | 45 → 43 | 79 → 69 | — | malus −5 rincé, pas de plafond : voulu |
| Bioderma Sensibio H2O | démaquillant | 64 → **77** | 59 → 78 | 69 → 77 | 75-80 | corrigé |
| Dermalogica Precleanse (huile rincée) | démaquillant | 59 → 59 | 5 → 49 | 47 → 59 | — | plus de « riche » sur un rincé : corrigé |
| LRP Toleriane Double Repair | hydratant | 83 → 84 | 84 → 94 | 95 → 99 | 80 | ok |
| LRP Toleriane Dermallergo | hydratant | 69 → 72 | 100 → 89 | 54 → 57 | 80 | ok (le perso fait le reste) |
| LRP Toleriane Sensitive Riche | hydratant | 68 → 71 | 89 → 87 | 56 → 59 | — | reste « riche » (+6 sèche) après recalage des seuils |
| Avène Cicalfate+ crème | hydratant | 77 → 70 | 99 → 88 | 77 → 60 | 75-80 | perd le faux bonus UV (−8) ; 5 pts sous l'attendu |
| Avène Cicalfate+ sérum | sérum | 54 → **67** | 58 → 82 | 59 → 67 | 70 | corrigé (SymSitive ≠ parfum) |
| Vanicream Moisturizing Cream | hydratant | 66 → 70 | 67 → 78 | 66 → 58 | 75 | mieux (PG) ; « riche » pour la peau grasse : juste |
| Vanicream Enhanced (HA + céramides) | hydratant | 87 → 86 | 100 → 94 | 87 → 91 | 85 | ok |
| Weleda Skin Food US (parfum déclaré) | hydratant | 42 → 42 | 5 → 34 | 32 → 31 | 50-60 | ok côté perso ; formule sévère (12 allergènes) |
| Weleda Skin Food FR (parfum absent de la fiche) | hydratant | 76 → 73 | 91 → 92 | 64 → 61 | 55 | **données** : compléter la fiche FR |
| Neutrogena Hydro Boost Water Gel | hydratant | 60 → 59 | 55 → 54 | 65 → 64 | 65 | ok |
| Mixa Soin Nourrissant (IPP + IPM en top 5) | hydratant | 55 → 58 | 62 → 64 | 39 → 43 | — | peau grasse toujours avertie (plafond −6) |
| CeraVe PM | hydratant | 82 → 82 | 99 → 95 | 92 → 97 | — | ok |
| CeraVe Moisturizing Cream | hydratant | 91 → 87 | 100 → 100 | 91 → 87 | — | ok |
| Paula's Choice 2 % BHA Liquid | exfoliant | 80 → 84 | 53 → 69 | 95 → 94 | 80 | ok |
| The Ordinary AHA 30 % + BHA 2 % | exfoliant | 70 → 75 | 59 → 71 | 91 → 91 | 65-70 | limite haute ; empilement facturé (2e et 3e acide) |
| Paula's Choice 25 % AHA peel | exfoliant | 64 → 66 | 53 → 65 | 89 → 86 | — | ok |
| Dr Dennis Gross Extra Strength | exfoliant | 28 → 32 | 5 → 6 | 54 → 50 | — | rouge : 7 acides + alcool + rétinol |
| [F] peel sans tampon | exfoliant | 64 → 68 | 46 → 63 | 89 → 88 | < 75 | orange : objection produit levée |
| [F] peel avec tampon | exfoliant | 77 → 82 | 73 → 84 | 98 → 98 | — | la ligne `tampon` fait +14 |
| LRP Effaclar Adapalene 0,1 % | traitement | 62 → **78** | 25 → 56 | 77 → 88 | 85 | corrigé (« USP 0.1% » normalisé, lowDose, premier irritant gratuit) |
| LRP Effaclar Duo+M | traitement | 79 → 82 | 74 → 98 | 90 → 93 | 80 | ok |
| LRP Effaclar BPO | traitement | 79 → 82 | 57 → 73 | 94 → 92 | 80 | ok |
| LRP Effaclar patchs | traitement | 53 → 63 | 53 → 68 | 58 → 63 | — | noté (minimaliste), pas exclu |
| LRP Effaclar toner astringent (alcool) | tonique | 37 → 41 | 14 → 28 | 45 → 43 | 35 | ok |
| LRP Effaclar Clarifying (alcool pos 2 + acides + menthol) | tonique | 45 → 64 | 6 → 42 | 70 → 84 | 55 | **à surveiller** : alcool en position 2 sous-pesé (D) |
| Thayers Witch Hazel Toner | tonique | 69 → 69 | 86 → 84 | 81 → 71 | 60 | sur-noté pour la peau réactive : fiche hamamélis (D) |
| LRP Serozinc | tonique | 53 → 53 | 46 → 53 | 65 → 55 | — | noté « minimaliste » ; prérequis humectant discutable (D) |
| The Ordinary Niacinamide 10 % + Zinc | sérum | 66 → **78** | 57 → 84 | 88 → 93 | 75 | corrigé |
| Vichy Minéral 89 | sérum | 63 → 63 | 75 → 73 | 68 → 63 | 65 | ok (clause humectant) |
| Drunk Elephant B-Hydra | sérum | 67 → 68 | 83 → 81 | 82 → 74 | — | ok |
| Drunk Elephant A-Gloei (5 ingrédients) | sérum | 88 → 92 | 100 → 99 | 76 → 80 | — | noté, pas exclu |
| Estée Lauder Advanced Night Repair | sérum | 76 → 64 | 85 → 71 | 83 → 65 | — | **à relire** (actifs sous la barre, D) |
| SKIN1004 Centella Ampoule | sérum | 49 → 48 | 22 → 39 | 57 → 50 | 65 | **à examiner** (fiche centella, D) |
| Dermalogica Dynamic Skin Retinol | sérum | 56 → 64 | 5 → 44 | 56 → 64 | 70 | mieux ; 7 composants parfumés |
| Paula's Choice 1 % Retinol | sérum | 76 → 86 | 85 → 89 | 79 → 87 | — | corrigé (rétinol lowDose) |
| [F] sérum rétinol en position 8 | sérum | 68 → 82 | 64 → 78 | 68 → 82 | — | le rétinol ne coûte plus rien |
| [F] sérum peptides + Retinol en dernière position | sérum | 66 → 82 | 69 → 86 | 71 → 82 | — | résiduel accepté (= rétinol honnête) |
| ANUA / VT PDRN / PC Resist Pure Radiance (« soupes ») | sérum | 92 → 86 / 86 / 89 | 100 → 100 | 100 → 96-99 | 80-85 | mieux ; Bubble Day Dream reste 92 (actifs en tête) |
| [F] eau + glycérine + gomme | sérum | 50 → 50 | 52 → 57 | 55 → 50 | < 55 | échec du prérequis conservé |
| The Ordinary Caffeine 5 % + EGCG | contour des yeux | 49 → **71** | 46 → 74 | 54 → 76 | 70 | corrigé |
| The Ordinary Squalane 100 % (classé démaquillant) | démaquillant | 74 → 72 | 78 → 79 | 74 → 72 | 65 | ok |
| LRP Anthelios UV Hydra SPF 50 | solaire | 39 → **NE** (38) | | | 80+ | **données** : filtres absents de la liste US |
| LRP Anthelios Mineral Tinted SPF 50 | solaire | 33 → **NE** (60) | | | 75 | **données** : TiO2 absent de la liste |
| LRP Anthelios Melt-in Milk SPF 100 | solaire | 74 → 74 | 60 → 75 | 89 → 82 | 75 | ok |
| Vanicream Mineral SPF 30 | solaire | 68 → **82** | 82 → 93 | 75 → 89 | 80 | corrigé |
| Cetaphil Sheer Mineral SPF 50 | solaire | 65 → **80** | 67 → 94 | 80 → 90 | 75 | corrigé |
| Avène Mineral SPF 50 | solaire | 58 → **77** | 64 → 94 | 65 → 84 | 75 | corrigé |
| Neutrogena Hydro Boost SPF 50 (octocrylène, parfum) | solaire | 73 → 73 | 60 → 73 | 85 → 80 | 60 | un peu haut (fiche différente de celle du rapport produit) |
| [F] gel nettoyant parfumé (SLES + 2 allergènes) | nettoyant | 42 → 42 | 5 → 33 | 47 → 42 | — | perso : une ligne parfum |
| [F] crème + « Parfum » (opaque) | hydratant | 66 → 64 | 64 → 59 | 76 → 79 | — | |
| [F] crème + Parfum + 6 allergènes (transparente) | hydratant | 58 → 56 | 5 → 51 | 68 → 71 | — | prime à l'opacité côté perso : 54 → 8 points |

Lecture : 14 étalons « corrigés », 4 en « données » (non évaluables ou fiche à compléter), 4 « à surveiller / relire » (Effaclar Clarifying, ANR, SKIN1004, Thayers), le reste stable et proche de l'attendu.

---

## F. Distribution finale, monotonie, robustesse, plafonds

### Note formule, avant / après (2 916 produits avant ; 2 851 notés après, 65 non évaluables)

| | moy | méd | % vert (≥ 75) | % rouge (< 45) | max | nettoyant | démaq. | tonique | exfoliant | sérum | traitement | hydratant | yeux | solaire | masque |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **V0** | 65,0 | 66 | 26,9 | 7,0 | 94 | 63 | 64 | 66 | 59 | 69 | 66 | 69 | 73 | 64,5 | 66 |
| **final** | 65,6 | 67 | 29,4 | 6,1 | 92 | 63 | 64 | 65 | 59 | 69 | 70 | 67 | 74 | 74 | 66,5 |

Verts par famille, V0 → final : nettoyants 18,8 → 19,5 · démaquillants 21,9 → 29,0 · toniques 27,0 → 24,4 · exfoliants 19,8 → 27,9 · sérums 31,8 → 35,0 · traitements 26,9 → 40,6 · hydratants 35,5 → 26,1 · contour des yeux 37,1 → 42,7 · solaires 20,7 → 39,2 · masques 20,1 → 19,4.
Rouges par famille : nettoyants 8,6 → 6,9 · toniques 14,5 → 15,8 · exfoliants 20,9 → 19,2 · sérums 0,6 → 3,1 · contour des yeux 13,3 → 11,9 · solaires 10,3 → 0,4 · les autres ≤ 3 %.
16 % des produits changent de bande (1 057 montent, 1 350 descendent, écart moyen +0,2, 11,9 % bougent de 10 points ou plus). Aucun produit à 100 (max 92) : le sommet reste réservé.

### Note perso, avant / après (produits notés)

| profil | écart moyen à la formule | p10 | % vert | % rouge | % au plancher 5 |
|---|---|---|---|---|---|
| sens3 (normale, sensibilité 3) | −15,9 → **−6,6** | −45 → −19 | 20,3 → 28,2 | 38,7 → 28,1 | 15,2 → **0,3** |
| sèche réactive | −10,2 → **−0,3** | −44 → −15 | 33,5 → 40,2 | 34,8 → 19,9 | 14,2 → **0,2** |
| grasse acnéique | +7,1 → +4,5 | −6 → 0 | 47,6 → 40,5 | 5,0 → 5,6 | 0 → 0 |
| normale, rides + taches | +3,4 → +5,1 | −11 → −2 | 45,4 → 43,9 | 14,2 → 6,6 | 0,9 → 0 |
| grasse, rides | +9,0 → +5,0 | −2 → 0 | 51,4 → 42,2 | 4,0 → 5,1 | 0 → 0 |
| rougeurs (sensibilité 2) | −11,0 → **−3,2** | −39 → −14 | 27,0 → 32,0 | 31,3 → 20,1 | 10,5 → 0,1 |

### Monotonie et robustesse (paquet final, catalogue entier)

| test | V0 | final |
|---|---|---|
| ajouter la niacinamide en fin de liste : produits dont la note baisse | 0 | **0** |
| ajouter « Parfum » en fin de liste : produits dont la note monte | 0 | **0** (coût moyen −14,2) |
| recopier les 5 premiers ingrédients en fin de liste (doublon) : produits qui gagnent | 264 | **0** |
| ajouter de l'eau en position 1 : produits qui montent | 143 | 80 |
| ajouter la niacinamide en position 1 : produits qui baissent | 165 | 167 (falaise 10/11, section D) |
| un ingrédient du top 5 mal lu : écart moyen / p90 / max | 1,7 / 6 / 31 | 1,6 / 5 / 32 |
| deux voisins inversés : écart moyen / max | 0,2 / 14 | **0,1 / 10** |

### Plafonds et triches

- Plafonnés : 15 produits, tous pour un ingrédient interdit dans l'UE en produit posé (14 à 45) ou l'hydroquinone (49) ; **0 note perso au-dessus de son plafond** (5 avant). La comédogénicité ne plafonne plus rien (14 avant).
- Triches sur The Ordinary Niacinamide (base 78) : +3 actifs après le conservateur **78** (+15 avant) · +8 extraits en queue **80** (+20 avant) · +céramide + tocophérol en queue **81** (+24 avant) · +Retinol en queue **81** (résiduel +3) · « Perfume » au lieu de « Parfum » **66** (78 avant : la triche coûte enfin autant que le parfum).
- Prime à l'opacité : crème « Parfum » vs même crème + 6 allergènes déclarés, perso sensibilité 3 : 57 / 49 (avant : 64 / 5).

---

## G. Annexe actionnable

### G1 — Correctifs de DONNÉES (`data/scan/dictionnaire.json`, `data/scan/ingredients-canon.json`, `data/scan/catalog.json`)

Dictionnaire — fonctions :
- `ZINC OXIDE`, `ZINC OXIDE (NANO)`, `ZINC OXIDE (CI 77947)`, `BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE`, `METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL` (+ NANO), `DROMETRIZOLE TRISILOXANE`, `TRIS-BIPHENYL TRIAZINE` → `["filtre-uva","filtre-uvb"]`.
- Nouvelles fiches : `OCTISALATE` (uvb, alias de `ETHYLHEXYL SALICYLATE`), `DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE` (uva), `DIETHYLHEXYL BUTAMIDO TRIAZONE` (uvb), `TITANIUM DIOXIDE (NANO)` (uvb).
- Fonction `stabilisant-avobenzone` (nouvelle) sur : `OCTOCRYLENE`, Tinosorb S, Tinosorb M, `ETHYLHEXYL METHOXYCRYLENE`, `BUTYLOCTYL SALICYLATE`, `POLYSILICONE-15`, `DIETHYLHEXYL 2,6-NAPHTHALATE`, `DIETHYLHEXYL SYRINGYLIDENEMALONATE`, `DIETHYLHEXYL BUTAMIDO TRIAZONE`.
- `tensioactif-doux` ajouté à : `PEG-6 CAPRYLIC/CAPRIC GLYCERIDES`, `POLOXAMER 184`, `POLOXAMER 188`, `PEG-40 HYDROGENATED CASTOR OIL`, `SODIUM LAUROYL LACTYLATE`, `POLYSORBATE 20`, `DISODIUM COCOAMPHODIACETATE`.
- `LECITHIN`, `HYDROGENATED LECITHIN`, `DILINOLEIC ACID/BUTANEDIOL COPOLYMER` : retirer `lipide-barriere`, mettre `emollient`.

Dictionnaire — drapeaux et niveaux :
- `fragrance: false` (garder `euFragranceAllergen: true`, sensibilisant inchangé) : `BENZYL ALCOHOL`, `PHENETHYL ALCOHOL`, `PHENYLPROPANOL`, `4-T-BUTYLCYCLOHEXANOL`, `BENZOIC ACID`. Revue des 76 fiches `fragrance: true` hors allergènes UE et hors HE (`NEOHESPERIDIN DIHYDROCHALCONE`, `MALTOL`, `THYMOL`, `CINNAMIC ACID` douteux).
- `PROPYLENE GLYCOL` : irritant 1, sensibilisant 2. `TRICLOSAN` : irritant 1, `restreintUE`. `ADAPALENE` : `lowDose: true`. `MENTHOL` : strength 0, `lowDose: true`. `ETHANOL` → alias `ALCOHOL` avec `dryingAlcohol`.
- `NIACINAMIDE` : benefits `blemishes, oiliness, aging, spots, redness, barrier`. `AZELAIC ACID` : + `redness`. `HAMAMELIS VIRGINIANA …` : power 1, benefits sans `redness` (à confirmer par le dermato). `GLYCERIN (VEGETABLE SOURCE)` / `(VEGETABLE DERIVED)` : power 2, benefits `dehydration`. Supprimer `ETANORULAYH MUIDOS`. `1,2-HEPTANEDIOL`, `1,3-PROPANEDIOL` : role `support` (pas « humectant »).
- Canonicaliser les 92 paires « nom botanique avec / sans parenthèse » divergentes sur la fiche de base (`CAMELLIA OLEIFERA (GREEN TEA) LEAF EXTRACT` ↔ `CAMELLIA OLEIFERA LEAF EXTRACT`, lavande, jojoba, coco, citron…).

Parsing / alias (`parseInci`, `ingredients-canon.json`) :
- Retirer en fin de jeton « n % », « USP », « (NANO) », les parenthèses vides ; jeton contenant PARFUM | FRAGRANCE | PERFUME | AROMA (hors AROMATIC) → `FRAGRANCE` ; `AVENE THERMAL SPRING WATER` et graphies d'eaux thermales → base eau. Pas de rapprochement flou.

Catalogue :
- Champ `filtresUV` hors solaire : recalculer selon B4(a) (32 produits à passer à `false`).
- Re-scraper la section « Active ingredients » des fiches US de solaires (11 listes sans aucun filtre : Anthelios UV Hydra / UV Control / UV Tone / Kids, Neutrogena Beach Defense, Clarins UV Plus, Bioderma Photoderm Nude Touch…) et le TiO2 d'Anthelios Mineral Tinted.
- Compléter l'INCI de Weleda Skin Food (fiche FR : parfum + allergènes) ; réparer Avène Tolérance Foaming (liste amputée) ; marquer les 65 « non évaluables » plutôt que les noter.
- Quiz allergies (`profil-peau.ts:324`, `allergiesDe()`) : sortir `BENZYL ALCOHOL`, `BENZYL BENZOATE`, `BENZOIC ACID`, `MENTHOL` du groupe « parfum » ; correspondance par jeton entier et familles canoniques (`dryingAlcohol`, `tensioactif-agressif`, `fragrance`, parabènes, isothiazolinones, lanoline, PG).

### G2 — Correctifs de RÈGLES (`src/lib/scan/scoring.mjs`, lignes de la version auditée)

| # | où | quoi |
|---|---|---|
| 1 | 299-318 `parseInci` | normalisations ci-dessus |
| 2 | 372-373 `@actifTop5` | gradué par w(pos) du meilleur actif power 3, `lowDose` → w = 1 |
| 3 | 375-377 `@photostable`, `@filtresUV` | lecture de la fonction `stabilisant-avobenzone` ; drapeau `filtresUV` accepté pour sunscreen seulement |
| 4 | 378 `@troisActifs` | remplacé par « un actif power ≥ 2 bien placé hors glycols OU humectant actif » (sérum, traitement) ; masques inchangés |
| 5 | 385-420 `evalueLigne` | dédoublonnage par nom ; `@actifs` ne compte que w ≥ 0,6 ou lowDose |
| 6 | 139, 153 | prérequis `douceur` (nouveau prédicat `@douceur`) et `dissout` (+ `emulsifiant`) |
| 7 | 169-170, 181, 192, 218, 240-241 | `pondere: true` sur `antiox` et `lipides` ; 219 : plafond `actifs` solaire 8 → 4 ; 257-266 : `indetermine.actifs` 20 → 14 |
| 8 | 326-331 `wPos` | `lowDose` : 1 en positions 1-10 ou avant la barre, 0,6 au-delà |
| 9 | 497 | `grav = irritant` (comédogène retiré) |
| 10 | 497-509 boucle risques | premier actif irritant (power ≥ 2, irritant 2, bien placé) sans malus générique ; suivants plein tarif |
| 11 | 510-518 | `banniUE` : cap 45 si `exposition ≥ 1`, sinon −5 × exposition ; `sensibilisant 3` hors parfum → −5 × sévérité × exposition |
| 12 | 537-545 | renvoyer `cap` et une ligne `plafond` dans `details` |
| 13 | 552, 681 `scorePerso` | `score = min(score, capAbsolu, F.cap)` |
| 14 | 568 | allergies : jeton entier + familles canoniques |
| 15 | 581 | matchs × `benefitPower/3` |
| 16 | 593-618 | parfum et HE : une ligne, × exposition ; sensibilisants 1-2 : −1 × niveau × S/3 × w × exposition, plafond −8 × S/3 ; nouveau canal irritant (irritant 2 seulement, exclusions, plafond −10 × S/3) ; alcool aussi pour S ≥ 2 |
| 17 | 606-610 | comédogène : ≥ 4, ou ≥ 3 en top 5 ; peau grasse/mixte OU préoccupation ; plafond −6 |
| 18 | 561, 353, 611-614, 624-629, 672-675 | force et alcool × w(pos) ; une seule ligne force (−5/cran, +5 si acide posé et S ≥ 2) |
| 19 | 336-357, 63-68, 635-643 | richesse par classes ; `seuilRiche` 4, `seuilLegere` 1,5 ; rien sur `exposition < 1` ; « légère » seulement hydratant / yeux |
| 20 | `lire-inci/route.ts:49-56`, `fiche/route.ts:46`, `categorise.mjs` | garde « non évaluable » et badges (B4) ; min des deux grilles si catégorie incertaine |
| 21 | (dernier) grilles | S9 : max atteignable, prérequis en part du budget, bandes |

### G3 — Scripts de simulation à conserver (`scratchpad/debat/`)

- `scoring-sim.mjs` : copie du moteur avec 36 interrupteurs (`SIM.*`) ; `patch.mjs` → `patch5.mjs` la reconstruisent depuis `src/lib/scan/scoring.mjs` ; `verif.mjs` prouve l'identité à interrupteurs éteints.
- `sim3.mjs` : banc final — `ARB1` … `ARB7` (les sept arbitrages), `FINAL '<knobs JSON>' P9` (paquet retenu : `{"s5Mode":"first","prereqMode":"d6d","comedoMode":"produit","banMode":45,"matchScale":"p3"}`).
- `sim2.mjs` : phase 2 (F1-F4, ATTR brique par brique, S4, PACK) ; `lib.mjs`, `distribution.mjs`, `monotonie.mjs`, `perso.mjs`, `robustesse.mjs`, `complements.mjs`, `simul.mjs`, `seuils.mjs` : phase 1.
- Rapports : `rapport-1-*.md`, `rapport-2-*.md`, `rapport-final.md`.
- Usage : `cd <dépôt> && node <script>` ; le moteur lit `data/scan/` depuis la racine du dépôt. Les scripts des deux autres agents (`scoring-sim-dermato.mjs`, `variants/`, `bench.mjs`) sont dans le même dossier.
