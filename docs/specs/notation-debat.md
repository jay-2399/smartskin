# Notation SmartSkin Score — compte rendu final du débat

> Rédigé par **est**, désigné par le lead pour clore le débat après avoir jugé
> qu'il était stabilisé (dernier désaccord de fond résolu au round 5 ; les
> rounds suivants n'ont produit que des confirmations, des extensions et des
> auto-corrections, plus aucune contradiction non résolue). Quatre agents ont
> débattu — nord, sud, est, ouest — chacun ayant lu les 3 specs
> (`scan-scoring.md`, `scan-scoring-structure.md`, `scan-scoring-recherche.md`)
> et le code réel (`src/lib/scan/`, `data/scan/`). Leurs notes complètes et
> le journal round par round restent dans `docs/specs/notation-debat/{nord,
> sud,est,ouest}.md` — ce document-ci remplace la version de travail
> précédente et fait foi.
>
> Aucune ligne de `src/` ou `data/` n'a été modifiée par ce débat. Tout ce
> qui suit est de la conception.

---

## 1. La question posée

Question donnée aux quatre agents, mot pour mot : *« quelle est la manière
la plus juste et la plus précise de noter un produit cosmétique — d'abord
sur sa formule seule, puis à travers le profil de peau d'un utilisateur issu
du scan visage, ce qui donne la note personnalisée ? »*

Le brief de départ, écrit par le lead avant le débat sur une lecture rapide
du code, posait trois « défauts établis, à ne pas re-débattre ». Ils sont
reproduits ici tels quels — un compte rendu qui efface une prémisse fausse
au lieu de la marquer comme tombée vaut moins qu'un qui montre son propre
chemin, et c'est une prémisse du coordinateur qui tombe pour l'une d'elles :

1. **« Le score perso n'est pas personnel. »** `profilUtilisateur(uid)`
   ignore l'identifiant reçu (`void uid`) et renvoie `data/scan/profil.json`,
   un fichier statique écrit à la main le 26/08 (`concerns: {blemishes:2,
   oiliness:2}`), servi à tous les utilisateurs — le scan visage n'entre
   jamais dans le calcul du score produit. *Tient intact.* Le débat l'a
   confirmé et étendu (§4.6 : la couture manque aussi côté quiz, pas
   seulement côté scan) — voir le classement en priorité n°1 (§7).
2. **« Aucun malus "hors-sujet". »** Un produit dont les actifs ne visent
   aucune préoccupation de l'utilisateur ne perd rien : il reste à sa note
   de formule. Mesuré à l'origine : le Kiehl's Acne-Treating Cleansing Paste
   vaut 77 en formule et 77 en perso pour une peau sans préoccupation — mais
   90 avec `profil.json`, via des lignes de matching (kaolin, niacinamide,
   charbon). **Requalifié pendant le débat : ce n'est PAS un défaut à
   corriger.** Est a fait tomber ce cadrage en premier (citation du journal
   produit du 26/08 : « un anti-rides qui ne traite pas tes préoccupations
   ne dégrade pas ta peau »), rejoint par nord sans qu'aucune objection de
   sud ni ouest n'arrive. Ce qui subsiste derrière l'exemple Kiehl's, c'est
   uniquement le défaut n°1 : le +13 est choquant parce que le profil servi
   est celui de Jayen à tout le monde, pas parce que matcher une vraie
   préoccupation ferait gagner des points à tort. Détail complet en §2.5,
   §3.2, et l'angle mort de cette requalification (jamais un vrai
   contradicteur) en §6.
3. **« L'échelle `strength` est vide. »** 2 ingrédients sur 3 165 ont une
   force ≥ 3 (adapalène, hydroquinone) ; 130 en ont une non nulle — le
   mécanisme `malusForceParCran` ne peut donc rien porter. *Tient*, mais la
   piste de correction (peupler un palier grossier pour les familles à
   plafond réglementaire connu, laisser le cumul de routine hors périmètre)
   n'a été discutée qu'entre est et nord — jamais confirmée ni contestée par
   sud ou ouest (nord le signale lui-même). À traiter comme une piste à deux
   voix, pas un consensus à quatre — voir §6 et la priorité n°5 (§7).

Le débat a donc confirmé le défaut n°1 tel quel, fait tomber le défaut n°2
comme mauvais cadrage (pas comme fait faux), et laissé le défaut n°3 sur une
piste non entièrement vérifiée par le groupe.

---

## 2. Ce qui a survécu à la contradiction

Chaque entrée nomme qui a mis le point à l'épreuve et comment il a tenu. Un
point qui n'a reçu aucune tentative de contradiction réelle est marqué
explicitement comme tel — voir aussi §6.

