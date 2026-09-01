# Comment noter une formule, puis une peau

> **Version resserrée** du compte rendu de débat. Le document intégral, rédigé
> par l'agent `est`, est dans `notation-debat.md` (679 lignes) — c'est lui qui
> fait foi. Ce résumé change l'ordre (les arbitrages passent avant l'ordre des
> travaux) et ajoute un regroupement qui n'est pas dans l'original ; les deux
> écarts sont signalés là où ils apparaissent.
>
> Débat du 31 août 2026 · quatre agents — `nord`, `sud`, `est`, `ouest` ·
> huit tours · journaux complets dans `notation-debat/{nord,sud,est,ouest}.md`
> · **aucune ligne de `src/` ni `data/` modifiée**.

**La question posée, mot pour mot :** quelle est la manière la plus juste et la
plus précise de noter un produit cosmétique — d'abord sur sa formule seule, puis
à travers le profil de peau issu du scan visage, ce qui donne la note
personnalisée ?

Aucune position n'a été assignée aux agents. Ils ont enquêté séparément dans le
code, puis passé huit tours à essayer de démolir les conclusions des autres.

| | |
|---:|:---|
| **6** | points ont tenu |
| **8** | sont tombés |
| **12** | n'ont jamais été éprouvés |
| **10** | arbitrages restent pour toi |

---

## 1. Le brief posait trois défauts. L'un d'eux n'en était pas un.

Trois « défauts établis, à ne pas re-débattre » avaient été écrits avant le
débat, sur une lecture rapide du code. Le compte rendu les reproduit mot pour
mot plutôt que de les corriger en silence — une prémisse fausse marquée comme
tombée vaut mieux qu'une prémisse effacée.

### ✅ Tient intact — *étendu par `nord`*
**Le score personnalisé n'est personnel pour personne.**
`profilUtilisateur(uid)` ignore l'identifiant reçu et renvoie
`data/scan/profil.json`, un fichier statique écrit à la main le 26 août. Tous
les utilisateurs reçoivent le même profil ; le scan visage n'entre jamais dans
le calcul. Le débat l'a confirmé **et étendu** : la couture manque aussi côté
quiz, pas seulement côté scan.

### ❌ Requalifié — *fait tomber par `est`, puis `nord` ; sans objection de `sud` ni `ouest`*
**L'absence de malus « hors-sujet » n'est pas un bug.**
Le brief le présentait comme un défaut à corriger. Le débat l'a renversé en
citant une décision produit déjà actée : « un anti-rides qui ne traite pas tes
préoccupations ne dégrade pas ta peau ». Le fait mesuré reste vrai — le Kiehl's
gagne bien +13 par matching. C'est le **diagnostic** qui tombe : ce +13 choque
parce que le profil servi est celui d'une seule personne, pas parce que matcher
une vraie préoccupation ferait gagner des points à tort. Le défaut n°2 se
réduit entièrement au n°1.

### ⚠️ Tient, mais à deux voix — *discuté par `est` et `nord` seulement*
**L'échelle `strength` est vide.**
2 ingrédients sur 3 165 ont une force ≥ 3. Le constat tient, mais la piste de
correction n'a été discutée qu'entre deux agents — `nord` le signale lui-même.
À traiter comme un accord à deux, pas un consensus à quatre.

---

## 2. Ce qui a survécu à la contradiction

Chaque entrée nomme qui a mis le point à l'épreuve. Plusieurs n'ont pas survécu
intacts : ils ont tenu **en se reformulant plus étroitement**.

### ✅ Tenu, reformulé — *attaqué par `ouest` et `sud`*
**Les grilles métier sont le bon référentiel pour la note de formule.**
Personne n'a défendu un retour à l'ancien offset recalé sur le catalogue. Mais
deux assauts l'ont entamé. Le premier : la normalisation par grille règle
l'équité *intra*-catégorie, jamais l'*inter*-catégorie — « 90 en nettoyant »
n'égale pas « 90 en sérum ». Le second, plus fin : « indépendant du catalogue »
n'est vrai qu'au scoring. Au **design**, chaque critère n'a été retenu que
parce qu'il est discriminant sur le catalogue actuel — 25 à 75 % de
remplissage, `scoring.mjs:127-129`. La dépendance n'a pas disparu, elle a migré
vers un choix figé.

