# Rapport 1 — Audit dermato-cosmétologique du moteur de notation

Périmètre : `src/lib/scan/scoring.mjs` (v2.0.0-metier), `data/scan/dictionnaire.json` (3 165 fiches), `data/scan/catalog.json` (2 950 produits visage notés). Lecture seule. Tous les chiffres ci-dessous viennent d'exécutions réelles du moteur (scripts dans `scratchpad/debat/exp-dermato*.mjs`).

Niveaux de certitude utilisés : **établi** (consensus, réglementation ou RCT), **débattu** (littérature contradictoire), **je ne sais pas**.

---

## D1 — Solaires : la grille « protéger des UV » se trompe de filtres

**Gravité : bloquant** (291 produits, la catégorie où l'app se veut la plus utile).

**Constat.**
- `@spectreLarge` exige un `filtre-uva` ET un `filtre-uvb` (scoring.mjs:370). Or ZINC OXIDE n'est que `filtre-uva` (dictionnaire), donc un solaire minéral à l'oxyde de zinc seul n'est pas « spectre large ». Calcul : solaire ZnO seul → **61** ; le même avec TiO2 ajouté → **75**.
- Sur les 69 solaires du catalogue sans le mérite « broad spectrum », **44 contiennent un filtre à spectre large** (ZnO, Tinosorb S, Tinosorb M, Mexoryl XL) que le dictionnaire classe UVA seul ou sans fonction.
- Filtres présents dans les INCI mais sans fonction `filtre-uv*` : Uvinul A Plus (DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE, 16 produits, absent du dictionnaire), Tinosorb M (7, fonctions `[]`), Iscotrizinol (5, absent), variantes « (NANO) » (9).
- `@photostable` (scoring.mjs:375-376) cherche `OCTOCRYLENE|TINOSORB|BEMOTRIZINOL|BISOCTRIZOLE|POLYSILICONE-15|DIETHYLHEXYL`. « Tinosorb », « bemotrizinol », « bisoctrizole » sont des noms commerciaux/USAN qui n'apparaissent jamais dans une INCI. Résultat : 25 solaires reçoivent −10 « avobenzone with nothing to stabilise it », dont **16 contiennent Tinosorb S/M ou Mexoryl** (Anthelios UVMune 400, Anthelios Age Correct, Photoderm XDefense…). Les stabilisants réels les plus fréquents du catalogue sont ignorés : ETHYLHEXYL METHOXYCRYLENE (26 produits), BUTYLOCTYL SALICYLATE (111).
- Donnée catalogue : 26 solaires prennent −25 « no UV filter at all ». Ce sont presque tous des produits US dont la section « Active ingredients » (avobenzone, ZnO…) a été perdue au scrape : Anthelios UV Hydra/UV Control/UV Tone, Naturium Dew-Glow, etc.

**Pourquoi c'est un problème.** Établi : l'oxyde de zinc absorbe de 290 à 400 nm, c'est le filtre minéral de référence pour l'UVA1 ; Tinosorb S, Tinosorb M et Mexoryl XL sont des filtres à large spectre ; Tinosorb S/M et le methoxycrylène stabilisent l'avobenzone. Un solaire minéral ZnO 20 % noté sous un ZnO+TiO2 est une inversion factuelle.

**Proposition.**
1. Dictionnaire : ZINC OXIDE, BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE, METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL, DROMETRIZOLE TRISILOXANE → `["filtre-uva","filtre-uvb"]`. Ajouter DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE (uva), DIETHYLHEXYL BUTAMIDO TRIAZONE (uvb), TRIS-BIPHENYL TRIAZINE (uva+uvb). Alias « (NANO) » / « [NANO] » vers la base.
2. `@photostable` : remplacer la regex par une lecture de fonction `stabilisant-avobenzone` portée par OCTOCRYLENE, BIS-ETHYLHEXYLOXYPHENOL…, METHYLENE BIS-BENZOTRIAZOLYL…, ETHYLHEXYL METHOXYCRYLENE, BUTYLOCTYL SALICYLATE, POLYSILICONE-15, DIETHYLHEXYL 2,6-NAPHTHALATE, DIETHYLHEXYL SYRINGYLIDENEMALONATE.
3. Catalogue : marquer « analyse partielle » tout solaire sans aucun filtre reconnu plutôt que −25, tant que les listes US ne sont pas réparées.

**Effet attendu / effet de bord.** 44 solaires remontent d'environ +14 ; 16 récupèrent +10. Risque : aucun scientifique ; un léger tassement vers le haut de la famille solaire.

---

## D2 — Les sensibilisants forts et les ingrédients interdits n'ont AUCUN effet sur la note formule

**Gravité : bloquant** (registre sécurité).

**Constat.** `grav = max(irritant, ceil(comedogenic/2))` (scoring.mjs:497) ignore `risks.sensibilisant`. METHYLISOTHIAZOLINONE est irritant 1 / sensibilisant 3 / `banniUE: true` → grav 1 → rien. Les champs `banniUE`, `libereFormaldehyde`, `restreintUE`, `pregnancyLevel` ne sont lus nulle part dans scoring.mjs (grep vide). Calcul : crème témoin conservée MI + MCI → **75** ; même crème au phénoxyéthanol → **75** ; profil sensibilité 0 → 75 aussi. Catalogue : 16 produits avec MI/MCI, 13 avec libérateur de formaldéhyde, 29 avec un ingrédient banni UE — tous notés comme si de rien n'était pour toute personne « non sensible ».

**Pourquoi c'est un problème.** Établi : la sensibilisation de contact est un risque de population, pas un trait de « peau sensible ». L'épidémie MI (2010-2016 ; prévalence de sensibilisation jusqu'à ~6-10 % des patients patch-testés en Europe) a conduit à l'interdiction UE en produits non rincés (2017). Les libérateurs de formaldéhyde et les isothiazolinones sont classés allergènes forts par le SCCS. La scission « irritation = formule, sensibilisation = perso » (commentaire scoring.mjs:42-46) est juste pour le decyl glucoside (niveau 2), fausse pour le niveau 3.

**Proposition.**
- Formule : `sensibilisant === 3` → malus fixe comme le parfum (−5 × sévérité × exposition), hors complexe parfumant.
- `banniUE: true` → plafond non compensatoire à 45 (jamais vert) ; `libereFormaldehyde` → −4 fixe.
- Perso : inchangé pour les niveaux 1-2.

**Effet attendu / effet de bord.** ~30 produits US descendent de 5 à 15 points. Aucun faux positif attendu : la liste `sensibilisant 3` du dictionnaire (22 entrées) est propre.

---

## D3 — L'alcool benzylique est compté comme un parfum : 59 produits perdent « sans parfum »

**Gravité : bloquant** (erreur de donnée à fort effet).

**Constat.** BENZYL ALCOHOL a `fragrance: true` (dictionnaire). Or `@sansParfum` exige qu'AUCUN ingrédient n'ait `fragrance` (scoring.mjs:366), et le malus fixe parfum s'applique (scoring.mjs:511). Calcul : crème témoin **75** → **61** en remplaçant phénoxyéthanol par alcool benzylique (−14). 59 produits du catalogue n'ont AUCUN parfum sauf ce conservateur (The Ordinary Glucoside Cleanser, Multi-Peptide Eye Serum, Sunday Riley Auto Correct…). PHENETHYL ALCOHOL est dans le même cas. À l'inverse, 22 produits contenant « FRAGRANCE (PERFUME) », « PARFUM/ », « FRAGRANCE (PARFUM). [BI 715] » n'ont aucun token reconnu comme parfum.

**Pourquoi c'est un problème.** Établi : l'alcool benzylique est un conservateur (annexe V du règlement 1223/2009, ≤1 %). Il figure sur la liste des allergènes à déclarer, mais le SCCS le classe sensibilisant faible. Un produit « fragrance-free » conservé à l'alcool benzylique est réellement sans parfum.

**Proposition.** BENZYL ALCOHOL, PHENETHYL ALCOHOL, BENZOIC ACID : `fragrance: false`, `euFragranceAllergen: true`, `sensibilisant: 1`. Normaliser au parsing tout token contenant PARFUM|FRAGRANCE|PERFUME|AROMA → FRAGRANCE.

**Effet attendu / effet de bord.** +10 à +14 sur 59 produits. Effet de bord : un produit parfumé uniquement à l'alcool benzylique n'existe pas en pratique.

---

## D4 — La comédogénicité (échelle lapin) est un malus universel, avec plafond « jamais vert »

**Gravité : important.**

**Constat.** `grav` intègre `ceil(comedogenic/2)` (scoring.mjs:497) pour TOUT LE MONDE, et `grav ≥ 3` déclenche le plafond 49/69 (scoring.mjs:508). 304 produits prennent un malus formule pour la seule comédogénicité. Calcul : baume « Water, Triticum Vulgare Germ Oil, Glycerin, Shea, Ceramide NP, Cholesterol, Panthenol… » → formule **49 (plafonné, jamais vert)** ; perso peau sèche/barrière : 69. Puis le perso re-pénalise la peau grasse (scoring.mjs:606) : double comptage (crème coco+isopropyl myristate : formule 59, perso grasse 53).

**Pourquoi c'est un problème.** Établi : les indices comédogènes (Fulton 1989, source citée dans les fiches) viennent du modèle oreille de lapin, qui surestime ; Draelos & DiNardo 2006 (JAAD) ont montré que la cote d'un ingrédient ne prédit pas celle du produit fini. Débattu : l'intérêt même du concept pour les peaux acnéiques. Pour une peau sèche, l'huile de germe de blé (acide linoléique, vitamine E) n'est pas un défaut de formule.

**Proposition.** Retirer `comedogenic` du calcul de `grav` en formule (et donc du plafond). Perso : garder −3 × w(pos), déclenché par la préoccupation `blemishes` ou `oiliness` (pas par le seul `skinType`), seulement pour `comedogenic ≥ 4`.

**Effet attendu / effet de bord.** 304 produits regagnent 1 à 6 points ; 10 sortent d'un plafond. Effet de bord : les peaux grasses perdent un signal faible mais parlant — compensé par la règle perso.

---

## D5 — Les rétinoïdes sont structurellement sous-notés

**Gravité : important.**

**Constat.** `@actifTop5` (scoring.mjs:372) lit la position brute `pos ≤ 5`, sans l'exception `lowDose` que `wPos` applique pourtant (scoring.mjs:327). Le rétinol dose 0,1-1 % : dans le catalogue, position médiane **16**, 12 occurrences sur 156 en pos ≤5. Calcul : sérum vitamine C (acide ascorbique pos 2) → **82** ; sérum rétinol (pos 10, ≈0,5 %) → **65**. Sur 73 sérums/traitements au rétinol ou rétinal, 20 seulement ont le mérite « concentré » (toujours via un autre actif). Dermalogica Dynamic Skin Retinol Serum : 56 avec « too few actives ».

**Pourquoi c'est un problème.** Établi : le rétinol/rétinal est l'actif anti-âge topique le mieux documenté (RCT en double aveugle, Kafi 2007 ; le rétinaldéhyde aussi). Le moteur a formalisé le bon principe (`lowDose` = poids plein) mais ne l'applique pas au critère qui pèse le plus (16-18 points de grille).

**Proposition.** `@actifTop5` : `(it.pos <= 5 || it.fiche?.lowDose) && benefitPower >= 3`. Idem dans `@troisActifs`/richesse si D6 est retenu.

**Effet attendu / effet de bord.** ~50 sérums rétinol +10 à +14. Effet de bord : les peptides (lowDose, power 2) ne sont pas concernés (seuil power 3), c'est voulu.

---

## D6 — « Trois actifs » comme ticket d'entrée du sérum récompense la liste longue, pas l'efficacité

**Gravité : important.**

**Constat.** Prérequis `@troisActifs` : −12 si moins de 3 fiches `role: active` avec bénéfices (scoring.mjs:164, 378). Le dictionnaire compte 1 572 « actifs », dont 1 332 à power 1 (extraits botaniques « traditionnel/in-vitro »). Calcul : The Ordinary Niacinamide 10 % + Zinc 1 % → **66** (−12 « too few actives ») ; sérum « cocktail » de 12 extraits tous placés APRÈS la barre 1 % → **69**.

**Pourquoi c'est un problème.** Établi : l'efficacité dépend de l'actif, de sa dose et de sa formulation (pH, véhicule), pas du nombre d'entrées. Une formule mono-actif bien dosée est la norme des produits à preuves (niacinamide 10 %, azélaïque 10 %, vitamine C 15 %). Le critère actuel note la stratégie marketing « 20 extraits » au-dessus.

**Proposition.** Prérequis sérum/traitement/masque : « au moins UN actif power ≥ 2 avec w(pos) ≥ 0,6 ou lowDose ». Ligne « richesse » : ne compter que les actifs à w ≥ 0,6 ou lowDose, plafond 3 familles.

**Effet attendu / effet de bord.** Les sérums minimalistes (+12), les cocktails de traces baissent de 3 à 6. Effet de bord : quelques sérums coréens « multi-extraits » légitimes (centella à 70 %+) restent bien notés car centella est en tête de liste.

---

## D7 — La force du produit et l'alcool sont lus sans tenir compte de la position (côté perso)

**Gravité : important.**

**Constat.**
- `natureProduit.forceMax` = max `strength` sur TOUTE la liste (scoring.mjs:353) ; `strengthMax` idem (scoring.mjs:561). 1 432 produits sur 2 209 ayant une force la tirent d'un ingrédient au-delà de la position 10 ou de la barre 1 %. Exemple réel : Effaclar Duo+ SPF 30, acide salicylique en pos 33 → « Stronger than your skin's comfort zone » −5 pour un profil plafond 1. Crème avec SA en pos 9 après le phénoxyéthanol, catégorie treatment, sensibilité 3 → −10 « Strong exfoliating actives » ET −5.
- `dryingAlcohol × peau sèche` → −6 sans w(pos) (scoring.mjs:611). Sérum témoin avec « Alcohol » en pos 11 (solvant d'un extrait) → −6. 162 produits ont de l'alcool UNIQUEMENT après la position 5.

**Pourquoi c'est un problème.** Établi : l'irritation des acides et de l'éthanol est dose-dépendante ; 0,1 % de SA ou d'éthanol résiduel d'un extrait n'a aucun effet mesurable. Le moteur applique lui-même ce principe côté formule (`w(pos)`, `pos ≤ 5` pour l'alcool) et l'oublie côté perso.

**Proposition.** `forceMax` et `strengthMax` : ne retenir que les ingrédients avec w ≥ 0,6 ou lowDose. `malusAlcoolSeche` : × w(pos), ou seulement si pos ≤ 5 (cohérent avec la formule).

**Effet attendu / effet de bord.** Faux malus retirés sur ~1 400 fiches perso pour les profils sensibles/secs. Aucun effet de bord scientifique.

---

## D8 — « Peau réactive » est traitée comme « allergie de contact », et les irritants sont ignorés côté perso

**Gravité : important.**

**Constat.** `irritant` n'est lu qu'à la ligne 497 (formule). Côté perso, la sensibilité déclenche : sensibilisants (−3 × niveau × S/3 × w), parfum, HE, sulfates, force. Calcul, sensibilité 3 :
- nettoyant doux parfumé : « Coco-glucoside — a known contact allergen » −6, « Cocamidopropyl betaine » −6 ;
- 286 solaires sur 290 prennent un malus « allergène » moyen de **−8,1** (octocrylène sensibilisant 2 en tête de liste) ;
- tonique au menthol + hamamélis : menthol −0,9 étiqueté « contact allergen », hamamélis 0. L'exemple §5 de la spec (« Menthol × peau réactive −4 ») ne se produit pas.

**Pourquoi c'est un problème.** Établi : la « peau sensible » (picotements, brûlures, tiraillements — définition Misery et al. 2017) est une hyperréactivité neurosensorielle aux IRRITANTS (menthol, alcool, acides, parfum, propylène glycol, eucalyptus, hamamélis). L'allergie de contact est un mécanisme immunitaire distinct qui ne concerne que les personnes sensibilisées (c'est le rôle du champ `allergies` du profil). Les glucosides et la bétaïne sont précisément les tensioactifs recommandés aux peaux sensibles ; les punir de −6 chacun contredit la pratique dermatologique.

**Proposition.**
- Perso : nouvelle ligne « irritant × réactivité » : −2 × irritant(1-2) × S/3 × w(pos), libellé « may sting on reactive skin ».
- Sensibilisants niveau 1-2 : ne pénaliser (−1 × w) qu'à sensibilité 3, ou si l'utilisateur déclare un antécédent d'eczéma de contact ; libellé « listed contact allergen » sans « your skin reacts easily ».
- Niveau 3 : en formule (D2).

**Effet attendu / effet de bord.** Les nettoyants doux remontent chez les sensibles (voulu) ; les toniques au menthol/alcool descendent (voulu). Effet de bord : le solaire à l'octocrylène perd son malus perso ; l'allergie à l'octocrylène est réelle mais rare (photoallergie, surtout enfants et patients kétoprofène) — une mention informative suffit.

---

## D9 — La texture « riche » se déduit de mots-clés qui incluent les émulsifiants et les esters légers

**Gravité : important** (pilote −12 / +6 côté perso).

**Constat.** `MOTS_RICHE` (scoring.mjs:336) contient STEARATE, PALMITATE, MYRISTATE, TRIGLYCERIDE, SQUALANE. Calcul : lotion « Water, Glycerin, Caprylic/Capric Triglyceride, Glyceryl Stearate, PEG-100 Stearate… » → richesse 9 → **riche** → −12 pour une peau grasse. Sur 134 hydratants « riches », **66** doivent ≥50 % de leur score à des stéarates/esters/CCT/squalane (Vanicream Daily Facial Moisturizer : 9/9 ; Kiehl's Ultra Facial Cream 7,3/10,1).

**Pourquoi c'est un problème.** Établi : la richesse sensorielle et occlusive dépend de la fraction et de la nature de la phase grasse — beurres, cires, pétrolatum, lanoline > huiles végétales > esters courts, CCT, squalane (émollients « secs », à étalement rapide). Glyceryl stearate et PEG-100 stearate sont des émulsifiants (1-3 %), pas des corps gras.

**Proposition.** Pondérer par classe : beurre/cire/pétrolatum/lanoline/shea 1,0 ; « OIL » 0,7 ; ester/CCT/squalane/alkane 0,3 ; STEARATE précédé de GLYCERYL/PEG/SORBITAN/SUCROSE/POLYGLYCERYL → 0. Relever `seuilRiche` après recalibrage sur Toleriane Riche (10,3, doit rester riche) et CeraVe PM (4,3, doit rester non riche).

**Effet attendu / effet de bord.** ~60 lotions légères cessent d'être « heavy for your oily skin ». Effet de bord : les crèmes riches vraies restent riches (vérifié : Weleda Skin Food 9, Toleriane Riche 10,3).

---

## D10 — L'exposition rincé/posé ne s'applique pas au coût du parfum

**Gravité : mineur.**

**Constat.** `exposition` (0,55 nettoyant) multiplie le malus fixe (scoring.mjs:515) mais pas le mérite `@sansParfum` (12/50 de la grille nettoyant, scoring.mjs:141) ni `malusParfumSensible` (scoring.mjs:602). Calcul : parfum dans un nettoyant −13, dans une crème −14 ; à sensibilité 3, le nettoyant parfumé perd **38** contre 30 pour la crème — l'ordre est inversé.

**Pourquoi c'est un problème.** Établi : seuils UE de déclaration des allergènes 0,01 % rincé vs 0,001 % posé (×10) ; le temps de contact d'un nettoyant est de 30-60 s. Débattu : les rincés restent une source d'eczéma de contact (savons mains). Le facteur d'exposition est bien pensé, il est simplement contourné par la grille.

**Proposition.** Multiplier `pts` de `sansParfum` par `exposition` dans les grilles rincées (ou 8 au lieu de 12-14), et `malusParfumSensible` × exposition.

---

## D11 — Qualité du dictionnaire : doublons divergents et fiches clés incomplètes

**Gravité : mineur à important** (cumul).

**Constat (preuves dictionnaire).**
- 257 paires « nom botanique avec / sans parenthèse » coexistent, **92 divergent** : LAVANDULA ANGUSTIFOLIA OIL sens 3 vs (LAVENDER) OIL sens 2 ; jojoba comedo 0 vs 1 ; coco barrier vs dehydration ; citron irritant 1 vs 2. L'alias (`ingredients-canon.json`, 348 entrées) ne les canonicalise pas → la note dépend de la graphie de la marque.
- NIACINAMIDE : benefits `blemishes, oiliness, aging` ; NIACINAMIDE (VITAMIN B3) : + `spots, redness, barrier`. Établi : niacinamide a des RCT sur la pigmentation (Hakozaki 2002), la barrière/céramides (Tanno 2000) et les rougeurs (Draelos 2005). La fiche canonique prive une préoccupation « taches » de son actif le plus courant.
- AZELAIC ACID : `blemishes, spots` sans `redness`. Établi : indication AMM rosacée (15 %).
- GLYCERIN (VEGETABLE SOURCE) power 3 + barrier vs GLYCERIN power 2. ETANORULAYH MUIDOS (inversion corrigée au catalogue le 26/08) toujours présent avec power 3.
- PROPYLENE GLYCOL irritant 2 (même niveau que SLS) : 267 produits pénalisés en formule, −2,3 en moyenne. Établi : CIR safe as used ; ACDS Allergen of the Year 2018 comme sensibilisant faible → irritant 1, sensibilisant 1.
- LECITHIN / HYDROGENATED LECITHIN / DILINOLEIC ACID-BUTANEDIOL COPOLYMER classés `lipide-barriere` : 54 des 201 hydratants « barrier lipids — rebuilds, not just coats » n'ont QUE ça. Établi : la lécithine est un émulsifiant phospholipidique, pas un lipide du stratum corneum (céramides, cholestérol, acides gras libres).
- TOCOPHEROL strength 1, sensibilisant 1 ; SQUALANE support sans bénéfice alors qu'ARGAN OIL est power 2 (« essais humains limités »). Bruit.

**Proposition.** Canonicaliser au parsing (retirer les parenthèses botaniques, unifier sur la fiche de base), supprimer l'entrée inversée, corriger les 6 fiches nommées, sortir lécithines/copolymère de `lipide-barriere` (les mettre en `emollient`).

---

## D12 — Grossesse : cohérent sur les rétinoïdes, muet sur le reste, et sans notion de dose

**Gravité : mineur.**

**Constat.** Cap 15 sur `pregnancyFlag` (9 fiches : rétinoïdes + hydroquinone), quelle que soit la position : retinyl palmitate en pos 20 (trace antioxydante) → **15**. `pregnancyLevel` 2 (SA, arbutine, romarin…) et 3 (parabènes, BENZOPHENONE-3, triclosan) ne sont jamais lus : solaire à l'oxybenzone pos 3, profil enceinte → 0 fait.

**Pourquoi.** Établi : éviter les rétinoïdes topiques en grossesse est la recommandation dermatologique standard (précaution, preuves de tératogénicité topique faibles). Ne PAS bloquer l'acide salicylique ≤2 % est correct (absorption systémique faible, consensus ACOG/revue Bozzo 2011). Débattu : l'oxybenzone (passage systémique démontré, Matta 2019 ; SCCS 2021 a abaissé la limite) mérite au minimum une information, pas un cap.

**Proposition.** `pregnancyFlag` : cap 15 seulement si w ≥ 0,6 ou lowDose ; sinon fait informatif « by precaution » avec cap 40. `pregnancyLevel 3` → fait informatif sans points.

---

## Ce qui est bien fait et ne doit pas changer

1. **Position INCI + barre des 1 % par marqueurs + exception `lowDose`.** C'est la meilleure approximation de la concentration sans les pourcentages. Vérifié sur CeraVe Hydrating Cleanser : phénoxyéthanol réellement en position 4, tout ce qui suit est ≤1 %, et le moteur le lit correctement. À protéger contre toute simplification « position brute ».
2. **Le plafond du complexe parfumant et la lecture des allergènes déclarés.** Déclarer LIMONENE/LINALOOL signifie « au-dessus du seuil 0,001 % » : un « Parfum » nu est réellement moins chargé qu'un « Parfum + 3 allergènes ». Différencier les deux sans multiplier les malus par 12 est scientifiquement juste et évite la prime à l'opacité.
3. **Le facteur d'exposition rincé/posé et la sévérité 1,8 du contour des yeux.** Exposition et zone sont les deux vrais déterminants de la dose délivrée. À généraliser (D10), pas à retirer.
4. **Grossesse et allergie déclarée en court-circuit binaire, jamais en ± points**, et l'acide salicylique cosmétique laissé libre. C'est le seul modèle validé (SkinSAFE) et la position dermatologique courante.
5. **Les grilles métier normalisées et les céramides pondérés par position.** CeraVe Moisturizing Cream 91 avec ses céramides en fin de liste à w 0,3 : le moteur ne se laisse pas acheter par le mot « ceramide » sur l'étiquette. Un nettoyant jugé sur sa douceur, un solaire sur ses filtres : c'est la bonne philosophie.
6. **Ingrédient inconnu = 0 point + badge « analyse partielle ».** Ni la punition de l'inconnu (EWG) ni sa neutralité silencieuse.
