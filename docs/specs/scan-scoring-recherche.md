# Classification des ingrédients — recherche sourcée (le CONTENU du dictionnaire)

> **Objet** : recherche web compagne de `scan-scoring-structure.md` (qui valide la STRUCTURE de la formule).
> Celle-ci fonde le **CONTENU** : comment classer chaque ingrédient INCI (rôle, bénéfices, risques, flags)
> et quelles listes réglementaires copier telles quelles dans le dictionnaire.
> Rédigé le 2026-08-26. Chaque affirmation porte sa source ; les incertitudes sont dites.

**Ce que le dictionnaire doit remplir (rappel de `scan-scoring.md`)** : `role`, `benefits`, `benefitPower` 1-3,
`risks` (irritant 0-3 · comédogène 0-5 · parfum/allergène · alcool desséchant · huile essentielle ·
conservateur controversé), `strength` 0-3, `flags` (grossesse, photosensibilisant), `lowDoseEffective`.

---

## 1. Comment les scoreurs existants classent les ingrédients

### 1.1 Yuka (méthode cosmétique publiée)

**Classification** : chaque ingrédient est rangé dans **4 niveaux de risque** — « High-risk (red dot) », « Moderate risk (orange dot) », « Low risk (yellow dot) », « Risk-free (green dot) » — évalués sur **5 axes de danger** : « endocrine disruption », « allergenic », « irritant », « carcinogenic », « pollutant » ([méthode cosmétique officielle](https://help.yuka.io/l/en/article/2t20ixn5y5-evualuation-cosmetic-products)). Base d'environ 12 500 ingrédients ; les risques et sources sont affichés par ingrédient sur la fiche produit.

**Sources revendiquées** ([page sources officielle](https://help.yuka.io/l/en/article/qn7duow8xh-on-which-sources-does-yuka-base-their-analyses)) : avis d'organismes officiels (SCCS, ECHA, US EPA, AICIS, ANSES, IARC/CIRC) + littérature indépendante hiérarchisée par niveau de preuve (méta-analyses > cohortes > cas-témoins > animal > in vitro > opinion d'expert), avec la cote de Klimisch pour la qualité des études expérimentales ; et des bases militantes/agrégées : **SIN List, TEDX List, ED List, DEDUCT, PubChem… et Skin Deep d'EWG** — donc une partie du sourcing est de seconde main et orientée « hazard ».

**Agrégation** (rappel — détaillée dans `scan-scoring-structure.md`) : le pire ingrédient plafonne (rouge → ≤ 24, orange → ≤ 49) ; sinon base ≥ 50 et malus additifs : −10 (cancérogène/PE potentiel), −7 (plusieurs risques), −2 (un seul risque) ; en présence de rouge/orange s'ajoutent −12/−8 (rouge) et −6/−4 (orange) ; formules ≤ 3 ingrédients → pénalités renforcées ([pénalités officielles](https://help.yuka.io/l/en/article/ih5pet4ffc-how-are-penalties-calculated-in-the-cosmetic-product-scores)). Yuka publie aussi un **changelog des reclassements** d'ingrédients ([recap risk level changes](https://help.yuka.io/l/en/article/3kdehn4bnk-risk-level-changes-cosmetic-ingredients)) — pratique à imiter.

**À retenir pour nous** : la hiérarchisation par niveau de preuve et le changelog sont sains ; le mélange « allergène = même axe que cancérogène » et l'appui sur des listes militantes (SIN, TEDX) sont les points faibles documentés (§2).

### 1.2 INCI Beauty

**Classification** : chaque ingrédient porte une **fleur de couleur** — vert, jaune, « orange éclaté », orange, rouge — du moins au plus controversé ([Comment ça marche ?](https://incibeauty.com/theme/17-comment-ca-marche) ; [Comment les produits sont-ils notés ?](https://incibeauty.com/blog/396-comment-les-produits-sont-ils-notes)).

**Agrégation** : note de départ **20/20**, puis malus par ingrédient à fleur (rouge > orange > jaune), **pénalité moindre pour les allergènes**, malus selon la position et le nombre d'ingrédients (< 15 favorisé, > 50 pénalisé), **bonus** bio/parfums naturels ([Les algorithmes](https://incibeauty.com/blog/526-les-algorithmes) ; [nouvel algorithme](https://incibeauty.com/blog/322-nouvel-algorithme-de-notation-en-test-sur-inci-beauty)). Leur position revendiquée : « pénalité progressive » — refus du zéro automatique dès qu'un perturbateur endocrinien est *suspecté*, jugé plus catégorique que la science ne le permet.

**À retenir** : le bonus « naturalité/bio » est un jugement de valeur, pas un fait dermatologique — nous ne le reprenons pas. La pénalité progressive et la modulation par position sont proches de notre design.

### 1.3 CosDNA

**Classification** : 3 colonnes par ingrédient — **Acne (comédogénicité) 0-5, Irritant 0-5, Safety 1-9** (certaines sources secondaires résument « 1-9 » pour tout ; le site étant inaccessible au fetch, on retient : acné/irritant sur échelle Fulton-like 0-5, safety 1-9) ; plus bas = mieux ; **case vide = absence de donnée, pas sécurité** ([Soko Glam / The Klog, avec Lab Muffin et KindofStephen interviewés](https://sokoglam.com/blogs/theklog/what-is-cosdna) ; [SkinSort — ratings explained](https://skinsort.com/blog/comedogenic-irritancy-ratings-explained)). Le « Safety » agrège des signalements long terme attribués à CIR, RTECS, FDA.

**Limites documentées** : « they don't cite their sources, which makes it impossible to tell if the info is legitimate » (Michelle Wong / Lab Muffin) ; impossible de savoir si une note vient d'une étude humaine, animale, ou d'une concentration précise (Stephen Alain Ko / KindofStephen) — les deux recommandent « a massive grain of salt » ([même source Soko Glam](https://sokoglam.com/blogs/theklog/what-is-cosdna)).

**À retenir** : CosDNA est la préfiguration exacte de nos champs `comédogène`/`irritant`/`safety`… et le contre-exemple exact sur la traçabilité : chaque note de notre dictionnaire doit porter sa source.

### 1.4 EWG Skin Deep

**Classification** : **hazard score 1-10** par ingrédient (1-2 = low, 3-6 = moderate, 7-10 = high hazard), calculé en « weight-of-evidence » sur ~10 endpoints santé (cancer, toxicité développement/reproduction, allergies/immunotoxicité, restrictions d'usage…) + écotoxicité ; chaque source/étude reçoit un poids 0-100 (ex. « known human carcinogen » = 100, « probable » = 55). S'y ajoute un **data availability rating** (none → robust) ; EWG recommande un produit à la fois low hazard ET à données ≥ « fair » ([Understanding Skin Deep ratings](https://www.ewg.org/skindeep/understanding_skin_deep_ratings/) ; [FAQ](https://www.ewg.org/skindeep/learn_more/faq/) ; [About](https://www.ewg.org/skindeep/learn_more/about/)).

**À retenir** : l'idée d'un indicateur séparé « quantité de données » est bonne (notre badge « analyse partielle » en dérive) ; le défaut structurel est que le hazard est compté **sans dose ni contexte d'usage** (§2).

### 1.5 Tableau comparatif

| Scoreur | Échelle ingrédient | Axes évalués | Dose/position ? | Sources tracées ? |
|---|---|---|---|---|
| Yuka | 4 niveaux (vert→rouge) | PE, allergène, irritant, cancérogène, polluant | non (hors formules courtes) | oui, par ingrédient (mais inclut listes militantes) |
| INCI Beauty | 5 fleurs (vert→rouge) | controverse globale | position + nb d'ingrédients | partiellement (fiches ingrédients) |
| CosDNA | acné 0-5 · irritant 0-5 · safety 1-9 | 3 axes distincts | non | **non** (défaut principal) |
| EWG | hazard 1-10 + data availability | ~10 endpoints + écotox | non | oui (mais pondération contestée) |

Aucun ne croise ingrédient × **profil de peau** — c'est notre différenciation (le score PERSO), et c'est aussi ce que fait le seul acteur validé médicalement, SkinSAFE (Mayo Clinic), mais en exclusion binaire d'allergènes, pas en points.

## 2. Critiques documentées : les erreurs de classification à ne pas répéter

Les critiques convergent depuis trois camps indépendants : chimistes cosmétiques vulgarisateurs (Michelle Wong / Lab Muffin, docteure en chimie ; Stephen Alain Ko / KindofStephen ; Jen Novakovich / The Eco Well), dermatologues interrogés par la presse ([Beauty Independent](https://www.beautyindependent.com/yuka-beauty-industry-insiders-question-product-ratings/), [Hypebae](https://hypebae.com/2025/11/yuka-app-makeup-skincare-ingredients-cosmetic-chemists-interview-trend-explainer), [Glossy](https://www.glossy.co/beauty/yuka-beauty-wellness-product-scanning-app/), [NewBeauty](https://www.newbeauty.com/view/beauty-ingredient-apps)), et la communication scientifique institutionnelle ([American Chemical Society — « Clean beauty, chemophobia »](https://www.acs.org/pressroom/tiny-matters/clean-beauty.html)).

### 2.1 L'erreur racine : confondre danger (hazard) et risque

« A hazard is a potential source of harm. A risk is how likely that harm will actually happen » — et « if you only look at hazards, then every single ingredient can be considered hazardous » (Michelle Wong, [Clean beauty is wrong](https://labmuffin.com/clean-beauty-is-wrong-and-wont-give-us-safer-products/)). EWG note le hazard **sans jamais intégrer l'exposition** (dose, concentration, rinçage, voie) ([analyse hazard vs risk](https://boldpurity.com/blogs/skin-science-journal/is-the-ewg-skin-deep-database-reliable)) ; Yuka ne connaît pas les concentrations et note comme si l'ingrédient trace pesait autant que l'ingrédient majeur ([Beauty Independent](https://www.beautyindependent.com/yuka-beauty-industry-insiders-question-product-ratings/)).

**Conséquence pour nous** : notre pondération par position `w(pos)` est précisément la réponse minimale à cette critique — elle doit rester au cœur du système, et le dictionnaire doit distinguer « danger intrinsèque » et « risque à l'usage cosmétique réel ».

### 2.2 La liste des erreurs de classification documentées (à ne pas répéter)

1. **Conservateurs sûrs pénalisés à tort** : phenoxyethanol (« solid safety profile at typical usage levels », autorisé partout, plafonné à 1 % UE) et parabens courts (methyl-/ethylparaben) sont sanctionnés alors que les évaluations officielles les jugent sûrs aux doses d'usage (§3.4, §4.4). Wong : les parabens sont « lumped together » alors que les profils diffèrent radicalement entre esters courts et longs ; les études à charge sont « in vitro on cells, or on animals ». Pénaliser les conservateurs pousse vers des formules **moins bien conservées ou conservées par des systèmes moins étudiés** (« newer preservatives… their health effects are largely unknown » — Lab Muffin). → *Règle : un conservateur autorisé et dosé réglementairement n'est PAS un risque de niveau élevé ; au pire un signal faible personnalisé (allergie de contact documentée).*
2. **Biais « naturel = sûr »** : « Natural chemicals aren't held up to the same level of scrutiny as synthetic chemicals » (Lab Muffin) ; les produits « clean » remplacent le parfum synthétique par des huiles essentielles « which can be so irritating for a lot of people ». INCI Beauty accorde un **bonus aux parfums naturels** — exactement l'inverse de la dermatologie : les allergènes officiels UE (§4.1-4.2) sont majoritairement des composants d'HE. → *Règle : aucune variable « naturalité » dans notre dictionnaire ; les HE sont jugées sur leurs allergènes et leur irritance, point.*
3. **Sourcing sur listes militantes** : Yuka cite SIN List, TEDX List, Skin Deep parmi ses sources — des listes de précaution/plaidoyer, pas des évaluations de risque ; « if the chemical… has already been fear-mongered, they often seek out obscure, often dated studies that support their agenda instead of looking at the body of evidence » (Novakovich/Wong, projet Formula IQ, [ACS](https://www.acs.org/pressroom/tiny-matters/clean-beauty.html)). → *Règle : nos sources primaires = CIR, SCCS, règlement UE ; jamais une liste militante comme source d'un malus.*
4. **Voie d'exposition ignorée** : titanium dioxide pénalisé dans des crèmes alors que le risque évalué (IARC 2B) concerne l'**inhalation** de poudre/spray — dans une crème il est même l'un des filtres UV les plus sûrs ([exemples Yuka critiqués](https://nuniq.io/blogs/stories/yuka-beauty-app-truth-info-power) ; [page Yuka dédiée](https://help.yuka.io/l/en/article/ydsi07q2n1-titanium-dioxide)). → *Règle : un flag de risque porte sa voie (topique/inhalation) et sa forme galénique.*
5. **Le paradoxe des solaires** : des solaires efficaces notés rouges (filtres, TiO2) pendant qu'une lotion basique score 80+ — alors que la photoprotection est LA recommandation dermatologique n°1 ([Hypebae](https://hypebae.com/2025/11/yuka-app-makeup-skincare-ingredients-cosmetic-chemists-interview-trend-explainer), [Beauty Independent](https://www.beautyindependent.com/yuka-beauty-industry-insiders-question-product-ratings/)). → *Règle : les filtres UV autorisés UE ne portent jamais un malus qui prive un SPF de la bande verte.*
6. **Actifs efficaces pénalisés comme « risques »** : salicylic acid, retinol flagués « danger » sans distinction entre irritance gérable (réelle, à personnaliser) et toxicité (fantasmée aux doses cosmétiques). → *Règle : distinguer `irritant` (axe personnalisable) de `hazard santé` (réglementaire) ; un actif fort n'est pas un « mauvais » ingrédient, il est un ingrédient à apparier au bon profil (`strength` vs tolérance).*
7. **Absence de données mal gérée** : chez CosDNA une case vide passe pour neutre ; chez EWG un ingrédient peu étudié peut afficher un hazard bas très visible à côté d'un « data availability: none » peu visible ([I Read Labels For You](https://ireadlabelsforyou.com/depths-skin-deep-database-cosmetics/)). → *Règle (déjà actée v1.1) : inconnu = 0 point + badge « analyse partielle » si couverture < 70 % du top 10.*
8. **Tout-en-un anxiogène** : mélanger cancérogénicité, allergie et irritance dans un même « risque » (Yuka : 5 axes fondus en 4 couleurs) fabrique de la peur sans informer (« capitalizes on fear » — [Amperna](https://amperna.com/blogs/news/barcode-scanning-apps-yuka-thinkdirty-helpful-harmful) ; « scores can reflect ideology more than science »). → *Règle : nos axes restent séparés jusqu'à l'affichage (irritant ≠ comédogène ≠ flag réglementaire ≠ flag grossesse) ; le « Why » nomme l'axe exact.*

### 2.3 Le méta-enseignement

Le seul reproche que la critique scientifique ne fait PAS aux scoreurs : personnaliser. Tous les reproches visent la prétention à un jugement **sanitaire absolu** sans dose ni contexte. Notre positionnement (adéquation à un profil, registre non médical, court-circuits réservés aux cas binaires type grossesse/allergie) est exactement l'angle mort qu'ils laissent libre — Formula IQ (Wong × Novakovich) confirme que les scientifiques eux-mêmes considèrent qu'« une app basée dose/contexte » est LA version défendable de l'idée.

## 3. Socle scientifique par famille de risque

### 3.1 Comédogénicité : l'échelle de Fulton (0-5), utile mais faible

**Origine** : la quasi-totalité des notes comédogènes en circulation descend de la liste de James Fulton (1989), construite sur le **modèle de l'oreille de lapin** : substance appliquée dans le canal auriculaire externe de lapins albinos, hyperkératose folliculaire notée histologiquement, échelle 0-5 ([revue clinique JAAD Reviews 2025 — « Comedogenicity in cosmeceuticals: clinical relevance, regulatory gaps »](https://www.jaadreviews.org/article/S2950-1989(25)00088-1/fulltext) ; [Lab Muffin — How to use comedogenicity ratings](https://labmuffin.com/fact-check-how-to-use-comedogenicity-ratings/)).

**Limites documentées** (toutes sourcées) :
- Peau de lapin plus sensible → **faux positifs** ; le gonflement folliculaire peut venir d'une irritation, pas d'un bouchon ; follicules anatomiquement différents, sébum différent ; pores naturellement dilatés comptés à tort comme comédons dans les tests d'origine ([JAAD Reviews 2025](https://www.jaadreviews.org/article/S2950-1989(25)00088-1/fulltext) ; dès 1982 : [« Is the rabbit ear model prophetic of acnegenicity? », J Am Acad Dermatol](https://www.sciencedirect.com/science/article/pii/S0190962282700325)).
- **« Finished products using comedogenic ingredients are not necessarily comedogenic »** — Draelos & DiNardo 2006, [« A re-evaluation of the comedogenicity concept », J Am Acad Dermatol](https://www.sciencedirect.com/science/article/abs/pii/S0190962205046001) : la concentration, le rinçage et le reste de la formule changent tout.
- Les listes qui circulent (CosDNA, blogs) **agrègent des tests faits à des concentrations différentes** et parfois contradictoires entre labos (Lab Muffin).

**Comment l'utiliser honnêtement** : l'échelle 0-5 reste le seul référentiel disponible et le standard de fait (le label « non-comédogène » n'a AUCUNE définition réglementaire — gap souligné par la JAAD Reviews). → Chez nous : (a) le niveau comédogène est un **signal d'adéquation pour peaux grasses/acnéiques uniquement** (jamais un malus universel) ; (b) seuil d'action à **≥ 3/5** ; (c) pondéré par la position et annulé en rinse-off (cohérent Draelos) ; (d) sources de référence croisées : liste Fulton 1989 + agrégats documentés ([SkinSort — ratings explained](https://skinsort.com/blog/comedogenic-irritancy-ratings-explained), qui a le mérite de publier sa méthodologie d'agrégation) ; en cas de désaccord entre sources → retenir le niveau **le plus bas** sauf consensus (principe anti-faux-positif, l'inverse du réflexe clean beauty).

### 3.2 Irritance : ce que la dermatologie reconnaît vraiment

La hiérarchie s'appuie sur les données de patch-tests cliniques, pas sur la réputation :

- **Parfum = l'allergène de contact cosmétique n°1 en pratique clinique** : dans les données NACDG 2019-2020 (Amérique du Nord, patch-tests standardisés), fragrance mix I est le **3e allergène le plus positif (12,8 %)** derrière le nickel et la methylisothiazolinone ([NACDG 2019-2020, Dermatitis](https://pubmed.ncbi.nlm.nih.gov/36917520/)) ; plus de 150 substances parfumantes ont causé des allergies de contact, les plus fréquentes étant les **hydroperoxydes de linalool et de limonène** (formes OXYDÉES des terpènes « doux »), HICC, mousse de chêne/arbre, isoeugenol, cinnamyl alcohol, cinnamal ([revue clinique](https://pubmed.ncbi.nlm.nih.gov/14572300/) ; [Fragrances: Contact Allergy, contactderm.org](https://www.contactderm.org/UserFiles/file/Fragrances__Contact_Allergy_and_Other_Adverse.3-1.pdf)).
- **Huiles essentielles** : mêmes molécules (linalool, limonène, citral, eugénol…) → même famille de risque que « fragrance », souvent à des teneurs supérieures ; leur oxydation à l'air AUGMENTE le pouvoir sensibilisant (hydroperoxydes). C'est le fondement scientifique de notre malus fixe HE.
- **SLS (Sodium Lauryl Sulfate) = L'irritant de référence de la dermatologie** : utilisé à 0,5 % comme **contrôle irritant standard** dans les patch-tests depuis les années 90 ([Geier 2003, Contact Dermatitis](https://pubmed.ncbi.nlm.nih.gov/12694214/) ; [Löffler 2003 — profil comparé SLS vs sodium laureth sulfate vs alkyl polyglucoside](https://pubmed.ncbi.nlm.nih.gov/12641575/) : SLS > SLES > APG en irritance ; [état de l'art 2026](https://onlinelibrary.wiley.com/doi/10.1111/cod.70075)). Un ingrédient choisi par les dermatologues COMME irritant modèle mérite `irritant: 2-3` en produit non rincé, 1-2 en rincé.
- **Alcool dénaturé** : le CIR l'a évalué **sûr tel qu'utilisé** ([Final report Alcohol Denat., Int J Toxicol 2008](https://pubmed.ncbi.nlm.nih.gov/18569160/)) — pas un « hazard santé » ; mais l'effet desséchant/irritant à forte concentration et usage répété est documenté cliniquement (données hand-sanitizers : [étude randomisée barrière cutanée](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12223927/) ; [Curology](https://curology.com/blog/alcohol-denat-in-skincare-is-it-safe/) ; [Healthline](https://www.healthline.com/health/alcohol/alcohol-denat)). Honnêteté : la littérature est partagée — l'effet dépend surtout de la concentration (position INCI) et du terrain (peau sèche/réactive). → chez nous : signal d'ADÉQUATION (malus si top 5, aggravé par profil sec/réactif), pas signal de danger.
- **Tensioactifs** : gradient documenté (Löffler) : sulfates (SLS surtout) > laureth/coco-sulfates > bétaïnes/glucosides. Cocamidopropyl betaine : allergène de contact reconnu (impuretés) mais faible — niveau 1.

### 3.3 CIR (Cosmetic Ingredient Review) : le stock de conclusions à réutiliser

**Processus** : programme d'expertise indépendant financé par l'industrie US mais à panel public (dermatologues, toxicologues, avec liaisons FDA et association de consommateurs), qui publie des monographies par famille d'ingrédients dans l'*International Journal of Toxicology* ([How does CIR work](https://www.cir-safety.org/how-does-cir-work) ; [présentation du programme, Boyer et al. 2017](https://journals.sagepub.com/doi/10.1177/1091581817717646)).

**Les 4 conclusions possibles** (ce sont EXACTEMENT nos valeurs de champ `safetyReview`) :
1. **« Safe as used »** (sûr dans les pratiques et concentrations d'usage) ;
2. **« Safe with qualifications »** (sûr sous conditions — souvent une concentration max ou « ne pas utiliser sur peau lésée ») ;
3. **« Unsafe »** ;
4. **« Insufficient data »**.

**Volumes** (état mars 2017, pour l'ordre de grandeur) : 4 740 ingrédients évalués — 4 611 sûrs ou sûrs avec conditions, **12 unsafe**, 117 données insuffisantes ([Boyer et al. 2017](https://journals.sagepub.com/doi/10.1177/1091581817717646)). Leçon : quand un scoreur affiche des centaines d'ingrédients « dangereux », il contredit le seul corpus d'évaluation systématique existant côté US.

**Usage chez nous** : la conclusion CIR (cherchable sur [cir-safety.org](https://www.cir-safety.org/)) sert de **verrou anti-diabolisation** : un ingrédient « safe as used » CIR ne peut pas recevoir de flag « hazard santé » dans notre dictionnaire (il PEUT rester irritant/comédogène — axes distincts). « Insufficient data » ≠ malus (règle v1.1 n°5).

### 3.4 SCCS : l'autorité scientifique du cadre UE

**Rôle** : comité scientifique indépendant de la Commission européenne ; pour les substances « à risque potentiel » (conservateurs, filtres UV, colorants, teintures capillaires, nano…), c'est LUI qui évalue, et ses avis alimentent les **annexes du règlement 1223/2009** — c'est le chemin avis SCCS → entrée/limite en annexe ([page officielle SCCS](https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs_en) ; [liste des opinions](https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs/sccs-opinions_en)).

**Document méthodologique de référence** : les *Notes of Guidance* (12e révision, SCCS/1647/22, adoptée 2023) — la bible de l'évaluation de sécurité UE (marge de sécurité, exposition, NAMs) ([texte officiel](https://health.ec.europa.eu/publications/sccs-notes-guidance-testing-cosmetic-ingredients-and-their-safety-evaluation-12th-revision_en)).

**Avis directement utilisables pour le dictionnaire** (exemples structurants) :
- **Fragrance allergens in cosmetic products** (SCCS/1459/11, 2012) : l'avis fondateur qui a identifié les substances parfumantes allergisantes « established in humans » → a produit le règlement 2023/1545 (§4.2) ([texte de l'avis](https://ec.europa.eu/health/scientific_committees/consumer_safety/docs/sccs_o_073.pdf)).
- Avis Vitamine A (retinol/retinal/retinyl esters), salicylic acid, parabens (§4.4) — chacun donne une concentration jugée sûre : c'est la **définition opérationnelle du « sûr aux doses d'usage »** en Europe.

**Usage chez nous** : même verrou que le CIR, avec priorité au SCCS en cas de conflit (notre marché est UE) ; un avis SCCS assorti d'une limite d'annexe = l'ingrédient est **contrôlé**, donc pas de malus « hazard » tant que le produit est légal UE — le risque résiduel se traite par les axes irritance/adéquation.

## 4. Listes réglementaires exactes (à copier dans le dictionnaire)

### 4.1 Allergènes de parfum UE — le cadre

- **Base légale** : annexe III du règlement (CE) 1223/2009, modifiée par le **règlement (UE) 2023/1545** (26 juillet 2023) + corrigendum du 13 novembre 2025 ([EUR-Lex](https://eur-lex.europa.eu/eli/reg/2023/1545/oj/eng) ; [SGS](https://www.sgs.com/en-hk/news/2023/10/eu-expands-the-list-of-fragrance-allergens-in-cosmetic-products) ; [Ecomundo](https://ecomundo.eu/en/blog/fragrance-allergen-labelling)).
- **Seuils de déclaration** (inchangés) : l'allergène doit apparaître par son nom INCI dans la liste d'ingrédients dès **> 0,001 % en leave-on** et **> 0,01 % en rinse-off**.
- **Transition** : produits non conformes — mise sur le marché jusqu'au **31 juillet 2026**, retrait des rayons au **31 juillet 2028**. Pendant la transition, notre scanner verra donc les DEUX formats d'étiquettes.
- **Comptage** (source de confusion à connaître) : « 26 historiques » − 2 interdits depuis (HICC/Lyral par Reg. 2017/1410, Butylphenyl Methylpropional/Lilial par Reg. 2021/1902, tous deux passés à l'annexe II) = **24 pré-existants** + **57 nouvelles entrées déclarables** = **81 substances déclarables distinctes** (82 entrées d'annexe, Benzyl Alcohol occupant les entrées 45 et 68) ([décompte réconcilié entrée par entrée, Effinity](https://effinity.io/compliance/eu-fragrance-allergens) ; avis scientifique d'origine : [SCCS/1459/11](https://ec.europa.eu/health/scientific_committees/consumer_safety/docs/sccs_o_073.pdf) qui a identifié 56 allergènes additionnels « established in humans » ; revue académique de contrôle : [Sukakul & Bruze 2024, Acta Derm Venereol](https://pmc.ncbi.nlm.nih.gov/articles/PMC11334351/)).

**Usage dictionnaire** : tout INCI ci-dessous → `risks.parfumAllergene: true` + tag `euFragranceAllergen`. La PRÉSENCE dans l'INCI suffit (si c'est listé, c'est que le seuil est dépassé — c'est le sens même de la règle d'étiquetage). C'est notre meilleure source de personnalisation « peau sensible/allergies » : réglementaire, binaire, indiscutable.

### 4.2 Allergènes de parfum UE — la LISTE COMPLÈTE (81 substances, INCI copiables)

**A. Les 24 « historiques » encore déclarables** (entrées 45, 67-92 de l'annexe III) :

| # | INCI | CAS |
|---|---|---|
| 45(+68) | Benzyl Alcohol | 100-51-6 |
| 67 | Amyl Cinnamal | 122-40-7 |
| 69 | Cinnamyl Alcohol | 104-54-1 |
| 70 | Citral | 5392-40-5 |
| 71 | Eugenol | 97-53-0 |
| 72 | Hydroxycitronellal | 107-75-5 |
| 73 | Isoeugenol | 97-54-1 |
| 74 | Amylcinnamyl Alcohol | 101-85-9 |
| 75 | Benzyl Salicylate | 118-58-1 |
| 76 | Cinnamal | 104-55-2 |
| 77 | Coumarin | 91-64-5 |
| 78 | Geraniol | 106-24-1 |
| 80 | Anise Alcohol | 105-13-5 |
| 81 | Benzyl Cinnamate | 103-41-3 |
| 82 | Farnesol | 4602-84-0 |
| 84 | Linalool | 78-70-6 |
| 85 | Benzyl Benzoate | 120-51-4 |
| 86 | Citronellol | 106-22-9 |
| 87 | Hexyl Cinnamal | 101-86-0 |
| 88 | Limonene | 138-86-3 |
| 89 | Methyl 2-Octynoate | 111-12-6 |
| 90 | Alpha-Isomethyl Ionone | 127-51-5 |
| 91 | Evernia Prunastri Extract (mousse de chêne) | 90028-68-5 |
| 92 | Evernia Furfuracea Extract (mousse d'arbre) | 90028-67-4 |

**Les 2 ex-« 26 » désormais INTERDITS (annexe II)** — flag `banni`, pas seulement allergène : **Hydroxyisohexyl 3-Cyclohexene Carboxaldehyde** (HICC/Lyral, 31906-04-4) et **Butylphenyl Methylpropional** (Lilial/BMHCA, 80-54-6 — également CMR reprotoxique). Les croiser dans un INCI = produit ancien ou non conforme UE.

**B. Les 12 entrées existantes devenues déclarables** (2023/1545) :

| # | INCI | CAS |
|---|---|---|
| 46 | 6-Methyl Coumarin | 92-48-8 |
| 109 | Pinus Mugo Leaf Oil | 90082-72-7 |
| 114 | Pinus Pumila Needle Extract | 97676-05-6 |
| 122 | Cedrus Atlantica Bark Oil | 92201-55-3 |
| 124 | Turpentine | 9005-90-7 |
| 131 | Alpha-Terpinene | 99-86-5 |
| 133 | Terpinolene | 586-62-9 |
| 154 | Myroxylon Balsamum Pereirae Balsam Oil (baume du Pérou) | 8007-00-9 |
| 157 | Alpha-Damascone (groupe « Rose Ketones » ; corr. 2025 : Rose ketone 4 = Damascenone) | 43052-87-5 |
| 175 | 3-Propylidenephthalide | 17369-59-4 |
| 196 | Lippia Citriodora Absolute (verveine) | 8024-12-2 |
| 324 | Methyl Salicylate | 119-36-8 |

**C. Les 45 entrées nouvelles** (entrées 327-371) :

| # | INCI | CAS |
|---|---|---|
| 327 | Acetyl Cedrene | 32388-55-9 |
| 328 | Amyl Salicylate | 2050-08-0 |
| 329 | Anethole | 104-46-1 |
| 330 | Benzaldehyde | 100-52-7 |
| 331 | Camphor | 76-22-2 |
| 332 | Beta-Caryophyllene | 87-44-5 |
| 333 | Carvone | 99-49-0 |
| 334 | Dimethyl Phenethyl Acetate | 151-05-3 |
| 335 | Hexadecanolactone | 109-29-5 |
| 336 | Hexamethylindanopyran | 1222-05-5 |
| 337 | Linalyl Acetate | 115-95-7 |
| 338 | Menthol | 89-78-1 |
| 339 | Trimethylcyclopentenyl Methylisopentenol | 67801-20-1 |
| 340 | Salicylaldehyde | 90-02-8 |
| 341 | Santalol | 11031-45-1 |
| 342 | Sclareol | 515-03-7 |
| 343 | Terpineol | 8000-41-7 |
| 344 | Tetramethyl Acetyloctahydronaphthalenes (OTNE) | 54464-57-2 |
| 345 | Trimethylbenzenepropanol (Majantol) | 103694-68-4 |
| 346 | Vanillin | 121-33-5 |
| 347 | Cananga Odorata Flower Oil (ylang-ylang) | 83863-30-3 |
| 348 | Cinnamomum Cassia Leaf Oil | 8007-80-5 |
| 349 | Cinnamomum Zeylanicum Bark Oil (cannelle) | 8015-91-6 |
| 350 | Citrus Aurantium Amara Flower Oil (néroli) | 72968-50-4 |
| 351 | Citrus Aurantium Dulcis Peel Oil (orange) | 68916-04-1 |
| 352 | Citrus Aurantium Bergamia Peel Oil (bergamote) | 68648-33-9 |
| 353 | Citrus Limon Peel Oil (citron) | 84929-31-7 |
| 354 | Cymbopogon Citratus Leaf Oil (lemongrass) | 8007-02-1 |
| 355 | Eucalyptus Globulus Leaf Oil | 97926-40-4 |
| 356 | Eugenia Caryophyllus Flower Oil (clou de girofle) | 8000-34-8 |
| 357 | Jasminum Officinale Oil (jasmin) | 84776-64-7 |
| 358 | Juniperus Virginiana Oil (cèdre de Virginie) | 8000-27-9 |
| 359 | Laurus Nobilis Leaf Oil (laurier) | 8002-41-3 |
| 360 | Lavandula Angustifolia Oil (lavande) | 84776-65-8 |
| 361 | Mentha Piperita Oil (menthe poivrée) | 8006-90-4 |
| 362 | Mentha Viridis Leaf Oil (menthe verte) | 8008-79-5 |
| 363 | Narcissus Tazetta Flower Extract | 90064-26-9 |
| 364 | Pelargonium Graveolens Oil (géranium ; corr. 2025 : + Flower/Leaf Oil) | 90082-51-2 |
| 365 | Pogostemon Cablin Oil (patchouli ; corr. 2025 : + Leaf Oil) | 8014-09-3 |
| 366 | Rosa Damascena Flower Oil (rose) | 8007-01-0 |
| 367 | Santalum Album Oil (santal) | 8006-87-9 |
| 368 | Eugenyl Acetate | 93-28-7 |
| 369 | Geranyl Acetate | 105-87-3 |
| 370 | Isoeugenyl Acetate | 93-29-8 |
| 371 | Pinene | 80-56-8 |

⚠️ **Précautions d'implémentation** : (1) les entrées botaniques (347-371, 122, 154, 157) sont des GROUPES — l'annexe III liste plusieurs variantes INCI et CAS par entrée (ex. « Cananga Odorata Oil/Extract », « Rose Ketones ») ; le matching doit donc se faire par préfixe botanique (`Cananga Odorata*`, `Lavandula*`…), pas par égalité stricte. (2) Cette table provient d'une source secondaire vérifiée entrée par entrée contre l'annexe consolidée ([Effinity](https://effinity.io/compliance/eu-fragrance-allergens), croisée avec [Sukakul 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11334351/)) — avant de figer le dictionnaire en prod, re-valider contre [l'annexe III consolidée sur EUR-Lex](https://eur-lex.europa.eu/eli/reg/2023/1545/oj/eng) (le site bloque le scraping automatisé ; contrôle manuel ou via CosIng). (3) La base **CosIng** de la Commission ([ec.europa.eu/growth/tools-databases/cosing](https://ec.europa.eu/growth/tools-databases/cosing/)) est l'outil officiel de requête par INCI — c'est la source de vérité machine-readable pour annexes II/III/V/VI.

**Lecture dermatologique de cette liste** : elle recoupe presque exactement les composants majeurs des huiles essentielles populaires (lavande, menthe poivrée, ylang-ylang, agrumes, tea-tree via terpinolène/alpha-terpinene…). Le règlement 2023/1545 est donc la **justification réglementaire de notre malus HE** : une HE dans un INCI amène quasi toujours un ou plusieurs allergènes déclarables.

### 4.3 Grossesse : la liste INCI avec niveau de consensus

Sources médicales croisées : [AAD — Dermatologist-approved pregnancy skin care](https://www.aad.org/public/everyday-care/skin-care-secrets/routine/pregnancy-skin-care) ; revue Motherisk [Bozzo, Chua-Gocheco, Einarson — « Safety of skin care products during pregnancy », Can Fam Physician 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3114665/) ; positions ACOG relayées par [Healthline (relu médicalement)](https://www.healthline.com/health/pregnancy/pregnancy-safe-skin-care) et [InfantRisk Center (Texas Tech)](https://infantrisk.com/content/overview-safety-skin-care-products-during-pregnancy).

**Niveau 1 — CONSENSUS FORT, court-circuit « grossesse » (plafond 15 + bandeau)** :

| Famille | Noms INCI exacts à matcher | Base |
|---|---|---|
| Rétinoïdes et TOUS dérivés | `Retinol`, `Retinal` / `Retinaldehyde`, `Retinyl Palmitate`, `Retinyl Acetate`, `Retinyl Propionate`, `Retinyl Linoleate`, `Retinyl Retinoate`, `Hydroxypinacolone Retinoate`, `Bakuchiol` EXCLU (pas un rétinoïde — ne pas flaguer) ; versions Rx : `Tretinoin`, `Adapalene`, `Tazarotene`, `Isotretinoin` | AAD : contre-indiqués ; Bozzo : 4 cas publiés de malformations sous tretinoin topique — « recommend against use » malgré l'absorption faible ; tératogénicité orale démontrée (classe entière sous suspicion) |
| Hydroquinone | `Hydroquinone` | Absorption systémique **35-45 %** (Bozzo) — la plus haute de tous les cosmétiques ; AAD : à éviter ; de toute façon interdite UE (§4.4) |
| Médicaments topiques (si jamais présents sur une étiquette) | `Finasteride`, `Spironolactone`, `Fluorouracil`, cyclines (`Tetracycline`…) | AAD (liste explicite) |

**Niveau 2 — CONSENSUS MOYEN, malus fort + mention explicite (pas de court-circuit)** :

| Famille | INCI | Nuance exacte |
|---|---|---|
| Acide salicylique À FORTE DOSE | `Salicylic Acid` (position top 5 ou produit exfoliant/peeling) | ACOG : OK en OTC faible dose ; à éviter en peels/fortes concentrations ; Bozzo : absorption topique minime « unlikely to pose any risk ». → notre règle « salicylique fort × grossesse » est correcte, mais un nettoyant à 0,5 % ne doit PAS déclencher le court-circuit |
| Dérivés d'hydroquinone | `Arbutin`, `Alpha-Arbutin` | se clivent en hydroquinone sur la peau ; « safer than hydroquinone » mais données grossesse quasi nulles → précaution recommandée par la majorité des dermatos interrogés ([synthèse](https://www.icliniq.com/qa/kojic-acid/are-kojic-acid-and-alpha-arbutin-used-when-pregnant)) — consensus moyen, honnêteté requise dans le wording |
| Huiles essentielles nommées par l'AAD | `Rosmarinus Officinalis (Rosemary) Oil`, `Ocimum Basilicum (Basil) Oil`, `Jasminum Officinale (Jasmine) Oil`, `Salvia Officinalis / Salvia Sclarea (Sage/Clary) Oil` + par extension `Gaultheria Procumbens (Wintergreen) Oil` (= méthyl salicylate) et `Camphor` en leave-on | AAD les liste nommément « use with caution » ; wintergreen = salicylate concentré |

**Niveau 3 — PRÉCAUTION SANS CONSENSUS (mention informative seulement, PAS de malus grossesse)** : parabens (`Methylparaben`, `Propylparaben`, `Butylparaben`, `Ethylparaben`), phtalates (`Diethyl Phthalate`…), `Triclosan`, `Phenol`, filtre `Benzophenone-3` (oxybenzone). L'AAD dit « caution/discuss », aucune contre-indication formelle — les transformer en interdits serait exactement le biais « précaution = danger » critiqué en §2. On informe, on ne sanctionne pas.

**Réputés SÛRS pendant la grossesse (consensus, à afficher en réassurance)** : `Benzoyl Peroxide` (5 % absorbé, métabolisé en acide benzoïque — « would not be of concern », Bozzo ; ACOG OK), `Azelaic Acid` (ACOG), `Glycolic Acid` / `Lactic Acid` (faible absorption), `Niacinamide`, `Ascorbic Acid` et dérivés, `Hyaluronic Acid`, filtres minéraux `Zinc Oxide` / `Titanium Dioxide`, autobronzant `Dihydroxyacetone` (0,5 % systémique, Bozzo). Un scanner qui rougirait le BPO ou l'azélaïque chez une femme enceinte contredirait l'ACOG.

### 4.4 Annexes UE II/III/V : les interdits et restreints pertinents pour le skincare

Le mécanisme : annexe II = interdits (>1 700 entrées, surtout des CMR jamais utilisés en cosmétique) ; annexe III = restreints (concentration/usage) ; annexe V = conservateurs autorisés (liste positive). Requêtable par INCI dans [CosIng](https://ec.europa.eu/growth/tools-databases/cosing/). Les entrées qui concernent RÉELLEMENT le skincare grand public scanné :

**Interdits (annexe II) qu'on peut encore croiser sur de vieux produits ou hors UE** — flag `banni_ue` :
- `Hydroquinone` — interdite comme éclaircissant ([liste des interdits notables](https://globalcosmeticregs.com/guides/eu/banned-cosmetic-ingredients-eu-list-guidelines)) ;
- `Formaldehyde` — interdit depuis 2019 (CMR 1B, [Reg. 2019/831](https://www.legislation.gov.uk/eur/2019/831/adopted/data.xht?view=snippet&wrap=true)) ; les LIBÉRATEURS restent autorisés (annexe V) mais tout produit qui en libère > 0,001 % doit étiqueter « releases formaldehyde » (seuil abaissé de 0,05 % à 0,001 % par Reg. 2022/1181, [Exponent](https://www.exponent.com/article/new-european-cosmetics-regulation-amendment-formaldehyde-releasers)) — INCI concernés : `DMDM Hydantoin`, `Imidazolidinyl Urea`, `Diazolidinyl Urea`, `Quaternium-15` (lui-même interdit depuis 2021/850), `Sodium Hydroxymethylglycinate`, `Bronopol` ;
- `Butylphenyl Methylpropional` (Lilial) — interdit 2022 (Reg. 2021/1902, CMR) et `Hydroxyisohexyl 3-Cyclohexene Carboxaldehyde` (Lyral) — interdit 2021 ;
- `Zinc Pyrithione` — interdit (Reg. 2021/1902) : encore fréquent dans des antipelliculaires non-UE ;
- `Methylisothiazolinone` en **leave-on** (Reg. 2016/1198) — en rinse-off : max 0,0015 % (Reg. 2017/1224). Présence de MI dans un leave-on = non conforme UE.

**Restreints (annexe III) — les plafonds qui définissent « dose cosmétique légale »** :

| INCI | Limite | Source |
|---|---|---|
| `Salicylic Acid` | 3 % rinse-off capillaire · 2 % autres produits · 0,5 % lotions corps/certains maquillages ; interdit < 3 ans (hors shampooing) | annexe III entrée 98 ([récap](https://allanchem.com/restricted-ingredients-eu-cosmetic-regulation/)) |
| `Retinol`, `Retinyl Acetate`, `Retinyl Palmitate` | **0,3 % équivalent rétinol** (visage/leave-on/rinse-off) · **0,05 % RE** lotion corps ; applicable produits mis sur le marché dès 1er nov. 2025, retrait 1er mai 2027 | [Reg. (UE) 2024/996](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ%3AL_202400996) ; [BeautyMatter](https://beautymatter.com/articles/eus-new-retinol-safety-rules) ; [COSlaw](https://coslaw.eu/new-amendment-to-cosmetics-regulation-retinol-and-other-substances-banned-or-restricted-in-cosmetics/) |
| `Alpha-Arbutin` | 2 % crème visage · 0,5 % lotion corps | Reg. 2024/996 ([SGS](https://ticmall.sgs.com/en/blog_details/ch-regulations-update-cosmetic-requirement-updates-eu-controls-the-use-of-vitamin-a-and-alpha-arbutin-and-arbutin-and-substances-with-endocrine-disrupting-properties-in-cosmetic-products)) |
| `Arbutin` (bêta) | 7 % crème visage | Reg. 2024/996 |
| `Kojic Acid` | 1 % (visage/mains) | Reg. 2024/996 |
| `Triclosan` | 0,3 % (catégories limitées) | annexe V |
| `Phenoxyethanol` | **1 % max** (annexe V) — c'est CE plafond qui en fait notre **marqueur de la barre des 1 %** dans la lecture de position INCI ([SCCS final opinion](https://pubmed.ncbi.nlm.nih.gov/27825833/) : sûr à 1 %) | annexe V |
| Parabens courts `Methylparaben`, `Ethylparaben` | 0,4 % seul · 0,8 % en mélange — **jugés sûrs par le SCCS à ces doses** | annexe V ([Cosmeservice](https://cosmeservice.com/news/parabens-safety-rules-2025/)) |
| Parabens moyens `Propylparaben`, `Butylparaben` | 0,14 % (seuls ou combinés) ; interdits zone du siège < 3 ans | [Reg. 1004/2014](https://www.legislation.gov.uk/eur/2014/1004/data.html) |
| Parabens longs/ramifiés `Isopropylparaben`, `Isobutylparaben`, `Phenylparaben`, `Benzylparaben`, `Pentylparaben` | **INTERDITS** (données insuffisantes, pas de preuve de danger — retrait par précaution) | Reg. 358/2014 |

**Traduction en flags dictionnaire** : `banni_ue` (présence = produit non conforme/étranger → alerte, pas simple malus) ; `restreint_ue` + valeur limite (présence = légal et évalué → PAS de malus « hazard », voir règle CIR/SCCS §3.3-3.4) ; `libere_formaldehyde` (malus sensibilisation niveau 2 : le formaldéhyde est un allergène de contact majeur des patch-tests NACDG).

## 5. Synthèse opérationnelle : le schéma de classification recommandé

### 5.1 Les champs du dictionnaire, et LA source de chaque champ

| Champ | Valeurs | Source de référence (dans l'ordre) |
|---|---|---|
| `role` | actif / support / remplissage | fonctions officielles **CosIng** (skin conditioning, emollient, preservative, viscosity controlling…) mappées vers nos 3 rôles ; un ingrédient à fonction uniquement technique = support, texture/parfum/colorant = remplissage |
| `benefits` | 7 familles maison | CosIng (fonction déclarée) + revues cliniques par actif (niacinamide, rétinoïdes, vit C, AHA/BHA, céramides…) ; pas de bénéfice sans littérature humaine |
| `benefitPower` | 1-3 | hiérarchie de preuve (méthode Yuka §1.1, la seule chose qu'on lui reprend en bien) : 3 = RCT humains multiples (retinol, niacinamide 4-5 %, AHA, SPF) · 2 = essais humains limités mais convergents (panthenol, centella…) · 1 = plausible/in vitro/traditionnel (extraits divers) |
| `risks.irritant` | 0-3 | patch-tests cliniques (NACDG [2019-2020](https://pubmed.ncbi.nlm.nih.gov/36917520/)), liste allergènes UE (§4.2), monographies CIR, gradient tensioactifs ([Löffler 2003](https://pubmed.ncbi.nlm.nih.gov/12641575/)) — définitions opérationnelles en 5.2 |
| `risks.comedogene` | 0-5 | Fulton 1989 croisé multi-listes, règle du **niveau le plus bas** en cas de désaccord (§3.1) ; seuil d'action ≥ 3 |
| `risks.parfumAllergene` | bool | **liste exacte §4.2** (81 INCI + préfixes botaniques) — copie mécanique, zéro jugement |
| `risks.alcoolDessechant` | bool | `Alcohol`, `Alcohol Denat`, `SD Alcohol *`, `Isopropyl Alcohol` — effet dépendant position (§3.2) ; NE PAS flaguer les alcools gras (`Cetyl/Stearyl/Cetearyl Alcohol`) |
| `risks.huileEssentielle` | bool | INCI botaniques `* Oil` distillés/exprimés aromatiques (pas les huiles végétales grasses type `Argania`, `Simmondsia`) |
| `safetyReview` | safe_as_used / safe_qualified / unsafe / insufficient / non_reviewed | conclusions **CIR** ([cir-safety.org](https://www.cir-safety.org/)) + avis **SCCS** ([opinions](https://health.ec.europa.eu/scientific-committees/scientific-committee-consumer-safety-sccs/sccs-opinions_en)) ; SCCS prioritaire (marché UE) |
| `flags.banni_ue` / `flags.restreint_ue{limite}` | bool / valeur | annexes II/III/V via **CosIng** + tableau §4.4 |
| `flags.grossesse` | 1 (court-circuit) / 2 (malus+mention) / 3 (info) | tableau §4.3 (AAD + ACOG + Bozzo) — les 3 niveaux sont dans le tableau, ne pas les aplatir |
| `flags.photosensibilisant` | vrai_phototoxique / sensibilite_indirecte | vrai : furocoumarines (`Citrus Aurantium Bergamia` non FCF — bergapten, [Tisserand](https://tisserandinstitute.org/phototoxicity-essential-oils-sun-and-safety/)) ; indirect : AHA (« Sunburn Alert » [FDA 2005](https://www.fda.gov/cosmetics/cosmetic-ingredients/alpha-hydroxy-acids) : sensibilité accrue pendant l'usage + 1 semaine), rétinoïdes (irritation/barrière, PAS une vraie photosensibilité — [littérature](https://pubmed.ncbi.nlm.nih.gov/3530309/)) |
| `lowDoseEffective` | bool | rétinoïdes, peptides, facteurs de croissance, extraits standardisés dosés < 1 % (règle v1.1 n°2) |
| `sources[]` | URLs + date | OBLIGATOIRE par entrée — la leçon CosDNA (§1.3) : une note sans source ne vaut rien |

### 5.2 Définitions opérationnelles des niveaux d'irritance (pour le prompt batch)

- **0** : aucune irritance/allergie documentée aux doses cosmétiques (glycérine, HA, squalane, panthenol…).
- **1** : réactions occasionnelles documentées, faible prévalence — allergène de contact mineur, tensioactif doux, conservateur légal bien toléré (cocamidopropyl betaine, phenoxyethanol, parabens courts…). *Ne pèse que sur profil sensibilité 3.*
- **2** : irritant/allergène reconnu par la littérature clinique aux doses d'usage — allergènes UE §4.2, SLS/sulfates en leave-on, alcool dénaturé en top 5, exfoliants forts (AHA ≥ 10 %, BHA 2 %), libérateurs de formaldéhyde. *Pèse sur peaux sensibles/réactives, visible dans le Why.*
- **3** : irritant majeur des patch-tests ou sensibilisant à éviction recommandée — methylisothiazolinone, formaldéhyde, HE phototoxiques non rectifiées, mélanges parfumants en tête d'INCI. *Pèse pour tous, déclenche le plafond de bande v1.1 n°1 si top 5.*

### 5.3 Les 10 règles du prompt de classification batch

1. **Matche l'INCI exactement** ; pour les botaniques, matche par préfixe de genre-espèce (`Lavandula Angustifolia*`) ; ne devine JAMAIS un synonyme — en cas de doute, `non_reviewed` + 0 point.
2. **Les flags réglementaires se COPIENT, ne s'infèrent pas** : allergènes = liste §4.2 ; bannis/restreints = §4.4 ; grossesse = §4.3. Aucune créativité autorisée sur ces trois champs.
3. **Danger ≠ risque** : un ingrédient légal UE évalué « safe as used » (CIR) ou sous limite d'annexe (SCCS) ne reçoit JAMAIS de niveau irritant 3 ni de flag santé pour des raisons « cancer/PE » — ces inquiétudes n'existent chez nous QUE sous forme de flag réglementaire factuel.
4. **Aucune variable naturalité** : une HE n'est ni bonus ni « clean » ; elle est évaluée par ses composants (allergènes §4.2, phototoxicité, irritance). Un synthétique n'est pas pénalisé pour être synthétique.
5. **Conservateurs** : légal + dosé = irritant ≤ 1 ; le champ « conservateur controversé » de la v1 est SUPPRIMÉ au profit de `safetyReview` + flags réglementaires (la « controverse » n'est pas une donnée).
6. **Comédogène** : niveau Fulton ≥ 3 requis pour agir ; en cas de sources divergentes prendre le PLUS BAS ; ne s'applique qu'aux profils gras/acnéiques ; nul en rinse-off.
7. **Grossesse en 3 niveaux** : seul le niveau 1 (rétinoïdes tous dérivés, hydroquinone, médicaments) déclenche le court-circuit ; niveau 2 = malus + phrase ; niveau 3 = information neutre. `Bakuchiol` n'est PAS un rétinoïde.
8. **Un actif fort n'est pas un mauvais ingrédient** : retinol = benefits anti-âge 3 ET irritant 2 ET grossesse 1 ET lowDoseEffective — les axes coexistent sans se contaminer ; les filtres UV autorisés ne portent aucun malus santé.
9. **Inconnu = honnête** : hors dictionnaire → 0 point, jamais de pénalité, comptabilisé pour le badge « analyse partielle » ; chaque entrée CLASSÉE porte ≥ 1 source URL + date de classification + `algo_version`.
10. **Trace tout** : chaque valeur non triviale (irritant ≥ 2, comédogène ≥ 3, tout flag) doit pouvoir citer sa source en une ligne dans le « Why » — si le prompt ne peut pas nommer la source, il abaisse le niveau, pas l'inverse.

### 5.4 Ce qui reste incertain (à dire tel quel)

- **La comédogénicité est la donnée la plus faible du système** (modèle lapin, listes contradictoires) — l'afficher comme « peut obstruer les pores (donnée indicative) », jamais comme un fait dur.
- **L'alcool dénaturé** : littérature partagée entre « sûr tel qu'utilisé » (CIR) et « desséchant/barrière » (études hand-sanitizer, concentrations ≫ cosmétique) — notre malus conditionnel (top 5 × profil sec) est une interprétation raisonnable, pas un consensus.
- **Le tableau §4.2 vient d'une source secondaire de qualité** (réconciliée entrée par entrée, corrigendum inclus) — re-valider contre CosIng/EUR-Lex avant le gel du dictionnaire de prod.
- **Les niveaux grossesse 2-3** reposent sur des recommandations de précaution, pas des preuves de nocivité — le wording de l'app doit rester « par précaution, les dermatologues conseillent… », jamais « dangereux ».
- **benefitPower** est le champ le plus « jugement d'expert » du schéma : il faudra une passe de calibration humaine sur les ~50 actifs les plus fréquents du catalogue.
