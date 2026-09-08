# Rapport 2 — Débat (angle dermato-cosmétologue)

Méthode : les deux rapports lus intégralement. Chaque chiffre nouveau ci-dessous vient d'une copie patchée du moteur (`debat/scoring-sim-dermato.mjs`, construite par `build-sim-dermato.mjs`, interrupteurs `globalThis.SIM`) exécutée sur les 2 950 produits en périmètre. Le dépôt n'a pas été touché. Profils : `secheReactive` (sèche, S3, déshydratation 3, rougeurs 2, barrière 2, plafond 0) et `normaleAge`, identiques à ceux du rapport stat.

---

## A. Position sur chaque observation des deux autres rapports

### Rapport statistique (S1-S11)

**S1 — parfum/HE/sensibilisants facturés par ingrédient côté perso.** *D'accord.* C'est le trou le plus grave de la note perso et je l'avais sous-estimé (je n'avais chiffré que le parfum nu). Mesure confirmée : profil `secheReactive`, 13,9 % du catalogue au plancher 5 ; avec parfum/HE en une ligne et sensibilisants plafonnés à −8 × S/3, le taux tombe à 0,7 %, la moyenne perso passe de 54,8 à 61,8. Condition dermato : le plafond des sensibilisants ne suffit pas, il faut aussi changer ce qu'on facture (voir D8 et friction 2).

**S2 — parfum compté deux fois en formule.** *D'accord* sur l'architecture, en révisant mon D10 (friction 1 ci-dessous).

**S3 — plafond gravité 3 contourné en perso, population de 4 ingrédients.** *D'accord* sur le report du cap en perso. Sur la population : après ma D4 (comédogénicité hors formule) et ma D2 (bannis UE), le plafond touche 18 produits : Lilial 7, MI 7, Lyral 2, hydroquinone 2, triclosan 2. Je retire le triclosan de la liste : `irritant 3` est faux (c'est un antimicrobien restreint à 0,3 % pour des raisons de résistance et d'endocrinologie, pas un irritant fort) → irritant 1 + `restreintUE`. Population finale = hydroquinone + bannis UE, tous justifiés.

**S4 — falaises de position.** *D'accord.* Graduer `@actifTop5` par w(pos) du meilleur actif power 3 est cohérent avec ma D5, à condition que `lowDose` donne w = 1 (sinon le rétinol reste à 0,3). Alcool linéaire en w(pos) : d'accord (P12e le demande aussi). Cap 49 si w = 1, 69 sinon : d'accord.

**S5 — malus de risque sur les actifs prouvés.** *D'accord sous condition* (friction 2).

**S6 — doublons non dédoublonnés dans les mérites.** *D'accord* sans réserve. Un `Set` de noms, première occurrence gardée, dans `evalueLigne`, `@actifs` et `@troisActifs`.

**S7 — grille `indetermine` la plus généreuse ; liste tronquée sans badge.** *D'accord* sur les badges (n < 12 ou `lecture.partielle` → partiel ; pas de vert si catégorie incertaine). *D'accord sous condition* sur la grille : baisser `actifs` de 20 à 14, oui ; ajouter un prérequis `@humectant`, non — une huile pure ou un baume anhydre passent légitimement en indéterminé et n'ont aucun humectant. La variante « noter sur les deux grilles les mieux votées, garder le min » est la plus propre.

**S8 — solaires : prérequis filtres, ZnO, regex, plafond 86.** *D'accord* (= ma D1 + P2 + P3). Réserve sur le point (1) : accepter `filtresUV === true` du catalogue pour satisfaire `@filtresUV` n'est sûr QUE pour la catégorie sunscreen ; P9 montre que ce drapeau est faux sur 90 non-solaires. Point (4), plafond `actifs` 8 → 4 : mécanique, pas d'objection.

**S9 — équité entre familles non tenue.** *D'accord sous condition d'ordre.* Ma simulation cumulée (section C) montre que retirer `sansParfum` sans les correctifs de données déplace fortement les familles : nettoyants verts 19 % → 11 %, contours des yeux 37 % → 20 %, solaires 21 % → 12 %. Or ces trois familles sont précisément celles où les données sont fausses (P4/P5 pour les nettoyants, D3 pour les yeux — alcool benzylique —, D1 pour les solaires). Recalibrer les plafonds atteignables AVANT ces corrections figerait des biais de données dans les poids. Séquence : données → règles → S9.

