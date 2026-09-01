# Notes de sud — débat notation

## Ce que j'ai vérifié avant de me positionner

Lu les 3 specs (`scan-scoring.md`, `-structure.md`, `-recherche.md`) ET le code réel :
`src/lib/scan/scoring.mjs` (CONFIG, `scoreFormule`, `scorePerso`), `moteur.ts`, `fonctions.mjs`,
`profil-utilisateur.ts`, et le dictionnaire (`data/scan/dictionnaire.json`, 3165 entrées).

**Constat important, absent des 3 specs** : le code tourne en `algoVersion: "2.0.0-metier"`,
une génération ENTIÈRE après le v1.4 que documente `scan-scoring.md`. Le système d'offset par
catégorie (recalé sur la médiane du catalogue) a été **remplacé** par des grilles « métier » :
chaque famille (cleanser, serum, sunscreen…) a son propre barème de mérites/prérequis/pénalités,
normalisé par SON PROPRE maximum théorique (`budgetMetier: 42` réparti différemment par grille).
Un nettoyant gagne ses points sur la douceur de ses tensioactifs et l'absence de parfum ; un
sérum sur la concentration d'un actif prouvé en tête de liste. Personne n'a encore écrit la
recherche qui valide CETTE structure — `scan-scoring-structure.md` valide l'additif+plafonds+offset
de la génération précédente. C'est un angle mort du débat que je compte combler.

Vérifié aussi que la recommandation « exceptions low-dose » (rétinoïdes, peptides < 1%) est bien
implémentée (97 entrées `lowDose: true` dans le dictionnaire, dont RETINOL, BAKUCHIOL, les
peptides палmitoyl-*) — donc pas un trou, contrairement à ce que je craignais en lisant juste le
nom de champ (`lowDose` dans le code vs `lowDoseEffective` dans la spec — synonymes, RAS).

---

## Ma position

### Sur le score FORMULE : le bon niveau de comparaison n'est PAS le produit dans l'absolu,
### c'est le produit face à SON métier — et la structure doit rester non-compensatoire en haut.

Trois couches, dans cet ordre de priorité :

1. **Un plafond de bande non-compensatoire** (déjà dans le code : `capRisque3Top5=49`,
   `capRisque3Ailleurs=69`) doit primer sur tout calcul additif. Aucune quantité de bons actifs
   ne rachète un risque de gravité 3 en tête de liste. C'est le geste Yuka/Nutri-Score qui manque
   à un additif pur, et scan-scoring-structure.md a raison de l'exiger (reco n°1). Non négociable.