**2.1 — Les grilles métier (v2.0, `CONFIG.RUBRIQUES`, `scoring.mjs`) sont le
bon référentiel pour le score FORMULE, supérieures à l'ancien offset recalé
sur le catalogue (v1.0-1.4, abandonné par le code lui-même,
`scoring.mjs:70-73`).**
Personne n'a défendu un retour à l'offset. Mis à l'épreuve par ouest et sud,
qui ont chacun soulevé indépendamment la même limite : la normalisation par
grille règle l'équité *intra*-catégorie, jamais l'équité *inter*-catégorie
(« 90 en nettoyant » ≠ « 90 en sérum »). Le point a tenu en se reformulant :
ce n'est pas un défaut de la structure, c'est une propriété qu'il faut
afficher honnêtement (voir §4.2) et qui aggrave le risque déjà identifié
d'une mauvaise catégorisation (nord, sud). Un deuxième assaut, plus fin, a
entamé une version plus forte de l'affirmation : ouest puis sud ont montré
séparément que « indépendant du catalogue » n'est vrai qu'AU SCORING (ajouter
un produit ne bouge la note d'aucun autre) — au DESIGN, chaque critère de
grille n'a été retenu que parce qu'il est « discriminant » sur le catalogue
actuel (`scoring.mjs:127-129`, 25-75 % de remplissage). La dépendance n'a pas
disparu, elle a migré vers un choix figé à la conception. Ce point-là n'a pas
« survécu » intact — voir §3.

**2.2 — Le plafond non-compensatoire sur risque de gravité 3
(`capRisque3Top5=49`, `capRisque3Ailleurs=69`, reco n°1 de la recherche) est
la bonne architecture et personne ne propose d'y renoncer.**
Mis à l'épreuve le plus durement de tout le débat : nord a montré que son
IMPLÉMENTATION a un trou (voir §4.1) et sud a vérifié, contre sa propre
taxonomie causale, que ce trou est bien un bug et non un choix. Le PRINCIPE
survit intact ; son exécution actuelle non.

**2.3 — Score PERSO : deux registres disjoints, sécurité binaire
(court-circuit dur, grossesse/allergie) et adéquation graduée (jamais
présentée comme sécurité).** Déjà largement respecté par le code
(`scoring.mjs:556-608`). Confirmé par les quatre comme le seul modèle
personnalisé validé médicalement pour l'étage sécurité (SkinSAFE/Mayo, CAMP —
`scan-scoring-recherche.md` §3.1) ; l'étage adéquation reste une heuristique
assumée comme telle. Personne n'a proposé de fusionner les deux registres ou
de faire remonter un malus gradué au rang de sécurité.

**2.4 — La scission irritant (formule, universel) / sensibilisant (perso,
proportionnel à la sensibilité déclarée, nul à sensibilité 0) est la
meilleure décision structurelle de la v2.0.** Position de sud, mise à
l'épreuve par ouest (la sensibilisation de contact est un PROCESSUS qui
s'installe avec l'exposition répétée — un profil à sensibilité 0 aujourd'hui
peut se sensibiliser demain). Le point a tenu pour parfum/huiles
essentielles (le malus fixe universel en formule porte déjà le risque de
population, la couche perso n'ajoute qu'une marge) mais a révélé, en
résistant à l'attaque, un vrai trou voisin non couvert par l'affirmation
d'origine : voir §4.7.

**2.5 — Pas de malus « hors-sujet » en score PERSO** (requalification du
défaut n°2 du brief). Convergence indépendante d'est (citation du journal
produit 26/08 : « un anti-rides qui ne traite pas tes préoccupations ne
dégrade pas ta peau ») et de sud (taxonomie causale : absence de match =
niveau 0 = silence sur l'axe bénéfice, distinct de l'axe risque). Nord et
ouest s'y rallient sans contre-exemple. **Se réduit entièrement au défaut
n°1** : l'exemple choquant du brief (Kiehl's 77→90) n'est choquant que parce
que le profil est celui de Jayen pour tout le monde, pas parce que matcher
une vraie préoccupation ferait gagner des points à tort. Voir §6 — ce point
n'a en réalité jamais été défendu à l'inverse par personne, la nuance compte.

**2.6 — Le scan visage ne doit nourrir que `concerns` (+ `oiliness` nuancé
par `shine`, + `visible_vessels` en corroboration UX de `sensitivity`,
jamais en correction silencieuse) ; `skinType`, `sensitivity`, `pregnancy`,
`allergies`, `strengthCeiling` restent déclaratifs (quiz).** Posé par est
(aucune base clinique pour déduire un type de peau ou une sensibilité d'une
photo unique — SkinSAFE/CAMP, seule perso validée médicalement =
patch-test/déclaratif). Mis à l'épreuve par ouest, qui a d'abord proposé
d'utiliser aussi `redness` — proposition testée et rétrécie après discussion
(`redness` seul est trop confondu par des causes transitoires : effort,
chaleur, éclairage, poussée du jour ; `visible_vessels`, signe structurel,
est retenu). Confirmé indépendamment par nord avec la même source. Le point
a donc survécu, mais sous une forme plus étroite que sa première énonciation.

---

## 3. Ce qui est tombé, et pourquoi

**3.1 — La proposition d'ouest d'arrondir/bander l'affichage du score
(« un entier à 2 chiffres est une fausse promesse de rigueur, faire comme
Nutri-Score qui ne publie que la lettre »).** Retirée explicitement par
ouest lui-même en round 3, après l'argument de sud : Nutri-Score est un cas
à part (étiquette réglementaire lue d'un coup d'œil en rayon, zéro
interaction), pas transférable à une app où le chiffre est la porte d'entrée
vers le bloc « Why » ; Yuka et INCI Beauty, les précédents cosmétiques
réels, affichent tous deux un nombre ; et dégrader la résolution après avoir
justifié des grilles plus fines par catégorie que Nutri-Score serait
incohérent. Remplacé par une position à quatre : garder le chiffre exact,
jamais seul, toujours à côté de signaux de confiance séparés (§4.2).

**3.2 — Le défaut n°2 du brief (« aucun malus hors-sujet »).** Passé de
« défaut à corriger » à « conséquence voulue, se réduit au défaut n°1 »
(§2.5). Ce n'est pas la mesure initiale qui était fausse (le fait est
vérifié : Kiehl's gagne bien +13 par matching), c'est le diagnostic
« il manque un malus » qui ne survit pas à la confrontation avec la décision
produit déjà actée le 26/08 et avec la reco n°9 de la recherche.

