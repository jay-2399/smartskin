# Rapport 2 — Débat, angle produit et terrain

Méthode : j'ai lu les deux rapports en entier, puis j'ai **simulé** chaque proposition contestée sur des copies patchées de `scoring.mjs` (dossier `scratchpad/debat/variants/`, dépôt intact), sur 49 étalons réels et sur les 2 950 produits du catalogue. Générateur : `variants.mjs` + `variants2.mjs` ; banc : `bench.mjs`. Profils : `sens3` (normale, sensibilité 3, rougeurs 2, plafond de force 1), `sensibleSeche` (sèche, S3, rougeurs + déshydratation), `grasseAcne` (grasse, S0, imperfections 3 + brillance 2, plafond 3), `aging` (normale, S1, rides 3 + taches 2). `FINAL3` = mon jeu de dix modifications, mesuré en fin de rapport.

---

## A. Position sur chaque observation des deux autres

### Rapport dermato (D1-D12)

| # | Verdict | Argument (produit réel, chiffres) |
|---|---|---|
| **D1** solaires | **D'accord** (= P2 + P3 + S8) | ZnO large spectre : Vanicream Mineral SPF 30 68 → 80, Cetaphil Sheer Mineral 65 → 79, Avène Mineral SPF 50 58 → 84. Condition : un solaire sans aucun filtre reconnu doit être **non évaluable**, pas « analyse partielle à −25 » (Anthelios UV Hydra reste à 38 même après DICO+UV : la liste US n'a simplement pas les filtres). Il en reste 14 après corrections. |
| **D2** sensibilisants 3 et bannis | **D'accord sous condition** | Le malus fixe −5 sur sensibilisant 3 hors parfum : oui. Le plafond 45 sur `banniUE` : **non tel quel**. La méthylisothiazolinone est légale en rincé (15 ppm) : Clinique For Men Face Scrub 73 → 45, Clinique Charcoal Face Wash 73 → 45 à tort. Sur 29 produits concernés, 14 sont rincés. Le lilial (BUTYLPHENYL METHYLPROPIONAL) est banni comme CMR, pas pour sa nocivité cutanée. Proposition : plafond **69** (jamais « excellent ») et seulement sur les produits posés ; en rincé, le malus fixe suffit. |
| **D3** alcool benzylique | **D'accord** (= P7) | Étendre à 4-T-BUTYLCYCLOHEXANOL (SymSitive : Cicalfate+ sérum 54 → 67), PHENETHYL ALCOHOL, PHENYLPROPANOL. Et l'alias PERFUME/AROMA → FRAGRANCE ferme une triche vérifiée : crème « + Perfume » 84 → 71. |
| **D4** comédogénicité | **D'accord sous condition** | D4 littéral (perso seulement si `blemishes`/`oiliness`, comedo ≥ 4) laisse passer la peau grasse sans préoccupation déclarée : Mixa Soin Nourrissant (isopropyl palmitate pos 3 + isopropyl myristate pos 5), profil grasse + rides : **42 → 58** ; SimplyVital (huile de coco pos 3) 53 → 65. Ma variante D4p (déclenche aussi sur `skinType: oily`, comedo 3 conservé en top 5) donne 52 et 60. Effaclar Duo+M (isocetyl stearate pos 4, produit testé non comédogène) : formule 79 → 82 dans les deux cas, c'est juste. |
| **D5** rétinoïdes | **D'accord**, avec S4 et LD10 | `@actifTop5` accepte lowDose : Dermalogica Retinol Serum 56 → 69, Paula's Choice 1 % Retinol 76 → 87, moyenne des 104 produits au rétinol 69,5 → 74,6. Mais D5 seul rouvre « Retinol en dernière position » (+10 sur un sérum peptides). Avec le poids lowDose = 1 en top 10 ou avant la barre des 1 %, 0,6 au-delà (LD10) et `@actifTop5` gradué par w (S4), la triche vaut +8 — identique à un rétinol honnête en position 4. **Résiduel assumé** : la position ne distingue pas 0,3 % de 0,01 %. |
| **D6** trois actifs | **D'accord sous condition** (variante D6d) | D6 littéral (« un actif power ≥ 2 à w ≥ 0,6 ») est un prérequis **mort** : la glycérine (power 2, pos 2) le satisfait partout — 3,1 % d'échecs, « eau + glycérine + gomme » 50 → 62. Si on exclut les glycols de base (D6b/D6c), on casse les sérums hydratants : Vichy Minéral 89 **63 → 51** (carbomer en pos 6 = barre, hyaluronate en pos 7 → w 0,3), Drunk Elephant B-Hydra 67 → 53, Estée Lauder ANR 76 → 61 ; et les masques passent de 7,7 % à **37,5 %** d'échecs (argiles sans « actif »). D6d : actif power ≥ 2 dosé (w ≥ 0,6 ou lowDose) hors glycols, **ou** humectant actif (hyaluronate, panthénol) à toute position ; masques sur la règle actuelle. Résultat : TO Niacinamide 66 → 78, SKIN1004 Centella Ampoule 53 → 65, Vichy 63 → 63, « eau + glycérine » 50 → 50, échecs sérum 4,3 → 4,9 %. |
| **D7** force et alcool sans position | **D'accord** (= S11, P8) | Dermalogica Retinol Serum, profil sens3 : **5 → 42** ; Effaclar Duo+M sens3 66 → 83 (acide salicylique en pos 34 ne déclenche plus « stronger than your comfort zone »). |
| **D8** réactivité = irritants | **D'accord sous condition** : irritant ≥ 2 seulement | D8 littéral crée du bruit : « Butylene glycol — may sting » sur Toleriane Dermallergo (76 → 74), « Homosalate / Octocrylene / Oxybenzone — may sting » −8 sur Neutrogena Hydro Boost SPF 50 (les filtres ne piquent pas). Restreint à irritant ≥ 2 (D8b) : Effaclar Clarifying (SA + glycolique + alcool + menthol) sens3 17 → 7, toner à l'alcool 22 → 17, Dermallergo 76, Sensibio 66, Cetaphil 70. Ordre attendu obtenu (voir friction 7). |
| **D9** richesse par classe | **D'accord** (inclus dans FINAL3) | Cohérent avec P8 ; non testé isolément. Point d'attention : Cicalfate+ (huile minérale pos 3 + hydrogenated vegetable oil) reste « riche » — c'est voulu. |
| **D10** exposition sur le parfum | **D'accord côté perso, pas côté formule** | Côté perso, `malusParfumSensible × exposition` : gel nettoyant parfumé, sens3, 36 → 44. Côté formule, multiplier le mérite `sansParfum` par l'exposition fait baisser **tous les nettoyants sans parfum** (Toleriane Purifying Foaming 75 → 70, Cetaphil Gentle 70 → 67, Sensibio 64 → 61) : la part normalisée se redistribue vers les critères qu'ils ne remplissent pas. % vert nettoyants 19 → 15 %, sur la famille déjà la plus basse (S9). Le malus fixe est déjà × exposition : ça suffit. |
| **D11** dictionnaire | **D'accord** ; à ajouter | Hamamélis : `benefits: redness, power 2` fait monter Thayers Witch Hazel Toner à **90** pour une peau sèche réactive (« Hamamelis targets your redness +7 ») alors que les dermatologues déconseillent l'hamamélis aux peaux réactives (tanins). Et les variantes « (Green Tea) » de P11. |
| **D12** grossesse | **D'accord** (mineur) | Non simulé. Le cap 15 sur un rétinyl palmitate en position 94 (Filorga) est absurde ; w ≥ 0,6 ou lowDose comme condition, oui. |