2. **Sous ce plafond, la note se construit PAR MÉTIER, pas par grille universelle.** Comparer un
   nettoyant et un sérum sur le même barème (comme le faisait v1.0-v1.4 avec un simple offset de
   recalage) revient à noter un buteur et un gardien de but sur les mêmes stats. Le nettoyant n'a
   pas vocation à contenir des actifs concentrés ; le juger « creux » pour ça est un contresens.
   La grille métier actuelle (v2.0) est la bonne réponse structurelle : elle fait gagner des points
   sur des critères PROPRES au métier (douceur pour un nettoyant, spectre large pour un solaire),
   et neutralise l'« effet best-seller de catégorie » qui gonflait les sérums et écrasait les
   nettoyants dans l'ancien système.
   **Mais** — et c'est le point que je veux mettre en débat — normaliser chaque grille par SON
   propre maximum théorique règle l'équité *intra-métier* (deux sérums sont comparables entre eux)
   sans jamais garantir l'équité *inter-métier* : « 90/100 en nettoyant » et « 90/100 en sérum »
   restent deux affirmations de nature différente (« ce nettoyant nettoie bien » ≠ « ce sérum
   traite bien »), et la seule protection contre une confusion marketing (« ce produit est mieux
   noté qu'un autre ») c'est une discipline d'affichage stricte — jamais classer/comparer deux
   catégories différentes sur le même chiffre. Le score doit rester **criterion-referenced**
   (réussite d'un métier donné), jamais transformé en classement inter-catégories.

3. **La sélection des critères de chaque grille reste, elle, calibrée sur le catalogue actuel**
   (le taux de remplissage 25-75 % cité dans le code, "mesuré comme discriminant"). Ce n'est pas
   un défaut à corriger, mais il faut être honnête : le système n'est pas totalement
   « catalogue-indépendant » comme son architecture le laisse croire — seul le SCORE d'un produit
   donné l'est (il ne bouge pas quand le catalogue change), pas le CHOIX des critères qui, lui,
   a été appris une fois sur un instantané. Contrairement à l'ancien offset, il n'a pas besoin
   d'être recalculé à chaque produit ajouté — c'est le vrai gain, pas une indépendance totale.

### Sur le score PERSO : la question n'est pas « combien de points », c'est
### « à quelle catégorie causale appartient ce risque » — et cette catégorie DICTE la mécanique.

Je propose une grille de lecture à 4 niveaux, que je trouve déjà largement respectée par le code
(la scission irritant/sensibilisant du 27/08 en est la meilleure preuve) mais jamais formulée
comme principe général dans les 3 specs :

| Type de risque | Où il doit vivre | Mécanique | Exemple dans le code |
|---|---|---|---|
| Dose-dépendant, effet universel (abîme la barrière de tout le monde) | **FORMULE** | pondéré position × exposition catégorie | `malusRisque × grav × w(pos) × severite × exposition` |
| Interaction type de peau (bon pour l'une, mauvais pour l'autre — PAS un danger) | **PERSO, gradué** | ± points, jamais de plafond dur | comédogène × grasse, alcool × sèche, richesse × type de peau |
| Sensibilisation idiosyncratique (allergène de contact) | **PERSO, gradué, nul à sensibilité 0** | échelle continue sur la sensibilité déclarée, PAS un malus fixe pour tout le monde | `malusSensibilisant × niveau × (sensibilité/3) × w(pos)` — un profil non sensible ne paie rien pour le decyl glucoside |
| Diagnostic binaire (grossesse, allergie déclarée) | **PERSO, court-circuit** | plafond dur, jamais un malus gradué | `capGrossesse=15`, `capAllergie=10` |

Le seul modèle de personnalisation cosmétique **validé cliniquement** (SkinSAFE/Mayo, CAMP) est
la case du bas : exclusion binaire après diagnostic. Les trois autres cases sont des heuristiques
d'adéquation, défendables, mais qui ne doivent JAMAIS emprunter le vocabulaire de la sécurité
médicale. C'est exactement la reco n°6 de `scan-scoring-structure.md` (« adéquation », jamais
« sécurité ») — je la retiens et je la généralise en грille de décision plutôt qu'en règle isolée.

**Point où je serai probablement en désaccord avec au moins un autre agent** : je pense que la
scission irritant/sensibilisant (irritation → formule, allergène → perso × sensibilité) est LA
bonne décision de toute la v2.0, plus importante que le débat position-INCI ou plafonds. Un
système qui pénalise un allergène de contact dans le score FORMULE (donc pour tout le monde, y
compris les 97 % qui n'y sont pas sensibles) commet la même erreur que EWG : confondre danger et
risque à l'usage réel. Je défendrai ce point s'il est attaqué.

### Ce qui reste fragile et que je dirai tel quel si on me pousse

- La comédogénicité (échelle Fulton, modèle oreille de lapin) est la donnée la plus faible du
  système — je suis d'accord avec `scan-scoring-recherche.md` : à afficher comme indicatif, jamais
  comme un fait.
- La qualité du catalogue INCI (couverture, doublons, catégorisation) reste, comme le dit
  `scan-scoring-structure.md` §3.2.8, le vrai risque n°1 — un moteur de notation parfait sur une
  INCI fausse produit une note fausse avec une précision trompeuse.
- Je n'ai pas de position ferme sur le tarif exact (3,5 par actif, plafond 55, etc.) — c'est de la
  calibration, pas de la structure. Je ne débattrai pas les chiffres, seulement les principes.

---

## Journal du débat

**Échange avec ouest** (position complète : `ouest.md`) :

- **Accord** sur ses points 1-2-3 : référentiel « métier » plutôt que catalogue/toxico absolu
  pour juger « juste » ; règle dure anti-classement inter-catégories en UI ; plafond
  non-compensatoire + pondération sévérité×exposition (rincé/laissé, contour de l'œil/corps)
  comme vrai différenciateur — j'ai nuancé : ce n'est pas « au-delà de l'état de l'art » en
  absolu, c'est la mise en œuvre de ce que la critique scientifique (Wong/Novakovich, « Formula
  IQ ») réclame aux scoreurs existants sans qu'aucun ne le fasse. Renforce son point.

- **Désaccord** sur son point 4 (afficher un entier 84/62 = fausse rigueur → bander/arrondir
  l'affichage, comme Nutri-Score qui n'affiche que la lettre). Ma position : le diagnostic est
  juste (w(pos) non validé), la prescription soigne le mauvais symptôme.
  - Les précédents cosmétiques (Yuka, INCI Beauty) affichent tous les deux un NOMBRE ; Nutri-Score
    est un cas à part (étiquette réglementaire lue d'un coup d'œil en rayon, zéro interaction) —
    mauvaise analogie pour une app où l'utilisateur clique vers le Why.
  - Dégrader la résolution détruit une information ordinale réelle (72 vs 78 dans la même bande
    reste discriminant pour comparer deux produits) sans rien régler côté validité.
  - Incohérent avec notre propre architecture : on vient de justifier une précision PAR CATÉGORIE
    plus fine que Nutri-Score, coarsen l'affichage après coup ne suit pas.
  - Meilleure réponse au vrai problème : garder le nombre, ajouter un signal de CONFIANCE séparé
    (le badge « analyse partielle » en est l'embryon — cf. reco EWG data-availability de
    scan-scoring-recherche.md §4.2) plutôt que dégrader la résolution du score.

- **Concession** sur son point 5 (le vrai goulot du perso n'est pas la formule, c'est que
  `profil-utilisateur.ts` sert le même `profil.json` statique à tout le monde — vérifié,
  `void uid; // v1 sert le même profil à tous`). J'ai étendu : ça touche directement ma couche 4
  (court-circuit grossesse/allergie) — le SEUL étage validé cliniquement du système tourne
  aujourd'hui sur une donnée qui n'est celle de personne. À écrire explicitement dans la
  synthèse finale : la justesse structurelle du perso est nécessaire mais pas suffisante tant que
  le branchement profil réel n'est pas fait.

**Échange 2 avec ouest** (nuance auto-critique + question sur mon point fort) :

- Ouest affine son propre point 1 : « grilles métier indépendantes du catalogue » est vrai au
  SCORING (ajouter un produit ne bouge aucune autre note) mais faux au DESIGN (les critères
  retenus par grille l'ont été parce que « discriminants », remplis par 25-75 % du catalogue
  actuel — scoring.mjs:127-129). La dépendance n'a pas disparu, elle a migré de l'ajustement
  visible (offset) vers le choix figé des critères (invisible). J'étais déjà arrivé à la même
  conclusion dans mes notes complètes (§ FORMULE point 3) sans l'avoir mise dans le message
  groupé — accord total, à retenir dans la synthèse + faire suivre une révision de grille par la
  même gouvernance que `algo_version` (reco n°8 recherche : datée, changelog).

- Ouest questionne mon point fort (sensibilisant → 0 exact à sensitivity=0) : la sensibilisation
  de contact est un PROCESSUS qui s'installe avec l'exposition répétée chez des gens initialement
  tolérants (recherche §3.2, NACDG). Vérifié précisément dans le code : pour parfum/HE (240+120
  entrées, le vrai poids clinique), un malus FIXE UNIVERSEL existe déjà au niveau FORMULE, payé
  par tout le monde indépendamment de `sensitivity` — le layer perso n'ajoute qu'une marge pour
  qui est déjà réactif. La lecture d'ouest est donc exacte, à écrire noir sur blanc dans la spec.
  MAIS j'ai trouvé un trou plus étroit que son inquiétude touche quand même : le champ générique
  `risks.sensibilisant` (allergènes hors parfum/HE — conservateurs, libérateurs de formaldéhyde)
  n'a AUCUN malus universel formule équivalent (`!f.fragrance && !f.essentialOil` exclut
  explicitement ces cas de la ligne perso, et rien ne les remplace en formule — un irritant
  niveau 1 étant exclu du score formule par la règle §5.2). Pour cette famille précise, un profil
  sensibilité=0 paie zéro nulle part. Proposition envoyée : étendre à `sensibilisant ≥ 2` le même
  mécanisme fixe-universel-formule déjà validé pour parfum/HE (poids plus faible, prévalence
  clinique plus basse), en gardant le malus perso ×(sensibilité/3) comme risque marginal en plus.

**Échange avec est** (position complète : `est.md`) :

Accord total sur ses 4 points, rien à attaquer :
1. Deux sources jamais interchangeables — scan visage → `concerns` (+ `oiliness` affiné par
   `shine`, signal caméra réel) ; `skinType`/`sensitivity`/`pregnancy`/`allergies`/
   `strengthCeiling` restent déclaratifs (quiz) — aucune base clinique pour déduire un type de
   peau d'une photo unique (sébumètre en dermato). J'ai relié ce point au point 5 d'ouest
   (profil statique) pour proposer une synthèse à 3 : « corriger la couture » = fusionner CES
   deux sources dans UN vrai profil par utilisateur, pas brancher le scan sur tout le profil.
2. Vérifié moi-même le comptage des familles de bénéfice peuplées (identique : dehydration 453,
   aging 547, blemishes 118, oiliness 72, barrier 213, redness 353, spots 132) — et confirmé que
   « éclat/radiance » (5e-6e famille listée dans `scan-scoring.md` §0 : « hydratation,
   anti-imperfections, apaisant, barrière, éclat, anti-âge, protection UV ») n'existe NULLE PART
   dans le dictionnaire réel. Pas juste un manque de données : un écart entre l'intention de spec
   et l'implémentation, à documenter précisément comme tel.
3. Contre le malus « hors-sujet » : converge avec ma position initiale (perso = adéquation,
   jamais pertinence-achat) par un chemin différent (journal 26/08 + reco n°9 vs ma grille
   causale). Personne dans le débat n'a proposé de malus hors-sujet — signal fort pour la
   synthèse.
4. `strength` borgne sur la concentration + cumul de routine hors du scope d'un score produit
   isolé — la version la plus nette d'un motif que je nomme dans ma synthèse : plusieurs agents
   ont indépendamment repéré la même erreur à éviter, fabriquer une précision qu'on n'a pas en
   étendant un modèle au-delà de son domaine réel de validité (position INCI > 1 %, comédogénicité
   > indicatif, w(pos) non calibré affiché à l'entier près, et maintenant : un produit isolé
   au-delà de ce qu'il peut voir seul — l'effet de la routine entière).

**Échange 2 avec est** (extension de ma taxonomie causale) :

- **Niveau 0 implicite accepté** : est ajoute le cas nul de l'axe BÉNÉFICE/MATCH (un actif qui ne
  sert aucune préoccupation déclarée = silence, ni bonus ni malus), distinct de mon tableau qui
  classait l'axe RISQUE. Précision de compositionnalité que j'ai ajoutée pour éviter toute
  confusion : les deux axes coexistent SUR LE MÊME ingrédient — un actif peut être niveau 0 côté
  bénéfice (hors-sujet, silence) tout en restant niveau 1/2/3 côté risque (irritant, comédogène…)
  pour le MÊME profil. Ça ferme proprement la case que mon tableau ne couvrait pas et formalise
  la règle « pas de malus hors-sujet » (position d'est, cf. journal v1.2) comme un cas particulier
  de ma grille plutôt qu'une exception à elle.
- **Granularité ingrédient vs formule entière** : accepté avec une précision technique — dans
  `natureProduit()`, les contributions par ingrédient restent lisibles (chaque OIL/BUTTER pèse un
  montant traçable), ce qui est émergent c'est le FRANCHISSEMENT DE SEUIL (`riche` à partir de
  `seuilRiche=8`) qui déclenche le malus/bonus, contrairement aux autres mécanismes de niveau 2
  (conditionnelles directes sur un seul ingrédient : comédogène×grasse, alcool×sèche). Je limite
  cette remarque au niveau 2 — pas vérifié qu'elle s'applique aux niveaux 1/3, pas de sur-extension.