**3.3 — Le « trou de population » d'est (5 des 16 attributs du scan sans
famille de bénéfice en face) a été remplacé par une trouvaille plus précise
d'ouest.** Ce n'est pas qu'un manque de données à combler : `scan-scoring.md`
§0 promettait explicitement 7 familles dont « éclat » et « protection UV »,
et ces deux-là ont **disparu** de l'implémentation réelle sans décision
explicite (zéro occurrence de « éclat »/« radiance »/« brightening » dans
tout `src/lib/scan/` et `dictionnaire.json`, vérifié par grep), pendant que
deux familles non prévues (`oiliness`, `spots`) apparaissaient. Le total
retombe à 7 par coïncidence — la composition a dérivé, ce n'est pas un trou
statique. Est a ensuite étendu la trouvaille (protection UV structurellement
bloquée, pas juste absente — §4.5) et trouvé une deuxième taxonomie de
concerns incompatible (§4.4), déplaçant encore le diagnostic : le problème
n'est plus « des familles à peupler » mais « une taxonomie canonique à
arbitrer avant tout peuplement ».

**3.4 — Le compte de nord, 6 familles de bénéfice peuplées, corrigé à 7.**
Erreur de lecture de sa propre sortie console (confirmée par est puis par
un script indépendant : `Object.values(dictionnaire).flatMap(benefits)` →
`Set` de taille 7 : `dehydration, aging, blemishes, oiliness, barrier,
redness, spots`). Le point substantiel (« éclat » absent) survit intact au
recomptage.