### Rapport statisticien (S1-S11)

| # | Verdict | Argument |
|---|---|---|
| **S1** parfum perso par ingrédient | **D'accord** (= P1) | Mesuré : crème + 6 allergènes déclarés, sens3 : 5 → 51 (opaque « Parfum » : 59). % du catalogue à 5 pour la peau sèche réactive : 14,0 → 0,2 %. Le plafond des sensibilisants (−12 × S/3) est inclus. |
| **S2** supprimer le mérite sansParfum | **Pas d'accord** | Simulé : (1) les références sans parfum **baissent** de 5 à 9 (CeraVe Hydrating 59 → 52, Cetaphil Gentle 70 → 63, Dermallergo 69 → 63, Sensibio 64 → 58, SKIN1004 53 → 46, Adapalene 47 → 38) ; (2) les parfumés **montent** (Weleda Skin Food US 55 → 60, Neutrogena Hydro Boost 60 → 64, Oak Essentials 19 parfums 61 → 66) ; (3) inversions : Weleda US 60 > Sensibio 58 > CeraVe Hydrating 52 ; crème « + Parfum » 71 → **78, verte** ; parfumés verts 1,8 → 10,4 % ; (4) les traitements passent de 3 à **23 % de rouges** (les patchs à 49 perdaient leur seul mérite). S2b (malus 8) corrige à moitié (parfumés verts 4,8 %) mais garde (1). L'alternative « mérite seul, malus 0 » (D10b) est pire : « Parfum + 6 allergènes » 63 → 75 vert, Weleda US 67. **Verdict friction 1 : garder les deux chemins (D10 côté perso seulement + S1).** Le « double comptage » est en réalité un mérite « ticket » + un malus « dose », et c'est lui qui tient la règle Yuka « parfum ⇒ rarement excellent ». |
| **S3** plafond formule contourné en perso | **D'accord** (inclus) | 5 produits ; aucune objection. |
| **S4** falaises de position | **D'accord** (inclus) | `@actifTop5` gradué par w : la « falaise 5 → 6 » devient 16 → 9,6 pts de grille. Combiné à LD10, il borne la triche rétinol. |
| **S5** pas de malus irritant sur actif prouvé | **D'accord sous condition : demi-tarif** (S5h) | S5 plein : peel AHA sans tampon 64 → **77 (vert)**, TO AHA 30 % + BHA 2 % 70 → **80**, Paula's Choice 25 % AHA peel → 80, Dr Dennis Gross Extra Strength **+18**, RoC 2-Step Peel +16. Profil grasse non sensible (plafond 3) : peel sans tampon 89 → **100**. D8 ne rattrape que les profils sensibles (sens3 : 61 → 43), pas la peau grasse « tout est permis ». Demi-tarif : peel sans tampon 70, TO AHA 30 % 75, PC 2 % BHA 82, rétinol pos 8 70 — l'actif ne devient plus net négatif (le point de S5), mais un acide en tête sans tampon reste sous le vert. |
| **S6** doublons | **D'accord** (inclus) | « Niacinamide écrit deux fois » 80 → 78 avec dédoublonnage + prérequis D6d. |
| **S7** grille indéterminée, listes tronquées | **D'accord sur deux points, pas sur le troisième** | Oui : noter sur les deux grilles les mieux votées et garder le min ; oui : `lecture.partielle` (retour vision) ⇒ pas de note. Non : « n < 12 ⇒ analyse partielle » — 11,2 % du catalogue, et parmi mes étalons Paula's Choice 2 % BHA (n = 8), Sensibio (10), Adapalene (8), Vanicream Moisturizing Cream (10), Cetaphil Gentle (10), Toleriane Eau Micellaire (9) : des formules **complètes et courtes**, c'est leur qualité. Voir friction 5. |
| **S8** solaires | **D'accord** (= P2/D1) | `@filtresUV` satisfait par le drapeau catalogue : Anthelios Mineral Tinted 33 → 59, Clinique UV Solutions 44 → 85, Naturium 40 → 65. Le plafond « actifs » 8 → 4 du solaire n'est pas simulé mais va dans le bon sens. |
| **S9** équité entre familles | **D'accord sur le diagnostic, à traiter APRÈS** | Sous FINAL3 : nettoyants 21 % verts, masques 19 %, sérums 42 %, contour des yeux 43 %. Recalibrer les plafonds maintenant reviendrait à calibrer sur des bugs de contenu (P4, P5, D3). À faire en dernier, analytiquement comme proposé. |
| **S10** allergie par sous-chaîne | **D'accord sur la mécanique, pas sur le chiffre** | Le profil v1 n'accepte **aucun texte libre** : `allergiesDe()` (profil-peau.ts:324) déplie les groupes du quiz q7 en 137 noms INCI du dictionnaire ; « alcohol » n'est pas saisissable. Les débordements de sous-chaîne réels sont bénins (D-LIMONENE, ETHYL LINALOOL, POLYCITRONELLOL, 4-TERPINEOL). **Le vrai problème mesuré** : cocher « allergie au parfum » plafonne **1 290 produits (44 %)** à 10/100, dont **68 uniquement** à cause de BENZYL ALCOHOL (57), MENTHOL (13), BENZYL BENZOATE — The Ordinary Caffeine Solution à 10/100 avec bandeau rouge pour une personne allergique au parfum. Liste canonique minimale : égalité de jeton entier ; sortir BENZYL ALCOHOL, BENZYL BENZOATE, BENZOIC ACID, MENTHOL du groupe parfum (les déclarer en « allergène listé, faible » informatif) ; garder l'exclusion CAMPHOR ; si un champ libre arrive un jour, résoudre vers les familles (`dryingAlcohol`, `tensioactif-agressif`, `fragrance`) comme S10 le propose. |
| **S11** dose ignorée côté perso | **D'accord** (= D7 + P8, inclus) | Sensibio, peau sèche réactive : 59 → 81 (plus de « not nourishing enough » sur une eau micellaire). Démaquillants riches rincés : plus de −12 peau grasse. |