**S10 — allergie déclarée par sous-chaîne.** *D'accord*, et c'est le complément naturel de ma D8 : les sensibilisants de niveau 1-2 doivent peser sur les personnes qui déclarent une allergie ou un antécédent d'eczéma de contact, pas sur « peau réactive ». La correspondance par famille canonique (alcool desséchant, sulfates, parfum, parabènes, isothiazolinones, lanoline, propylène glycol) rend cette déclaration exploitable.

**S11 — force, alcool, richesse sans position ni rinçage.** *D'accord* (= D7 + P8). J'ajoute la fusion des deux lignes force : « Stronger than your comfort zone » (−5/cran) et « Strong exfoliating actives » (−10) décrivent le même fait ; garder une ligne, −5 par cran, +5 si la catégorie est un acide posé (exfoliant/treatment/toner) et S ≥ 2. Total −10 à −15 conservé pour un BHA 2 % sur peau très réactive, ce qui est cliniquement juste, mais affiché une fois.

### Rapport produit (P1-P12)

**P1 — prime à l'opacité côté perso.** *D'accord* (= S1).

**P2 — solaires « sans aucun filtre ».** *D'accord* (= D1 données). J'endosse la règle de garde : catégorie sunscreen sans aucun filtre reconnu ⇒ « filtres non lisibles, pas de note » plutôt que −25. Vérifié : OCTISALATE apparaît dans 115 INCI de solaires et n'a pas de fiche (P2 disait 70 — le chiffre est plus élevé encore en cherchant dans l'INCI brut). Normaliser « NOM n% » et « NOM USP » dans `parseInci` : oui.

**P3 — ZnO « UVA seulement ».** *D'accord* (= D1). TiO2 reste `filtre-uvb` : il couvre UVB + UVA2, pas l'UVA1, c'est correct.

**P4 — laits sans tensioactif punis −12.** *D'accord*, et c'est la faute la plus contraire à la clinique du rapport produit. Vérifié : CeraVe Hydrating Facial Cleanser 59 avec `douceur −12`. Un lait démaquillant ou une crème lavante à base d'émulsion est la forme la plus douce qui existe ; le prérequis doit sanctionner « un système lavant agressif sans rien de doux ». Règle : `douceur` satisfait si `tensioactif-doux`, OU (`emollient`/`emulsifiant` présents ET aucun `tensioactif-agressif` ET pas `@savon`). Fonction `tensioactif-doux` à ajouter à SODIUM LAUROYL LACTYLATE, POLYSORBATE 20, POLOXAMER 188/184, DISODIUM COCOAMPHODIACETATE.

**P5 — eaux micellaires : +8,8 et −12 pour le même tensioactif.** *D'accord.* Vérifié : Sensibio H2O 64, `rincable +8,8` et `dissout −12`. PEG-6 caprylic/capric glycerides, poloxamers, PEG-40 hydrogenated castor oil sont des tensioactifs non ioniques doux : `tensioactif-doux` est la bonne fonction.

**P6 — mono-actif puni, saupoudrage récompensé.** *D'accord* sur (a), (b), (c) ; *pas d'accord* sur (d) (plafonner lowDose à 0,6 sous la barre des 1 %). Le rétinol est PAR NATURE sous la barre : 0,1-0,5 % est sa dose efficace, et sa position médiane dans le catalogue est 16. Brider w sous la barre revient à sous-noter le cas normal pour attraper le cas « rétinol à 0,01 % en dernière position », qu'aucune règle de position ne peut distinguer d'un rétinol à 0,3 % en dernière position. Je préfère accepter cette triche que fausser tous les sérums rétinol. Règle unique en friction 5.

**P7 — conservateurs et anti-irritants comptés comme parfum.** *D'accord* (= D3). J'ajoute 4-T-BUTYLCYCLOHEXANOL (SymSitive : antagoniste TRPV1 ajouté POUR les peaux réactives) et PHENYLPROPANOL à ma liste. Revue des 76 `fragrance:true` hors allergènes UE et hors HE : oui.