**3.5 — Le cadrage initial de nord sur le trou du plafond non-compensatoire
(« cas d'école du domaine, réintroduit exactement le biais Nutri-Score »).**
Walked back par nord lui-même après vérification sur le catalogue réel :
aucun `tensioactif-agressif` n'atteint aujourd'hui gravité 3 (irritant max
2), et sur les 4 ingrédients qui atteignent gravité ≥ 3 dans tout le
dictionnaire (vérifié : HYDROQUINONE, TRICLOSAN, 2× TRITICUM VULGARE (WHEAT)
GERM OIL), aucun ne recoupe une règle `penalites`. Nord a retiré son
« cas d'école », remplacé par « invariant non gardé, dormant, zéro produit
affecté aujourd'hui ». Le bug structurel, lui, survit à la correction (§4.1)
— c'est la SÉVÉRITÉ de l'énoncé qui est tombée, pas le constat.

**3.6 — L'affirmation « grilles métier indépendantes du catalogue ».**
Voir §2.1 : ouest puis sud, indépendamment, l'ont nuancée en
« indépendantes au scoring, dépendantes au design (choix figé des critères
discriminants) ». La version forte de l'affirmation est tombée ; la version
nuancée est ce qui reste en §2.1.

**3.7 — Le diagnostic « 3-4 signaux orphelins isolés » (catConfiance,
metier, marge de vote) a été remplacé par une cause unique, plus précise,
trouvée par nord en fin de débat, et acceptée par ouest lui-même sur son
propre constat.** Vérifié par est avant d'écrire ce document : `metier`
n'est en réalité **pas** absent du JSON renvoyé par l'API
(`score/route.ts:27`, `lire-inci/route.ts:54` l'incluent tel quel dans
l'objet `formule`) — c'est qu'aucun composant front ne le lit
(`grep -rn "formule\." src/components` = zéro résultat). Et `catConfiance`
n'est pas non plus « jamais branché nulle part » (ouest avait d'abord
énoncé le constat trop fort, et l'a corrigé lui-même après la nuance de
nord) : `lire-inci/route.ts:63` le renvoie déjà (`confianceCategorie:
cat.confiance`) pour le chemin étiquette photographiée — c'est
spécifiquement `fiche/route.ts` (chemin catalogue) qui ne le renvoie
jamais. Le vrai problème n'est donc pas « plusieurs signaux perdus », c'est
l'absence d'une fonction de mise en forme de réponse partagée entre le
moteur et les 4 routes API, chacune recomposant sa propre liste de champs à
la main et oubliant une chose différente.

**3.8 — La 6e famille orpheline trouvée par ouest (`visible_vessels`).**
Tombée dans le même message où elle a été proposée : ouest a réalisé, en la
cherchant, que le problème n'est pas que du contenu (une famille à peupler)
mais aussi du ROUTAGE — certains attributs du scan ne devraient jamais
finir en `concerns` (matching produit) parce qu'ils reclassent la peau
elle-même (`shine`→`oiliness`, `redness`/`visible_vessels`→corroboration de
`sensitivity`). Une fois `visible_vessels` correctement sorti du panier
« concern », les trous de contenu réels retombent à 5 : pores, texture,
radiance/dullness, cernes, poches. Ce point est arrivé au tout dernier
round et n'a reçu aucune contradiction — voir §6, il n'a pas eu le temps
d'être mis à l'épreuve.

---

## 4. Découvertes actionnables, localisées dans le code

Chaque point ici a été vérifié directement dans le code par au moins un
agent, et revérifié par est avant la clôture de ce document (commandes
`grep`/scripts Python rejouées ce jour).

**4.1 — Le plafond non-compensatoire (gravité 3) peut être contourné par les
pénalités métier.** `scoring.mjs`, bloc `scoreFormule` : `if (grav >= 3) cap
= Math.min(cap, ...)` est imbriqué dans `if (grav >= 2 && !aMalusFixe &&
!dejaFactures.has(it.name))`. Or `dejaFactures` est rempli par les
`penalites` de grille métier (ex. `sulfate` en `cleanser`/`makeup-remover`,
les 2 seules grilles sur 11 à avoir des `penalites` non vides). Un
ingrédient déjà « facturé » par une pénalité métier saute donc ENTIÈREMENT
le bloc de risque générique, y compris la pose du plafond. **Impact vérifié
aujourd'hui : zéro** — les 27 fiches portant une fonction alimentant
`dejaFactures` (`tensioactif-agressif`, `tensioactif-savon`,
`acide-gras-libre`, `base-saponifiante`) plafonnent toutes à `irritant: 2` ;
les 4 seuls ingrédients du dictionnaire à gravité ≥ 3 (HYDROQUINONE,
TRICLOSAN, 2× TRITICUM VULGARE (WHEAT) GERM OIL) ont `fonctions: []` ou
`["emollient"]`, jamais captés par une ligne `penalites`. **Trouvé par
nord, gravité initiale corrigée après vérification catalogue, confirmée
indépendamment par sud, ouest et est** (compte exact rejoué : 4/3165,
aucune intersection). Risque réel mais différé : une recalibration
défendable du SLS à `irritant: 3` (la recherche le qualifie d'« irritant de
référence de la dermatologie », `scan-scoring-recherche.md` §3.2) ou
l'extension des `penalites` à une nouvelle grille (probable pour exfoliant/
traitement) réveillerait l'invariant sans qu'aucun test actuel ne le
détecte. **Précision de sud, à retenir pour la priorisation (§7)** : le
déclencheur de cette faille est une mise à jour de DONNÉE (une
reclassification d'ingrédient dans le dictionnaire), pas de CODE — un bug
qui se réveille au prochain scraping du dictionnaire plutôt qu'au prochain
commit du moteur, donc invisible à toute revue de code normale. C'est
l'argument qui justifie de corriger maintenant plutôt que d'attendre qu'un
produit réel déclenche le trou. **Fix proposé** : vérifier le déclenchement
du cap sur `grav`
AVANT toute exclusion par `dejaFactures` — découpler « qui paie des points »
(reste gated, anti-double-comptage) de « qui peut déclencher le plafond »
(doit s'appliquer à tout ingrédient, sans exception). Couvrir par un test
de non-régression explicite, pas un mémo de spec.

**4.2 — Il n'existe aucune fonction de mise en forme de réponse partagée
entre le moteur et les routes API ; chaque route oublie un champ différent.**
Synthèse de nord, vérifiée intégralement par est (grep rejoués ce jour) :
- `metier` (le libellé du métier jugé par `scoreFormule`, ex. « deliver
  active ingredients ») **est bien présent** dans le JSON renvoyé par
  `src/app/api/produit/score/route.ts:27` et `lire-inci/route.ts:54` (à
  l'intérieur de l'objet `formule`). Mais **zéro composant front-end ne le
  consomme** — `grep -rn "formule\." src/components` retourne 0 résultat.
  Le seul écran qui l'afficherait, `06-result-premium.html`, est un
  prototype HTML statique (`product-scan-liquidglass/`, `public/scan-proto/`),
  pas une route sous `src/components`.
- `catConfiance`/`categorieSource`, calculés par `categorise.mjs:103,
  131-134` et écrits sur les produits du catalogue (`categorise.mjs:
  164-165`), sont bien renvoyés par `lire-inci/route.ts:63`
  (`confianceCategorie: cat.confiance`) pour le chemin étiquette
  photographiée — mais **`fiche/route.ts` (chemin catalogue, ~2 439
  produits, dont les 899 « incertain » arbitrés par agents en v1.4) ne les
  renvoie jamais**, vérifié en lisant le fichier (`fiche/route.ts:47`
  renvoie `categorie: p.category`, jamais `catConfiance`). La même
  information est donc montrée sur un scan caméra en direct et cachée sur
  la fiche catalogue du même produit.
- La marge de vote calculée par `categorise.mjs` pour distinguer
  « sur »/« probable »/« incertain »/« aucune » (4 états, pas 3 — l'état
  « aucune » apparaît quand le classement est vide, catégorie
  `indetermine`) n'est surfacée nulle part non plus.
**Fix proposé par nord** : une seule fonction `formaterReponseProduit()`
partagée par les 4 routes (`fiche`, `score`, `lire-inci`, `overview`), pas
quatre listes de champs assemblées à la main.

**4.3 — Aucun front-end ne consomme encore `/api/produit/*` aujourd'hui.**
Vérifié par est en clôturant ce débat (non soulevé explicitement par les
trois autres) : `grep -rln "api/produit" src/app src/components` ne
retourne aucun résultat hors des routes API elles-mêmes. `src/app` ne
contient que `(espace)`, `(funnel)`, `(home)`, `privacy`, `terms`,
`dashboard-preview` — aucune page ne branche le scan produit. **Le moteur
de score (`scoring.mjs`/`categorise.mjs`) et ses 4 routes API existent,
sont exercés par les scripts de calibration, mais n'ont aujourd'hui aucun
consommateur en production.** Ce fait recadre entièrement §7 : aucune des
failles listées ici n'a d'impact utilisateur MESURABLE aujourd'hui, parce
qu'il n'y a pas encore d'écran réel à mesurer.

**4.4 — Deux taxonomies de « concerns » incompatibles coexistent déjà dans
le code.** `scoring.mjs` (`libelle()`, ligne 657) : 7 clés — `blemishes,
oiliness, dehydration, redness, aging, spots, barrier` (celle que
`scorePerso` consomme pour le matching). `overview.ts` (`LIBELLE_SOUCI`,
lignes 36-40) : 11 clés — `blemishes, oiliness, dehydration, redness,
darkspots, wrinkles, pores, texture, dullness, barrier, sensitivity`
(utilisée pour résumer les avis clients, une fonctionnalité voisine). Noms
différents pour les mêmes idées (`darkspots`/`spots`, `wrinkles`/`aging`) ;
`pores`/`texture`/`dullness` existent dans la 2e liste mais pas la
1re. **Trouvé par ouest, confirmé par nord indépendamment (même compte de
7), étendu par est.** Aucune des deux n'est alignée sur les 16 attributs du
scan (`src/features/analysis/attributes.ts`).

**4.5 — « Protection UV » est structurellement bloquée pour le score PERSO,
pas juste absente du dictionnaire.** Vérifié dans `dictionnaire.json` :
`ZINC OXIDE`, `TITANIUM DIOXIDE`, `AVOBENZONE`, `OCTOCRYLENE`, `HOMOSALATE`
sont tous `role: "support"` avec `benefits: []`. `scorePerso` ne crée un
match que si `f.role === "active"` — donc même avec une famille
`sunProtection` dédiée et peuplée, aucun filtre UV ne pourrait jamais
déclencher de bonus perso sans d'abord reclasser leur `role`. Le
`bonusFiltresUV` existant est un bonus de MÉTIER (formule, identique pour
tout le monde), pas de la personnalisation. Trouvé et vérifié par est,
confirmé par ouest.

**4.6 — La couture manque des DEUX côtés, pas seulement scan→profil.**
Le funnel (`src/features/funnel/questions.ts`) collecte déjà `pregnancy` et
une condition diagnostiquée (rosacée/eczéma) en q7 — une porte d'entrée
déclarative existe pour ces deux champs — mais `allergies` n'apparaît nulle
part dans le funnel, et surtout **aucune fonction ne relie
`questions.ts`/le store au `ProfilPeau`** consommé par `scorePerso`. La
couture quiz→profil manque autant que la couture scan→profil déjà établie
dans le brief. Trouvé par nord.

**4.7 — Le champ générique `risks.sensibilisant` (allergènes de contact
hors parfum/huiles essentielles — conservateurs, libérateurs de
formaldéhyde) n'a aucun malus universel équivalent en FORMULE.** Le code
exclut explicitement `!f.fragrance && !f.essentialOil` de la ligne perso
(`sensi > 0 && sensitivity > 0 && !fragrance && !essentialOil`), et rien ne
les remplace côté formule (un irritant de niveau 1 est hors formule par la
règle §5.2 de la spec). Pour cette famille précise, un profil à
`sensitivity: 0` paie zéro nulle part — contrairement à parfum/HE qui ont
déjà un malus fixe universel en formule. **Attribution précise (corrigée
après les positions finales)** : c'est **sud** qui a trouvé ce trou, en
répondant à une question d'ouest sur un point voisin (la sensibilisation de
contact comme processus qui s'installe avec l'exposition répétée) — sud
propose d'étendre le mécanisme fixe déjà validé pour parfum/HE (poids plus
faible, prévalence clinique plus basse) + garder le malus perso
×(sensibilité/3) en risque marginal. **Piège d'implémentation relevé par
ouest** : `scan-scoring-recherche.md` §5.2 classe les libérateurs de
formaldéhyde en `irritant: 2` — le nouveau malus fixe doit donc passer par
le même ensemble `aMalusFixe` (`scoring.mjs:493`, `Math.max`, pas addition)
pour éviter de recréer le double comptage déjà corrigé deux fois dans le
journal du 26/08 ; sud a accepté la correction. **Ni ouest ni nord n'ont
vérifié ce point par un script/requête indépendante** (les deux le
précisent explicitement dans leur position finale) : seul sud a quantifié
le recoupement `irritant`×`sensibilisant` sur le cas trouvé, jamais audité
en entier sur le reste du dictionnaire. **Ne pas compter ce point comme
"testé/confirmé par 3 agents"** — c'est un constat de sud, une analyse
d'ouest engagée sans vérification indépendante, et un silence de nord.