### Les sept points de friction, tranchés

1. **S2 vs D10 (parfum).** Mesures ci-dessus. Le mérite `sansParfum` est ce qui maintient « parfumé ⇒ rarement vert » (1,8 % de parfumés verts) sans plancher ni double langage. S2 inverse mes paires (Weleda parfumé au-dessus de Sensibio et CeraVe) et ouvre la triche la moins chère du marché (« Parfum » = −4 en sérum). **Décision : D10 côté perso + S1 ; formule inchangée.** Weleda FR 76 / US 55 restent séparés : c'est la donnée (fiche FR sans « Parfum ») qu'il faut corriger, pas le tarif.
2. **S5.** Produits qui deviendraient sur-notés : TO AHA 30 % + BHA 2 % (80), Paula's Choice 25 % AHA peel (80), Dr Dennis Gross Extra Strength (+18), peel fictif sans tampon 77 ; peau grasse non sensible : 100. D8 suffit pour les profils sensibles seulement. **Décision : S5 à demi-tarif.**
3. **D4.** Produit remonté à tort pour une peau grasse : Mixa Soin Nourrissant (IPP + IPM en top 5) +16 si aucune préoccupation « imperfections » n'est cochée ; SimplyVital (coco pos 3) +12. **Décision : D4 avec déclenchement sur `skinType: oily` aussi, comedo 3 conservé en top 5.**
4. **D6/S6/P6.** Règle unique retenue (D6d + UNI + D5 + S4 + LD10) : prérequis = un actif dosé power ≥ 2 hors glycols, ou un humectant actif ; richesse et prérequis ne comptent que w ≥ 0,6 ou lowDose, dédoublonnés ; lowDose = 1 en top 10 / avant la barre, 0,6 après ; masques sur l'ancienne règle. Triche « retinol en dernier » sur un sérum peptides : base 70 → 66 (le rétinol coûtait plus qu'il ne rapportait, S5), FINAL3 70 → 78 ; rétinol honnête pos 4 : 78. Résiduel +8 accepté. Coréens honnêtes : SKIN1004 Centella Ampoule 53 → 65, Tone Brightening 92 → 92, Hyalu-Cica Blue 75 → 73, Rovectin Cica 62 → 60. Soupes : VT PDRN 92 → 89, PC Resist Pure Radiance 92 → 90 (léger, voulu).
5. **Non évaluable.** Sur mes étalons : n < 6 exclut 4 produits (TO Squalane 100 %, Avène Eau Thermale, Effaclar patchs, Drunk Elephant A-Gloei — n = 5, noté 88 à raison) ; n < 10 en exclut **10** (+ PC 2 % BHA, Adapalene, Effaclar toner, Toleriane Milky, Toleriane micellaire, Cetaphil Cleansing Milk) ; n < 12 en exclut **15** (+ Sensibio, TO Niacinamide, Vichy M89, Vanicream, Cetaphil Gentle). Catalogue : 156 / 258 / 339 produits. Un seuil de longueur n'est pas le bon outil. **Décision** : non évaluable si (a) `lecture.partielle` ; (b) solaire sans filtre reconnu ; (c) n < 6 ET couverture < 1 (Avène Tolerance « Citrate, Niacinamide… ») ; (d) n < 6 ET pas de solvant/huile/absorbant en position 1 (22 cas sur 84, patchs compris). Une huile pure, une eau thermale, un baume à 4 ingrédients **doivent être notés** (couverture 1, formule plausible), avec la mention « produit mono-ingrédient » — et une grille « huile » sans prérequis humectant (TO Squalane 47 « nothing here draws in water » est un défaut de grille, pas de produit). Badge « partielle » (pas exclusion) si 6 ≤ n < 10 sans eau/huile ni conservateur : 89 produits.
6. **S10.** Voir tableau : 44 % du catalogue plafonné par le groupe parfum, 68 à tort. Liste canonique ci-dessus.
7. **D8.** Ordre obtenu avec D8b + FINAL3, profil sens3 : Sensibio 81 ≈ Toleriane Eau Micellaire 82 ≈ Dermallergo 79 > Cetaphil Gentle 70 ≈ CeraVe Hydrating 69 > Neutrogena Hydro Boost SPF 50 (octocrylène + parfum) 42 > Effaclar Clarifying (menthol, acides, alcool) 40 > Effaclar toner à l'alcool 24. Facts du Clarifying : −10 exfoliant fort, −5 force, −4 alcool, −4 SA, −4 glycolique, −1,2 menthol. Le solaire à l'octocrylène perd le « contact allergen » −8 et garde « Octocrylene — known contact allergen −1 » : informatif, comme le demandait D8.