**P8 — « pas assez nourrissant » sur des rincés et des aqueux.** *D'accord.* Règle : `legere` (bonus ET malus) seulement sur moisturizer et eye-cream ; `riche` sur tout ce qui reste posé (un sérum huileux sur peau grasse, c'est pertinent) ; aucune adéquation de texture si `exposition < 1` (= S11).

**P9 — faux bonus « protection UV ».** *D'accord*, et je durcis : la règle proposée (ZnO/TiO2 en positions 1-6 sans pigment CI 77) laisse passer Cicalfate+, dont l'oxyde de zinc est en position 3-4 comme protecteur cutané à 5-10 %, sans aucun SPF. Hors catégorie sunscreen, `filtresUV` seulement si filtre organique reconnu OU « SPF » dans le nom. Un minéral seul sans mention SPF ne protège pas de façon mesurable.

**P10 — INCI vide ou tronquée = note moyenne.** *D'accord* sur le principe ; seuils en friction 6.

**P11 — une graphie = une fiche.** *D'accord* (= D11). Sur le repli fuzzy : Levenshtein ≤ 2 est dangereux sur les noms courts (retinol/retinal, cetyl/cetearyl…) ; le restreindre aux noms ≥ 10 lettres avec liste d'exclusion, et marquer « lu comme X » à l'écran.

**P12 — l'explication ne justifie pas le chiffre.** (a) ligne `plafond` dans `details` : *d'accord*. (b) libellé gradué par niveau de sensibilisant : *d'accord* ; « a known contact allergen » pour un niveau 1 est faux et anxiogène. (c) propylène glycol : *je me range à P12* (friction 4). (d) `bonusMatch × power/3` : *d'accord* ; « Avène thermal spring water targets your redness +7 » n'est pas défendable, glycérine à ×0,67 pour la déshydratation l'est. (e) alcool linéaire : *d'accord* (= S4).

### Les six points de friction, tranchés

**Friction 1 — mérite `sansParfum` : supprimer (S2) ou garder × exposition (D10) ?**
Verdict : **supprimer, S2 a raison sur l'architecture, D10 avait raison sur la conséquence.** Deux canaux pour un même fait rendent le coût du parfum illisible et court-circuitent l'exposition. Mais avec le seul malus fixe à 4, un parfum dans une crème posée coûte −4 : trop bas pour l'allergène cosmétique n° 1 (fragrance mix positive chez ~10 % des patients patch-testés, ~1-4 % de la population générale — établi). Simulation, mérite retiré des grilles et du max, malus fixe × sévérité × exposition, plafond du complexe 12 × sévérité × exposition :

| tarif | nettoyant (Parfum / +2 allergènes) | crème | contour des yeux | sérum | % vert catalogue |
|---|---|---|---|---|---|
| base actuelle | −13 / −17 | −14 / −22 | −23 / −37 | −13 / — | 26,6 |
| 4 | −2 / −6 | −4 / −12 | −7 / −21 | −4 / −12 | 20,6 |
| 6 | −3 / −6 | −6 / −12 | −11 / −21 | −6 / −12 | 19,5 |
| **8** | **−4 / −6** | **−8 / −12** | **−14 / −21** | **−8 / −12** | 18,7 |

Tarif 8 : l'ordre rincé < posé < yeux est enfin le bon (la base mettait nettoyant −13 ≈ crème −14), et « Parfum » nu reste moins cher que « Parfum + allergènes déclarés », ce qui est fondé (déclaration = dose au-dessus du seuil). La baisse du % vert (26,6 → 18,7) n'est pas une baisse des parfumés : c'est la disparition des 9 points gratuits que tout produit sans parfum recevait. C'est une question de calibration des bandes ou de `budgetMetier`, à traiter APRÈS les correctifs de données (S9).