**4.8 — `natureProduit()` : seul le franchissement de seuil est émergent.**
Précision technique de sud sur un point d'est/ouest : dans le calcul de
richesse/légèreté (`seuilRiche=8`), chaque contribution (BUTTER/OIL/WAX
pondéré par position) reste lisible ingrédient par ingrédient — ce qui est
émergent, c'est le FRANCHISSEMENT du seuil qui déclenche le malus/bonus, pas
le jugement dans son ensemble. Utile pour qui voudra un jour exposer ce
calcul dans le bloc « Why » : la ligne à afficher est le score de richesse
cumulé, pas une liste d'ingrédients coupables un par un.

**4.9 — Routage proposé par ouest pour les 16 attributs du scan**, à
trancher avant tout peuplement de famille de bénéfice : `shine` →
descripteur de profil (`oiliness`, déjà fait) ; `redness` et
`visible_vessels` → corroboration UX de `sensitivity`, jamais matching
produit ; `acne`, `dark_spots`, `fine_lines`/`wrinkles`, `tone_evenness` →
vrais concerns (le matching actif a un sens). Une fois ce tri fait, les
trous de CONTENU réels (attributs orphelins côté concern, aucune famille de
bénéfice ne les couvre) retombent à 5 : `pores`, `texture`,
`radiance`/`dullness`, `under_eye_circles`, `under_eye_puffiness`. Ce
routage n'a pas été vérifié pour les attributs restants non cités
(`comedones`, `post_acne_marks`, `flaking`) — voir §6.

---

## 5. Désaccords non résolus — arbitrages pour l'utilisateur

Aucun n'est un désaccord ENTRE coéquipiers (aucun n'a été contesté en
interne) : ce sont des décisions produit/planning que le débat a identifiées
sans pouvoir les trancher lui-même.

**5.1 — Éclat, protection UV, deux taxonomies de concerns : peupler/
réconcilier, ou réduire la promesse de la spec ?**
Le débat a établi les faits (§3.3, §4.4, §4.5) mais pas le remède. Deux
options non arbitrées : (a) peupler une famille de bénéfice « éclat » dans
le dictionnaire, reclasser le `role` des filtres UV pour rendre « protection
UV » matchable côté perso, et fusionner les taxonomies `scoring.mjs`/
`overview.ts` en une liste canonique unique ; (b) accepter que ces
dimensions restent hors du système de matching actif×préoccupation et
corriger `scan-scoring.md` §0 pour ne plus les promettre. C'est un chantier
de contenu (dictionnaire + réconciliation de vocabulaire), pas un correctif
de code — son ampleur et sa priorité restent à cadrer par l'utilisateur.