- **Confiance sur la catégorie (3e axe)** : très bon point, appuyé par un précédent documenté
  (journal v1.4 : Agua Micelar classé sérum à 25/100). Avec les grilles métier v2.0, une mauvaise
  catégorie n'est plus un recalage raté, c'est le référentiel de jugement entier qui devient faux
  — plus grave qu'avec l'ancien offset. `categorise.mjs` calcule déjà une marge de vote (« votes
  serrés déclarés incertain ») qui pourrait nourrir ce signal sans travail neuf.

**Échange 2 avec ouest** :

- **Point 4 (affichage) : clos, consensus atteint.** Ouest concède entièrement — chiffre précis
  conservé (précédents Yuka/INCI Beauty, incohérent de coarsen après avoir construit des grilles
  plus fines que Nutri-Score), mais affine sa demande : le badge « analyse partielle » actuel ne
  couvre qu'UN type d'incertitude (couverture dictionnaire). Il en manque un second, de nature
  différente : la CALIBRATION (benefitPower, bonusActif, seuils de grille = jugement d'expert, pas
  coefficient dose-réponse validé). Fusionner les deux serait aussi trompeur que le problème
  qu'on corrige. Proposition affinée d'ouest : deux signaux distincts sur l'écran méthode.

- **Synthèse à 3 que j'ai proposée aux deux** : le point d'ouest (couverture / calibration) et le
  3e axe d'est (catégorisation) sont orthogonaux et convergent naturellement en UNE recommandation
  commune : TROIS signaux de confiance distincts, jamais fusionnés dans un seul badge qui
  grossirait — couverture dictionnaire, calibration des poids, confiance de catégorisation.
  Proposé aux deux comme point à écrire ensemble dans la synthèse finale.

