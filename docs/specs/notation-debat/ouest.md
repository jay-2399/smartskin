# Position — ouest

## Constat de départ (fait, vérifié dans le code, pas dans les specs)

Les 3 specs (`scan-scoring.md`, `-structure.md`, `-recherche.md`) documentent et jugent une architecture
**additive + offset par catégorie** (v1.0 → v1.4, journal du 26/08). Mais `src/lib/scan/scoring.mjs`
(`CONFIG.algoVersion = "2.0.0-metier"`) a depuis remplacé les offsets par des **grilles métier**
(`CONFIG.RUBRIQUES`) : chaque famille (cleanser, serum, sunscreen…) a son propre référentiel de mérites/
pénalités/prérequis, normalisé par SON PROPRE maximum théorique (`maxTheorique()`, scoring.mjs:415-423),
et gagne un budget commun de 42 points (`budgetMetier`) sur des critères propres à son métier. C'est une
**3e architecture**, jamais examinée par la recherche (qui ne juge que l'additif-plafonné). Mon débat part
de là : je juge la structure réelle du 27/08, pas seulement celle du 26/08.

## Thèse centrale : « juste » n'a pas de sens sans dire juste PAR RAPPORT À QUOI

Trois référentiels possibles pour le score FORMULE, trois réponses différentes :

1. **Absolu toxicologique** (EWG) — déjà invalidé par la recherche (`scan-scoring-recherche.md` §2.1, §4.1) :
   confond hazard et risque, ignore la dose. Écarté, personne ne le défend plus ici.
2. **Relatif au catalogue** (l'ancien offset v1.3-1.4, `categoriesLegacy` dans scoring.mjs:74-89, conservé
   en commentaire comme repoussoir) — le score d'un nettoyant dépendait de la médiane de NOS 2 439 produits.
   Deux défauts mortels que le code lui-même documente (scoring.mjs:70-73) : (a) non-déterministe dans le
   temps — ajouter 500 produits au catalogue change la note d'un produit qu'on n'a pas touché ; (b) un
   scrape non représentatif devient silencieusement la définition de « moyen ».
3. **Relatif au métier déclaré du produit** (grilles v2.0, en place) — référentiel fixe et absolu (ne dépend
   d'aucun catalogue), répond à la question que l'utilisateur pose réellement : il a déjà choisi qu'il
   voulait un nettoyant, il demande « CE nettoyant-là est-il un bon nettoyant », pas « nettoyant ou sérum ».

**Je défends (3) comme la structure la plus juste ET la plus précise**, précisément parce qu'elle est la
seule des trois à être déterministe dans le temps et indépendante d'un échantillon de catalogue. C'est un
progrès réel, non documenté, sur ce que la recherche a évalué.

## Mais deux dangers que cette architecture ouvre, à nommer noir sur blanc

**Danger 1 — non-comparabilité inter-catégorie.** Un 90 en nettoyant et un 90 en sérum ne veulent PAS dire
« skincare aussi bonne » : ils veulent dire « exécution aussi complète de deux métiers différents ». Si un
jour l'UI utilise ce chiffre pour classer des produits de catégories différentes entre eux (ex. « les 3
meilleurs produits de ta routine »), c'est une erreur de méthode, pas de calibration. Règle à graver :
le score formule n'est comparable QU'à l'intérieur d'une même `RUBRIQUE`, jamais entre elles — et ça doit
être une contrainte structurelle du code d'affichage, pas une bonne intention.

**Danger 2 — le chiffre final mélange trois référentiels sans le dire.** Le score affiché combine : la part
normalisée du métier (0-42, relatif à SA grille), les malus universels de risque (non normalisés, en points
bruts), et les plafonds non compensatoires (cap dur). Trois logiques d'agrégation empilées dans UN entier.
Défendable en pratique (chacune répond à un problème réel), mais il ne faut jamais vendre ce chiffre comme
une seule dimension pure — le bloc « Why » doit pouvoir dérouler les trois étages séparément, pas juste les
lignes individuelles.

## Ce que je retiens comme déjà solide (je ne l'attaquerai pas)

- **Plafond non compensatoire sur gravité 3** (`capRisque3Top5`/`capRisque3Ailleurs`, scoring.mjs:501) :
  exactement la reco n°1 de la recherche, implémentée.
- **Pondération par sévérité × exposition de zone** (`R.severite`, `R.exposition`, scoring.mjs:498) : va
  plus loin que Yuka/Nutri-Score — aucun scoreur étudié ne module le malus par « produit rincé vs laissé sur
  peau, contour des yeux vs corps ». C'est une réponse concrète et déjà codée à la critique dose/exposition
  de §2.1 de la recherche.
- **Un ingrédient = un seul malus fixe, complexe parfumant plafonné en UNE ligne** (scoring.mjs:503-521) :
  corrige la prime à l'opacité (marque qui déclare 12 allergènes vs marque qui écrit juste « Parfum »).
  Déjà fait, bien fait.

## Score PERSO : la vraie question est le REGISTRE, pas le nombre de points

Le moteur sépare déjà (scoring.mjs:556-608) :
- **Sécurité, binaire, jamais graduée** : grossesse × flag / allergie déclarée → `capAbsolu`, court-circuit.
  C'est le seul modèle validé médicalement (SkinSAFE/Mayo, CAMP — recherche §3.1). Bien fait, à ne pas
  toucher.
- **Adéquation, graduée, jamais présentée comme sécurité** : matches actif×préoccupation, texture×peau,
  sensibilisant × sensibilité en continu (pas un flag « sensible oui/non », un ratio `sensitivity/3` —
  scoring.mjs:582-587). C'est plus honnête que la plupart des scoreurs qui flaggent en tout-ou-rien.

Mon désaccord avec la synthèse de la recherche (reco n°9 : « présenter comme adéquation, jamais sécurité ») :
je suis d'accord sur le fond, mais je vais plus loin sur la forme. **La précision affichée — un entier à
deux chiffres — est elle-même une fausse promesse de rigueur.** Nutri-Score, le système le plus validé
scientifiquement de toute la comparaison (recherche §4.3), refuse délibérément d'afficher son score brut au
public : il ne publie QUE la lettre. Nous affichons 84/62 au chiffre près sur une formule qui repose sur des
poids maison non validés (`w(pos)` 1,0/0,6/0,3 — recherche §2.3 : « aucune validation publiée »). Proposition
que je sais attaquable et que je mets sur la table : arrondir l'affichage à un multiple de 5, ou a minima
interdire dans le produit toute lecture du type « 71 vs 74 » comme un signal réel.

## Le vrai goulot d'étranglement du PERSO aujourd'hui (constat de code)

`src/lib/scan/profil-utilisateur.ts` : le profil « issu du scan visage » **n'est pas branché**. Toute
requête reçoit le même `data/scan/profil.json` statique (littéralement le profil de Jayen, avec un
commentaire `_note` qui le dit). Donc en l'état, le « score perso » de n'importe quel compte est le score
calculé pour Jayen. Ce n'est pas un problème de formule — c'est un rappel : peu importe la qualité du calcul
perso, il est sans objet tant que l'entrée (profil réel, dérivé des 16 critères du bilan visage) n'existe
pas. La formule la plus juste sur un faux profil reste un faux résultat.

## Mes 5 positions pour le débat

1. Le référentiel « métier » (catégorie-normalisée, indépendant du catalogue) est la structure la plus juste
   pour FORMULE — à condition que l'UI n'compare jamais deux catégories entre elles par ce chiffre.
2. La pondération par sévérité × exposition de zone est un vrai raffinement au-delà de l'état de l'art
   étudié (Yuka/Nutri-Score/EWG ne le font pas) — à garder et à documenter comme différenciateur.
3. PERSO doit rester deux registres disjoints : sécurité binaire / adéquation graduée. Déjà globalement
   respecté dans le code, à durcir dans le wording produit (jamais « safe », toujours « suited »).
4. La précision numérique affichée (2 chiffres) excède la rigueur réelle de la donnée — proposition à
   débattre : arrondir, ou bander l'affichage plus grossièrement.
5. Le goulot d'étranglement actuel de la justesse PERSO n'est pas le calcul, c'est (a) le profil utilisateur
   pas encore branché sur le scan visage et (b) la qualité du catalogue INCI (déjà connue de l'équipe) —
   deux problèmes de donnée d'entrée, pas de formule.

## Round 2 — réponse à sud

sud converge fortement avec moi : plafond non-compensatoire en haut, grilles métier en dessous, scission
irritant(formule universelle)/sensibilisant(perso gradué, nul à sensibilité 0), diagnostic binaire en
court-circuit. Peu de désaccord frontal — donc j'attaque la prémisse la plus confortable qu'on partage
tous les deux plutôt que de faire semblant d'un désaccord de façade.

**Nuance que je lui envoie** : on a tous les deux vendu les grilles métier comme « indépendantes du
catalogue, déterministes ». C'est vrai au moment du SCORING (ajouter un produit ne bouge la note d'aucun
autre). Mais c'est faux au moment du DESIGN : le commentaire de scoring.mjs:127-129 dit explicitement que
chaque critère de grille n'a été retenu QUE parce qu'il est « discriminant » — rempli par 25-75 % des
produits de la famille dans NOTRE catalogue. Donc la dépendance au catalogue n'a pas disparu avec
l'abandon de l'offset : elle a juste migré de « un ajustement visible et recalculable » (l'offset, qu'on
peut recalibrer en changeant un chiffre) vers « le choix figé des critères et de leurs barèmes au moment
de la conception » (invisible, et qui ne se corrige qu'en réécrivant la grille). Je ne dis pas que c'est
pire — c'est même plus honnête d'un point de vue produit (le catalogue a servi à CONCEVOIR un référentiel
absolu, pas à NOTER par comparaison) — mais on ne peut pas dire que la structure v2.0 a « réglé » la
dépendance au catalogue. Elle l'a déplacée en amont et gelée. Conséquence pratique : si le catalogue
change de nature (ex. on ajoute 1000 produits coréens avec des profils d'actifs différents), les grilles
ne se recalibrent PAS toutes seules — contrairement à l'ancien offset qui, lui, aurait bougé (pour le
meilleur ou pour le pire). À planifier : une revue périodique des grilles, pas un « c'est réglé une fois
pour toutes ».

**Question ouverte que je lui pose** (pas une attaque, une vraie incertitude) : le champ `sensibilisant`
scindé du `irritant` est-il bien calé sur la bonne frontière ? La sensibilisation de contact est un
PROCESSUS qui s'installe avec l'exposition répétée (recherche §3.2 : « plus de 150 substances parfumantes
ont causé des allergies de contact ») — quelqu'un à `sensitivity: 0` aujourd'hui peut se sensibiliser à un
allergène après des mois d'usage. Mettre le malus perso à zéro pile pour ce profil traite `sensitivity`
comme un trait figé, alors que c'est un état mesuré à l'instant T du scan visage. Je pense que ça reste
défendable SI le malus formule fixe (parfum/HE, déjà universel) porte déjà le signal « risque de population
lié à l'exposition », et que le champ `sensibilisant` (liste fine des 81 allergènes nommés) n'ajoute qu'une
prudence SUPPLÉMENTAIRE pour qui est déjà réactif — pas un nouveau risque qu'on masquerait. Je crois que
c'est le cas ici, mais ça mérite d'être dit explicitement dans la spec, pas juste vérifié dans le code.

**Ce que je maintiens et qu'il n'a pas encore attaqué** : mes points 4 (l'affichage à 2 chiffres est une
fausse précision — Nutri-Score ne publie que la lettre) et 5 (le profil « issu du scan visage » n'est pas
branché, `profil-utilisateur.ts` sert le même `profil.json` statique à tout le monde). Je les relance
explicitement vers sud/nord/est : silence là-dessus jusqu'ici.

## Round 3 — réponse à sud (concession partielle) et à est (accord + extension)

**Sur mon point 4, je concède l'essentiel à sud, avec un ajout.** Son argument est le bon : Yuka et INCI
Beauty affichent tous deux un nombre, Nutri-Score est un cas à part (étiquette réglementaire lue d'un coup
d'œil en rayon, zéro interaction) — pas transférable à une app où le chiffre sert de porte d'entrée vers le
Why. Et coarsen l'affichage APRÈS avoir construit des grilles plus précises par métier que la référence
qu'on cite serait incohérent. Ce qui compte n'est pas « les poids sont-ils validés par les pairs » mais
« le classement produit par ces poids est-il stable et cohérent avec un jugement d'expert » — exactement ce
que les tests de monotonie de scan-scoring.md (« ajouter du parfum ne peut jamais monter un score ») sont
censés garantir. Je retire ma proposition d'arrondir/bander l'affichage.

Ce que je garde de mon inquiétude initiale, reformulé : le badge « analyse partielle » actuel ne couvre
QU'un seul type d'incertitude (couverture — ingrédient absent du dictionnaire). Il en manque un second, de
nature différente : l'incertitude de CALIBRATION (l'ingrédient est classé, mais `benefitPower`, `bonusActif`,
les seuils de grille... sont un jugement d'expert, pas un coefficient dose-réponse validé). Fusionner les
deux dans un seul badge serait aussi trompeur que le problème qu'on essaie de résoudre. Proposition affinée :
deux signaux de confiance distincts sur l'écran méthode, pas un seul badge étendu.

**Sur est, accord complet sur 1, 3, 4 — avec une extension sur le 1 et un renfort sur le 2.**

Extension du 1 : `attributes.ts` confirme que le scan mesure aussi `redness` (niveau 1-4) et
`visible_vessels` (binaire) — des signaux visuels directement observés, pas une inférence de type de peau.
Dans le même esprit que son `shine → oiliness`, je propose d'utiliser ces deux attributs comme signal de
CORROBORATION (jamais de remplacement) du `sensitivity` déclaratif au quiz : si l'utilisateur déclare
sensitivity=0 mais que le scan montre redness/vessels élevés, c'est un désaccord donnée-déclaratif vs
donnée-observée qui mérite d'être remonté (à l'utilisateur, ou au minimum en interne) plutôt qu'ignoré. Ça
répond aussi à ma question ouverte à sud sur la sensibilisation qui s'installe avec le temps : on n'a pas
besoin d'inventer un signal, il existe déjà dans les 16 attributs, juste jamais branché sur `ProfilPeau`.

Renfort du 2 (vérifié dans le code) : `scoring.mjs:657` (`libelle()`) ne connaît que 7 clés de concern —
blemishes, oiliness, dehydration, redness, aging, spots, barrier — exactement les 7 familles qu'est a
comptées dans le dictionnaire. Mais `scan-scoring.md` §0 promettait une 8e famille canonique : « éclat »
(radiance). Elle n'existe NULLE PART dans le code (`grep -rniE "eclat|radiance"` sur `src/lib/scan/` et
`dictionnaire.json` : zéro résultat). Ce n'est donc pas un trou de POPULATION de données comme les 4 autres
attributs qu'est cite (pores, texture, under_eye_*) — c'est un champ prévu par la spec et disparu sans
décision explicite entre le doc et le code. Je pense que ça mérite d'être tranché nommément (soit on
peuple `radiance`/`eclat`, soit on raye la mention dans la spec) plutôt que de rester un angle mort silencieux.

