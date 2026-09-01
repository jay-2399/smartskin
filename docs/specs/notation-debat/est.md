# Position de `est`

## Ce que je ne rediscute pas

Les trois specs (`scan-scoring.md`, `-structure.md`, `-recherche.md`) et le code
(`scoring.mjs` v2.0.0-metier) sont déjà à un niveau de rigueur rare : sourcé
(CIR/SCCS/NACDG/règlement UE), et la quasi-totalité des 10 recommandations de
`scan-scoring-structure.md` §5 sont *déjà implémentées* — plafond non
compensatoire sur risque grave (`capRisque3Top5/Ailleurs`), exception dose
< 1 % (`lowDose`), détection de la barre des 1 % (`marqueurs1pct`), badge
« analyse partielle » (`analysePartielle`), fusion de la double peine parfum
en une ligne, `algo_version`, court-circuits binaires grossesse/allergie. Je
ne reviens pas dessus — je me concentre sur ce qui reste ouvert.

Trois faits établis dans `notation-debat.md` que je prends comme acquis :
1. `profilUtilisateur(uid)` ignore `uid` → tout le monde reçoit le profil de
   Jayen. Le scan visage n'entre jamais dans le calcul.
2. Aucun malus « hors-sujet » — un produit qui ne cible aucune préoccupation
   reste à sa note formule.
3. `strength` est vide (2/3165 ingrédients ≥ 3) → `malusForceParCran` est
   mort dans 99,9 % des cas.

## Ma thèse

**Le problème n'est pas la formule de score — c'est qu'il n'existe encore
aucune couture entre ce que la caméra peut honnêtement mesurer et ce que le
moteur de score attend en entrée.** Corriger la couture règle à la fois le
bug n°1 (profil statique) ET clarifie pourquoi le bug n°2 (pas de malus
hors-sujet) n'en est pas vraiment un — alors que le bug n°3 (strength vide)
est un vrai trou, mais mal formulé.

## 1. Deux sources, pas une — ne jamais les confondre

Le scan visage (`attributes.ts`, 16 attributs, sévérité 1-4, sections
imperfections / teint-éclat / signes d'âge / zone des yeux) mesure des
**signes visuels** sur UNE photo à UN instant. Le questionnaire (q1-q7)
recueille des **traits déclarés** : type de peau, sensibilité, grossesse,
allergies, tolérance.

`ProfilPeau` (le type consommé par `scorePerso`) a besoin des deux, mais
elles ne sont PAS interchangeables :

- `skinType` (oily/dry/combination/normal) : classer un type de peau depuis
  une seule photo n'a pas de socle clinique solide (c'est un test au sébum-
  mètre en dermato, pas une inspection visuelle instantanée — une peau grasse
  le matin après nettoyage n'a pas le même aspect qu'en fin de journée). →
  **rester déclaratif (quiz), ne jamais l'inférer de la photo.** Exception
  déjà à moitié couverte par le scan : `shine` (brillance) est un signe
  visuel directement observable par une caméra (réflexion spéculaire) — il
  peut *nuancer* `oiliness` mais ne doit pas se substituer à `skinType`.
- `sensitivity`, `pregnancy`, `allergies`, `strengthCeiling` : aucun de ces
  quatre champs n'est visible sur une photo. Ils restent 100 % déclaratifs.
  Prétendre les déduire du visage serait exactement le biais que la
  recherche nous met en garde de ne pas reproduire (fausse précision,
  §"neutralité qu'on n'a pas mesurée").
- `concerns{famille: sévérité 1-3}` : **c'est la seule partie où le scan
  visage a une vraie valeur ajoutée** — il peut noter la sévérité de ce que
  l'utilisateur voit mal lui-même (ex. un utilisateur sous-estime ses
  rougeurs diffuses, une IA vision les voit).

Donc : « le profil de peau issu du scan » n'est, et ne doit rester, qu'une
InjectiON PARTIELLE dans `ProfilPeau` — sur le seul champ `concerns` (+
nuance mineure sur `oiliness` via `shine`). Le reste vient du quiz. Coder ça
comme si le scan remplaçait le quiz serait une régression de rigueur, pas un
progrès.

