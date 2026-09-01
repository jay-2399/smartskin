# SmartSkin Score — la formule maison (v1, 2026-08-26)

Deux notes par produit scanné, **100 % calculées, zéro IA dans les chiffres** :
- **Score FORMULE** (0-100) : la qualité intrinsèque de la composition — la même pour tout le monde.
- **Score PERSO** (0-100) : la même composition, relue pour UNE peau — part du score formule, ajustée par le profil.

L'IA n'intervient qu'après : elle rédige 2 phrases à partir des faits calculés (jamais l'inverse).
Chaque point du calcul est traçable à une règle → le bloc « Why this score » est un sous-produit gratuit.

---

## 0. La matière première

- **L'INCI du produit** (catalogue : 2 584/2 817 produits couverts). L'ordre INCI ≈ la concentration
  (réglementaire jusqu'à 1 %) → la **position pondère tout** :
  `w(pos)` = 1,0 (positions 1-5) · 0,6 (6-10) · 0,3 (au-delà).
- **Le dictionnaire d'ingrédients** (à construire, une fois, hors ligne — pièce 4) : pour chaque INCI unique,
  - `role` : actif / support / remplissage
  - `benefits` : familles servies (hydratation, anti-imperfections, apaisant, barrière, éclat, anti-âge, protection UV)
  - `benefitPower` 1-3 : force du bénéfice (niacinamide=3, aloe=1)
  - `risks` : irritant 0-3 · comédogène 0-5 · parfum/allergène · alcool desséchant · huile essentielle · conservateur controversé
  - `strength` 0-3 : agressivité (exfoliants, rétinoïdes…)
  - `flags` : grossesse-interdit, photosensibilisant
  - inconnu du dictionnaire → contribue **0** (on n'invente jamais).
- **La catégorie** du produit (nettoyant, sérum…) — dont `rinseOff` (un actif dans un produit rincé compte ×0,5).
- **Le profil** (quiz + analyse) : type de peau, sensibilité 0-3 (→ plafond de tolérance), préoccupations
  avec sévérité 1-3, grossesse, aversions déclarées (parfum, HE…), allergies.

---

## 1. Score FORMULE

```
score = 50                                                    # base neutre
+ Σ actifs bénéfiques :  (+2 × benefitPower) × w(pos) × rinse # max 2 actifs comptés PAR FAMILLE
                                                              # bonus total plafonné à +35
− Σ risques :            (−2 × gravité) × w(pos)              # gravité = niveau irritant/comédogène (1-3)
  parfum & huiles essentielles : malus FIXE (−4 / −5)         # actifs même à faible dose
  alcool desséchant en top 5 : −6
− remplissage : si < 2 actifs au total → −8 (« formule creuse »)
→ borné [5, 98], arrondi
```

Règles anti-triche :
- **Plafond par famille** (2 actifs max comptés) : 5 humectants ne valent pas 5 bonus.
- **Plafond global** (+35) : on ne « farme » pas le score en allongeant l'INCI.
- Le score ne dépend d'AUCUN signal de popularité (ni avis, ni ventes) — pure composition.

Bandes (déjà dans le design system) : **≥ 70 vert · 40-69 orange · < 40 rouge**.

## 2. Score PERSO

```
score = scoreFormule
+ Σ matches   : actif × préoccupation du profil : +2 × sévérité(1-3) × w(pos)   # max +6/ingrédient,
                                                                                # max 2/famille, total +20
± texture     : catégorie/galénique × type de peau : de −8 (riche × grasse) à +4 (gel × grasse)
− flags perso : parfum × sensibilité S : −4 × S (S=3 → −12)
                comédogène ≥ 3 × peau grasse/acnéique : −3 × w(pos)
                alcool desséchant × peau sèche/déshydratée : −6
                huile essentielle × peau réactive : −8
− force       : strength du produit − plafond de tolérance : −5 par cran de dépassement
→ borné [5, 98]
```

**Règles absolues (court-circuit, pas des malus)** :
- grossesse × rétinoïde / acide salicylique fort → **score plafonné à 15 + bandeau rouge**
- allergie déclarée présente dans l'INCI → **plafonné à 10 + bandeau rouge**

## 3. Le « facts object » (= le bloc Why, gratuit)

Chaque ligne du calcul perso émet un fait :
```json
{ "label": "Salicylic acid targets your breakouts", "points": +6,
  "evidence": { "inci": "Salicylic Acid", "position": 4, "profil": "imperfections (sévérité 3)" } }
```
Affichage : facteurs |points| ≥ 5, max 5 lignes, triés — puis « See the full breakdown (N more) ».
Le LLM (Haiku) reçoit CE JSON et rédige le verdict (2 phrases). Repli sans IA : phrases-gabarits.

## 3bis. Révisions structurelles v1.1 — imposées par la recherche (scan-scoring-structure.md)

Ces règles CORRIGENT/complètent les sections 1-2 ci-dessus :

1. **Plafonds de bande non compensatoires** (le correctif n°1) : l'additif pur permet à dix bons
   ingrédients de « racheter » un vrai problème — la critique centrale faite au Nutri-Score.
   Comme Yuka (rouge → ≤ 24, orange → ≤ 49), on impose : un ingrédient à risque **gravité 3
   en positions 1-5** → le score du produit est **plafonné à 49** (jamais vert), quelle que soit
   la somme. Gravité 3 au-delà de la position 5 → plafond 69 (jamais « excellent »).
2. **Exceptions « efficaces à faible dose »** : rétinoïdes, peptides, facteurs de croissance et
   assimilés reçoivent **le poids plein (w = 1,0) quelle que soit leur position** — sinon la
   pondération par position les sous-note mécaniquement (ils dosent < 1 % par nature). Liste
   d'exceptions maintenue dans le dictionnaire (`lowDoseEffective: true`). Miroir exact du malus
   fixe parfum/HE côté risques.
3. **Détection de la barre des 1 %** : sous 1 %, l'ordre INCI est LIBRE (règlement UE 1223/2009
   art. 19 ; US 21 CFR 701.3) — la position n'y signifie rien. On borne la zone fiable par
   marqueurs : la position du **phenoxyethanol** (plafonné légalement à 1 %) et des gélifiants
   (xanthan gum, carbomer) marque l'entrée de la zone « ≤ 1 % » → tout ce qui suit passe à
   w = 0,3 forfaitaire, sauf exceptions du point 2.
4. **La double peine parfum est assumée mais AFFICHÉE EN UNE LIGNE** : le malus formule (−4)
   et le malus perso (−4 × sensibilité) sont défendables comme « effet de base + interaction »,
   à condition d'être calibrés comme UN total voulu et rendus dans le Why comme UNE seule ligne
   (« Fragrance — poorly suited to reactive skin : −16 »), jamais deux lignes qui semblent
   compter le même ingrédient deux fois.
5. **L'inconnu n'est jamais un malus, mais il se VOIT** : ingrédient hors dictionnaire = 0 point
   (règle conservée) ; MAIS si la couverture du dictionnaire sur les positions 1-10 du produit
   passe sous 70 %, la fiche porte un badge **« analyse partielle »** — un produit non couvert ne
   doit pas paraître faussement neutre (l'erreur inverse d'EWG, qui pénalise l'absence de données).
6. **Positionnement du score perso** : l'étage perso se présente TOUJOURS comme de
   l'**adéquation** (« suited to your skin »), JAMAIS comme de la sécurité médicale. Seuls les
   court-circuits binaires (grossesse, allergie déclarée) relèvent du registre sécurité — c'est le
   seul modèle validé médicalement (SkinSAFE/Mayo Clinic : exclusion binaire, pas des ± points).
7. **`algo_version` obligatoire** dès le premier score stocké + changelog des versions (playbook
   Nutri-Score 2023 / INCI Beauty) ; le re-scoring lors d'un changement d'algo est un événement
   produit annoncé, pas un correctif silencieux.
8. **Le risque n°1 n'est pas la formule, c'est le catalogue** : même SkinSAFE a ~28 % de listes
   INCI incomplètes (étude Dermatitis). → contrôle qualité des INCI importés (longueur plausible,
   présence d'eau/conservateurs, comparaison inter-sources) au même rang de priorité que le moteur.

## 4. Calibration & garde-fous

- **Jeu étalon** : 25-30 produits connus × 3 profils types → on ajuste les poids jusqu'à ce que le
  classement « sonne juste » (même méthode que le moteur reco, juin 2026). Les poids ci-dessus
  sont le point de départ, pas la vérité révélée.
- **Tests de monotonie** (automatiques) : ajouter du parfum ne peut JAMAIS monter un score ;
  retirer un actif qui matche une préoccupation ne peut jamais monter le perso.
- **Déterminisme** : même INCI + même profil ⇒ même score, à vie de la version.
- **`scoreVersion`** stocké avec chaque note : le re-scoring (nouveau face scan OU nouvelle version
  de formule) est un événement produit, pas un bug.

## 5. Ce que ça donne (exemple illustratif)

Effaclar Duo+M × profil « mixte à grasse, imperfections sévères, peau réactive au parfum » :

| Étape | Points | Note |
|---|---|---|
| Score formule | | **84** |
| Acide salicylique (pos. 4) × imperfections sév. 3 | +6 | |
| Niacinamide (pos. 6) × zone T grasse | +4 | |
| Parfum × sensibilité 3 | −12 | |
| Duo exfoliant > plafond de tolérance (2 crans) | −10 | |
| Alcool denat (pos. 7) × barrière fragilisée | −6 | |
| Menthol (pos. 12) × peau réactive | −4 | |
| **Score perso** | | **62** |

→ Verdict affiché : « Good for you — with one caution », et le Why liste exactement ces lignes.
(Le 84/62 de toutes nos maquettes n'était pas du hasard : c'est ce calcul-là, joué à la main.)

## 6. Journal de calibration (v1.0.0-dev)

**2026-08-26 — deux corrections de CONFORMITÉ (pas des choix de calibration)** :
1. `irritant: 1` ne pèse plus dans le score FORMULE — la spec §5.2 dit « ne pèse que sur profil
   sensibilité 3 », or le score formule est sans profil. Il ne compte donc plus que côté perso.
2. **Pas de double comptage interne** : un ingrédient qui reçoit un malus FIXE (parfum, HE,
   alcool en top 5) ne reçoit plus EN PLUS le malus générique d'irritance. Une ligne = un
   ingrédient.

Effet mesuré sur les 2 584 produits du catalogue :
| | avant | après |
|---|---|---|
| moyenne formule | 46,3 | **53,0** |
| produits verts (≥70) | 15 | **72** |
| produits rouges (<40) | 566 | **314** |
| max observé | 77 | 80 (perso 84) |

Diagnostic à l'origine : malus moyen −20,3/produit contre bonus +11,9 — les micro-malus
(4,7 par produit) et le double comptage parfum écrasaient mécaniquement la distribution.

**Reste à calibrer** (session avec l'utilisateur) : seuil d'affichage du bloc Why (5 pts masque
des matches à +4) ; générosité de `bonusActif` ; audit des produits au plancher de 5.

**2026-08-26 (suite) — audit des extrêmes : deux bugs d'équité trouvés et corrigés**

3. **Un ingrédient = UN seul malus fixe.** Une huile essentielle allergène cumulait le malus HE
   (−5) ET le malus parfum (−4). On retient désormais le plus fort, jamais la somme.
4. **Plafond du complexe parfumant (−12 max par produit).** Bug le plus grave : le règlement UE
   oblige à DÉCLARER les allergènes d'un parfum (jusqu'à 12 lignes INCI). Une marque transparente
   prenait donc 12 malus quand une marque opaque écrivant « Parfum » n'en prenait qu'un. Prime à
   l'opacité = inacceptable. Le système parfumant compte maintenant comme UNE caractéristique du
   produit, avec un malus cumulé plafonné, affiché en une ligne « complexe parfumant (N composants) ».

Effet cumulé des 4 corrections sur les 2 584 produits :
| | départ | final |
|---|---|---|
| moyenne | 46,3 | **56,1** |
| verts | 15 | **72** |
| rouges | 566 | **46** |
| au plancher (5/100) | 15 | **0** |

Les produits qui restaient au plancher étaient tous des formules riches en huiles essentielles
(7 à 12 entrées déclarées) — un artefact de la déclaration réglementaire, pas un jugement de qualité.

**2026-08-26 (fin de journée) — dictionnaire COMPLET + fiche branchée**

- **3 199 ingrédients classés, 100 % de couverture** (1 610 actifs). Overlay réglementaire :
  137 allergènes UE, 4 bannis, 3 libérateurs de formaldéhyde, 9 grossesse-N1, 31 N2, 97 low-dose.
- **Qualité catalogue** : 1 INCI inversé détecté et corrigé (« ETANORULAYH MUIDOS » = SODIUM
  HYALURONATE écrit à l'envers, dans 3 produits). Restent ~14 artefacts de parsing dans le
  vocabulaire (ETC, COPOLYMER, « ACNE TREATMENT. INACTIVE INGREDIENTS: WATER ») — neutres pour
  le score (inconnu = 0 point) mais à nettoyer en amont du scraper.
- **Distribution finale** : moyenne 56,2 · 82 verts · 2 453 orange · 49 rouges · min 26 · max 79 ·
  45 produits en « analyse partielle ». **68 % des produits ont une note perso différente de leur
  note formule** — la personnalisation discrimine réellement.
- **Fiche branchée** : `06-result-premium.html?p=<produit>` affiche les vrais chiffres via le
  nouvel endpoint `/produit` (identité + 2 scores + facts). Jauge, couleur de bande, légendes
  autour du packshot et bloc « Why » remplis depuis le calcul. Verdict = phrase-gabarit
  déterministe en attendant l'IA (crédit API épuisé).

**2026-08-26 — v1.1.0 : l'échelle est libérée jusqu'à 100 (décision produit)**

Constat : la formule v1.0 plafonnait à **79** sur tout le catalogue — non pas parce que les
produits étaient moyens, mais parce que le tarif du bonus (2) et le plafond (35) étaient trop
serrés. Les 4 meilleures formules (0 malus, 9-11 actifs prouvés) récoltaient 29 points de bonus
sur 35 possibles. Une échelle sur 100 dont le sommet réel est 79 gaspille 20 % de la graduation
et fait passer l'excellence pour du « pas mal ».

**Méthode : calibration par ÉTALONS.** Quatre INCI construits à la main comme repères fixes :

| étalon | v1.0 | v1.1 |
|---|---|---|
| PARFAIT (sérum idéal, 0 défaut, actifs prouvés) | 78 | **99** |
| TRÈS BON (actifs prouvés, sans risque) | 68 | 82 |
| MOYEN (1 actif, base neutre) | 46 | 49 |
| MAUVAIS (alcool + parfum, 0 actif) | 20 | 20 |

Ces étalons sont désormais la référence de non-régression : toute évolution de la formule doit
les laisser dans ces eaux (parfait ≈ 100, mauvais ≈ 20).

**Réglages appliqués** : `bonusActif` 2 → **3,5** · `plafondBonus` 35 → **55** ·
`borne` [5,98] → **[5,100]** · bandes vert 70 → **75**, orange 40 → **45**
(70 ne peut plus signifier « bon » quand 100 est atteignable).

**Résultat catalogue** : moyenne 65,3 · min 28 · max **100** · 524 verts (20 %) · 70 rouges (3 %).
Les 4 produits à 100 ont été vérifiés un par un : ANUA Niacinamide 10 TXA 4, DRMTLGY Needle-less,
Peace Out Dark Spots, Paula's Choice Resist — tous 9-11 actifs prouvés et **zéro malus**. Le 100
reste ce qu'il doit être : le sans-faute, pas la moyenne.

**Position assumée** : 100 = « parfait sur le papier », pas « parfait ». On note la composition
déclarée, jamais le produit fini — l'écran méthode doit le dire noir sur blanc.

**2026-08-26 — v1.2.0 : l'adéquation se déduit de la COMPOSITION, pas du libellé**

Bug trouvé : la règle « catégorie × type de peau » de la v1.0 (`texture`) attendait des catégories
`moisturizer_rich`, `gel`, `cleanser_foaming` — **qui n'existent pas dans le catalogue** (il ne
connaît que `moisturizer`, `cleanser`, `serum`…). C'était du code mort : la dimension « adapté à ma
peau » ne se déclenchait jamais, d'où un écart perso moyen de 2,3 points seulement.

Principe retenu (formulation utilisateur) : **un produit se juge par rapport à ce qu'il prétend
être, au regard de la peau** — et surtout PAS pénalisé pour être hors sujet. Un anti-rides qui ne
traite pas les préoccupations de l'utilisatrice ne dégrade pas sa peau : sa note reste haute.

Implémentation — `natureProduit()` DÉDUIT de l'INCI :
- **richesse** (beurres, huiles, cires, esters gras pondérés par position) → riche / légère ;
- **sulfates** en tête (tensioactifs décapants) ;
- **filtres minéraux** (solaires) ; **force max** des actifs.

Puis confrontation au profil : riche × grasse −12 · riche × mixte −7 · riche × sèche **+6** ·
légère × sèche −7 · légère × grasse +5 · sulfates × sensible ou sèche −8 · exfoliant fort ×
sensible −10 · filtre minéral × sensible +4.

Le tarif perso est aligné sur le tarif formule (2 → **3,5**, plafond des matches 20 → 30) :
la pertinence pour TA peau ne peut pas valoir moins que la qualité générale.

| | v1.1 | v1.2 |
|---|---|---|
| produits dont la note perso diffère | 68 % | **88 %** |
| écart moyen | 2,3 pts | **6,0 pts** |
| écarts ≥ 10 pts | 25 | **563** |
| amplitude | −6 / +13 | **−13 / +26** |

Étalons de contrôle (profil mixte, imperfections+brillance) : anti-âge pur 87 → **90** (aucune
pénalité de hors-sujet, juste sa texture légère qui convient) · anti-imperfections 89 → **100** ·
crème riche 64 → **51** (texture inadaptée + comédogènes).

**2026-08-26 — v1.3.0 : règles par catégorie (chaque famille a son métier)**

Trois couches ajoutées :
1. **Modulateurs par catégorie** — `rince` (le produit part au rinçage → risques ET actifs
   comptent moins), `exigeActifs` (un sérum doit en avoir, un nettoyant non), `douceurCritique`
   (contour des yeux 1,8 · nettoyant 1,6 : la tolérance prime sur la performance).
2. **Le métier du solaire, c'est protéger** : filtres UV = **+22** pour un solaire, **+8** pour un
   produit qui en contient sans que ce soit son métier (crème de jour SPF). Fin de l'absurdité
   « solaire avec 0 actif ».
3. **Pas de malus « formule creuse »** pour les catégories dont ce n'est pas le métier
   (nettoyant, démaquillant, tonique, masque).

**Puis correction d'un biais que ces règles avaient créé** : les moyennes par famille divergeaient
(sérums 77,4 vs nettoyants 52,3) — l'app aurait dit « tes nettoyants sont médiocres » par
construction. Un **offset par catégorie** aligne désormais la médiane de chaque famille sur 60 :
sérum −17 · solaire −21 · hydratant −8 · nettoyant +7 · démaquillant +10.
**On compare les nettoyants aux nettoyants**, pas aux sérums.

Résultat : toutes les familles à 58-61 de moyenne. Meilleurs de chaque famille vérifiés
légitimes (COSRX Boost Your Barrier 73 en nettoyant, CeraVe Acne Control 89 en exfoliant,
Paula's Choice Resist 89 en tonique, ANUA 88 en sérum).

⚠️ **Effet de bord à traiter** : avec des règles par catégorie, une MAUVAISE catégorie devient une
erreur de note (avant elle était sans conséquence). Cas repérés : « Neutrogena Agua Micelar »
classé sérum (25/100), « Mario Badescu Cucumber Cleansing Lotion » classé hydratant (20/100),
Horace « Exfoliant Visage » classé hydratant, « Strengthening Conditioner » (un après-shampooing)
classé hydratant. → prochaine étape : traiter les 899 « incertain » et sortir les produits
capillaires/corps du périmètre visage.

**2026-08-26 — v1.4.0 : le catalogue est enfin propre (catégories + périmètre)**

Le chantier le plus long de la journée. Trois passes successives :

1. **Faisceau de preuves** (`categorise.mjs`) — le nom et la composition VOTENT chacun avec un
   poids (3 = nomme la catégorie · 1 = indice faible), la somme décide, et les votes serrés sont
   déclarés « incertain » plutôt que tranchés au hasard. Ni le nom ni la composition ne dominent :
   les deux sont des preuves, de force inégale selon le cas (filtres UV organiques = 3, filtres
   minéraux = 1 car aussi pigments).
2. **959 « incertains » arbitrés par agents** — analyse nom + INCI, avec **recherche web** sur les
   cas réellement 50/50 (~50 produits vérifiés sur les fiches officielles des marques). Décisions
   marquées `sur-agent` / `probable-agent`, jamais réécrites ensuite par les règles mécaniques.
3. **Nettoyage final** — enrichissement français (« Exfoliant Visage » n'était pas reconnu par un
   motif anglophone), détection mécanique du hors-périmètre, et règle du **nom commun final** :
   en anglais le type de produit est le dernier mot (« Exfoliating Cleanser » = un nettoyant,
   « Cleansing Scrub » = un exfoliant).

**Résultat : 2 439 produits de soin visage** (sur 2 817), répartis en 10 familles équilibrées ·
**184 produits sortis du périmètre** (shampooings, après-shampooings, gels douche, laits corporels,
maquillage, coffrets multi-produits, accessoires) — marqués, jamais supprimés.

Nouvelle catégorie `hors-perimetre` : ces produits ne reçoivent plus de note de soin visage.
Les offsets par catégorie ont été recalés sur le catalogue propre (médiane de chaque famille = 60).

**Découvertes de qualité de données** signalées par les agents : une INCI de crème solaire sur
une fiche de sérum No7 (bundle mal scrapé), des « Duo » qui sont un seul flacon bi-chambre
(L'Oréal Serum Le Duo) vs des vrais coffrets de 3 produits, des patchs silicone réutilisables
sans formule (NYX Face Freezie), une crème « Cetaphil Advanced Protection » qui est en réalité
un soin bébé pour le siège.