**Accord total sur le 4 d'est** (`strength` = un problème de routine, pas de produit isolé) : j'ajoute que
ça doit être écrit explicitement sur l'écran méthode — « cette note évalue UN produit isolément, pas la
charge cumulée de ta routine » — sinon l'absence de cette dimension se lit comme un oubli plutôt qu'une
limite de périmètre assumée.

## Round 4 — la confiance-catégorie existe déjà en données mortes ; le trou sensibilisant est plus étroit qu'annoncé

**est relève le point 2 au rang d'un risque d'INTÉGRITÉ DU CALCUL** (pas juste d'affichage) : avec les
grilles v2.0, une mauvaise catégorie fait tourner le produit sur un référentiel entièrement étranger — le
journal v1.4 documente déjà des cas réels (Neutrogena Agua Micelar classé sérum → 25/100). Il propose un
indicateur de confiance sur la CATÉGORIE elle-même (mécanique/agent/incertain), au même rang que le badge
couverture. **Vérifié dans le code : ce signal existe déjà, gelé, jamais branché.**
`categorise.mjs:103,131-134` calcule bien un niveau `confiance` ("sur"/"probable"/"incertain") par produit,
et `categorise.mjs:164-165` l'écrit dans le catalogue sous `catConfiance`/`categorieSource`. Mais
`grep -rn "catConfiance|categorieSource" src/` ne retourne AUCUN résultat en dehors du fichier qui les
écrit — ni `moteur.ts`, ni `scoring.mjs`, ni aucune route ne les lit. Ce n'est donc pas une infrastructure à
construire, c'est un signal déjà calculé qu'on jette silencieusement à chaque scoring. Point fort à porter
tel quel dans la synthèse : « brancher, pas inventer ».

Sur mon point 4, le triptyque moi/sud/est converge : liste/à-l'œil → bande seule (Nutri-Score) ; écran
détail/Why → le nombre reste (support du bloc Why, ce qui nous distingue de CosDNA — recherche §1.3),
jamais affiché seul, toujours à côté d'un double signal de confiance (couverture dictionnaire + désormais
confiance catégorie, qui existe déjà en données).

