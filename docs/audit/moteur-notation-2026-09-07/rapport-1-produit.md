# Rapport 1 — Audit « produit et terrain » du moteur de notation SmartSkin

Angle : avocat du diable. Où la note trompe l'utilisatrice sur de vrais produits, comment une marque peut tricher, et si l'explication justifie le chiffre.
Méthode : `scoreFormule` / `scorePerso` (scoring.mjs, algo 2.0.0-metier) exécutés sur le catalogue (3 233 produits, 2 950 en périmètre avec INCI) et sur des INCI construites pour tester la triche. Scripts dans `scratchpad/debat/` (s.mjs, triche.mjs, distrib.mjs, biais.mjs). Aucun fichier du dépôt modifié.

Profils perso utilisés : `sens3` = normale, sensibilité 3, rougeurs 2 · `sensibleSeche` = sèche, sensibilité 3, rougeurs 2 + déshydratation 2, plafond force 1 · `grasseAcne` = grasse, sensibilité 0, imperfections 3 + brillance 2 · `seche` / `grasse` = sans préoccupation (seule l'adéquation texture joue).

---

## Tableau — produits de référence : note obtenue vs réputation dermatologique

| Produit (catalogue) | Catégorie | Note formule | Attendu (réputation) | Verdict |
|---|---|---|---|---|
| CeraVe Hydrating Facial Cleanser | cleanser | **59** (mid) | 80+ | sous-noté, cause P4 |
| LRP Toleriane Purifying Foaming Face Wash | cleanser | 75 | 75 | ok — mais passe DEVANT le CeraVe Hydrating |
| LRP Toleriane Double Repair Moisturizer | moisturizer | 83 | 80 | ok |
| LRP Toleriane Dermallergo | moisturizer | 69 (perso sèche sensible : 93) | 80 | formule un peu basse (−4 isocetyl stearate), le perso rattrape |
| Bioderma Sensibio H2O | makeup-remover | **64** (mid) | 75-80 | sous-noté, causes P5 + P8 |
| LRP Toleriane Eau Micellaire (fiche FR) | makeup-remover | 70 | 75 | idem P5 |
| Paula's Choice 2 % BHA Liquid Exfoliant | exfoliant | 80 | 80 | ok |
| Paula's Choice 2 % BHA Exfoliating Toner (même INCI + « BHA ») | toner | 72 | 80 | −7 pour une graphie d'extrait, P11 |
| The Ordinary Niacinamide 10 % + Zinc 1 % | serum | **66** (mid) | 75 | sous-noté : « too few actives », P6 |
| Avène Cicalfate+ crème | moisturizer | 77 | 75-80 | ok, mais dont +8 « protection UV » indus (P9) |
| Avène Cicalfate+ sérum | serum | **54** (mid) | 70 | sous-noté : anti-irritant compté comme parfum, P7 |
| LRP Anthelios UV Hydra SPF 50 | sunscreen | **39** (bad) | 80+ | FAUX : « no UV filter at all », P2 |
| LRP Anthelios UV Control SPF 50 (azélaïque) | sunscreen | **37** (bad) | 80 | FAUX, P2 |
| LRP Anthelios Mineral Tinted Fluid SPF 50 | sunscreen | **33** (bad) | 75 | FAUX, P2 |
| Neutrogena Beach Defense SPF 70 | sunscreen | **17** (bad) | 60 | FAUX, P2 |
| Vanicream Facial Moisturizer Mineral SPF 30 | sunscreen | 68 (mid) | 80 | sous-noté : pas de « large spectre » avec ZnO, P3 |
| Cetaphil Sheer Mineral Drops SPF 50 | sunscreen | 65 (mid) | 75 | idem P3 |
| Avène Mineral Sunscreen SPF 50 | sunscreen | 58 (mid) | 75 | idem P3 (+ parfum) |
| LRP Anthelios Melt-in Milk SPF 100 (organique) | sunscreen | 74 | 75 | ok — mais devant TOUS les minéraux purs |
| Vanicream Moisturizing Cream | moisturizer | 66 (mid) | 75 | sous-noté : −4 propylene glycol, P12 |
| Vanicream Enhanced (HA + céramides) | moisturizer | 87 | 85 | ok |
| Cetaphil Gentle Skin Cleanser | cleanser | 70 | 70 | ok |
| Cetaphil Cleansing Milk (INCI = ancienne formule SLS + parabènes) | cleanser | 37 (bad) | 45-55 | sévère mais défendable |
| Weleda Skin Food (fiche US, parfum déclaré) | moisturizer | 51-55 | 50-60 | ok |
| Weleda Skin Food Crème de Jour (fiche FR, parfum absent de l'INCI) | moisturizer | **76** (good) | 55 | même produit, +21 pts : la donnée décide, P10/P11 |
| Nivea Men Maximum Hydration Face Wash | cleanser | 53 | 50 | ok |
| Savon (Urban Hydration Aloe Bar) | cleanser | 29 | 30 | ok |
| LRP Effaclar Adapalene 0,1 % (rétinoïde, AMM acné) | treatment | **47** (mid) | 85 | FAUX : « too few actives to treat anything », P6 + P11 |
| LRP Effaclar Duo+ M | treatment | 79 | 80 | ok |
| LRP Effaclar toner astringent (alcool) | toner | 37 | 35 | ok |
| LRP Effaclar BPO | treatment | 79 | 80 | ok |
| Neutrogena Hydro Boost Water Gel | moisturizer | 60 | 65 | ok (parfum) |
| Vichy Minéral 89 sérum | serum | 63 | 65 | ok |
| Embryolisse Lait-Crème Concentré | moisturizer | 58 | 60 | ok |
| The Ordinary Caffeine 5 % + EGCG (yeux) | eye-cream | **49** (mid) | 70 | sous-noté : benzyl alcohol = « parfum », P7 |

Paires à l'envers du bon sens :
- CeraVe Hydrating Cleanser 59 < Toleriane Purifying Foaming 75 (le sans-tensioactif perd contre le moussant).
- The Ordinary Niacinamide 10 % 66 < sérum fictif « aloe + panthénol + allantoïne » 70 (le mono-actif prouvé perd contre trois extraits faibles).
- Vanicream Mineral SPF 30 68 < Anthelios Melt-in Milk SPF 100 74 (le minéral, recommandé aux peaux sensibles et femmes enceintes, perd le « large spectre »).
- Effaclar Adapalene 47 < Effaclar Multi-Target Blemish Patches 53 (le rétinoïde perd contre un patch hydrocolloïde).

---

## Observations (par importance)

### P1 — Le score PERSO récompense l'opacité sur le parfum — **bloquant**

**Constat.** Le score formule plafonne bien le complexe parfumant à −12 (scoring.mjs:524-529, commentaire :521-523 « prime à l'opacité = inacceptable »). Mais le score perso refait le malus parfum **par ingrédient, sans plafond** (scoring.mjs:601-605 : `if (f.fragrance && sensitivity > 0) score -= 4 × sensitivity`, dans la boucle sur la liste). Crème test (base propre, 84/100), profil sensibilité 3 :

| INCI | Formule | Perso sens 3 | Perso sens 1 |
|---|---|---|---|
| sans parfum | 84 | 78 | 82 |
| + « Parfum » (marque opaque) | 71 | **53** | 65 |
| + Parfum, Linalool, Limonene | 63 | **21** | 49 |
| + Parfum + 6 allergènes UE déclarés | 63 | **5** (plancher) | 33 |
| + Parfum + 12 allergènes UE déclarés | 63 | **5** | **9** |

Le bloc « Why » affiche alors sept lignes identiques « Fragrance — poorly suited to your reactive skin −12 ».

**Pourquoi c'est un problème.** La marque qui respecte le règlement UE (déclaration des 26 allergènes) est notée 5/100 ; celle qui écrit « Parfum » est à 53. C'est exactement le biais que la note formule a corrigé le 26/08, resté ouvert côté perso — et la note perso est celle qu'on montre en premier. Le facts object ne dit même pas pourquoi : « Fragrance » sept fois.

**Proposition.** Sortir le malus parfum-sensible de la boucle : une seule ligne par produit, `−malusParfumSensible × sensibilité` si au moins un ingrédient `fragrance`, éventuellement +1 cran si HE (déjà couvert par `malusHEReactive`). Idem pour la ligne `sensibilisant` (:593-599) : plafonner la somme (par ex. −12).

**Effet attendu.** Le produit à 6 allergènes remonte de 5 à 53 (= produit opaque). Aucun effet sur les produits sans parfum. Risque : un parfum très riche en allergènes n'est plus « pire » qu'un parfum simple côté perso — acceptable, l'information reste dans la liste d'ingrédients (`allergene: true`).

### P2 — Des solaires de référence notés « sans aucun filtre UV » (−25, rouge) — **bloquant**

**Constat.** 26 solaires sur 290 reçoivent `manque filtres` (−25, « no UV filter at all »). Parmi eux : Anthelios UV Hydra SPF 50 = 39, UV Control = 37, UV Tone = 48, Anthelios Mineral Tinted SPF 50 = 33, Anthelios Kids SPF 50 = 38, Neutrogena Beach Defense SPF 70 = 17, Clarins UV Plus SPF 50 = 17, Bioderma Photoderm Nude Touch = 42. Trois causes :
1. INCI US « Drug Facts » : les filtres sont dans « Active ingredients », que le scrape a perdus (Anthelios UV Hydra : 26 ingrédients, zéro filtre ; Mineral Tinted : 40 ingrédients, pas de dioxyde de titane).
2. `parseInci` (scoring.mjs:305) ne retire le pourcentage qu'en tête (`3% Avobenzone`) ou entre parenthèses finales. « Zinc Oxide 20% », « Titanium Dioxide 5% », « Adapalene USP 0.1% » restent inconnus (testé).
3. Dictionnaire : `OCTISALATE` absent (nom US de l'ethylhexyl salicylate) → **70 solaires** ont un filtre non reconnu ; `ZINC OXIDE (NANO)`, `TITANIUM DIOXIDE (NANO)` absents ; `METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL` (Tinosorb M) et `DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE` (Uvinul A Plus) sans fonction filtre.

**Pourquoi c'est un problème.** Anthelios est la référence dermatologique n°1 en France. L'app dit « bad, aucun filtre UV » : l'utilisatrice le jette ou n'a plus confiance dans l'app. Et un solaire mal noté pour une raison de données, c'est un risque santé (elle choisira le « 74 » chimique à la place du minéral conseillé par son dermato).

**Proposition.** (a) Normaliser `NOM n%` et `NOM USP` dans `parseInci` ; alias OCTISALATE, OCTINOXATE, OCTOCRYLENE 10 %, ZINC OXIDE (NANO) ; fonctions filtre pour Tinosorb M et Uvinul A+. (b) Règle de garde : catégorie `sunscreen` + aucun filtre détecté ⇒ pas de note (statut « filtres non lisibles, analyse impossible ») au lieu de 17-48 rouge. Un solaire sans filtre n'existe pas ; c'est toujours une donnée manquante. (c) Côté catalogue : re-scraper les « Active ingredients » des fiches US.

**Effet.** Les 26 « sans filtre » sortent du rouge ; les 70 à filtre partiel regagnent `spectre` quand l'octisalate complète un avobenzone. Risque : aucun côté moteur ; c'est du nettoyage de données.

### P3 — L'oxyde de zinc est classé « UVA seulement » : aucun minéral pur n'a le « large spectre » — **important**

**Constat.** `ZINC OXIDE` : `fonctions: ["filtre-uva"]` ; `TITANIUM DIOXIDE` : `["filtre-uvb"]`. Le prédicat `@spectreLarge` (scoring.mjs:370) exige les deux. Or l'oxyde de zinc couvre UVB + UVA2 + UVA1 : c'est LE filtre large spectre de référence. Résultat : 41 solaires à ZnO seul sur 43 « sans spectre » perdent 18 pts de grille (≈ 14 pts de note) : Vanicream Mineral SPF 30 = 68, Cetaphil Sheer Mineral = 65, Avène Mineral SPF 50 = 58, TATCHA Silk = 68, Naturium Dew-Glow = 65, cocokind = 70. Le meilleur minéral pur plafonne à 71 quand Anthelios Melt-in Milk (organique) fait 74.

**Pourquoi.** Le minéral est précisément ce qu'on recommande aux peaux sensibles, aux enfants, aux femmes enceintes. Le moteur le range systématiquement sous les filtres organiques, à l'inverse de la recommandation (et de Yuka, qui note mieux les minéraux).

**Proposition.** `ZINC OXIDE` → `["filtre-uva","filtre-uvb"]` ; `TITANIUM DIOXIDE` reste `filtre-uvb` (UVA2 partiel). Le bonus perso `filtreMineralBonus` (+4 si sensible) existe déjà et est juste.

**Effet.** +13 à +14 pts sur ~41 solaires ; Vanicream Mineral passe ~82. Risque : nul, c'est un fait de photophysique.

### P4 — Les nettoyants sans tensioactif sont punis « pas d'agent lavant doux » (−12) — **important**

**Constat.** Prérequis `douceur` (scoring.mjs:139) = présence d'un `tensioactif-doux`, sinon −12. Un lait ou une crème lavante sans tensioactif (la forme la plus douce qui existe) prend le malus : CeraVe Hydrating Facial Cleanser 59 (« no gentle cleansing agent » ; son sodium lauroyl lactylate est sans fonction dans le dictionnaire), Toleriane Moisturizing Milky Cleanser 58, Aveeno Calm+Restore 56, Avène Tolerance Foaming 54, The Ordinary Glycolipid Cream Cleanser 54, Clinique Redness Solutions 65, Cetaphil Cleansing Milk 37. 35 nettoyants sur 384 concernés. Pendant ce temps Toleriane Purifying Foaming (moussant, coco-bétaïne) = 75 et Cetaphil Gentle Foaming = 77.

**Pourquoi.** C'est l'inverse de la clinique : le CeraVe Hydrating est le nettoyant le plus prescrit pour peau sèche/atopique parce qu'il ne mousse pas. La grille « nettoyant » assimile « doux » à « contient un tensioactif étiqueté doux ». Une marque gagne 12 pts en ajoutant un glucoside à 0,5 %.

**Proposition.** Le prérequis doit sanctionner « un système lavant agressif sans rien de doux », pas « pas de tensioactif » : `douceur` satisfait si `tensioactif-doux` OU (`emollient` / `emulsifiant` présents ET aucun `tensioactif-agressif`). Ajouter `tensioactif-doux` à SODIUM LAUROYL LACTYLATE, POLYSORBATE 20, POLOXAMER 188, DISODIUM COCOAMPHODIACETATE. Le mérite `soutien` (émollients) récompense déjà les laits : il fera le reste.

**Effet.** CeraVe Hydrating ≈ 71-75, Toleriane Milky ≈ 70. Les moussants ne bougent pas. Risque : un « nettoyant » qui n'est qu'une crème (mauvaise catégorie) monte aussi — à traiter par P10.

### P5 — Eaux micellaires : « rinces off cleanly » +8,8 et « nothing here dissolves makeup » −12 pour le même ingrédient — **important**

**Constat.** Sensibio H2O = 64 : `+8.8 rincable` (PEG-6 caprylic/capric glycerides = `emulsifiant`) ET `−12 dissout` (prérequis = emollient / occlusif / tensioactif-doux ; scoring.mjs:153). 12 démaquillants sur 155 dans ce cas, 12/12 avec les deux lignes en même temps : toutes les eaux micellaires Bioderma (Sensibio 64, Hydrabio 58, Sébium 53), Toleriane Eau Micellaire 70, A-Derma 70, Nuxe 54.

**Pourquoi.** Double langage : on dit à l'utilisatrice « ça se rince bien » et « rien ne dissout le maquillage » à propos du même tensioactif micellaire, dans la même fiche. Et l'eau micellaire la plus vendue au monde, référence des peaux réactives, sort « mid ».

**Proposition.** Donner `tensioactif-doux` aux tensioactifs non ioniques micellaires (PEG-6 caprylic/capric glycerides, poloxamer 184/188, disodium cocoamphodiacetate, PEG-40 hydrogenated castor oil), ou accepter `emulsifiant` dans le prérequis `dissout`.

**Effet.** Sensibio ≈ 76-78, Toleriane micellaire ≈ 80. Risque : aucun, ce sont bien des agents démaquillants.

### P6 — Le mono-actif est puni, le saupoudrage est récompensé — **important**

**Constat.**
- Prérequis `@troisActifs` (scoring.mjs:378) compte les actifs **quelle que soit la position**, même après la barre des 1 %. The Ordinary Niacinamide 10 % + Zinc = 66 (« too few actives for a serum » −12). TO Azelaic 64, TO Ascorbyl Glucoside 54, TO Argireline 50, L'Oréal HA 1,5 % 47. **Effaclar Adapalene 0,1 %** (rétinoïde à AMM) = 47 « too few actives to treat anything » (et « Adapalene USP 0.1% » n'est même pas reconnu, cf. P11).
- Triche testée : TO Niacinamide + « Sodium Hyaluronate, Panthenol, Allantoin » ajoutés APRÈS le phenoxyethanol → **66 → 81** (+15). + « Retinol » seul en dernière position (lowDose ⇒ w = 1) → 78 (+12). + 8 extraits traces → 82.
- Sérum fictif « Aloe, Panthénol, Allantoïne » (trois actifs power 1-2, rien de prouvé) = 70 > TO Niacinamide 66.
- Top 12 sérums du catalogue : 9 à 36 actifs comptés, jusqu'à 15 **sous la barre des 1 %** (VT Cosmetics PDRN 92 : 17 actifs dont 10 sous la barre ; COSRX Blue Peptide 91 : 20 dont 15 ; Dr. Althea 91 : 26 dont 14).
- Corrélation longueur INCI → score moyen : toner 54 (≤10 ingrédients) → 71 (≥46) ; moisturizer 56 → 70 ; treatment 57 → 68.

**Pourquoi.** Un dermatologue dit l'inverse : un actif prouvé à dose efficace vaut mieux que quinze traces, et moins d'ingrédients = moins d'allergènes. Le moteur donne la note maximale à des « soupes » K-beauty et punit The Ordinary, Paula's Choice C25, Vichy. C'est le vecteur de triche n°1 : allonger la liste ne peut jamais faire baisser la note (hors parfum), il suffit d'ajouter des traces.

**Proposition.** (a) `@troisActifs` et `richesse` ne comptent que les actifs avec `w ≥ 0,6` (positions 1-10 et au-dessus de la barre), sauf `lowDose`. (b) Prérequis satisfait aussi par UN actif power 3 en top 5 (`@actifTop5`) : un mono-actif concentré n'est pas « creux ». (c) `richesse` : décroissance au-delà de 4 actifs (ou plafond à 3 actifs par famille déjà présent, mais 7 familles × 2 = 14 comptés). (d) lowDose en dernière position : plafonner à w = 0,6 si sous la barre (un rétinol à 0,01 % existe).

**Effet.** TO Niacinamide ≈ 78, Adapalene (une fois reconnu) ≈ 80, les soupes à 92 redescendent vers 80-85. Risque : les sérums multi-actifs honnêtes (Paula's Choice Resist) perdent 3-5 pts ; à calibrer sur les étalons.

### P7 — Conservateurs et anti-irritants comptés comme « parfum » — **important**

**Constat.** `BENZYL ALCOHOL` (conservateur), `4-T-BUTYLCYCLOHEXANOL` (SymSitive, anti-irritant pour peaux sensibles), `PHENETHYL ALCOHOL`, `PHENYLPROPANOL` (boosters de conservation) ont `fragrance: true`. Conséquence : perte du mérite `sansParfum` (12 à 18 pts de grille) + malus fixe 4 (× 1,8 pour les yeux) + côté perso « Fragrance — poorly suited to your reactive skin » −4 × S. **90 produits** du catalogue n'ont que ces quatre-là comme « parfum » : The Ordinary Multi-Peptide Eye Serum **49**, TO Caffeine Solution 5 % **49** (marque célèbre pour être sans parfum), Cicalfate+ sérum **54**, TO Salicylic Acid 2 % Masque 60, TO Glucoside Cleanser 57, Drunk Elephant Protini 70. Test direct : la crème étalon 84 tombe à **71 avec « Benzyl Alcohol » seul — exactement la note avec « Parfum »**.

**Pourquoi.** On dit « parfum » à une peau réactive pour un produit formulé sans parfum. Le SymSitive est ajouté précisément POUR les peaux réactives. Yuka classe le benzyl alcohol « risque faible », INCIdecoder « conservateur, allergène listé » — aucun ne dit « parfum ».

**Proposition.** `fragrance: false` pour ces quatre entrées (garder `euFragranceAllergen` + `sensibilisant` sur benzyl alcohol → il reste facturé côté perso sensible, à sa juste place). Passer en revue la liste « fragrance:true mais ni allergène UE ni HE » (76 entrées) : `NEOHESPERIDIN DIHYDROCHALCONE`, `MALTOL`, `THYMOL`, `CINNAMIC ACID` sont douteux.

**Effet.** +13 à +25 pts sur ~90 produits, surtout The Ordinary et les soins yeux. Risque : nul.

### P8 — L'adéquation « texture légère = pas assez nourrissant » s'applique aux produits rincés et aqueux — **important**

**Constat.** `natureProduit` + `richesse.legere.dry = −7` (scoring.mjs:63-66, 639-643) s'applique à TOUTES les catégories. Sensibio H2O, profil sèche sensible : 59 avec « Light texture — not nourishing enough for your dry skin −7 ». CeraVe Hydrating Cleanser, le nettoyant DES peaux sèches : −7 pour la peau sèche, +5 pour la peau grasse. Écart moyen perso(grasse) − perso(sèche), profils sans aucune préoccupation : **toner +10,4 · cleanser +8,8 · sunscreen +7,9 · exfoliant +7,7 · serum +6,9** (moisturizer −1,1 seulement).

**Pourquoi.** Personne n'attend d'une eau micellaire, d'un tonique ou d'un fluide solaire qu'ils « nourrissent ». La peau sèche voit toute sa salle de bain rincée baisser de 7-10 pts avec une phrase fausse. Et la comparaison entre catégories devient biaisée par type de peau.

**Proposition.** Appliquer `legere` (le malus) uniquement à `moisturizer` et `eye-cream` ; garder `riche` partout (une huile démaquillante lourde sur peau grasse, c'est pertinent), ou réutiliser `exposition` comme pour le bonus solaire.

**Effet.** Sensibio sèche 59 → 66 ; disparition d'un biais systématique de 7-10 pts. Risque : « la personnalisation discrimine moins » sur les rincés — c'est voulu.

### P9 — Faux bonus « protection UV » sur des produits qui ne protègent pas — **important** (message santé)

**Constat.** `filtresUV` est levé par ZnO/TiO2 dès qu'ils apparaissent (categorise.mjs:105, `FILTRES_MIN`), y compris comme pigment ou astringent. Côté formule : +8 « protection UV en bonus » pour **92 non-solaires** (47 hydratants, 12 traitements, 10 masques, 10 sérums…). Côté perso, **78 non-solaires** affichent « UV filters — you say you skip sunscreen +10 » : Cicalfate+ crème (ZnO cicatrisant, aucun SPF) 77 dont +8, Mario Badescu Drying Lotion (ZnO), Kate Somerville EradiKate (soufre + ZnO), Kiehl's Ultra Facial Toner, Murad Vitamin C Eye Serum, Hero Rescue Balm, L'Oréal Age Perfect sérum. Le test `solaire-rince.test.ts` n'a corrigé que les catégories rincées.

**Pourquoi.** On dit à une femme qui « ne met jamais de solaire » que sa crème Cicalfate la protège des UV. C'est le seul endroit du moteur où une erreur peut faire du mal.

**Proposition.** Hors catégorie `sunscreen`, `filtresUV` seulement si (filtre organique reconnu) OU (SPF dans le nom) OU (ZnO/TiO2 en positions 1-6 ET pas de pigment `CI 77…` autour). Sinon `filtresUV = false`.

**Effet.** ~90 produits perdent 8 pts indus et la phrase perso. Risque : une crème de jour SPF dont l'INCI cache le TiO2 loin → perdre le bonus : acceptable, le nom porte « SPF ».

### P10 — INCI vide ou tronquée = note « moyenne » avec la mention « sans parfum » — **important**

**Constat.** INCI vide, catégorie cleanser → **48 (mid)** avec « +11.8 no fragrance » ; serum → 47 ; « Aqua » seul en indéterminé → **61**. **149 produits** en périmètre ont moins de 4 ingrédients (The Face Shop Rice Water 48, FOREO masques 49, SelpH BHA 48…). Avène Tolerance Foaming Cleanser : INCI = « Citrate, Niacinamide, Sodium Benzoate, Tocopherol, Xanthan Gum » (5 jetons, pas d'eau, pas de tensioactif), couverture 0,8 → **pas de badge partiel**, note 54. CeraVe Hydrating tronqué aux 8 premiers → 51. Même produit Weleda Skin Food : fiche FR sans « Parfum » 76, fiche US avec 55. La route fiche (produit/fiche/route.ts:46) note `p.inci || ""`.

**Pourquoi.** `analysePartielle` mesure la couverture dictionnaire, pas la plausibilité (spec §3bis.8 : contrôle qualité des INCI, non implémenté). Une liste absente vaut donc un « mid » rassurant + « sans parfum ». Pour la lecture d'étiquette (OCR partiel, dos de tube coupé), c'est le cas courant. Et une marque n'a qu'à fournir une INCI courte à Amazon.

**Proposition.** Garde-fou avant notation : n < 6 ingrédients, ou absence de tout solvant/eau/huile/tensio en tête ⇒ « non évaluable » (pas de chiffre). Badge « partielle » aussi si n < 10 ou si `r.partielle` (déjà renvoyé par lire-inci mais sans effet sur le score). Ne jamais attribuer `sansParfum` quand la liste est partielle.

**Effet.** ~150 produits passent en « non évaluable » au lieu de 47-49. Risque : moins de produits notés dans le catalogue — c'est honnête.

### P11 — Une graphie = une fiche : la même molécule a deux notes — **mineur** (mais systémique pour l'étiquette)

**Constat.** Dictionnaire indexé par chaîne exacte, 348 alias seulement. `CAMELLIA OLEIFERA LEAF EXTRACT` (power 1, sans fonction) ≠ `CAMELLIA OLEIFERA (GREEN TEA) LEAF EXTRACT` (power 2, antioxydant) → Paula's Choice 2 % BHA : 79 vs 72 en grille toner pour la même formule. `ADAPALENE USP 0.1%`, `ZINC OXIDE 20%`, `OCTISALATE`, `ZINC OXIDE (NANO)` inconnus. `PERFUME`, `AROMA` inconnus → une marque qui écrit « Perfume » garde 84 au lieu de 71 ; « Parfun » (faute OCR) idem. OCR « Niacinamid » : TO Niacinamide 66 → 50 ; « Cetearyl Alchol » + « Glycerine » : CeraVe 59 → 57. Cicalfate+ Emulsion : 4 fautes de frappe dans la fiche marque → couverture 0,60 → badge partiel mais note 72 affichée.

**Pourquoi.** En lecture d'étiquette, la variante orthographique est la règle. Le moteur ne pardonne rien et, pire, pardonne au parfum mal écrit.

**Proposition.** Canonicaliser dans `parseInci` : retirer « (nom commun) », « USP », « n% », « NANO » ; alias US/UE des filtres ; `PERFUME`, `AROMA`, `PARFUM*`, `FRAGRANCE (NATURAL)` → FRAGRANCE. Repli fuzzy (distance de Levenshtein ≤ 2 sur les noms ≥ 8 lettres) avec marquage « lu comme X ».

**Effet.** Stabilité de la note entre fiches d'un même produit. Risque : faux rapprochements (retinol/retinal : distance 1 !) → liste d'exclusions.

### P12 — L'explication ne justifie pas toujours le chiffre — **mineur**

**Constat.**
- Plafond gravité 3 muet : `score = min(score, cap)` (scoring.mjs:537) sans ligne `details`. Paula's Choice Dark Spot Eraser (hydroquinone) : lignes = 68-74, note = 49. ELEMIS Cleansing Balm : lignes 79, note 69 (huile de germe de blé, comédogène 5 selon Fulton 1989 sur oreille de lapin — en position trace). 5 produits.
- « Cetearyl alcohol — a known contact allergen, and your skin reacts easily » −3 pour un `sensibilisant: 1` ; « Propylene glycol — a known contact allergen » ; « Tocopherol — a known contact allergen ». Le libellé est alarmant pour −0,9 à −3.
- `PROPYLENE GLYCOL` `irritant: 2` → −4 dans la note FORMULE quand il est en top 5 : Vanicream Moisturizing Cream 66 (la crème de référence des allergologues US), Toleriane Hydrating Cleanser −2,2, Sensibio −1,4, Adapalene −2,4. Le PG est un humectant CIR-safe ; « allergène de l'année 2018 » = sensibilisant (perso), pas irritant à dose cosmétique.
- Points perso « targets your … » sur des ingrédients marketing : « Avene thermal spring water targets your redness » +7 (power 2, position 1), « Copper sulfate targets your breakouts » +3,1, « Rhamnose targets your fine lines », « Cucumber extract targets your redness » +4,2. 1 320 des 1 572 actifs ont une source « plausible/limitée » ; ils rapportent des points perso en position haute (3,5 × sévérité × w).
- Même produit, « Alcohol » en position 5 vs 6 : −6 vs −2,4 (Weleda Skin Food 42 vs 51) — falaise de seuil.

**Proposition.** (a) Pousser une ligne `{type:"plafond", pts: cap − somme, dit:"…"}`. (b) Libellé gradué selon `sensibilisant` (1 = « rarement sensibilisant », 3 = « allergène fréquent ») ; masquer sous 3 pts (déjà fait par `factsAffiches`, mais `facts` complet est renvoyé). (c) PG : `irritant 1`, `sensibilisant 2`. (d) Points perso : `bonusMatch` × (benefitPower / 3) pour que le power 1 rapporte 1/3. (e) Alcool : malus linéaire de w(pos) au lieu d'un seuil à 5.

---

## Comment une marque peut tricher aujourd'hui (résumé, chiffres ci-dessus)

| Manœuvre | Gain | Le moteur la récompense ? |
|---|---|---|
| Écrire « Parfum » au lieu de déclarer les allergènes | perso +16 à +48 pts (P1) | **oui, massivement** |
| Écrire « Perfume », « Aroma », « Parfum* » | formule +13, perso +25 (P11) | oui |
| Ajouter 3 actifs traces après le conservateur | serum +15 (P6) | oui |
| Ajouter « Retinol » en toute fin | +12 (P6) | oui (lowDose) |
| Ajouter un glucoside à 0,5 % dans un lait | +12 (P4) | oui |
| Fournir une INCI courte / tronquée | note « mid » + « sans parfum » (P10) | oui |
| Nommer le produit « essence/lotion » pour tomber en toner | TO Niacinamide 66 → 79 ; CeraVe cleanser 59 → 81 | oui (grilles sans prérequis actifs) |
| Laisser la catégorie « indéterminée » | +10 en moyenne (aucun prérequis) | oui |
| Déclarer les allergènes (obligation UE) | −48 pts perso | **punie** |

## Yuka et INCIdecoder : où SmartSkin est plus juste, où il l'est moins

**Plus juste que Yuka.** Yuka ne note que le danger (4 niveaux par ingrédient, pire ingrédient dominant), sans bénéfice, sans dose, sans rinçage. SmartSkin : position INCI comme proxy de dose, barre des 1 %, exposition rincé × 0,5, grille par métier (un solaire jugé sur protéger), complexe parfumant plafonné (côté formule), inconnu = 0. Un nettoyant au coco-bétaïne n'est pas « mauvais » parce qu'un ingrédient est orange.

**Moins juste que Yuka.** (1) Chez Yuka, ajouter un ingrédient ne peut jamais faire monter la note ; chez SmartSkin, si (P6, P4) → surface de triche. (2) Yuka compte « Parfum » une fois ; SmartSkin perso le compte N fois (P1). (3) Yuka note mieux les filtres minéraux que les organiques ; SmartSkin l'inverse par erreur de données (P2, P3). (4) Yuka ne dit jamais « ce produit vous protège des UV » (P9).

**Vs INCIdecoder.** INCIdecoder ne donne pas de note ; il qualifie chaque ingrédient (superstar / goodie / icky) avec la preuve. SmartSkin est plus utile (un chiffre + perso) mais moins prudent sur le « bénéfique » : le groupe `benefique` de `ficheIngredients` (moteur.ts:127) inclut tout `role: active` avec un bénéfice, y compris l'eau thermale, le sulfate de cuivre, le concombre. INCIdecoder les mettrait en « goodie / preuves limitées ». Recommandation : afficher `benefitPower` (et la source) dans la fiche, et réserver « bénéfique » à power ≥ 2.

## Ce qui est bien fait et ne doit pas changer

1. **Le plafond du complexe parfumant côté formule** (−12 max, une ligne « N composants ») et le principe écrit noir sur blanc « prime à l'opacité = inacceptable ». Il faut juste l'étendre au perso.
2. **Exposition rincée** (cleanser 0,55, démaquillant 0,5) : un sulfate dans un gel rincé ne coûte pas ce qu'il coûte dans une crème de nuit. Yuka ne le fait pas.
3. **Barre des 1 % par marqueurs + exceptions lowDose** : la bonne lecture de l'INCI, à condition de l'appliquer aussi au comptage des actifs (P6).
4. **Grilles métier normalisées par leur propre maximum, sans offset catalogue** : un nettoyant est comparé à ce qu'un nettoyant doit faire ; la note ne bouge pas quand le catalogue grossit. Les prérequis « absence coûte, présence ne rapporte rien » sont une bonne idée — c'est leur définition qui pèche (P4, P5, P6).
5. **Scission allergie / irritation** : le decyl glucoside ne coûte rien à qui n'y est pas allergique ; l'irritation reste universelle. Et les court-circuits binaires grossesse / allergie déclarée (modèle SkinSAFE) plutôt que des ± points.
6. **Inconnu = 0 point, jamais un malus** (l'erreur inverse d'EWG), et le badge « analyse partielle » — à durcir (P10), pas à supprimer.
7. **Le perso fait vraiment son travail quand la formule est bien lue** : Toleriane Dermallergo 69 → 93 pour une peau sèche réactive, 54 pour une peau grasse ; Cicalfate+ 96 pour la peau sèche. Le facts object rend le calcul auditable — c'est ce qui a permis cet audit.