État du débat après ce round : convergence quasi totale avec est et ouest sur la structure
(plafond non-compensatoire, grilles métier avec la réserve sur leur dépendance de conception au
catalogue, scission irritant/sensibilisant, taxonomie causale à 4 niveaux + niveau 0 implicite,
adéquation jamais pertinence-achat, affichage précis + 3 signaux de confiance séparés, nécessité
de brancher un vrai profil scan+quiz).

## Round 3 : deux bugs concrets trouvés en testant les propositions contre le code

**Est — deux taxonomies de concerns jamais réconciliées.** `overview.ts` (`LIBELLE_SOUCI`, 10
clés : blemishes/oiliness/dehydration/redness/darkspots/wrinkles/pores/texture/dullness/barrier/
sensitivity, pour résumer les avis clients) ≠ `scoring.mjs` (`libelle()`, 7 clés seulement, celle
que ma taxonomie consomme pour le matching perso) — noms différents pour les mêmes idées
(darkspots/spots, wrinkles/aging). Conséquence pour ma taxonomie : mon « niveau 0 implicite »
(silence = pas de match) n'a de sens que si la liste des choses à matcher est stable — avec deux
vocabulaires non réconciliés, un souci peut être « présent » sous un nom et invisible sous
l'autre. Accord : une liste canonique unique de préoccupations est un préalable, pas un détail.
Je l'ai retenue comme 4e instance de mon thème transversal (motif : une correspondance calibrée
pour un domaine étroit — 7 clés pensées pour `benefits` d'ingrédients — étirée pour représenter
une réalité plus riche : 16 attributs scan, 10 clés de résumé d'avis).

