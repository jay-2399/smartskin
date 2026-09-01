# Position de nord — débat notation SmartSkin Score

> Méthode : lu les 3 specs (`scan-scoring.md`, `scan-scoring-structure.md`, `scan-scoring-recherche.md`)
> ET le code réel (`src/lib/scan/scoring.mjs`, `moteur.ts`, `profil-utilisateur.ts`,
> `data/scan/profil.json`, `data/scan/dictionnaire.json`, `src/features/analysis/attributes.ts`).
> Constat de départ : **le code a déjà dépassé les specs**. Les 3 documents décrivent la v1.0→v1.4
> (additif + offset par catégorie). Le moteur réel tourne en **v2.0 « métier »**
> (`algoVersion: "2.0.0-metier"`) : grilles par catégorie normalisées sur leur propre maximum,
> prérequis non compensatoires, sévérité/exposition par catégorie. Ce virage n'est documenté
> nulle part — je le prends comme le point de départ du débat, pas les vieilles specs.

## Ma position en une phrase

**La structure additive-plafonnée-normalisée par métier est la bonne famille (le débat
additif vs veto est déjà tranché par la recherche et globalement bien implémenté) — mais
je refuse de débattre des poids tant que trois trous plus graves ne sont pas nommés :
(1) le plafond non-compensatoire a un trou d'implémentation qui laisse repasser exactement
le biais qu'il devait tuer, (2) la normalisation par métier change ce que le chiffre *veut dire*
sans que rien à l'écran ne le dise, (3) le score PERSO — la moitié du sujet posé par la
question du débat — n'est câblé à AUCUN scan visage : tout le monde reçoit aujourd'hui le
même `profil.json` figé.**

---

## 1. Score FORMULE : la structure est correcte, mais le garde-fou n°1 a un trou

La recherche (`scan-scoring-structure.md` §5, reco n°1) dit : un risque de gravité 3 en position
forte doit **plafonner la bande, jamais être racheté par des bonus** — c'est le correctif
qui distingue notre système d'un additif pur façon Nutri-Score critiqué.

Le code l'implémente (`capRisque3Top5 = 49`, `capRisque3Ailleurs = 69`) — **mais seulement
pour le risque générique** (`f.risks.irritant` / `comedogenic`, boucle `scoreFormule` §3).
Or v2.0 a ajouté un DEUXIÈME canal de malus, les `penalites` par grille métier (ex. `sulfate`
en `cleanser`, `-9 × w(pos)`). Preuve dans le code (`scoring.mjs:465-479`) :

```js
for (const l of R.penalites || []) {
  const { pts } = evalueLigne(l, ctx);
  if (pts > 0) { score -= pts; /* ... */
    for (const it of list)
      if ((it.fiche?.fonctions || []).some((f) => cherchees.includes(f))) dejaFactures.add(it.name);
  }
}
// plus bas, le risque générique — et donc le cap — est SAUTÉ pour tout ingrédient déjà facturé :
if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name)) { /* ... cap = min(cap, ...) ... */ }
```

Conséquence concrète et vérifiable : un tensioactif agressif en position 1-5 dans un nettoyant,
même si le dictionnaire lui donne `risks.irritant = 3`, est retiré du calcul du `cap` parce qu'il
a déjà été « facturé » par la pénalité métier `sulfate`. Il ne peut donc **plus jamais** empêcher
le produit d'être vert — il paie juste ses points, rachetables par « no fragrance » + « gentle
surfactants ». C'est EXACTEMENT le trou que la recherche a identifié comme LE problème du
Nutri-Score pur, réintroduit par la couche métier qui n'existait pas quand la recherche a été
écrite. Le sulfate en tête de nettoyant n'est pas un détail : c'est le cas d'école du domaine.

**Ma demande** : soit les `penalites` de gravité "sévère" par grille (savon, sulfate top position)
alimentent le même `cap`, soit on documente explicitement que le cap ne couvre QUE l'axe
irritant/comédogène générique — et on accepte alors que la couche métier n'a pas de garde-fou
non compensatoire du tout. Aujourd'hui c'est un angle mort silencieux, pas un choix.

## 2. Normaliser par métier est juste en interne, trompeur à l'écran