### ✅ Principe tenu — *attaqué par `nord`, vérifié par `sud`*
**Le plafond non compensatoire est la bonne architecture.**
Le point le plus durement attaqué du débat. `nord` a montré que son
implémentation a un trou ; `sud` a vérifié, contre sa propre taxonomie, que ce
trou est bien un bug et non un choix.

> Le principe survit intact. Son exécution actuelle, non.

### ✅ Tenu — *confirmé par les quatre*
**Deux registres disjoints pour le score perso.**
Sécurité binaire d'un côté — court-circuit dur pour grossesse et allergie — et
adéquation graduée de l'autre, jamais présentée comme de la sécurité. C'est le
seul modèle personnalisé validé médicalement pour l'étage sécurité ; l'étage
adéquation reste une heuristique assumée. Personne n'a proposé de fusionner les
deux registres.

### ✅ Tenu, trou révélé — *posé par `sud`, attaqué par `ouest`*
**La scission irritant / sensibilisant.**
L'irritant vit côté formule, universel ; le sensibilisant côté perso,
proportionnel à la sensibilité déclarée. `ouest` a objecté que la sensibilisation
de contact est un *processus* qui s'installe avec l'exposition — un profil à
sensibilité nulle aujourd'hui peut se sensibiliser demain. Le point a tenu pour
le parfum et les huiles essentielles, mais en résistant à l'attaque il a
**révélé un trou voisin** que l'affirmation d'origine ne couvrait pas (§4).

### ⚠️ Tenu sans contradicteur — *énoncé par `est` et `sud` ; personne n'a plaidé l'inverse*
**Pas de malus « hors-sujet » en score perso.**
Deux raisonnements indépendants y mènent, les deux autres agents s'y rallient
sans contre-exemple. Mais le compte rendu refuse de le compter comme validé :
personne n'a jamais construit l'argument inverse. Le point a résisté au cadrage
du brief, pas à un débat réel.

### ✅ Tenu, rétréci — *posé par `est`, attaqué par `ouest`, confirmé par `nord`*
**La photo ne peut nourrir que les préoccupations.**
Aucune base clinique ne permet de déduire un type de peau ou une sensibilité
d'une photo unique. Type de peau, sensibilité, grossesse et allergies restent
**déclaratifs**. `ouest` voulait ajouter la rougeur ; proposition testée puis
rétrécie — la rougeur seule est trop confondue par l'effort, la chaleur,
l'éclairage. Seuls les vaisseaux visibles, signe structurel, sont retenus, et en
simple relance de l'utilisateur, jamais en correction silencieuse du moteur.

---

## 3. Ce qui est tombé, et pourquoi

Un débat dont on ne publie que les conclusions survivantes cache la moitié de
son travail. Trois de ces abandons sont des agents qui se sont corrigés
eux-mêmes.

### Arrondir la note en bandes plutôt qu'un chiffre exact
*Retiré par son auteur `ouest`, réfuté par `sud`.* `ouest` soutenait qu'un
entier à deux chiffres est une fausse promesse de rigueur, et proposait
d'imiter le Nutri-Score. Retiré par lui-même au troisième tour : le Nutri-Score
est une étiquette réglementaire lue d'un coup d'œil en rayon, sans interaction —
pas transférable à une app où le chiffre est la porte d'entrée vers
l'explication. Yuka et INCI Beauty, les vrais précédents cosmétiques, affichent
tous deux un nombre. Remplacé par une position à quatre : **garder le chiffre
exact, jamais seul**, toujours accompagné de signaux de confiance séparés.

### « Cinq attributs du scan n'ont pas de famille en face »
*Diagnostic d'`est` remplacé par une trouvaille d'`ouest`.* La spec promettait
explicitement sept familles, dont **« éclat » et « protection UV »**. Les deux
ont **disparu de l'implémentation sans décision explicite** — zéro occurrence
dans tout le moteur, vérifié par grep — pendant que deux familles non prévues
apparaissaient. Le total retombe à sept par coïncidence.

> Ce n'est pas un trou. C'est une dérive de composition que personne n'a décidée.