## B. Mes observations P1-P12, révisées

| # | Décision | Recouvrement / correction |
|---|---|---|
| P1 | **Maintenu** | = S1. Le plafond des sensibilisants est le complément. |
| P2 | **Maintenu**, précisé | = D1 + S8. Trois couches : dictionnaire (octisalate, NANO, Tinosorb, Uvinul), parsing « n % / USP », drapeau catalogue accepté ; solaire sans filtre → non évaluable (14 restants). |
| P3 | **Maintenu** | = D1 (ZnO uva + uvb). |
| P4 | **Maintenu** | Aucun des deux autres ne l'a vu. CeraVe Hydrating 59 → 69, Toleriane Milky 58 → ~70, Cetaphil Cleansing Milk 37 → 39 (SLS conservé). Effet de bord mesuré : Toleriane Purifying Foaming 75 → 72 (redistribution). |
| P5 | **Maintenu** | Idem. Sensibio 64 → 77, Toleriane Eau Micellaire 70 → 82. |
| P6 | **Modifié** | Ma règle « un power 3 en top 5 OU trois actifs dosés » laissait SKIN1004 Centella à 53 ; D6d (power ≥ 2 dosé hors glycols, ou humectant actif) est meilleure. Le résiduel « retinol en dernier » (+8) est acté. |
| P7 | **Maintenu** | = D3, élargi à 4 entrées + alias PERFUME/AROMA. |
| P8 | **Maintenu** | = S11 / D7 (texture légère seulement hydratant + yeux ; riche seulement posé). |
| P9 | **Maintenu** | Personne d'autre ne l'a mesuré : 78 non-solaires disaient « UV filters — you say you skip sunscreen ». Règle UV de FINAL3 : hors solaire, filtre organique reconnu ou ZnO/TiO2 en top 6. |
| P10 | **Modifié** | Remplacer « n < 6 ⇒ non évaluable » par les quatre conditions de la friction 5. |
| P11 | **Maintenu**, rejoint D11 | Canonicalisation des parenthèses botaniques, « USP », « n % », « NANO », alias US. |
| P12 | **Maintenu** ; PG fait | PG irritant 1 / sensibilisant 2 (dans DICO) : Vanicream 66 → 70. Ligne « plafond » = S3. Points perso × benefitPower/3 : **non retenu dans le top 10** (le plafond des matchs à 30 borne déjà ; à revoir avec D11 sur l'hamamélis et l'eau thermale). |