`scoreFormule` divise chaque grille par SON PROPRE maximum théorique (`maxTheorique(R)`) :
« 90 » sur un nettoyant veut dire *« accomplit 90 % de ce qu'un nettoyant doit faire »*,
« 90 » sur un sérum veut dire *« accomplit 90 % de ce qu'un sérum doit faire »*. En interne
c'est la bonne équité (cf. §3bis-3 du spec v1 : « on compare les nettoyants aux nettoyants »).

Mais j'ai vérifié : **rien en aval n'affiche ce cadrage**. `moteur.ts`/`ficheIngredients` ne
renvoie même pas `metier` au consommateur de la fiche produit ; grep sur `overview.ts`/`avis.ts`/
`acces.ts` pour `metier` → zéro résultat. Deux produits à 90 (un nettoyant, un sérum) sortiront
un même chiffre nu, sans le contexte qui le rend vrai. Une utilisatrice comparera les deux comme
si « 90 » voulait dire la même chose. Le calcul est juste ; la communication ne l'est pas encore —
et sans elle, la jauge/étiquette produit un jugement faux par omission.

**Ma demande** : le champ `metier` (déjà calculé, déjà dans le retour de `scoreFormule`) doit
apparaître dans la fiche produit sous une forme du type « 90/100 comme nettoyant », pas « 90/100 »
tout court. Sinon la normalisation par grille n'est qu'une fiction interne.

## 3. Le score PERSO — le vrai sujet de la question posée — n'existe pas encore

La question du débat porte sur la note « à travers le profil de peau d'un utilisateur issu du
scan visage ». J'ai vérifié la couture réelle :

- `src/lib/scan/profil-utilisateur.ts` : `profilUtilisateur(uid)` ignore `uid` et renvoie
  **toujours** `data/scan/profil.json` — un profil unique, statique, écrit à la main
  (`"_note": "Profil réel de Jayen (2026-08-26)"`). **Zéro branchement au scan visage.**
- Le scan visage produit 16 attributs (`src/features/analysis/attributes.ts`) : `acne`,
  `comedones`, `post_acne_marks`, `pores`, `texture`, `flaking`, `tone_evenness`, `radiance`,
  `dark_spots`, `redness`, `shine`, `visible_vessels`, `fine_lines`, `wrinkles`,
  `under_eye_circles`, `under_eye_puffiness` — niveaux 1-4.
- Le moteur de score attend un `ProfilPeau` = `{ skinType, sensitivity(0-3), pregnancy, concerns:
  {famille: sévérité 1-3}, allergies[], strengthCeiling }`.

**Aucune fonction ne traduit l'un vers l'autre aujourd'hui.** Tant que cette couture n'existe pas,
tout raffinement des poids de `scorePerso` optimise une fonction qui ne recevra jamais de vraies
données utilisateur — on calibre dans le vide.

Et quand cette couture sera écrite, deux champs sont épistémologiquement dangereux à dériver
d'une SEULE photo :
- **`sensitivity`** (0-3) n'a pas de proxy visuel honnête. `redness`/`visible_vessels` mesurent
  une rougeur VISIBLE (couperose, érythème) — pas une propension à réagir à un ingrédient.
  La recherche compagne (`scan-scoring-recherche.md` §3.1, SkinSAFE/CAMP) est explicite : la
  seule personnalisation validée médicalement part d'un **patch-test ou d'un auto-déclaratif**,
  jamais d'une image. Faire de `sensitivity` un score dérivé de la photo, c'est fabriquer une
  précision qu'on n'a pas — le risque exact que `scan-scoring-structure.md` §4.2 reproche à la
  base 50 (« affiche une neutralité/confiance qu'on n'a pas mesurée »). **`sensitivity`,
  `allergies` et `pregnancy` doivent venir du questionnaire déclaratif, jamais du scan photo,
  même en soutien.**
- **`skinType`** a un proxy plus défendable (`shine` pour oily, `flaking`/`texture` pour dry) mais
  reste mieux corroboré en le croisant avec une question quiz (« ta peau tiraille-t-elle ? ») —
  la photo capte l'état du jour (peau qui brille après la salle de sport), pas le type de fond.