### « Le trou du plafond est un cas d'école »
*Rétracté par `nord` après vérification catalogue.* Sur les 3 165 ingrédients du
dictionnaire, **4 seulement** atteignent la gravité 3 — hydroquinone, triclosan,
deux entrées d'huile de germe de blé — et aucun ne recoupe une règle de pénalité
métier. Remplacé par « invariant non gardé, dormant, zéro produit affecté
aujourd'hui ». C'est la **sévérité de l'énoncé** qui tombe, pas le constat.

### « Trois ou quatre signaux orphelins isolés »
*Cause unique trouvée par `nord`, acceptée par `ouest` sur son propre constat.*
Le champ `metier` n'est *pas* absent du JSON de l'API — il y est. C'est
qu'aucun composant du front ne le lit : `grep -rn "formule\." src/components`
retourne zéro. Et la confiance de catégorisation n'est pas « jamais branchée » :
`lire-inci/route.ts:63` la renvoie pour le chemin étiquette photographiée. C'est
spécifiquement `fiche/route.ts`, le chemin catalogue, qui ne la renvoie jamais.

> La même information est montrée sur un chemin et cachée sur l'autre, pour le
> même produit.

Le vrai problème n'est pas plusieurs signaux perdus : c'est l'absence d'une
**fonction de mise en forme partagée** entre le moteur et les quatre routes.
Chacune recompose sa liste de champs à la main, et oublie une chose différente.

### Et quatre corrections plus courtes
- **Le comptage de `nord`**, « 6 familles de bénéfice », corrigé à 7 — erreur de
  lecture de sa propre sortie console, tranchée par un script indépendant.
- **« Grilles indépendantes du catalogue »** affaibli en « indépendantes au
  scoring, dépendantes au design ».
- **La sixième famille orpheline** proposée par `ouest`, tombée dans le message
  même où elle naissait : le problème n'est pas le contenu mais le **routage** —
  certains attributs ne devraient jamais devenir des préoccupations, parce
  qu'ils reclassent la peau elle-même.

---

## 4. Ce qui est cassé, avec l'adresse exacte

Chaque point vérifié dans le code par au moins un agent, puis rejoué par le
rédacteur avant clôture. Les cinq plus lourds :

### Le plafond de sécurité a une porte dérobée
*Trouvé par `nord` ; vérifié par `sud`, `ouest`, `est`.* Le test qui pose le
plafond est imbriqué dans une condition que les pénalités métier font sauter
entièrement. Un ingrédient déjà « facturé » par une pénalité de catégorie
échappe donc au plafond, même à gravité 3. **Impact vérifié : zéro** — aucun
produit du catalogue actuel n'est affecté.

> Mais le déclencheur est une mise à jour de *données*, pas de code. Ce bug se
> réveillera au prochain scraping du dictionnaire, pas au prochain commit —
> donc invisible à toute revue de code.

C'est l'argument de `sud`, et c'est ce qui justifie de corriger maintenant : une
reclassification défendable du SLS en irritant 3 suffirait à l'armer.

### Aucun écran ne consomme encore ce moteur
*Trouvé par `est` en clôturant ; non soulevé par les trois autres.*
`grep -rln "api/produit" src/app src/components` ne retourne rien hors des
routes elles-mêmes. Le moteur de score et ses quatre routes existent, sont
exercés par les scripts de calibration, et n'ont **aucun consommateur en
production**.

> Aucune des failles de ce document n'a d'impact utilisateur mesurable
> aujourd'hui — parce qu'il n'y a pas encore d'écran à mesurer.

C'est le fait qui réordonne toute la priorisation.

### Deux vocabulaires de préoccupations coexistent déjà
*Trouvé par `ouest`, confirmé par `nord`, étendu par `est`.* Le moteur de score
en connaît **7**. Le résumé des avis clients en connaît **11**, sous des noms
différents pour les mêmes idées. Ni l'un ni l'autre n'est aligné sur les **16
attributs** que mesure le scan. Le vocabulaire « pores / texture / éclat » n'est
donc pas absent : il est **orphelin et non réconcilié**. Il faut arbitrer une
taxonomie canonique *avant* de peupler quoi que ce soit.