## C. Vote final : les dix modifications retenues

Chaque ligne : règle exacte · effet mesuré sur les étalons (FINAL3) · triche fermée.

1. **Perso : parfum, HE et sensibilisants une fois par produit** (S1 = P1). `fragrance` : une ligne −4 × S ; `essentialOil` : une ligne −8 ; sensibilisants : somme plafonnée à −12 × S/3. · Crème + 6 allergènes, sens3 : 5 → 51 ; % à 5 (sèche réactive) 14,0 → 0,2 %. · Ferme « écrire Parfum plutôt que déclarer » côté perso.
2. **Solaires lisibles** (D1 + S8 + P2/P3). Dictionnaire : ZINC OXIDE, Tinosorb S, Tinosorb M, Mexoryl XL → uva + uvb ; OCTISALATE, « (NANO) », Uvinul A+ ajoutés ; `parseInci` retire « n % » et « USP » en fin de jeton ; `@filtresUV` accepte `filtresUV === true` ; **aucun filtre reconnu ⇒ non évaluable**. · Vanicream Mineral 68 → 80, Cetaphil Sheer Mineral 65 → 79, Avène Mineral 58 → 84, Anthelios Mineral Tinted 33 → 59, Clinique UV Solutions 44 → 85 ; 26 « sans filtre » → 14, à sortir de la notation. · Ferme rien, corrige une injustice de données.
3. **Nettoyants et démaquillants sans tensioactif** (P4 + P5). `douceur` = `tensioactif-doux` OU (aucun `tensioactif-agressif` ET émollient/émulsifiant/occlusif) ; `dissout` accepte `emulsifiant` ; `tensioactif-doux` sur PEG-6 caprylic/capric glycerides, poloxamers, disodium cocoamphodiacetate, sodium lauroyl lactylate, polysorbate 20. · CeraVe Hydrating 59 → 69, Sensibio 64 → 77, Toleriane Eau Micellaire 70 → 82, Aveeno Calm+Restore 56 → ~68. · Ferme « ajouter un glucoside à 0,5 % pour +12 ».
4. **Conservateurs ≠ parfum** (D3 + P7). `fragrance: false` sur BENZYL ALCOHOL, 4-T-BUTYLCYCLOHEXANOL, PHENETHYL ALCOHOL, PHENYLPROPANOL (sensibilisant conservé) ; alias PERFUME, AROMA, PARFUM* → FRAGRANCE. · TO Caffeine Solution 49 → 72, TO Multi-Peptide Eye 49 → 72, Cicalfate+ sérum 54 → 67, 90 produits. · Ferme « Perfume » (84 → 71).
5. **Une seule règle de comptage des actifs** (D6d + S6 + UNI). Prérequis sérum/traitement : un actif power ≥ 2 à w ≥ 0,6 ou lowDose, hors glycols de base, OU un humectant actif ; masques : règle actuelle ; `richesse`/`actifs` : dédoublonnés par nom, comptés seulement à w ≥ 0,6 ou lowDose. · TO Niacinamide 66 → 78, SKIN1004 Centella 53 → 65, Vichy M89 63 → 63, VT PDRN 92 → 89 ; échecs sérum 4,3 → 4,9 %. · Ferme « 3 traces après le conservateur » (81 → 78) et « écrit deux fois » (80 → 78).
6. **Rétinoïdes à leur juste place, sans ouvrir la porte** (D5 + S4 + LD10). `@actifTop5` = 16 × w du meilleur actif power 3 ; lowDose : w = 1 si pos ≤ 10 ou avant la barre, 0,6 après. · Dermalogica Retinol 56 → 69, PC 1 % Retinol 76 → 87, moyenne rétinol 69,5 → 74,6 ; falaise 5/6 supprimée. · Borne « Retinol en dernier » à +8 (résiduel).
7. **La dose compte aussi côté perso** (D7 + S11 + P8 + D9). `strengthMax`/`forceMax` : w ≥ 0,6 ou lowDose ; alcool × peau sèche : pos ≤ 5 ; texture « légère » : hydratant et yeux seulement ; « riche » : produits posés seulement ; richesse par classe de corps gras. · Sensibio sèche réactive 59 → 81, Dermalogica sens3 5 → 42, Effaclar Duo+M sens3 66 → 83. · Aucune triche ; retire des faux malus.
8. **Bonus UV crédible seulement** (P9). Hors solaire : `filtresUV` compte si filtre organique reconnu OU ZnO/TiO2 en positions 1-6. · Cicalfate+ 77 → 78 (perd +8 UV, gagne ailleurs) ; ~90 produits perdent la phrase « you skip sunscreen ». · Ferme le faux message santé.
9. **Comédogénicité hors formule, perso ciblée** (D4p). `grav = irritant` ; perso : comedo ≥ 4 partout ou ≥ 3 en top 5, si `skinType: oily` ou imperfections/brillance. · Dermallergo 69 → 72, Duo+M 79 → 82, Mixa (grasse + rides) 42 → 52 (pas 58). · Rien à fermer ; retire le plafond « jamais vert » de l'huile de germe de blé.
10. **Peau réactive = irritants, allergie = quiz** (D8b + S10 canonique). Perso : irritant ≥ 2 → −2 × irritant × S/3 × w « may sting » ; sensibilisant 2 à S = 3 → −1 × w « listed contact allergen » ; groupe q7 parfum sans BENZYL ALCOHOL / BENZYL BENZOATE / BENZOIC ACID / MENTHOL, égalité de jeton. · Effaclar Clarifying sens3 17 → 40 (formule assainie, malus ciblés), toner à l'alcool 22 → 24, TO Caffeine Solution n'est plus à 10/100 pour une allergie au parfum. · Ferme rien ; rend le perso lisible.