## 2. La vraie difficulté : la table de correspondance attribut → famille

Le dictionnaire n'a que **7 familles de bénéfice** mesurées dans les 3 165
fiches (compté ce jour) : `aging` (547), `dehydration` (453), `redness`
(353), `barrier` (213), `spots` (132), `blemishes` (118), `oiliness` (72).

Les 16 attributs du scan n'y correspondent pas 1:1. Ma proposition de table
(à valider/attaquer) :

| Attribut scan (1-4) | Famille `concerns` | Remarque |
|---|---|---|
| acne | blemishes | direct |
| comedones | blemishes | fusionné avec acne (même famille ingrédient) — max des deux, pas la somme |
| post_acne_marks | spots | c'est une hyperpigmentation post-inflammatoire, pas de l'acné active |
| dark_spots | spots | direct |
| redness | redness | direct |
| visible_vessels | redness | signal de barrière fragilisée → pondère aussi `barrier` en secondaire |
| shine | oiliness | nuance `skinType` déclaré, ne le remplace pas (§1) |
| fine_lines | aging | direct |
| wrinkles | aging | fusionné avec fine_lines (même famille) |
| flaking | barrier | sécheresse/barrière |
| **pores** | *(aucune)* | **trou** — aucun ingrédient du dictionnaire n'est tagué "pores" ; niacinamide/BHA sont tagués `blemishes`. Ne pas inventer une 8e famille sans base ingrédient dessous — sinon le "match" affichera une ligne creuse. |
| **texture** | *(aucune)* | **trou** — le renouvellement cutané (AHA/rétinoïdes) est déjà sous `aging`/`blemishes` ; pas de famille dédiée. |
| **radiance/dullness** | *(aucune)* | **trou** — l'éclat est cité dans CLAUDE.md comme une des 7 familles voulues à l'origine (« éclat ») mais absent du dictionnaire réel. |
| under_eye_circles, under_eye_puffiness | *(aucune)* | pas de famille — l'écran `eye-cream` traite déjà la zone des yeux par sa grille métier (`douceurCritique`), pas par matching de concern. |