**Ouest — mon extension `sensibilisant≥2` recrée un double comptage.** `scan-scoring-recherche.md`
§5.2 classe les libérateurs de formaldéhyde en `irritant:2` — un ingrédient peut donc porter à la
fois `irritant:2` (déjà payé par le malus générique de gravité, scoring.mjs:490-501) ET
`sensibilisant:2` sous ma proposition d'origine, empilant deux malus sur le même ingrédient.
Concédé : bonne direction, mauvais câblage. Correction : le nouveau malus fixe sensibilisant doit
rejoindre la même chaîne `fixe = Math.max(fixe, ...)` que parfum/HE/alcool (~503-506) ET entrer
dans le booléen `aMalusFixe` (~493) qui exclut l'ingrédient du malus générique — un seul malus fixe
par ingrédient, le plus fort, comme la règle déjà actée le 26/08 pour les trois autres sources.

**Nord — le plafond gravité-3 est contournable par les pénalités métier (bug confirmé, vérifié dormant).**
Test de cohérence de nord contre ma taxonomie : un tensioactif agressif (sulfate) est le cas
manuel de mon camp 1 (dose-dépendant, effet universel — SLS = irritant de référence des
patch-tests, recherche §3.2), donc devrait toujours pouvoir déclencher mon plafond non-
compensatoire (« non négociable »). Or dans scoring.mjs, un ingrédient déjà facturé par une
pénalité métier (`dejaFactures`, ex. « sulfate » en cleanser) est ENTIÈREMENT sauté à l'étape des
risques génériques — y compris la ligne qui fixe `cap` pour gravité≥3. Un sulfate de gravité 3 en
tête de liste d'un nettoyant ne pourrait donc plus jamais empêcher le vert : exactement le biais
Nutri-Score que le plafond devait tuer, réintroduit par la couche `penalites` v2.0 (postérieure à
la recherche qui a écrit la reco n°1). **Confirmé bug, pas un choix**, par ma propre règle
(plafond au-dessus de tout calcul additif). Vérifié l'impact réel avant de confirmer : DORMANT
aujourd'hui — SLS/SLES/ammonium lauryl sulfate sont tous à `irritant:2` (pas 3) dans le
dictionnaire actuel, et les 2 seuls ingrédients à `irritant:3` (HYDROQUINONE, TRICLOSAN) ont
`fonctions: []`, jamais captés par une ligne `penalites` (aujourd'hui limitées à 2 grilles sur 11).
Zéro produit du catalogue actuel n'est affecté — mais mine structurelle pour toute reclassification
future ou nouvelle grille `penalites`. Fix proposé : découpler DEUX portes que `dejaFactures`
confond — qui paie les points (reste gated, anti-double-comptage) vs qui peut déclencher le
plafond (doit tourner sur TOUS les ingrédients, sans exception).

**Motif reconnu à travers les 2 bugs** : les deux corrections trouvées ce round touchent le même
mécanisme (`dejaFactures`/`aMalusFixe`, conçu pour éviter le double comptage des points) qui a des
interactions non testées avec des règles adjacentes — le plafond chez nord, le malus générique
chez moi. Ni l'une ni l'autre spec de recherche ne pouvait les anticiper (antérieures aux grilles
métier v2.0). Proposé pour la synthèse : audit systématique de tout ce qui touche
`dejaFactures`/`aMalusFixe`, pas seulement les deux cas trouvés par hasard. Egalement noté (est) :
plusieurs trous de ce débat (signal de catégorisation calculé mais jamais lu, plafond contournable)
sont des corrections à coût quasi nul — du câblage, pas une refonte.

## Round 4 : confirmation croisée + un signal orphelin qui résout un problème déjà posé

- **Nord recompte gravité≥3 sur la formule complète** (`max(irritant, ceil(comedo/2))`, pas
  seulement irritant) : vérifié moi-même, exactement 4 ingrédients sur 3165 — HYDROQUINONE,
  TRICLOSAN (irritant:3), 2× TRITICUM VULGARE GERM OIL (comedo:5). Aucun ne recoupe une règle
  `penalites`. Diagnostic « dormant » confirmé complet, pas seulement sur le sous-cas sulfate que
  j'avais vérifié. **Confirmé à nord** : fermer le trou architecturalement MAINTENANT, pas attendre
  qu'un produit réel le déclenche — 3 raisons : (1) seule règle que nous quatre avons qualifiée de
  non négociable ; (2) le déclencheur est un changement de DONNÉE (ex. SLS irritant 2→3, défendable
  vu que la recherche l'appelle « l'irritant de référence de la dermatologie ») et non de code — un
  bug qui se réveille au prochain scraping de dictionnaire, pas au prochain commit du moteur, donc
  invisible en review normale ; (3) le fix est petit. Test de non-régression explicite proposé par
  est, retenu.

- **Est/nord trouvent un 3e cas de « signal calculé, jamais affiché »** : `R.metier` (le libellé du
  métier jugé, ex. « deliver active ingredients ») sort de `scoreFormule` mais n'est lu nulle part
  (ni overview.ts/avis.ts/acces.ts, ni aucune route — vérifié par grep par est/nord). Connexion que
  j'ai ajoutée : ce n'est pas qu'une 4e instance du motif « mécanisme existant mal câblé » — c'est
  la solution concrète et déjà prête à la règle anti-cross-catégorie qu'ouest et moi avions posée
  comme discipline d'affichage (jamais laisser comparer « 90 nettoyant » à « 90 sérum »). Afficher
  `R.metier` à côté du score rend la règle auto-appliquée (l'utilisateur voit contre quoi le produit
  est jugé) au lieu de dépendre d'une convention UI que quelqu'un pourrait oublier. Un principe
  discuté comme contrainte devient un champ à brancher — coût quasi nul.

- Est demande que la synthèse finale cite les cas NOMMÉS (confiance-catégorie/vote de
  `categorise.mjs`, `metier`, plafond gravité-3 contournable) plutôt que de rester au niveau
  conceptuel « signaux non fusionnables / mécanismes mal câblés » — accord total, sinon risque de
  fabriquer un 4e signal orphelin en inventant un nouveau badge au lieu de brancher l'existant.

État à ce stade : plus aucun désaccord de fond entre nord/est/ouest/moi. Le débat a basculé de
« quels principes » (largement clos, convergence à 4) vers « quelles failles concrètes dans
l'implémentation actuelle violent ces principes déjà partagés » — 3 trouvées ce round-ci
(cap gravité-3 contournable, `metier` orphelin, taxonomies de concerns non réconciliées), toutes
à coût de correction faible. En attente de la suite.

## Position finale (envoyée à est, rédacteur de la synthèse dans docs/specs/notation-debat.md)

Consigne du lead : distinguer ce qui a réellement tenu sous attaque de ce qui n'est qu'un silence.
Contenu complet envoyé à est par message — résumé ici pour mémoire :

**Maintenu, stress-testé par ≥2 autres agents** : plafond non-compensatoire prioritaire sur tout
additif ; grilles métier normalisées par leur propre maximum ; score criterion-referenced, jamais
un classement inter-catégories ; taxonomie causale à 4 niveaux (validée par les 4 agents, chacun
par un chemin différent) ; perso = adéquation jamais pertinence-achat/sécurité ; affichage précis
+ 3 signaux de confiance séparés (seul désaccord frontal du débat, avec ouest — gagné : ouest a
concédé explicitement).

**Concédé, précisément** : à ouest, le câblage de mon extension `sensibilisant≥2` (bonne direction,
recréait un double comptage — corrigé) et l'insuffisance pratique de toute la structure perso tant
que `profil-utilisateur.ts` reste statique ; à nord, confirmation que le contournement du plafond
par `dejaFactures` est un bug (pas un choix) par ma propre taxonomie — dormant aujourd'hui, à
corriger maintenant car déclenché par une donnée, pas du code.

**Non tranché, à ne pas lire comme accord** : étendue réelle du trou `sensibilisant` (corrigé pour
1 cas, jamais audité en entier) ; l'audit systématique `dejaFactures`/`aMalusFixe` que j'ai proposé
— NOMMÉ EXPLICITEMENT ici comme action non faite, seulement 2 interactions trouvées par chance en
testant des propositions ponctuelles ; réconciliation des taxonomies de concerns (7/10/16 clés) —
accord de principe, zéro contenu produit ; que faire des 5 attributs scan sans famille ingrédient ;
format concret des 3 signaux de confiance (nord n'a pas participé à ce fil — son silence ≠ aval) ;
le « niveau 0 implicite » est un accord bilatéral avec est, non confirmé par nord/ouest ; la piste
d'un avertissement produit sur le cumul de routine (jamais débattue formellement).

Participation active considérée terminée sauf réaction de nord ou ouest sur ces points ouverts.

## Round 5 : vérification de la synthèse d'est (docs/specs/notation-debat.md)

Lu le document partagé (318 lignes, sections Constats/Objections/Consensus/Désaccords non
résolus) à l'invitation d'ouest. Deux vérifications de code faites avant de valider :

- **Nord précise sa propre trouvaille sur `metier`** : pas absent du JSON — `scoreFormule()`
  (avec `metier: R.metier`) traverse tel quel dans `formule` sur `fiche/route.ts:44`,
  `lire-inci/route.ts:53-54`, `score/route.ts:24-27`. Vérifié moi-même : `grep -rln "formule\."
  src/components src/app` → zéro résultat. Le champ atteint bien l'API, aucun composant ne le lit
  — défaut de plomberie front, pas d'omission backend. Distinction que j'ai proposée pour la
  synthèse : le point de nord (« signal calculé, jamais lu ») est un défaut de PLOMBERIE
  (l'info existe, personne ne la lit) — différent en nature de mon thème transversal à moi, qui
  est un défaut de VALIDITÉ (le modèle affirme plus qu'il ne sait). Est les a déjà gardés liés par
  un « ou » dans le consensus n°6 plutôt que fusionnés — bonne granularité, rien à corriger.
- **`fiche/route.ts` vs `lire-inci/route.ts` sur `catConfiance`** : vérifié, `fiche/route.ts` ne
  contient aucune occurrence de `catConfiance` (grep vide) alors que `lire-inci/route.ts:63`
  renvoie `confianceCategorie: cat.confiance`. Confirme exactement la trouvaille de nord/ouest.

Relu la section d'ouest (constats 3-5, le triptyque d'affichage) à son invitation explicite :
fidèle sur les points qui me concernent (dejaFactures/aMalusFixe, affichage), rien à corriger.

**Le document partagé est cohérent, précis, et correctement attribué** sur tout ce que je peux
vérifier. Ma participation active au débat est terminée ; je reste disponible si nord/est/ouest
relancent sur un point encore ouvert (liste dans « Position finale » ci-dessus).