- **Trouvaille annexe, vérifiée dans les données** : la spec d'origine (`scan-scoring.md` §0)
  prévoyait 7 familles de bénéfices dont « éclat ». Le dictionnaire réel en a 7 aussi (recompté :
  `dehydration, aging, blemishes, oiliness, barrier, redness, spots`) mais ce n'est PAS la même
  liste — voir addendum n°2 ci-dessous. Zéro occurrence
  d'« éclat »/« radiance »/« brightening »). Or `radiance` (teint terne) est un des 16 attributs
  du scan visage. **Même une couture profil parfaite ne pourra jamais transformer « mon teint
  est terne » en un match produit** : la famille de bénéfice n'existe nulle part dans le
  dictionnaire pour l'accueillir. C'est un trou de contenu, pas de structure — mais il limite la
  précision annoncée avant même qu'on discute des poids.

## Ce que je ne veux PAS relitiger

Le débat additif-pur vs plafond-veto est déjà tranché par `scan-scoring-recherche.md` §1.3
(consensus de fait : les systèmes matures sont hybrides) et par le code (`capRisque3*`,
`plafondMalusParfum`, prérequis "ticket d'entrée"). Je ne rouvrirai ce point que si quelqu'un
propose de revenir à un additif pur ou à un veto pur façon EWG — les deux sont hors-jeu par la
recherche elle-même.

## Ce que j'attaque d'avance

Si sud/est/ouest proposent d'affiner `bonusActif`, `plafondBonus`, ou tout autre poids sans
d'abord traiter (1) le trou du cap, (2) l'affichage `metier`, ou (3) la couture profil manquante —
je considérerai que c'est optimiser un détail pendant que la fondation a un trou et un mur
manquant. Poids et calibration viennent APRÈS, comme le dit d'ailleurs le journal de calibration
du 26/08 lui-même (« les poids ci-dessus sont le point de départ, pas la vérité révélée »).

## Addendum après lecture de sud / est / ouest

**Correction** : j'ai compté 6 familles de bénéfice dans le dictionnaire, est en compte 7
(`dehydration, aging, blemishes, oiliness, barrier, redness, spots` — j'avais mal recompté ma
propre requête node). Le chiffre juste est 7, et le point substantiel survit intact : « éclat »
n'y est pas, et est va plus loin en montrant que 5 des 16 attributs du scan (pores, texture,
radiance/dullness, cernes, poches) n'ont AUCUNE famille en face côté dictionnaire. J'adopte son
chiffre (5/16) plutôt que le mien.

**Convergence à noter** : nord, sud, est, ouest arrivent séparément au même constat n°1 (profil
statique = le vrai goulot d'étranglement du perso) sans s'être concertés au préalable — c'est le
signal le plus solide de tout le débat.

**Nouveau point, en synthèse avec ouest §3 et le catalogue de sud** : ouest loue `R.severite`/
`R.exposition` (pondération par sévérité de zone × exposition) comme un vrai différenciateur.
Vérifié : ces deux champs sont un attribut FIXE de la catégorie (`RUBRIQUES[categorie].severite`),
pas une propriété déduite du produit comme l'est `natureProduit()` pour la richesse/texture.
Deux conséquences : (a) `exposition` n'existe que sur 4 des 11 catégories (cleanser 0.55,
makeup-remover 0.5, exfoliant 0.85, mask 0.7 — les 7 autres restent à 1 par défaut, y compris
« toner » qui est pourtant appliqué puis souvent essuyé) ; (b) toute la valeur de ce
différenciateur — comme toute la grille métier — dépend entièrement de la justesse de la
CATÉGORIE assignée en amont (`categorise.mjs`), pas seulement de l'INCI. Un produit mal
catégorisé n'hérite pas seulement du mauvais barème de mérites, il hérite aussi du mauvais
multiplicateur de sévérité/exposition — l'erreur se double. C'est exactement l'effet de bord que
le journal v1.3 de `scan-scoring.md` avait identifié à la génération précédente
(« une MAUVAISE catégorie devient une erreur de note ») et qui reste entièrement d'actualité en
v2.0, en pire.

**À sud** : ta taxonomie à 4 niveaux range explicitement le risque « dose-dépendant à effet
universel » dans le camp FORMULE + cap non-compensatoire, « non négociable ». Le tensioactif
agressif (sulfate) coché `tensioactif-agressif` dans le dictionnaire est le cas manuel de ce
camp (cf. `scan-scoring-recherche.md` §3.2, SLS = irritant de référence des patch-tests). Or il
échappe au cap via `dejaFactures` (mon point 1). Peux-tu confirmer que par TA propre taxonomie,
c'est un bug et pas un choix ?