**Aussi retenus, hors top 10** : S3 (plafond formule appliqué au perso), S5h (irritant ÷ 2 sur actif prouvé), D2 amendé (sensibilisant 3 → −5 fixe ; banni UE → plafond 69, posé seulement), D10 côté perso, non évaluable (friction 5), S7 « min des deux grilles » quand la catégorie est incertaine, D11/P11 (dictionnaire et graphies), D12.

**Rejetés** : **S2/S2b/D10b** (suppression d'un des deux chemins parfum : inversions mesurées, parfumés verts × 6, traitements 23 % rouges) · **D6a** littéral (prérequis mort) · **D6b/D6c** sans clause humectant (Vichy M89 −12, masques 37 % d'échecs) · **S5 plein tarif** (peels sans tampon verts, 100 pour peau grasse) · **D4 sans `skinType`** (Mixa +16) · **D8 sur irritant 1** (bruit sur Dermallergo et sur les filtres UV) · **S7 « n < 12 ⇒ partielle »** (15 étalons sur 49) · **D2 plafond 45 sur banni UE** (MI légal en rincé) · **D10 côté formule** (baisse tous les nettoyants sans parfum) · **S10 tel que chiffré** (« alcohol » non saisissable ; le vrai chiffre est 44 % via le groupe parfum).