**Friction 2 — où vit l'irritance d'un actif prouvé ?**
Verdict : **dans les deux, mais pas au même titre.** Côté formule, l'irritation d'un rétinol ou d'un AHA à dose efficace est le prix connu de son efficacité, pas un défaut de formulation ; en revanche, EMPILER plusieurs actifs irritants bien dosés (glycolique + vitamine C + rétinol dans le même sérum) est un vrai défaut de formulation (irritation cumulative — établi). Règle : pour `role: active`, `benefitPower ≥ 2`, `irritant ≤ 2`, le PREMIER actif irritant bien placé ne prend pas le malus générique ; à partir du deuxième, malus plein. Simulation : 317 des 695 sérums/traitements montent, Δ moyen +1,4 ; sérum rétinol témoin 65 → 69, puis 80 avec `lowDose` dans `@actifTop5` (D5) ; l'empilement glycolique + vit C + rétinol reste facturé deux fois. 133 produits ont ≥ 2 actifs irritants bien placés (exfoliants 60, sérums 23, traitements 21, nettoyants 15, toniques 12) : la règle a une population réelle. Côté perso, l'irritance vit dans le plafond de force (`strengthCeiling`, déjà là, à pondérer par position — D7) pour les actifs, et dans un canal irritant nouveau pour les NON-actifs (menthol, propylène glycol, hamamélis, alcool) — D8. Pas de double comptage : le canal irritant exclut ce qui a `strength ≥ 1`, `dryingAlcohol`, `fragrance`, `essentialOil`, `tensioactif-agressif`, chacun ayant sa ligne.

**Friction 3 — comédogénicité : D4 contre S3 et P12.**
Verdict : **D4, complétée par S3.** L'échelle comédogène (Fulton 1989, oreille de lapin) ne prédit pas le produit fini (Draelos & DiNardo 2006 — établi) ; l'utiliser comme malus universel ET comme plafond « jamais vert » est indéfendable, et l'ELEMIS balm plafonné 69 pour une trace d'huile de germe de blé (P12) en est la caricature. Règle finale : `grav = irritant` seul en formule ; le plafond gravité 3 ne concerne plus que l'hydroquinone (irritant 3, banni) ; `banniUE` → cap 45, avec portée : MI banni en posé seulement (autorisé 15 ppm en rincé) → cap si `exposition ≥ 1`, sinon malus −5 × exposition ; Lilial, Lyral, hydroquinone bannis partout → cap partout. Le cap est renvoyé par `scoreFormule` et appliqué en perso (S3). Côté perso, comédogène ≥ 4 seulement, × w(pos), déclenché par la préoccupation `blemishes` ou `oiliness` (pas le seul type de peau), plafond −6. Effet mesuré : 326 produits changent en formule, 18 restent plafonnés (tous légitimes après retrait du triclosan).

**Friction 4 — propylène glycol : irritant 1 / sensibilisant 2 (P12) ou 1 / 1 (D11) ?**
Verdict : **P12, irritant 1 / sensibilisant 2.** Source : ACDS Allergen of the Year 2018 (Jacob & Scheman, *Dermatitis* 2018) ; NACDG 2015-2016, positivité ~3,5 % au PG 30 % aqueux, comparable à la cocamidopropyl bétaïne (~2-3 %) qui est au niveau 2 du dictionnaire. Une part de ces réactions est de nature irritative, ce qui justifie de ne pas le mettre à 3, mais la prévalence le place au niveau 2. Ce qui compte plus que le niveau : ne plus le facturer comme irritant 2 en formule (267 produits, −2,3 en moyenne, Vanicream Moisturizing Cream 66).

**Friction 5 — comptage des actifs : règle unique.**
Règle unique, testée : (1) dédoublonnage par nom, première occurrence (S6) ; (2) un actif compte dans `@actifs`, `richesse` et le prérequis s'il est **bien placé** = `w(pos) ≥ 0,6` (positions 1-10 ET au-dessus de la barre des 1 %) OU `lowDose` (P6a, D6) ; (3) prérequis sérum/traitement/masque = « au moins UN actif `benefitPower ≥ 2` bien placé » (D6 + P6b), qui remplace `@troisActifs` ; (4) `@actifTop5` = actif power 3 avec `pos ≤ 5` OU `lowDose`, gradué par w (S4, D5) ; (5) `maxActifsParFamille = 2` conservé — avec le filtre (2), au plus ~8 actifs comptent, la décroissance de P6c devient inutile. Mesure sur 863 sérums/traitements/masques : 90 échouent au prérequis actuel, 82 échoueraient au nouveau ; 41 mono-actifs sauvés (The Ordinary Niacinamide : niacinamide power 3 en position 2 ; Ascorbyl Glucoside 12 % ; Argireline, lowDose ; Vichy Minéral 89 par sa glycérine) ; 33 nouveaux échecs = cocktails de traces, voulu. Effaclar Adapalene reste à zéro actif tant que « Adapalene USP 0.1% » n'est pas normalisé (P11) ; ADAPALENE doit aussi recevoir `lowDose: true` (dosé 0,1 %).