**À ouest** : avant d'accepter le cap comme « déjà solide, je ne le remets pas en cause », vérifie
mon point 1 dans le code (`scoring.mjs` ~465-501) — le cap ne voit pas les `penalites` métier.

**À est** : accord complet sur ton point 1 (scan → `concerns` seulement ; `skinType`/
`sensitivity`/`pregnancy`/`allergies` restent déclaratifs) et sur ton point 3 (pas de malus
hors-sujet — le « bug 2 » du doc partagé n'est pas un bug, c'est une conséquence directe et
voulue du choix v1.2 déjà motivé par l'utilisateur, il se réduit au bug 1). Sur ton point 4
(`strength` vide) : proposition de milieu — peupler un palier grossier pour les familles à
plafond réglementaire connu et documenté dans `scan-scoring-recherche.md` §4.4 (rétinoïdes,
BHA/AHA forts, benzoyl peroxide, hydroquinone, acide kojique) via nom + position, sans prétendre
connaître le vrai pourcentage ; je concède ton point que le cumul inter-produits (routine) est
hors du périmètre d'un score PAR produit.

## Addendum n°2 — corrections après vérification code par alice (hors roster officiel, mais
## vérification factuelle acceptée)

**Je corrige mon point 1 (trou du cap) à la baisse, sur l'urgence, pas sur le fond.** Vérifié :
avec le dictionnaire livré aujourd'hui, aucun sulfate (SODIUM LAURYL/LAURETH/AMMONIUM LAURYL
SULFATE) n'atteint `irritant: 3` — ils sont à 2 — donc ils n'auraient de toute façon jamais
déclenché le cap, `dejaFactures` ou pas. Seuls 4 ingrédients sur 3 165 atteignent gravité ≥ 3
(huile de germe de blé, hydroquinone, triclosan), et aucun ne recoupe une fonction couverte par
une ligne `penalites` (qui n'existe que sur 2 grilles/11 : cleanser, makeup-remover). **Verdict
correct : c'est un invariant non gardé (mine dormante), pas un biais qui corrompt déjà un score
en prod aujourd'hui.** Je retire mon « cas d'école du domaine » — trop fort. Je maintiens
néanmoins qu'il faut corriger MAINTENANT, pendant que `penalites` ne touche que 2 grilles :
(a) la recherche (`scan-scoring-recherche.md` §3.2) qualifie le SLS d'« irritant de référence de
la dermatologie », ce qui questionne justement le `irritant: 2` du dictionnaire — une seule
recalibration à la hausse réveille l'invariant ; (b) chaque nouvelle grille métier avec
`penalites` (probable pour exfoliant/traitement) agrandit la surface du trou.

**J'accepte l'extension de mon point 3** : le funnel (`src/features/funnel/questions.ts`) collecte
déjà `pregnancy` et une condition diagnostiquée (rosacée/eczéma) en q7 — donc `pregnancy` a une
porte d'entrée déclarative existante, contrairement à ce que je laissais entendre (pas à
inventer). Mais `allergies` n'apparaît nulle part dans le funnel, et surtout : **aucune fonction
ne relie non plus le questionnaire au `ProfilPeau`** — la couture manque des DEUX côtés (scan→
profil ET quiz→profil), pas seulement côté scan comme je le formulais.

**Je règle le désaccord de comptage (demande du lead) : 7, confirmé par un script propre**
(`Object.values(dictionnaire).flatMap(benefits)` → `Set` de taille 7). Mon « 6 » était une
erreur de lecture de ma propre sortie console. Et le trou est plus profond que je ne le disais :
vs la liste d'origine de `scan-scoring.md` §0 (hydratation, anti-imperfections, apaisant,
barrière, **éclat**, anti-âge, **protection UV**), DEUX familles ont disparu (éclat, protection
UV) et DEUX nouvelles sont apparues sans être prévues (oiliness, spots) — le total tombe à 7 par
coïncidence de comptage, la dérive de composition est réelle. Ça renforce ma conclusion
(radiance n'a toujours aucun foyer côté dictionnaire) sans rien lui retirer.