**Ce que FINAL3 fait au catalogue** (2 950 produits) : moyenne 64,8 → 66,2 ; verts 26,6 → 32,1 % ; rouges 6,9 → 5,6 % ; parfumés verts 1,8 → 1,7 % ; coût d'une trace de parfum −14,9 → −14,8 ; peau sèche réactive : écart perso moyen −11,7 → +0,6, rouges 36,7 → 15,5 %, à 5/100 14,0 → 0,2 %. 13 % des produits changent de bande (291 montent, 93 descendent). Restent ouverts : S9 (nettoyants 21 % verts vs sérums 42 %), le résiduel rétinol (+8), l'alcool dénaturé en position 2 d'un tonique pour peau grasse (Effaclar Clarifying grasseAcne 70 → 86 : le malus alcool de 6 × 1,2 pèse peu face aux actifs ; à relever à 8-10 en top 3), et les 14 solaires sans filtre lisible.

## Tableau final — note actuelle → note mesurée sous FINAL3

Formule · perso sèche réactive · perso grasse acnéique. « Attendu » = réputation dermatologique (formule).

| Produit | Formule | Sèche réactive | Grasse acné | Attendu | Verdict |
|---|---|---|---|---|---|
| CeraVe Hydrating Facial Cleanser | 59 → **69** | 55 → 78 | 64 → 69 | 75-80 | mieux ; 5-6 pts sous l'attendu (grille nettoyant, S9) |
| LRP Toleriane Purifying Foaming | 75 → 72 | 71 → 79 | 83 → 75 | 75 | ok ; passe désormais **derrière** CeraVe Hydrating pour la peau sèche |
| LRP Toleriane Double Repair | 83 → 87 | 82 → 87 | 95 → 100 | 80 | ok |
| LRP Toleriane Dermallergo | 69 → 72 | 93 → 90 | 54 → 69 | 80 | ok (perso fait le reste) |
| Bioderma Sensibio H2O | 64 → **77** | 59 → 81 | 69 → 77 | 75-80 | corrigé |
| LRP Toleriane Eau Micellaire | 70 → **82** | 69 → 89 | 75 → 82 | 75-80 | corrigé |
| Paula's Choice 2 % BHA Liquid | 80 → 82 | 58 → 63 | 95 → 92 | 80 | ok |
| The Ordinary Niacinamide 10 % | 66 → **78** | 57 → 78 | 88 → 95 | 75 | corrigé |
| SKIN1004 Centella Ampoule | 53 → 65 | 58 → 79 | 58 → 65 | 65 | corrigé |
| Avène Cicalfate+ crème | 77 → 78 | 96 → 94 | 74 → 87 | 75-80 | ok, sans le faux bonus UV |
| Avène Cicalfate+ sérum | 54 → **67** | 53 → 85 | 59 → 67 | 70 | corrigé |
| LRP Anthelios UV Hydra SPF 50 | 39 → 38 | 40 → 49 | 47 → 41 | 80+ | **non évaluable** (filtres absents de la liste US) |
| LRP Anthelios Mineral Tinted SPF 50 | 33 → **59** | 23 → 59 | 45 → 62 | 75 | mieux ; le TiO2 manque toujours dans l'INCI (données) |
| LRP Anthelios Melt-in Milk SPF 100 | 74 → 73 | 62 → 77 | 86 → 80 | 75 | ok |
| Vanicream Mineral SPF 30 | 68 → **80** | 75 → 88 | 72 → 84 | 80 | corrigé |
| Cetaphil Sheer Mineral Drops SPF 50 | 65 → **79** | 72 → 97 | 77 → 86 | 75 | corrigé |
| Neutrogena Hydro Boost SPF 50 (octocrylène, parfum) | 59 → 58 | 22 → 48 | 68 → 62 | 60 | ok |
| Vanicream Moisturizing Cream | 66 → 70 | 60 → 69 | 66 → 70 | 75 | mieux (PG) |
| Vanicream Enhanced | 87 → 86 | 96 → 88 | 87 → 91 | 85 | ok |
| Cetaphil Gentle Skin Cleanser | 70 → 70 | 74 → 84 | 85 → 80 | 70 | ok |
| Cetaphil Cleansing Milk (INCI SLS + parabènes) | 37 → 39 | 14 → 26 | 42 → 39 | 45-55 | sévère, défendable |
| Weleda Skin Food US (parfum déclaré) | 55 → 53 | 15 → 55 | 43 → 53 | 50-60 | ok ; la peau réactive n'est plus au plancher |
| Weleda Skin Food FR (parfum absent de la fiche) | 76 → 77 | 84 → 91 | 64 → 77 | 55 | **données** à corriger (fiche FR) |
| Nivea Men Face Wash | 53 → 53 | 16 → 43 | 58 → 53 | 50 | ok |
| Savon Urban Hydration | 29 → 44 | 22 → 45 | 28 → 43 | 30-40 | remonte (douceur via émollients) ; −10 savon conservé |
| LRP Effaclar Adapalene 0,1 % | 47 → 49 | 35 → 48 | 52 → 49 | 85 | **toujours faux** : « Adapalene USP 0.1% » reste inconnu tant que le parsing « USP / n % » n'est pas fait (règle 2) ; attendu ~80 après |
| LRP Effaclar Duo+M | 79 → 82 | 75 → 92 | 90 → 94 | 80 | ok |
| LRP Effaclar toner astringent (alcool) | 37 → 41 | 16 → 25 | 45 → 44 | 35 | ok |
| LRP Effaclar Clarifying (acides + alcool + menthol) | 45 → 66 | 9 → 38 | 70 → 86 | 55 | formule un peu haute (alcool pos 2 sous-pesé) |
| LRP Effaclar BPO | 79 → 80 | 59 → 70 | 94 → 90 | 80 | ok |
| Neutrogena Hydro Boost Water Gel (parfum) | 60 → 59 | 53 → 53 | 65 → 64 | 65 | ok |
| Vichy Minéral 89 | 63 → 63 | 69 → 77 | 68 → 63 | 65 | ok (grâce à la clause humectant) |
| The Ordinary Caffeine Solution 5 % | 49 → **72** | 44 → 86 | 54 → 77 | 70 | corrigé |
| The Ordinary AHA 30 % + BHA 2 % | 70 → 75 | 57 → 63 | 91 → 91 | 65-70 | limite haute (S5h) |
| Dermalogica Dynamic Skin Retinol | 56 → 69 | 5 → 51 | 56 → 69 | 70 | corrigé |
| Sérums « soupe » à 92 (ANUA, Bubble, VT, PC Resist) | 92 → 89-92 | 93-100 → 100 | 100 → 99-100 | 80-85 | encore hauts : la longueur reste récompensée (S9, richesse) |
| Oak Essentials Gel Cleanser (19 composants parfumés) | 61 → 58 | 5 → 54 | 66 → 58 | 55 | ok ; plus de plancher pour la peau réactive |
| Thayers Witch Hazel Toner | 69 → 69 | 80 → 90 | 81 → 76 | 60 | **sur-noté** pour la peau réactive (hamamélis « apaisant » au dictionnaire, D11) |
| The Ordinary Squalane 100 % | 47 → 47 | 47 → 40 | 47 → 52 | 65 | grille « huile » à créer (friction 5) |