**Friction 6 — seuils de « non évaluable ».**
Mesure : 85 produits ont moins de 6 ingrédients ; 11 sont des formules simples légitimes (Vichy eau thermale « WATER », Serozinc « WATER, ZINC SULFATE », sprays d'acide hypochloreux, DIME sérum HA à 3 ingrédients) ; 7 ont 4-5 ingrédients sans base en tête et sont manifestement tronqués (Avène Tolérance Foaming : « Citrate, Niacinamide, Sodium Benzoate… »). Une base en position 1 (eau, huile, beurre, cire, alcool, glycérine, glycol, silicone, squalane, alcane, tensioactif, acide hypochloreux) est la seule propriété partagée par TOUTES les formules réelles, y compris une huile pure. Règle : n ≤ 3 et 100 % connus → évaluable, badge « formule minimaliste » ; n ≤ 3 avec un inconnu → non évaluable ; 4 ≤ n ≤ 5 → non évaluable sauf base en position 1 ET 100 % connus (alors partiel) ; n ≥ 6 → évaluable, partiel si position 1 n'est pas une base, si `lecture.partielle` (OCR), si solaire sans filtre reconnu, ou n < 12 (S7). Jamais de mérite lié à une absence (parfum, sulfate) sur une liste partielle — point devenu sans objet pour le parfum une fois S2 appliquée.

---

## B. Mes observations D1-D12, révisées

| ID | Décision | Recouvrement | Ce qui change |
|---|---|---|---|
| D1 solaires | **maintenue** | = S8 + P2 + P3 | J'ajoute de P2 : normalisation « NOM n% / USP », alias OCTISALATE (115 solaires), « pas de note » plutôt que −25 ; de S8 : plafond `actifs` 8 → 4. |
| D2 sensibilisants forts / bannis UE | **maintenue, précisée** | unique (ni S ni P ne l'ont vue) | Portée du ban (posé seulement pour MI ; partout pour Lilial, Lyral, HQ). Mesure : crème MI+MCI 75 → 45 ; nettoyant MI 67 → 62. Triclosan sorti du cap. |
| D3 alcool benzylique = parfum | **maintenue, élargie** | = P7 | + 4-t-butylcyclohexanol, phénylpropanol ; revue des 76 `fragrance:true` hors allergènes UE. |
| D4 comédogénicité | **maintenue** | contre S3, avec P12 | Réconciliée en friction 3 : cap appliqué en perso (S3), population du cap revue. |
| D5 rétinoïdes | **maintenue, fusionnée** | avec S4 | `@actifTop5` gradué par w avec `lowDose` = 1. Sérum rétinol 65 → 80 avec la friction 2. |
| D6 « trois actifs » | **maintenue, fusionnée** | = P6 + S6 | Règle unique de la friction 5. |
| D7 force et alcool sans position | **maintenue** | = S11 + P12e | + fusion des deux lignes force en une (S11). |
| D8 peau réactive ≠ allergie | **maintenue, tarif révisé** | complète S1, S10 | Canal irritant −2 × irritant × S/3 × w × exposition, plafond −10 × S/3 ; sensibilisants ≤ 2 à −1 × niveau × S/3 × w × exposition, plafond −8 × S/3 ; niveau 3 en formule (D2) ; sensibilisants 1-2 à plein tarif seulement sur allergie déclarée (S10). Mesures, sensibilité 3 : nettoyant doux aux glucosides 63 → 71 ; tonique propylène glycol + hamamélis 70 → 66 ; gel SLES parfumé 19 → 29. Profil `secheReactive` : moyenne 54,8 → 64,3, rouges 36 % → 22 %, plancher 13,9 % → 0,7 %. Données à corriger pour que le canal fonctionne : MENTHOL `strength` 1 → 0 (bruit) et `lowDose: true` (irritant sensoriel actif sous 1 %), ETHANOL → alias ALCOOL avec `dryingAlcohol`. |
| D9 richesse gonflée par les émulsifiants | **maintenue** | unique ; + P8/S11 | Pondération par classe de corps gras ; aucune texture sur les rincés ; `legere` seulement sur moisturizer/eye-cream. |
| D10 parfum × exposition | **retirée au profit de S2** | friction 1 | Un seul canal, tarif 8 × sévérité × exposition, plafond 12. |
| D11 dictionnaire | **maintenue, PG amendé** | = P11 + P12c | PG irritant 1 / sensibilisant 2. |
| D12 grossesse | **maintenue** | unique | Mineure ; inchangée. |

---

## C. Vote final

Préalable d'ordre, sans lequel les chiffres se contredisent : **données (1-3) → règles (4-9) → recalibration (10)**. Ma simulation cumulée des règles seules laisse la moyenne formule inchangée (64,8 → 64,9) mais déplace les familles (nettoyants verts 19 % → 11 %, contours des yeux 37 % → 20 %, sérums 32 % → 40 %) parce que les données fausses de ces familles ne sont pas corrigées dans la simulation. Recalibrer avant de corriger les données figerait ces biais.

### Les dix modifications retenues, classées

1. **Solaires : dictionnaire et prédicats** (D1 = S8 + P2 + P3). ZnO, Tinosorb S, Tinosorb M, Mexoryl XL → `filtre-uva` + `filtre-uvb` ; ajout Uvinul A Plus, Iscotrizinol, Tris-biphenyl triazine ; alias OCTISALATE, « (NANO) », « NOM n% », « USP » ; `@photostable` sur une fonction `stabilisant-avobenzone` (octocrylène, Tinosorb S/M, ethylhexyl methoxycrylene, butyloctyl salicylate, polysilicone-15, DEHN, DESM) ; solaire sans filtre reconnu ⇒ pas de note. Effet : 44 solaires minéraux +14, 16 solaires +10, 26 solaires sortent d'un rouge faux.
2. **Nettoyants et démaquillants : la douceur n'est pas un tensioactif** (P4 + P5). `douceur` satisfait si `tensioactif-doux` OU (émollient/émulsifiant ET aucun agressif ET pas savon) ; `tensioactif-doux` sur PEG-6 caprylic/capric glycerides, poloxamers, PEG-40 HCO, sodium lauroyl lactylate, polysorbate 20, disodium cocoamphodiacetate. Effet : CeraVe Hydrating 59 → ~72, Sensibio H2O 64 → ~77, 47 produits.
3. **Parfum : un seul canal, et « parfum » ne veut pas dire conservateur** (S2 + D3/P7 + S1/P1). Mérite `sansParfum` retiré des 10 grilles et de leur max ; malus fixe 8 × sévérité × exposition, complexe plafonné 12 × sévérité × exposition ; côté perso, parfum et HE en UNE ligne, × exposition ; `fragrance: false` sur benzyl alcohol, phenethyl alcohol, phenylpropanol, 4-t-butylcyclohexanol, benzoic acid ; tout token contenant PARFUM|FRAGRANCE|PERFUME|AROMA → FRAGRANCE. Effet : coût du parfum nettoyant −4 / crème −8 / yeux −14 ; 59 à 90 produits +10 à +25 ; plancher perso 13,9 % → < 1 %.
4. **Comédogénicité hors formule, plafond recentré et appliqué en perso** (D4 + S3 + D2 + P12a). `grav = irritant` ; `banniUE` → cap 45 selon portée ; `sensibilisant 3` hors parfum → −5 × sévérité × exposition en formule ; `cap` renvoyé et appliqué en perso ; ligne `plafond` dans `details` ; triclosan irritant 1. Effet : 326 produits +1 à +6, 18 plafonnés dont 7 au MI et 7 au Lilial, crème MI 75 → 45.
5. **Comptage des actifs : règle unique** (friction 5 : S6 + P6 + D6 + D5 + S4). Dédoublonnage ; actif compté si w ≥ 0,6 ou `lowDose` ; prérequis = un actif power ≥ 2 bien placé ; `@actifTop5` = power 3 et (pos ≤ 5 ou `lowDose`), gradué par w ; premier actif irritant bien placé sans malus générique, les suivants à plein (friction 2) ; ADAPALENE `lowDose`. Effet : 41 mono-actifs +12 (The Ordinary Niacinamide 66 → ~78), sérums rétinol +10 à +15, 264 gains par doublon supprimés, 33 cocktails de traces −12.
6. **Perso : peau réactive = irritants, allergie = sensibilisants** (D8 + S1 + S10 + P12b). Canal irritant −2 × irritant × S/3 × w × exposition (plafond −10 × S/3), exclusions : strength ≥ 1, alcool, parfum, HE, sulfates ; sensibilisants ≤ 2 à −1 × niveau × S/3 × w × exposition (plafond −8 × S/3), libellé gradué ; plein tarif seulement sur allergie déclarée, appariée par famille canonique (fin du `includes` : 1 224 faux positifs « alcohol » supprimés) ; `dryingAlcohol` aussi × S ≥ 2. Effet : `secheReactive` moyenne 54,8 → 64,3, rouges 36 % → 22 %.
7. **Force et alcool pondérés par la position, une seule ligne** (D7 + S11 + P12e). `strengthMax`/`forceMax` sur les seuls ingrédients à w ≥ 0,6 ou `lowDose` ; alcool × w(pos) ; lignes « comfort zone » et « strong exfoliating » fusionnées (−5/cran, +5 si acide posé et S ≥ 2). Effet : ~1 400 faux malus perso retirés.
8. **Texture : classes de corps gras, jamais sur un rincé** (D9 + P8 + S11). Beurre/cire/pétrolatum/lanoline 1,0 ; huile 0,7 ; ester/CCT/squalane/alcane 0,3 ; stéarates d'émulsifiants 0 ; `riche` sur le posé seulement ; `legere` sur moisturizer/eye-cream seulement. Effet : 66 lotions légères cessent d'être « heavy », 118 démaquillants +12 pour les peaux grasses, écart grasse/sèche sur les toniques (+10,4) supprimé.
9. **Faux bonus UV et listes courtes** (P9 + P10/S7). Hors sunscreen, `filtresUV` seulement si filtre organique OU « SPF » dans le nom ; seuils de la friction 6 ; partiel si n < 12, base absente en position 1, ou `lecture.partielle` ; pas de vert si catégorie incertaine ; grille `indetermine` : `actifs` 20 → 14 ou min des deux grilles votées. Effet : 90 produits perdent 8 pts indus et la phrase « ça vous protège », ~150 listes vides passent en non évaluable.
10. **Dictionnaire et recalibration** (D11 + P11 + P12c/d + S9). Canonicalisation des noms botaniques avant lecture (92 doublons divergents), NIACINAMIDE complété (spots, redness, barrier), AZELAIC ACID + redness, PG irritant 1 / sensibilisant 2, lécithines hors `lipide-barriere`, MENTHOL strength 0 + lowDose, entrée inversée supprimée, `bonusMatch × power/3` ; puis, en dernier, maximum atteignable par grille et bandes/`budgetMetier` revus (S9) sur les étalons.

### Ce que je rejette

- **P6(d)** — brider `lowDose` à w = 0,6 sous la barre des 1 % : sous-note le cas normal du rétinol (médiane position 16) pour un cas de triche indétectable par position.
- **S5 pur** — exonérer TOUT actif power 3 du malus d'irritance : l'empilement d'actifs irritants est un défaut de formulation réel (133 produits) ; version « premier gratuit, suivants payés » retenue.
- **S7, prérequis `@humectant` sur la grille indéterminée** : une huile pure ou un baume anhydre n'en ont pas et sont légitimes.
- **P9 tel quel** (ZnO en positions 1-6 sans pigment ⇒ protection UV) : laisse passer Cicalfate+ ; il faut « SPF » dans le nom pour un minéral seul.
- **S8(1) hors sunscreen** — accepter `filtresUV` du catalogue comme preuve de filtre : ce drapeau est faux sur 90 non-solaires (P9).
- **Mon D10** — garder le mérite `sansParfum` × exposition : deux canaux pour un fait, S2 l'a montré.
- **Mon D11 sur le PG à sensibilisant 1** : la prévalence NACDG le place au niveau 2.
- **P11, fuzzy Levenshtein ≤ 2 sans garde** : retinol/retinal à distance 1 ; restreint aux noms ≥ 10 lettres avec exclusions.
- **Recalibrer S9 avant les correctifs de données** : les biais de données seraient gelés dans les poids.