**5.2 — `sensibilisant` générique (§4.7) : corriger maintenant ou différer ?**
La direction du fix est actée (router par le même mécanisme `aMalusFixe`
que parfum/HE) mais son urgence ne l'est pas — la surface touchée
aujourd'hui (conservateurs/libérateurs de formaldéhyde hors parfum/HE) n'a
pas été chiffrée sur le catalogue par personne, contrairement au cap-bypass
(§4.1) qui l'a été (4/3165, impact zéro). Sans ce chiffrage, impossible de
dire si c'est un correctif à regrouper avec §4.1 ou un chantier à part.

**5.3 — `exposition` de zone, aujourd'hui sur 4 des 11 grilles métier
seulement** (cleanser 0.55, makeup-remover 0.5, exfoliant 0.85, mask 0.7 ;
les 7 autres restent à 1 par défaut, y compris `toner`, pourtant souvent
essuyé). Nord a soulevé l'incohérence, personne n'a proposé de valeurs pour
les 7 catégories manquantes ni statué sur la priorité de ce chantier face
aux autres.

**5.4 — Le refactor `formaterReponseProduit()` (§4.2) : à faire à quel
moment ?** Nord le propose comme correctif structurel « une fois, au bon
endroit ». Vu §4.3 (aucun écran ne consomme encore ces routes), différer ce
refactor au moment de construire le premier écran semble défendable, mais
ce n'est qu'un avis d'est glissé ici, pas un point débattu par les quatre.