### La protection solaire est structurellement exclue du perso
*Trouvé par `est`, confirmé par `ouest`.* Les filtres UV — oxyde de zinc,
dioxyde de titane, avobenzone, octocrylène — sont tous classés `role: "support"`
avec `benefits: []`. Or le score perso ne crée un match que pour un rôle
`active`. Donc même avec une famille « protection UV » dédiée et peuplée,
**aucun filtre ne pourrait jamais déclencher de bonus personnalisé** sans
reclasser son rôle d'abord. Le bonus solaire actuel est un bonus de métier,
identique pour tout le monde. Ce n'est pas de la personnalisation.

### Un trou d'allergènes, et le piège de son correctif
*Trouvé par `sud` seul ; `ouest` analyse sans vérifier ; `nord` n'a rien
vérifié.* Les allergènes de contact hors parfum et huiles essentielles —
conservateurs, libérateurs de formaldéhyde — n'ont **aucun malus universel côté
formule**, contrairement au parfum. Un profil non sensible n'y paie rien, nulle
part. `ouest` a repéré le piège du correctif : ces mêmes ingrédients sont déjà
classés irritants ; les facturer une seconde fois recréerait un double comptage
que le projet a déjà corrigé deux fois.

**À ne pas compter comme vérifié par trois agents** — les deux l'ont signalé
eux-mêmes.

---

## 5. Ce qui n'a jamais été mis à l'épreuve

Une convergence forte en fin de débat n'est pas une validation. Cette section
était obligatoire, et c'est celle qui rend le reste utilisable : elle distingue
ce qui a résisté de ce dont personne n'a parlé.

**Personne n'a plaidé pour un malus hors-sujet.** Le rédacteur construit alors
lui-même l'argument adverse manquant : un score perso qui ne pénalise jamais la
non-pertinence *pourrait laisser croire qu'un produit hors sujet vaut un produit
ciblé*, si l'écran ne sépare pas clairement adéquation et pertinence d'achat. Un
risque d'interface, pas de calcul — qu'aucun agent n'a creusé.

**Le routage des 16 attributs n'a reçu aucune réponse.** La meilleure idée
structurelle du débat est arrivée au dernier tour. Trois attributs — comédons,
marques post-acné, desquamation — **ne sont classés nulle part**. Non parce
qu'on a tranché, mais parce que le débat s'est arrêté avant.

**Rien n'a été confronté à un écran ni à un utilisateur.** Tout ce qui concerne
l'affichage est un accord de principe entre quatre agents qui lisent du code.
Même les valeurs de sévérité et d'exposition, saluées comme un différenciateur
au-delà de l'état de l'art, n'ont **jamais été vérifiées pour leur
calibration**. Seule leur existence a été applaudie.

**L'audit du mécanisme anti-double-comptage n'a jamais eu lieu.** Les deux bugs
trouvés sortent du **même mécanisme**, mais tous deux par hasard, en testant des
propositions ponctuelles — jamais par une relecture méthodique. `sud` le nomme
explicitement comme une action non faite.

> Rien ne garantit qu'un troisième cas n'existe pas.

### Deux réserves n'ont jamais atteint le débat

Elles n'étaient même pas un accord tacite. `sud` les avait rangées dans ses
notes sous une clause conditionnelle — « ce que je dirai tel quel si on me
pousse ». Personne ne l'a poussée.

- **La comédogénicité est la donnée la plus faible du système.** Échelle de
  Fulton, modèle de l'oreille de lapin, faux positifs documentés depuis 1982. À
  afficher comme indicatif, jamais comme un fait.
- **La qualité du catalogue INCI est le vrai risque n°1**, avant la justesse du
  calcul. Même SkinSAFE, l'outil de référence adossé à la Mayo Clinic, a environ
  28 % de listes INCI incomplètes.

> Un moteur de notation parfait sur une INCI fausse produit une note fausse —
> avec la précision trompeuse d'un chiffre.

Le débat entier a porté sur la justesse du **calcul** sans jamais remettre sur
la table que le résultat dépend d'abord de la matière première.

---

## 6. Ce que le débat ne peut pas trancher à ta place

Aucun n'est un désaccord entre agents — ce sont des décisions produit que le
débat a su identifier sans pouvoir les prendre.

> ⚠️ Le regroupement ci-dessous en « quatre pour toi » et « six techniques » est
> une lecture ajoutée dans ce résumé. Le document d'origine présente les dix sur
> le même plan.

### Quatre décisions produit — elles t'appartiennent