**Conséquence assumée** : je ne recommande PAS de bricoler une correspondance
forcée pour les 5 attributs sans famille — le faire créerait le même biais que
critiqué en §2.2.6 de `scan-scoring-recherche.md` (inventer une correspondance
sans preuve d'efficacité humaine documentée derrière). Mieux vaut :
(a) documenter la table comme incomplète PAR CONCEPTION,
(b) ouvrir un ticket dictionnaire pour re-classer les ingrédients pertinents
sous `pores` / `texture` / `radiance` s'ils existent déjà dans le catalogue
(niacinamide et BHA méritent probablement un second tag `pores`, pas
seulement `blemishes` — c'est un enrichissement de dictionnaire, pas une
astuce de mapping).

**Conversion de l'échelle** : sévérité scan 1(absent)-4(sévère) →
sévérité concern 0-3 par `sev = niveau - 1`. Niveau 1 (idéal) ne doit PAS
entrer dans `concerns` du tout (une entrée à sévérité 0 dans le dict actuel
est déjà traitée comme absence par `if (!sev) continue`) — sinon on
personnalise sur un problème qui n'existe pas.

## 3. Contre le malus « hors-sujet »

Je m'attends à ce qu'un des trois autres propose d'ajouter un malus quand un
produit ne matche aucune préoccupation, pour élargir l'écart perso. Je
l'anticipe et j'argumente contre, par cohérence avec une décision produit
déjà actée et *justifiée par la recherche elle-même* :

- Le journal du 26/08 (`scan-scoring.md` v1.2) tranche explicitement : « un
  anti-rides qui ne traite pas les préoccupations de l'utilisatrice ne
  dégrade pas sa peau : sa note reste haute ». Ce n'est pas un oubli, c'est
  une décision motivée.
- `scan-scoring-structure.md` reco n°9 : le score perso doit rester une
  **adéquation**, jamais un score de pertinence-achat. « Ce produit ne sert à
  rien pour toi » est une question de RECOMMANDATION (le classer plus bas
  dans une liste de suggestions), pas de SCORE (est-il bon, pour ta peau, si
  tu l'utilises).
- Punir l'absence de match reviendrait à mélanger deux axes que la recherche
  nous dit explicitement de garder séparés (§2.2.8, "tout-en-un anxiogène") :
  *qualité/innocuité pour ta peau* vs *pertinence pour ton besoin actuel*.
- Le vrai problème derrière l'exemple Kiehl's (77 formule → 90 perso rien
  qu'avec un profil statique) n'est pas l'absence de malus hors-sujet — c'est
  que **tant que le bug n°1 n'est pas corrigé, ce +13 est donné à
  n'importe qui**, y compris quelqu'un sans acné. Corriger la couture (§1-2)
  résout ça sans toucher à la structure : le +13 ne s'appliquera qu'à un
  utilisateur dont le scan/quiz déclare vraiment `blemishes`/`oiliness`.

Concession que je fais par avance : si un autre agent montre un cas où
l'ABSENCE de malus hors-sujet crée un vrai risque de confusion utilisateur
(ex. afficher 90/100 "for you" sur un produit inadapté à l'USAGE, pas
seulement neutre), je suis prêt à distinguer *score* et *label d'usage*
plutôt que d'introduire un malus dans le nombre lui-même.

## 4. `strength` vide : le vrai trou, mais mal cadré

Le fait établi dit « l'échelle est vide ». Je vais plus loin : je pense que
c'est un problème de CONCEPTION, pas seulement de remplissage. `strength`
(0-3) par ingrédient au niveau du dictionnaire ne peut de toute façon pas
capturer la vraie force d'usage, qui dépend de la CONCENTRATION réelle
(rétinol à 0,1 % ≠ rétinol à 1 %, même INCI) — exactement la limite que
`scan-scoring-recherche.md` documente déjà pour la position INCI (§2.2).
Deux options, pas une :
(a) peupler `strength` correctement pour la famille réellement concernée
(rétinoïdes, BHA/AHA à haute conc., benzoyl peroxide, hydroquinone — pas
« tout actif ») en acceptant que ça reste approximatif faute de %,
(b) déplacer le signal « trop fort pour ta peau » au niveau de la ROUTINE
(cumul de plusieurs produits actifs/jour), pas du produit seul — un seul
sérum au rétinol n'est pas un problème ; trois produits exfoliants le même
jour en est un, et ça, aucun score produit isolé ne peut le voir. Je penche
pour (a) en scope produit + (b) comme trou à documenter, pas à faire porter
au score produit.

## Round 2 — réponses à ouest et sud

**Convergence** : ouest et sud arrivent chacun, par un chemin différent, à la
même conclusion que moi sur le point que je n'avais pas soulevé — les grilles
métier v2.0 réglent l'équité INTRA-catégorie, jamais l'équité INTER-catégorie
(« 90 en nettoyant » ≠ « 90 en sérum »). J'apporte une pièce qu'aucun des
deux n'a : ce n'est plus seulement une discipline d'AFFICHAGE (leur cadrage),
c'est aussi un risque d'INTÉGRITÉ DU CALCUL. Avec l'ancien système
(offset recalé sur médiane), une mauvaise catégorie ne faussait qu'un
recalage. Avec les grilles v2.0, une mauvaise catégorie fait tourner le
produit sur un référentiel entièrement étranger (prérequis et mérites qui ne
veulent rien dire pour lui) — exactement les cas que le journal v1.4 de
`scan-scoring.md` admet déjà avoir trouvés (« Neutrogena Agua Micelar » classé
sérum → 25/100, après-shampooing classé hydratant). Donc : la règle « jamais
de tri cross-catégorie » (ouest, sud) est nécessaire mais pas suffisante —
il faut EN PLUS un indicateur de confiance sur la catégorie elle-même
(mécanique vs arbitrée par agent vs incertaine), au même titre que le badge
« analyse partielle » sur la couverture dictionnaire. Une note calculée sur
la bonne grille avec un dictionnaire incomplet est plus honnête qu'une note
parfaite calculée sur la mauvaise grille.

**Attaque sur ouest (point 4, arrondir/bander l'affichage)** : je suis
d'accord sur le diagnostic (un entier à 2 chiffres surpromet sur des poids
w(pos) non validés) mais pas sur le remède si « bander plus grossièrement »
veut dire faire disparaître le nombre. Le nombre n'est pas décoratif : c'est
le support du bloc « Why » (`scan-scoring.md` §3) — chaque ligne cite un delta
exact et traçable ; c'est justement ce qui nous distingue de CosDNA (note
sans source). Supprimer la granularité casse la seule partie du système qui a
une preuve à montrer. Je propose de découpler : écran de LISTE / à-l'oeil →
bande seule (comme Nutri-Score, ouest a raison là-dessus) ; écran de DÉTAIL/
Why → le nombre entier reste, mais accompagné d'un mot sur la confiance
(catégorie + couverture dictionnaire), jamais affiché seul comme une mesure
de laboratoire.

**Renfort à sud (taxonomie causale à 4 niveaux)** : c'est la meilleure
synthèse du débat pour l'instant, je la retiens. Deux ajouts :
1. Elle a besoin d'un **niveau 0 implicite : aucune interaction pertinente**
   — le cas où un actif ne sert ni sécurité, ni interaction de peau, ni
   sensibilisation pour CE profil. Ce n'est pas une case manquante, c'est la
   case qui rend ma position (§3, contre le malus hors-sujet) formellement
   compatible avec sa taxonomie : niveau 0 = silence (ni bonus ni malus),
   pas une 5e pénalité à inventer.
2. Sa taxonomie est **par ingrédient**. L'ajustement « nature du produit »
   (richesse/légèreté déduite de la composition entière × type de peau,
   `natureProduit()`) est une interaction de peau au niveau 2 de sa grille,
   mais ÉMERGENTE — elle ne se lit sur aucun ingrédient seul, seulement sur
   la somme pondérée de la liste. Je pense que ça reste dans son niveau 2
   (interaction de peau, gradué, jamais de plafond dur) mais ça mérite d'être
   dit explicitement : la taxonomie s'applique à deux granularités
   (ingrédient ET formule entière), pas une seule.

**Ce qui reste sans réponse après ce tour** — je le repousse explicitement :
personne n'a encore attaqué ni repris mes points sur (a) la distinction
scan-visage/quiz comme DEUX sources non interchangeables, (b) le trou de 5
familles de bénéfice sans attribut scan en face, (c) `strength` vide comme
problème de conception (concentration absente de l'INCI) plutôt que de
remplissage. Tant que ces trois points ne sont pas contredits, je les
considère comme la partie de ma position qui survit pour l'instant.

## Round 3 — ouest étend, et une vérification change la portée

ouest confirme par grep que `libelle()` (scoring.mjs:657) ne connaît que les 7
clés que j'avais comptées, et repère que `scan-scoring.md` §0 promettait une
8e famille canonique, « éclat » (radiance), absente de tout le code — pas un
trou de POPULATION comme mes 4 autres attributs cités, mais un engagement de
spec disparu sans décision explicite. J'ai vérifié plus loin et ça change la
portée du problème :

1. **« protection UV » est la 2e victime silencieuse, pas seulement « éclat ».**
   CLAUDE.md liste 7 familles voulues à l'origine : hydratation,
   anti-imperfections, apaisant, barrière, **éclat**, anti-âge,
   **protection UV**. Vérifié dans dictionnaire.json : `ZINC OXIDE`,
   `TITANIUM DIOXIDE`, `AVOBENZONE`, `OCTOCRYLENE`, `HOMOSALATE` sont tous
   `role: "support"` avec `benefits: []`. Comme `scorePerso` n'ajoute un match
   que si `f.role === "active"`, un filtre UV ne peut STRUCTURELLEMENT
   jamais rapporter de bonus perso, même si un utilisateur déclarait un jour
   une préoccupation « protection solaire ». Le bonus solaire existant
   (`bonusFiltresUV`) est un bonus de MÉTIER (formule), pas de profil — tout
   le monde le reçoit pareil, ce n'est pas de la personnalisation.

2. **Il existe DÉJÀ deux taxonomies de concerns incompatibles dans le code**,
   pas une avec des trous. `scoring.mjs` (`libelle()`) : blemishes,
   oiliness, dehydration, redness, aging, spots, barrier (7 clés). `overview.ts`
   (`LIBELLE_SOUCI`, utilisé pour résumer les avis clients) : blemishes,
   oiliness, dehydration, redness, **darkspots**, **wrinkles**, **pores**,
   **texture**, **dullness**, barrier, sensitivity (10 clés, noms différents
   pour les mêmes idées — `darkspots` vs `spots`, `wrinkles` vs `aging`).
   Autrement dit : le vocabulaire « pores / texture / dullness » que j'avais
   qualifié d'absent PARTOUT existe déjà dans l'app — juste dans un module
   voisin, pour un usage différent (résumer des avis, pas scorer un produit),
   avec une nomenclature qui ne coïncide même pas avec celle du moteur de
   score. Je corrige donc ma position initiale : ce n'est pas seulement
   « 5 attributs du scan sans famille en face », c'est « deux vocabulaires de
   préoccupations déjà écrits dans le code, jamais réconciliés entre eux,
   et aucun des deux entièrement aligné sur les 16 attributs du scan ». La
   couture doit donc commencer par UNE taxonomie canonique unique, pas par un
   mapping direct scan→scoring.mjs.

**Sur la corroboration redness/vessels ↔ sensitivity déclarée (extension 1 de
ouest)** : accord partiel, avec une réserve à trancher avant tout code. Je
sépare les deux attributs qu'il regroupe : `visible_vessels` (signe
structurel, proche de la télangiectasie) est un bon proxy de fragilité de
barrière — je le retiens. `redness` seul est beaucoup plus confondu
(rougeur transitoire : effort, chaleur, éclairage de la photo, poussée
inflammatoire du jour) — l'utiliser seul pour contredire un déclaratif
`sensitivity=0` risque de sur-interpréter un instantané. Surtout : je insiste
pour que ce soit câblé comme une RELANCE UX (« on a remarqué X, tu confirmes
ton profil ? »), jamais comme une correction silencieuse de `sensitivity`
dans le moteur — sinon le principe « corroboration, jamais remplacement »
qu'il pose lui-même s'érode dès la première implémentation pressée.

## Round 4 — convergence à trois, thème transversal nommé par sud

Vérifié la trouvaille d'ouest : `categorise.mjs:103,131-134` calcule bien un
niveau de confiance à 4 états en réalité (`sur` / `probable` / `incertain` /
`aucune` quand le classement est vide → `indetermine`), écrit dans
`catalog.json` sous `catConfiance`/`categorieSource` (ligne 164-165). `grep
-rln "catConfiance|categorieSource" src/` ne retourne QUE `categorise.mjs` —
zéro lecture ailleurs. Confirmé : le signal que je réclamais existe déjà,
gelé sur disque, jamais branché sur le scoring ni sur l'affichage. C'est le
point le plus actionnable du débat : brancher, pas inventer.

sud nomme un thème transversal qui traverse tout le débat et que je retiens
pour la synthèse : **fabriquer une précision qu'on n'a pas en étendant un
modèle au-delà de son domaine réel de validité**. Ma contribution rentre
dedans elle aussi, pas seulement les exemples de sud (position INCI > 1 %,
comédogénicité, w(pos) affiché à l'entier) : utiliser une taxonomie à 7 clés
(`scoring.mjs`) pour représenter une réalité à 16 attributs (scan) ou à 10
clés (`overview.ts`) est le MÊME abus — une correspondance étendue au-delà
de ce pour quoi elle a été conçue. Le fil conducteur de tout le débat : à
chaque étage du système, quelqu'un a été tenté de faire dire à un signal
plus qu'il ne peut honnêtement dire — et la discipline collective qui s'est
dégagée est de le nommer plutôt que de le corriger en douce.

État à ce stade : accord à trois (est/sud/ouest) sur mes 4 points initiaux +
les extensions catégorie-confiance et double-taxonomie. Aucune attaque
frontale reçue sur le fond depuis le round 2. En attente de nord.

## Round 5 — nord rejoint, deux attaques vérifiées ; sud affine la compositionnalité

nord confirme mes 4 points (avec mon chiffre 7 corrigeant son propre
recomptage) et ajoute deux attaques que j'ai vérifiées par le code, pas
seulement lues :

**Attaque 1 (confirmée, réelle, mais latente aujourd'hui) : le plafond non
compensatoire peut être court-circuité.** Dans `scoreFormule` (scoring.mjs),
le test `if (grav >= 3) cap = Math.min(cap, ...)` est logé À L'INTÉRIEUR du
bloc `if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name))`. Or
`dejaFactures` est rempli par les `penalites` MÉTIER (ex. le sulfate d'un
nettoyant) AVANT ce bloc. Un ingrédient déjà facturé par une pénalité métier
saute donc ENTIÈREMENT le bloc de risque générique — y compris la pose du
plafond. Vérifié sur le catalogue réel : aucun `tensioactif-agressif` du
dictionnaire n'atteint aujourd'hui gravité 3 (irritant max = 2, ex. SODIUM
LAURYL SULFATE, SODIUM LAURETH SULFATE) — donc le contournement est
STRUCTUREL et prouvé dans le code, mais il n'a PAS encore produit de score
faussement vert dans le catalogue actuel (seuls cleanser/makeup-remover ont
des `penalites`, et seul le tag `tensioactif-agressif` y est concerné). C'est
une mine, pas encore une plaie ouverte. Je propose de le traiter comme un cas
de test de non-régression explicite (dans l'esprit de `scan-scoring.md` §4) :
« un ingrédient facturé par une pénalité métier doit quand même déclencher le
plafond de bande s'il atteint gravité 3 » — sinon le prochain ingrédient
ajouté au dictionnaire avec irritant=3 ET tagué `tensioactif-agressif` fera
repasser un nettoyant au vert malgré un risque majeur, exactement le biais
Nutri-Score que le plafond devait fermer.

**Attaque 2 (confirmée intégralement) : le contexte métier est calculé puis
jeté.** `grep -rln "\.metier\b" src app` ne retourne QUE `scoring.mjs`
lui-même — aucune route, aucun composant, aucun des trois fichiers cités par
nord (overview.ts/avis.ts/acces.ts) ne lit `metier`. C'est le TROISIÈME
signal déjà calculé et jamais branché qu'on trouve dans ce débat, après
`catConfiance`/`categorieSource` (ouest) et la marge de vote de
`categorise.mjs` (sud). Motif qui se répète assez pour être nommé dans la
synthèse : **le moteur documente déjà plus d'incertitude/contexte qu'il n'en
affiche** — le travail restant est autant de la plomberie (brancher) que du
calcul (inventer).

**sud affine mon niveau 0 et ma granularité formule entière**, dans les deux
cas plus précisément que ma formulation : le niveau 0 est le cas nul de l'axe
BÉNÉFICE, indépendant de l'axe RISQUE — un même ingrédient est classable sur
les deux en même temps (silence bénéfice + risque réel possible). Et dans
`natureProduit()`, seules les CONTRIBUTIONS restent par-ingrédient ; ce qui
est émergent, c'est le franchissement de seuil (`seuilRiche=8`), pas le
jugement entier. J'adopte les deux précisions — plus juste que ma version.

## Ce que j'attends des trois autres

- Si quelqu'un défend le malus hors-sujet : je veux voir comment il évite de
  recréer l'« effet falaise » (une IA/route de reco qui punirait un produit
  honnête et inoffensif juste parce qu'il ne target rien chez CET
  utilisateur).
- Si quelqu'un propose d'inférer `skinType` ou `sensitivity` depuis la
  photo : je conteste, sauf preuve clinique publiée qu'une classification
  visuelle égale un sebumètre/déclaratif.
- Je suis preneur d'une meilleure réponse que la mienne sur les 5 attributs
  sans famille de bénéfice (pores/texture/radiance/zone des yeux) — c'est le
  point le moins solide de ma position.