**5.5 — Gouvernance des grilles métier.** Ouest note que chaque critère de
`CONFIG.RUBRIQUES` n'est retenu que parce qu'il est statistiquement
discriminant sur le catalogue ACTUEL (25-75 %, `scoring.mjs:127-129`) — une
dépendance de conception au catalogue, pas au scoring (§2.1/§3.6). Faut-il
un processus de révision versionné pour ces grilles (à la manière
d'`algo_version`), et à quelle fréquence si le catalogue change de nature
(ex. l'ajout de nombreux produits d'une zone géographique aux profils
d'actifs différents) ? Non tranché.

**5.6 — `visible_vessels`/`redness` en corroboration UX de `sensitivity`
(§2.6) implique une fonctionnalité d'interface qui n'existe nulle part
aujourd'hui** (une relance/confirmation utilisateur, pas un simple calcul).
Le principe (jamais de correction silencieuse) est acquis ; la
fonctionnalité elle-même — à quel moment du parcours la proposer, sous
quelle forme — reste à cadrer côté produit avant de devenir un item de
scoring.

**5.7 — Confiance-catégorie : signal visible à l'utilisateur, ou usage
interne/QA seulement ?** Nommé par ouest dans sa position finale : brancher
`catConfiance` sur `fiche/route.ts` (§4.2) est actionnable techniquement,
mais personne n'a tranché si un utilisateur doit voir « catégorie
incertaine » sur une fiche produit, ou si ce signal doit d'abord servir en
interne (prioriser les 899 produits « incertain » pour un arbitrage humain,
cf. journal v1.4) avant d'être exposé. Décision produit, pas technique.

**5.8 — `R.severite`/`R.exposition` : attribut fixe par catégorie, ou déduit
du produit comme `natureProduit()` ?** Nommé par ouest, jamais tranché.
Aujourd'hui ces deux champs sont des constantes par grille métier
(`RUBRIQUES[categorie].severite/exposition`) — une mauvaise catégorisation
en amont fausse donc à la fois le barème ET le multiplicateur (double
peine, relevé par nord). Les faire dépendre de la composition réelle du
produit réduirait ce risque mais n'a été ni chiffré ni même esquissé par
personne.

**5.9 — Correction immédiate du cap-bypass (§4.1), ou test de
non-régression documenté seulement pour l'instant ?** Nommé par ouest.
Tout le monde s'accorde sur le DIAGNOSTIC et la direction du fix ; personne
n'a tranché s'il faut livrer le correctif de code maintenant (surface
minuscule : 2 grilles sur 11) ou seulement documenter/tester le
comportement attendu en attendant un chantier scoring plus large.

**5.10 — Format concret des 3 signaux de confiance (couverture, calibration,
catégorie).** Remonté par sud via nord en toute fin de débat : leur
EXISTENCE et la nécessité de les brancher séparément est un vrai accord
(§2, §4.2) — mais leur présentation (à quoi ça ressemble, où ça vit dans
l'interface) n'a été débattue par personne, y compris dans le triptyque
nord/ouest qui a posé le principe. Silence, pas une décision différée.

---

## 6. Ce qui n'a PAS été mis à l'épreuve

Une convergence forte en fin de débat n'est pas une validation — plusieurs
points de ce document reposent sur un accord rapide entre les quatre agents,
jamais sur une contradiction soutenue par un vrai défenseur de la position
inverse. À dire franchement :

- **« Pas de malus hors-sujet » (§2.5) n'a jamais eu de vrai contradicteur.**
  Est et sud l'ont chacun défendu par un raisonnement différent, nord et
  ouest s'y sont ralliés — mais personne, à aucun moment du débat, n'a
  construit le meilleur argument POUR un malus hors-sujet (par exemple :
  un score perso qui ne pénalise jamais la non-pertinence pourrait laisser
  croire qu'un produit hors sujet est aussi bon qu'un produit ciblé, si
  l'écran ne distingue pas clairement adéquation et pertinence d'achat — un
  risque d'UX, pas de calcul, qu'aucun agent n'a creusé). Le point a résisté
  au CADRAGE initial du brief, pas à un débat contradictoire réel.
- **Le routage d'ouest des 16 attributs (concern vs descripteur de profil,
  §4.9) est arrivé au tout dernier round et n'a reçu aucune réponse.** Trois
  attributs (`comedones`, `post_acne_marks`, `flaking`) ne sont classés nulle
  part dans ce cadre — pas parce qu'ils ont été jugés, mais parce que le
  débat s'est arrêté avant. `tone_evenness` classé « vrai concern » par
  ouest n'a pas non plus été contesté ou confirmé par un tiers.
- **Les « trois signaux de confiance disjoints » (couverture dictionnaire /
  calibration des poids / confiance de catégorisation) ont convergé vite et
  sans friction entre les quatre.** Personne n'a défendu l'alternative
  inverse (un seul badge fusionné, plus simple à lire) au-delà de
  l'affirmer trompeur par intuition — aucun test utilisateur, aucune
  maquette, rien qui montre qu'un utilisateur réel distinguerait
  effectivement ces trois signaux sur un écran mobile plutôt que de les
  ignorer tous.
- **La taxonomie causale à 4 niveaux de sud (universel/interaction de
  peau/sensibilisation idiosyncratique/diagnostic binaire) a été adoptée
  quasi immédiatement par les trois autres, avec seulement des raffinements
  (le niveau 0 d'est, la granularité formule-entière).** Personne n'a
  proposé de structure concurrente ni contesté qu'un risque « dose-dépendant
  à effet universel » doive vivre ENTIÈREMENT côté formule plutôt que d'une
  quelconque façon partagé avec le perso.
- **`R.severite`/`R.exposition` salués comme un différenciateur « au-delà de
  l'état de l'art »** (ouest) : personne n'a vérifié si les valeurs
  elles-mêmes (0.55, 0.5, 0.85, 0.7…) sont calibrées sur autre chose qu'une
  intuition de départ — seule leur EXISTENCE en tant que mécanisme a été
  saluée, jamais leur calibration.
- **Rien dans ce débat n'a été confronté à un écran réel ou à un utilisateur
  réel.** Confirmé en clôturant (§4.3) : le moteur n'a aujourd'hui aucun
  consommateur front-end. Tout ce qui concerne l'affichage (chiffre exact,
  bande, signaux de confiance, libellé « comme nettoyant ») est un accord
  de principe entre quatre agents lisant du code, jamais testé contre une
  maquette ni un utilisateur.
- **`visible_vessels` comme corroborateur fiable de `sensitivity` déclarée**
  (§2.6) s'appuie sur la littérature générale rougeur/allergie de contact
  citée par la recherche compagne, mais aucun agent n'a vérifié que cette
  littérature couvre spécifiquement l'usage envisagé ici (une relance UX
  ponctuelle à partir d'une seule photo) plutôt que le lien clinique général
  qu'elle établit réellement.
- **L'audit systématique de `dejaFactures`/`aMalusFixe` n'a jamais eu lieu.**
  Sud le nomme explicitement dans sa position finale comme une action NON
  faite, pas comme un problème résolu : les deux interactions trouvées
  (le cap chez nord, §4.1 ; le malus générique chez sud, §4.7) l'ont été en
  testant des propositions ponctuelles contre le code, jamais par une
  relecture méthodique de toutes les occurrences du mécanisme dans
  `scoring.mjs`. Rien ne garantit qu'un 3e cas n'existe pas.
- **La section « Désaccords non résolus » proposée par nord (les items
  §5.3, §5.5, §5.6 de ce document, dans leur formulation d'origine) était
  une proposition solo,** envoyée à sud/est/ouest pour contradiction avant
  la consigne du lead d'arrêter d'écrire dans le doc — nord le précise
  lui-même : aucune confirmation ni contradiction explicite reçue de sud
  sur ces items avant la clôture. Ils restent dans ce document parce que
  personne ne les a contestés quand ils ont été relayés, mais leur statut
  est « proposés par un agent, non objectés », pas « débattus à quatre ».
- **La piste de résolution du défaut n°3 (`strength`, §1) n'a été discutée
  qu'entre est et nord** — nord le signale explicitement dans sa position
  finale : ni sud ni ouest ne l'ont confirmée ou contestée dans le
  document. À traiter comme un accord à 2, pas 4.

Les points ci-dessus sont des **accords non contestés** : quelqu'un les a
énoncés, personne ne les a attaqués, mais faute d'attaque ce n'est pas une
validation. Les deux qui suivent sont d'une autre nature — des **réserves
déposées mais jamais débattues** : sud les a explicitement rangées, dans ses
notes (`docs/specs/notation-debat/sud.md`, section « Ce qui reste fragile et
que je dirai tel quel si on me pousse »), sous une clause conditionnelle.
Personne ne l'a poussée sur ces deux points précis — ils ne sont donc jamais
entrés dans le débat, jamais dans les échanges entre agents, jamais
contredits NI confirmés par personne d'autre. Ce n'est même pas un accord
tacite : c'est un silence sur une réserve qui existait avant le débat et que
le débat n'a pas su faire remonter.

- **La comédogénicité (échelle de Fulton, modèle de l'oreille de lapin) est
  la donnée la plus faible du système** (sud, citant `scan-scoring-
  recherche.md` §3.1 : faux positifs documentés dès 1982, listes agrégées
  à des concentrations différentes et parfois contradictoires). À afficher
  comme indicatif, jamais comme un fait — ce que fait déjà la règle actée
  du 26/08 (seuil d'action ≥ 3, priorité au niveau le plus bas en cas de
  désaccord de sources), mais qu'aucun agent n'a vérifié être VRAIMENT
  présentée comme telle à l'écran (aucun écran n'existe — §4.3).
- **La qualité du catalogue INCI (couverture, doublons, exactitude de la
  catégorisation) est le vrai risque n°1 du système, avant la justesse du
  calcul** (sud, citant `scan-scoring-structure.md` §3.2.8 : même SkinSAFE,
  l'outil de référence adossé à la Mayo Clinic, a ~28 % de listes INCI
  incomplètes ; un moteur de notation parfait sur une INCI fausse produit
  une note fausse, avec une précision trompeuse). Ce n'est pas une
  découverte du débat — la recherche compagne le disait déjà avant que les
  quatre agents ne commencent — mais le débat entier a porté sur la justesse
  du CALCUL (grilles, plafonds, personnalisation) sans jamais remettre sur
  la table que le résultat dépend d'abord de la matière première. Voir §7
  pour la conséquence que j'en tire sur l'ordre des travaux.

---

## 7. Ordre des travaux recommandé, par impact mesuré

**Réserve préalable, avant le classement — mon jugement, pas celui du
débat.** La qualité du catalogue INCI (§6, réserve de sud) qualifie TOUT ce
qui suit : c'est un problème de matière première, pas de mécanisme, donc il
ne rentre pas naturellement dans une liste ordonnée de correctifs — je ne
le place PAS comme un item numéroté en concurrence avec les autres, mais je
recommande de le traiter comme un chantier de fond permanent, mené EN
PARALLÈLE du reste, pour trois raisons : (a) contrairement aux items
1-7 ci-dessous, ce n'est pas un correctif ponctuel mais une amélioration
continue (couverture, déduplication, comparaison inter-sources) sans point
d'arrivée net ; (b) il conditionne la confiance qu'on peut avoir dans
CHACUN des items 1-7 — corriger la couture du profil (item 1) sur une INCI
fausse produit une personnalisation fausse avec une précision trompeuse,
exactement l'avertissement de sud ; (c) un mitigant existe déjà et
fonctionne indépendamment du reste (le badge « analyse partielle », lié à
la couverture dictionnaire) — ce n'est donc pas un chantier à zéro, mais un
chantier qui doit rester visible et financé pendant qu'on avance sur le
reste, pas un item qu'on coche une fois et qu'on oublie. Je ne le fais PAS
remonter en position 1 : la couture du profil (ci-dessous) reste, à mon
jugement, le levier le plus décisif parce qu'elle est structurelle et
absolue (sans elle, 100 % des scores perso sont ceux de Jayen, quelle que
soit la qualité du catalogue) — alors qu'une INCI imparfaite dégrade la
précision sans annuler la personnalisation. Mais ce chantier doit être
nommé et suivi dès aujourd'hui, pas différé jusqu'à ce qu'un des 7 items
numérotés soit terminé.

Le fait le plus structurant pour le classement numéroté est §4.3, découvert en
clôturant le débat et pas anticipé par les trois autres agents : **aucune
des failles ci-dessus n'a d'impact utilisateur mesurable aujourd'hui, parce
qu'aucune page de l'app ne consomme encore `/api/produit/*`.** L'ordre
ci-dessous classe donc par « coût si on construit le premier écran sans
l'avoir réglé », pas par gravité apparente du bug.

1. **Le profil réel (défaut n°1 + §4.6, couture scan ET quiz → `ProfilPeau`).**
   Priorité absolue, sans discussion possible entre les quatre agents. Ce
   n'est pas seulement « le bug le plus grave » : c'est un préalable
   structurel — tant qu'il n'existe pas, tout raffinement de `scorePerso`
   s'exerce sur un profil qui n'est celui de personne, et aucune mesure
   d'impact réelle sur le perso n'est possible avant qu'il soit corrigé.
2. **Décider AVANT de construire le premier écran, pas après** (parce que
   ce sont des décisions qui coûtent cher à défaire une fois un écran
   construit dessus) : la taxonomie canonique unique de concerns (§4.4,
   remplace les deux existantes) ; le routage des 16 attributs du scan
   (§4.9, à compléter — §6) ; les champs que la réponse API doit exposer et
   sous quelle fonction partagée (§4.2, `formaterReponseProduit()`) ; le
   traitement d'éclat/protection UV (§5.1) ; si la confiance-catégorie est
   un signal utilisateur ou un usage interne (§5.7) ; et le format concret
   des 3 signaux de confiance (§5.10) — ce dernier point n'a même pas
   commencé à être débattu (§6). Bon marché à trancher maintenant, coûteux à
   corriger une fois un écran en prod dessus.
3. **Le plafond non-compensatoire contournable (§4.1).** Impact vérifié nul
   aujourd'hui, mais protège un invariant que les quatre agents ont qualifié
   de non négociable, et le correctif est petit (une ligne, un test de
   non-régression). À faire avant la prochaine recalibration du dictionnaire
   (le SLS est un candidat identifié) ou avant l'extension des `penalites`
   à de nouvelles grilles métier — pas urgent dans l'absolu, mais moins cher
   à faire maintenant qu'à déboguer après coup sur un vrai produit mal noté.
4. **Le malus `sensibilisant` générique (§4.7, §5.2).** Même famille de
   correctif que le point 3 (même zone de code, `aMalusFixe`), direction
   actée, urgence non chiffrée — à regrouper avec le point 3 par économie
   d'effort plutôt qu'à traiter comme un chantier séparé.
5. **`strength` : peuplement grossier des familles à plafond réglementaire
   connu** (rétinoïdes, BHA/AHA forts, benzoyl peroxide, hydroquinone, acide
   kojique — défaut n°3 du brief). Périmètre étroit, gain modeste, à faire
   quand le temps le permet — sans viser une reconstruction universelle
   (la vraie force dépend d'une concentration que l'INCI ne donne pas) et
   sans essayer de couvrir le cumul inter-produits d'une routine, hors
   portée d'un score par produit.
6. **`exposition` de zone sur les 7 grilles qui n'en ont pas encore (§5.3),
   gouvernance de révision des grilles (§5.5), et la question fixe-vs-déduit
   pour `severite`/`exposition` (§5.8).** Amélioration de calibration et de
   process, pas de structure — après les points ci-dessus, pas avant.
7. **Affichage (chiffre exact + bande + signaux de confiance + libellé
   métier, §2.1, §3.1) et fonctionnalité de relance UX (§5.6).**
   Explicitement en dernier : aucun écran n'existe encore pour l'accueillir
   (§4.3), donc ce travail n'a de sens qu'une fois le point 2 tranché —
   construire l'affichage avant la taxonomie et le format de réponse
   reviendrait à décorer une fondation qui va encore bouger.