**§5.1 — Tenir la promesse de la spec, ou la réduire.** Peupler une famille
« éclat », reclasser le rôle des filtres UV pour les rendre matchables, et
fusionner les deux taxonomies en une liste canonique. **Ou** accepter que ces
dimensions restent hors du système et corriger la spec pour ne plus les
promettre. *C'est le seul arbitrage qui touche ce que l'app dit à
l'utilisateur.*

**§5.7 — La confiance de catégorisation : visible, ou interne ?** Techniquement,
la brancher est trivial. Mais un utilisateur doit-il lire « catégorie
incertaine » sur une fiche produit — ou ce signal doit-il d'abord servir en
interne, à prioriser les **899 produits incertains** pour un arbitrage humain ?

**§5.6 — La relance utilisateur sur les vaisseaux visibles.** Le principe est
acquis : jamais de correction silencieuse du profil. Mais cela implique une
**fonctionnalité d'interface qui n'existe nulle part**. À quel moment du
parcours la proposer, sous quelle forme ?

**§5.10 — À quoi ressemblent les trois signaux de confiance.** Leur existence et
la nécessité de les garder séparés font un vrai accord. Leur **présentation**
n'a été débattue par personne, y compris par ceux qui ont posé le principe.
*Silence, pas décision différée.*

### Six questions de séquencement — un développeur peut les trancher

Corriger le plafond maintenant ou seulement documenter le comportement attendu ;
quand refactorer la mise en forme des réponses ; quelles valeurs d'exposition
pour les sept grilles qui n'en ont pas ; chiffrer la surface du malus allergène
avant de le grouper ou non ; instaurer une gouvernance versionnée des grilles
métier ; et rendre la sévérité déduite du produit plutôt que fixe par catégorie.

---

## 7. Ordre des travaux — par coût futur, pas par gravité apparente

> **Réserve préalable — jugement du rédacteur, pas du débat.** La qualité du
> catalogue INCI **qualifie tout ce qui suit**. Ce n'est pas un correctif
> ponctuel mais une amélioration continue sans point d'arrivée, et elle
> conditionne la confiance qu'on peut avoir dans chacun des sept points
> ci-dessous. Elle ne monte pas en première position pour autant : sans couture
> du profil, **100 % des scores personnalisés sont ceux d'une seule personne**,
> quelle que soit la qualité du catalogue — alors qu'une INCI imparfaite dégrade
> la précision sans annuler la personnalisation. Mais ce chantier doit être
> nommé et suivi dès maintenant, mené en parallèle, pas différé.

1. **Brancher un vrai profil — scan *et* quiz.** Priorité absolue, unanime. Ce
   n'est pas seulement le bug le plus grave : c'est un préalable structurel.
   Tant qu'il n'existe pas, tout raffinement s'exerce sur le profil de personne,
   et aucune mesure d'impact n'est possible.
2. **Trancher quatre choix avant de construire le premier écran.** La taxonomie
   canonique unique, le routage des 16 attributs, les champs que l'API doit
   exposer via une fonction partagée, et le sort d'« éclat » et « protection
   UV ». Bon marché maintenant, coûteux à défaire une fois un écran en
   production dessus.
3. **Fermer la porte dérobée du plafond.** Impact nul aujourd'hui, correctif
   d'une ligne plus un test de non-régression. À faire avant la prochaine
   recalibration du dictionnaire ou l'extension des pénalités à de nouvelles
   grilles.
4. **Le malus allergène générique.** Même zone de code que le point précédent,
   même famille de correctif. À regrouper avec lui par économie d'effort.
5. **Peupler `strength`, mais grossièrement.** Uniquement les familles à plafond
   réglementaire connu — rétinoïdes, acides forts, peroxyde de benzoyle,
   hydroquinone, acide kojique. Sans viser une reconstruction universelle : la
   vraie force dépend d'une concentration que l'INCI ne donne pas.
6. **Compléter l'exposition de zone, et gouverner les grilles.** Sept grilles sur
   onze n'ont pas de valeur d'exposition. Calibration et processus, pas
   structure — après ce qui précède, pas avant.
7. **L'affichage, en tout dernier.** Aucun écran n'existe pour l'accueillir.
   Construire l'affichage avant la taxonomie et le format de réponse reviendrait
   à décorer une fondation qui va encore bouger.