**sud affine mon inquiétude sur `sensibilisant` — le trou est réel mais plus étroit que je ne l'avais dit.**
Parfum/HE ont déjà un malus fixe universel en FORMULE (payé par tout le monde) ; le calque PERSO
(`malusParfumSensible × sensitivity`) n'est qu'une marge additionnelle pour les réactifs — ma lecture
initiale tenait. Mais le champ générique `risks.sensibilisant` (allergènes de contact hors parfum/HE —
conservateurs, libérateurs de formaldéhyde) n'a AUCUN équivalent formule : `sensi > 0 && sensitivity > 0 &&
!fragrance && !essentialOil` — exclusif par construction, rien ne le remplace côté formule (l'irritant
niveau 1 est explicitement hors formule par §5.2). Pour cette famille précise, sensibilité=0 paie zéro
nulle part. sud propose d'étendre le mécanisme déjà validé (malus fixe formule, plus faible, + marge perso
×sensitivity/3).

**Le piège d'implémentation que je remonte à sud** : `scan-scoring-recherche.md` §5.2 définit le niveau
`irritant` 2 comme incluant explicitement « les libérateurs de formaldéhyde ». Un même ingrédient peut donc
porter à la fois `irritant: 2` (déjà payé par le malus générique de gravité en formule) ET
`sensibilisant: 2` sous la proposition de sud — recréer exactement le double comptage que l'équipe a corrigé
DEUX FOIS dans le journal (parfum×irritance le 26/08, parfum×HE le 26/08 suite). Le nouveau malus fixe
`sensibilisant` doit rejoindre le même ensemble d'exclusion que `aMalusFixe` (scoring.mjs:493) — pas
s'empiler à côté de lui.

## Round 5 — nord rejoint (cap troué, vérifié) ; est trouve un 2e recalage silencieux + 2 taxonomies

**nord attaque mon point 3 (« le plafond non-compensatoire est déjà solide, intouchable ») — vérifié, il a
raison sur le fond, nuancé sur l'impact actuel.** Relecture précise de scoring.mjs:484-512 : la mise à jour
du cap (`if (grav >= 3) cap = Math.min(...)`) est IMBRIQUÉE dans le même bloc que
`!dejaFactures.has(it.name)`. Un ingrédient déjà facturé par une pénalité MÉTIER (ex. `sulfate` en
cleanser/makeup-remover, les seules `penalites` non vides du système) est donc structurellement exclu du
déclenchement du cap, même si sa gravité est 3. C'est précisément le biais que la reco n°1 de la recherche
devait tuer, réintroduit par une couche postérieure (v1.3+) à cette recherche.

J'ai vérifié l'IMPACT réel sur le dictionnaire (3 199 fiches) : les seules `fonctions` qui alimentent
`dejaFactures` aujourd'hui sont `tensioactif-agressif`, `tensioactif-savon`, `acide-gras-libre`,
`base-saponifiante` (27 fiches au total) — et AUCUNE n'a `grav >= 3` (SLS/SLES/ALS sont tous `irritant: 2`,
pas 3). **Le trou est réel structurellement, mais dormant sur le catalogue actuel : 0 produit affecté
aujourd'hui.** C'est une mine posée pour la prochaine fiche (un savon dur classé grav 3, un futur
tensioactif agressif mal noté) — pas une erreur de score en production ce jour. Je retire mon
« intouchable » du round 1 ; je le remplace par : solide en principe, troué à l'intersection avec la couche
`penalites`, correctif d'une ligne (vérifier le cap sur `grav` AVANT d'exclure via `dejaFactures`, pas après).

Sur son point 2 (severite universel, mais `exposition` seulement sur 4/11 catégories — cleanser 0.55,
makeup-remover 0.5, exfoliant 0.85, mask 0.7 ; toner reste à 1 par défaut malgré un usage souvent essuyé) :
confirmé en relisant `CONFIG.RUBRIQUES`. Ça rejoint le motif que je commence à voir se répéter dans ce
débat (avec la découverte `catConfiance` et la mienne sur « éclat ») : **chaque couche successive de v2.0
est cohérente en elle-même mais jamais revérifiée contre les couches déjà en place** — un différenciateur
puissant (sévérité×exposition) appliqué à 4 catégories sur 11, un signal de confiance calculé puis jamais
lu, un champ de concern prévu par la spec puis disparu du code. Ce n'est plus trois anecdotes isolées, c'est
un pattern d'intégration à nommer dans la synthèse.

Sur son point 3 (mon idée d'arrondir) : terrain déjà couvert avec sud et est aux rounds 3-4, je lui fais un
résumé plutôt que de relitiger — convergence à quatre : garder le chiffre exact (support du Why, porte
d'entrée), jamais affiché seul, toujours avec au moins deux signaux de confiance distincts (couverture +
calibration), plus désormais un troisième (confiance catégorie, déjà calculée par `categorise.mjs`, jamais
branchée) ; bande seule sur les écrans de liste/comparaison ; interdiction dure de tri cross-catégorie.

**est pousse plus loin sa propre trouvaille sur « éclat » — deux découvertes qui changent la portée.**
Vérifié dans le dictionnaire : `ZINC OXIDE`, `TITANIUM DIOXIDE`, `AVOBENZONE`, `OCTOCRYLENE`, `HOMOSALATE`
sont tous `role: "support"` avec `benefits: []`. Comme `scorePerso` ne matche un concern QUE si
`f.role === "active"`, un filtre UV ne peut STRUCTURELLEMENT jamais déclencher de bonus perso — même si un
utilisateur déclarait « protection solaire » comme préoccupation. Le `bonusFiltresUV` existant est un bonus
de MÉTIER (formule, identique pour tout le monde), pas de la personnalisation. « Protection UV » est donc
la 2e des 7 familles voulues par CLAUDE.md/scan-scoring.md à être orpheline, structurellement cette fois
(pas un trou de dictionnaire à combler — même en le remplissant, `role: "support"` bloque le match).

Et surtout : vérifié qu'il existe déjà DEUX taxonomies de concerns incompatibles dans le code — pas une
seule avec des trous. `scoring.mjs` (`libelle()`) : blemishes/oiliness/dehydration/redness/aging/spots/
barrier (7 clés). `overview.ts` (`LIBELLE_SOUCI`, pour résumer les avis clients) : blemishes/oiliness/
dehydration/redness/darkspots/wrinkles/pores/texture/dullness/barrier/sensitivity (11 clés, vérifié). Même
idées, noms différents (`darkspots` vs `spots`, `wrinkles` vs `aging`), et aucune des deux alignée sur les
16 attributs du scan. Le vocabulaire « pores/texture/dullness » que je pensais absent PARTOUT existe déjà,
juste dans un module voisin, pour un usage différent (résumer des avis, pas scorer). Ça déplace le chantier :
avant tout mapping scan→moteur, il faut une taxonomie de concerns UNIQUE et canonique — sinon on ajoute une
3e liste incompatible aux deux qui existent déjà.

Sur ma proposition redness/vessels : j'accepte la scission d'est — `visible_vessels` (signe structurel,
proche télangiectasie) reste un bon proxy de fragilité barrière ; `redness` seul est trop confondu (effort,
chaleur, éclairage, poussée du jour) pour contredire un déclaratif à lui seul. Et je retiens son insistance :
toujours en RELANCE UX (« on a remarqué X, tu confirmes ? »), jamais en correction silencieuse de
`sensitivity` dans le moteur — sinon « corroboration jamais remplacement » s'érode à la première
implémentation pressée. Position affinée, adoptée telle quelle.

## Round 6 — convergence sur les 3 axes de confiance ; un 6e attribut orphelin ; la taxonomie n'a pas
## qu'un problème de contenu, elle a un problème de ROUTAGE

sud clôt le point 4 (chiffre exact conservé, signaux de confiance séparés) et relaie la proposition à 3 axes
disjoints, jamais fusionnés : couverture dictionnaire (mon point d'origine), calibration des poids (mon
affinement), catégorisation (est, `categorise.mjs`). est confirme sa vérification au caractère près et
précise un 4e état (`confiance: "aucune"` quand le classement est vide, catégorie "indetermine") — donc
sur/probable/incertain/aucune, pas 3. J'accepte les deux sans réserve, rien à attaquer, c'est du bon travail
collectif qui converge proprement.

**Ce que j'ajoute au chantier taxonomie d'est** : en recomptant moi-même les 16 attributs de `attributes.ts`
contre les 7 clés de `scoring.mjs`, j'ai trouvé un 6e orphelin qu'aucun de nous n'avait encore nommé :
`visible_vessels` (vaisseaux visibles, binaire) — comme `pores`/`texture`/`radiance`/`under_eye_circles`/
`under_eye_puffiness`, aucune famille de bénéfice ne le couvre dans le dictionnaire.

Mais en le cherchant, je réalise que le problème n'est pas seulement DE CONTENU (des familles à peupler),
il est aussi DE ROUTAGE : tous les attributs du scan ne devraient pas nécessairement finir en `concerns`
(qui déclenche un matching actif×préoccupation). Certains sont plus utiles comme signaux qui informent le
PROFIL lui-même :
- `shine` → `oiliness` : est l'a déjà positionné comme signal légitime pour le type de peau, pas comme un
  concern à matcher contre des actifs.
- `redness` + `visible_vessels` → corroboration de `sensitivity` (accepté au round 5) : ce ne sont pas des
  « préoccupations » qu'un produit doit traiter avec un actif dédié, ce sont des signaux qui reclassent LA
  PEAU elle-même.
- À l'inverse, `acne`, `dark_spots`, `fine_lines`/`wrinkles`, `tone_evenness` sont de VRAIS concerns : un
  produit peut légitimement les traiter avec un actif ciblé, et matcher est la bonne mécanique.

Donc `visible_vessels` n'est peut-être pas un 6e trou à combler dans le dictionnaire — c'est un attribut
mal routé s'il finit dans `concerns` alors qu'il n'a rien à y faire (aucun « actif anti-vaisseaux » n'existe
ni ne devrait exister comme catégorie de matching produit). Proposition pour la synthèse : avant de peupler
quoi que ce soit, chaque attribut du scan doit être routé une fois pour toutes vers l'un de deux registres —
CONCERN (déclenche un matching produit) ou DESCRIPTEUR DE PROFIL (reclasse skinType/sensitivity/etc.) — et
seuls les vrais trous côté CONCERN (pores, texture, radiance, under_eye_circles, under_eye_puffiness — 5,
pas 6, une fois `visible_vessels` correctement sorti de ce panier) restent un problème de contenu à
peupler. Ça évite de forcer un mapping ingrédient là où la bonne réponse est un reclassement de profil.

## Position finale (envoyée à est, rédacteur de la synthèse)

**Ce que je maintiens :**
1. Grille métier (v2.0, `CONFIG.RUBRIQUES`) = le référentiel le plus juste pour FORMULE — déterministe au
   scoring, supérieur à l'ancien offset catalogue. Nuance maintenue : pas indépendante au DESIGN (critères
   choisis par discriminance sur le catalogue actuel, scoring.mjs:127-129) — gouvernance de révision des
   grilles nécessaire, ce n'est pas réglé pour toujours.
2. Interdiction dure de tri/classement cross-catégorie par le score brut dans l'UI — non négociable.
3. `severite`×`exposition` reste un vrai différenciateur (dose/contexte, au-delà de Yuka/Nutri-Score/EWG) —
   MAIS avec la réserve de nord non résolue : attribut fixe de catégorie (pas déduit du produit), présent
   sur 4/11 catégories seulement, toute sa valeur suspendue à la justesse de `categorise.mjs` en amont.
4. Trois signaux de confiance disjoints, jamais fusionnés dans un badge unique : couverture dictionnaire,
   calibration des poids, confiance catégorie.
5. `visible_vessels` retenu comme signal de corroboration UX de `sensitivity` (jamais correction
   silencieuse) ; `redness` seul écarté (trop confondu).
6. Routage CONCERN vs DESCRIPTEUR DE PROFIL à faire pour chaque attribut du scan avant de peupler de
   nouvelles familles de bénéfice — sinon on force des mappings qui n'ont pas de sens.
7. Motif transversal (à ne pas perdre, demandé explicitement par le lead) : chaque couche de
   l'architecture v2.0 est cohérente EN ELLE-MÊME mais n'a jamais été revérifiée contre les couches déjà en
   place — cap non-compensatoire qui ignore les pénalités métier, signal de catégorie calculé puis
   diversement lu selon la route API, familles de concern qui dérivent silencieusement entre la spec et le
   code. Fusionné avec le thème de sud (mécanismes étendus au-delà de leur domaine réel de validité) et la
   piste de nord (aucune fonction de mise en forme de réponse partagée entre moteur et routes API).

**Ce que j'ai concédé, et à qui :**
- À sud (round 3) : j'ai RETIRÉ ma proposition d'arrondir/bander l'affichage du score à 2 chiffres. Argument
  qui m'a convaincu : Yuka/INCI Beauty affichent tous deux un nombre, Nutri-Score est un cas à part
  (étiquette réglementaire, zéro interaction), et coarsen l'affichage après avoir construit des grilles plus
  précises par métier que la référence citée serait incohérent. Un abandon assumé, pas un point maintenu.
- À nord (round 5/7) : j'ai retiré mon « le plafond non-compensatoire est intouchable » (round 1). Le cap
  est bien contournable via `dejaFactures` — confirmé indépendamment (0 produit affecté aujourd'hui, mais
  invariant non gardé dans le code).
- À nord (round 7) : j'ai corrigé mon propre constat « catConfiance jamais lu nulle part » — trop fort. La
  réalité, plus précise et plus révélatrice : lu pour le scan caméra en direct (`lire-inci/route.ts`),
  jamais pour la fiche catalogue (`fiche/route.ts`).
- À est (round 4-5) : j'ai accepté la scission redness/vessels (vessels retenu, redness seul écarté) et la
  reformulation « deux taxonomies incompatibles déjà écrites » plutôt que « trous à peupler ».

**Ce que je considère NON tranché (silence ≠ accord) :**
1. **Pas de proposition concrète de taxonomie canonique de concerns.** On est tous d'accord qu'il en faut
   une, personne (moi y compris) n'a proposé LA liste finale qui réconcilie les 7 clés de `scoring.mjs`, les
   11 de `overview.ts`, et les 16 attributs du scan. C'est un chantier de conception ouvert, pas un bug à
   corriger.
2. **`severite`/`exposition` : fixe par catégorie ou déduit du produit ?** Personne n'a tranché si ces deux
   leviers devraient devenir des propriétés DÉDUITES du produit (comme `natureProduit()` le fait pour la
   richesse) plutôt que des constantes de catégorie à étendre aux 11 grilles. Les deux options ont été
   nommées, aucune choisie.
3. **Le fix du cap `dejaFactures` (nord) : correctif immédiat ou test de non-régression documenté ?** On a
   convergé sur « c'est un invariant non gardé, dormant » — pas sur s'il faut le corriger maintenant vs
   simplement le couvrir par un test qui alerte s'il se réveille.
4. **La confiance-catégorie doit-elle être visible utilisateur, ou rester un signal interne/QA ?** On a
   convergé sur « brancher `fiche/route.ts` sur ce qui existe déjà » — mais pas sur si ça doit apparaître à
   l'écran (« on n'est pas sûr que ce soit un sérum ») ou seulement alimenter un contrôle qualité en coulisse.
   Décision produit, pas technique.
5. **Le `formaterReponseProduit()` partagé proposé par nord** : je n'ai pas vérifié moi-même en détail
   l'affirmation que `metier` traverse déjà le JSON de `score`/`lire-inci` sans consommateur front — je m'y
   fie sur la parole de nord, pas sur une vérification personnelle comme pour mes autres constats. À
   revérifier avant de l'écrire comme fait établi dans la synthèse finale.
