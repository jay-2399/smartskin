# Notes randy — brancher le profil réel sur le moteur V2

Notes d'enquête, pas le plan. Tout ce qui suit a été lu dans le code ou mesuré sur le
catalogue réel (3 152 produits notables sur les 3 232 de `data/scan/catalog.json`).
Bancs d'essai jetables : `scratchpad/exp*.mjs` (aucune écriture dans `src/` ni `data/`).

---

## 1. Ce que `scorePerso` demande vraiment

Lecture ligne à ligne de `src/lib/scan/scoring.mjs:541-655`. Le profil n'est touché qu'en
9 endroits, et rien d'autre n'est lu :

| champ | ligne | usage exact | forme attendue |
|---|---|---|---|
| `pregnancy` | 557 | `capAbsolu = min(…, 15)` si un ingrédient `pregnancyFlag` | booléen |
| `allergies` | 561 | `it.name.includes(a.toUpperCase())` → `capAbsolu = 10` | `string[]` de fragments INCI |
| `concerns` | 569 | `sev = concerns[b]` puis `pts = min(3.5 × sev × w, 10)` | `Record<famille, number>` |
| `sensitivity` | 583, 590, 604 | malus sensibilisant × `sensitivity/3` ; malus parfum × `sensitivity` ; malus HE si ≥ 2 | 0-3 |
| `skinType` | 595, 600, 621 | comédogène si `["oily","combination"]` ; alcool si `"dry"` ; `CONFIG.richesse[nature][skinType]` | **anglais**, 4 valeurs |
| `strengthCeiling` | 613 | `max(0, strengthMax − ceiling) × −5` | 1-4 |

`avoid` n'est lu **nulle part** — ni dans `scoring.mjs`, ni dans `avis.ts`, ni dans
`overview.ts`. Champ mort, présent seulement dans `PROFIL_NEUTRE` et `profil.json`.

Deux autres consommateurs du **même objet**, faciles à oublier :
- `avis.ts:100` `pourProfil` — lit `skinType` (segments d'avis) et les **clés** de `concerns`
  (`LIBELLE_SOUCI` ligne 66 : les 7 mêmes familles).
- `overview.ts:106` `overviewPour` — lit `skinType` et les clés de `concerns` pour le prompt.
- `moteur.ts:117` `ficheIngredients` — lit `skinType`, `sensitivity`, `pregnancy`, `concerns`.

## 2. Vocabulaires : trois échelles à raccorder

**Familles de bénéfice** — comptées dans `data/scan/dictionnaire.json` (3 165 entrées,
1 572 actifs) : `aging` 547, `dehydration` 453, `redness` 353, `barrier` 213, `spots` 132,
`blemishes` 118, `oiliness` 72. Il n'y en a **pas d'autre**. `avis.ts:66` liste exactement
les mêmes 7 → une seule table de correspondance sert les deux.

**Type de peau** — `result.profile.skinType` est une chaîne libre. Le prompt
(`analysis/prompt.ts:92`) est passé à l'anglais et demande « Oily / Combination / Normal /
Dry », avec « sensitive » **ajouté** au libellé (« Normal, sensitive »). Les anciennes
lignes sont en français (« Mixte »). `normalizeSkinType` (`profile.ts:31`) absorbe les deux
et rend une clé **française** : grasse / seche / mixte / normale / sensible.
`scorePerso` veut l'**anglais** et n'a aucune entrée `sensitive` dans `CONFIG.richesse` :
lui passer `"sensitive"` ferait retomber sur `?? 0` sans erreur → tout le jugement
d'adéquation de texture disparaîtrait en silence.

**Force** — `strength` dans le dictionnaire vaut 0 (3 035 entrées), 1 (114), 2 (14), 3 (2).
`EngineProfile.strengthCeiling` vaut 1-4. Les deux échelles sont déjà compatibles :
aucune conversion, `ceiling = 4` signifie « rien n'est trop fort », ce qui est exact.

## 3. La mesure qui change tout : le branchement naïf fait saturer le score

`scorePerso` part de `F.score` (déjà borné à 100) et **ajoute** jusqu'à
`CONFIG.plafondMatchs = 30`. Le bouchon `profil.json` déclare 2 préoccupations ; un vrai
bilan en produit 5 à 7. Avec la table de correspondance appliquée telle quelle
(toute famille dont un attribut est à `level ≥ 2`, `sev = level − 1`) :

| profil de test | familles | % du catalogue à 100/100 | ex æquo au rang 1 des sérums |
|---|---|---|---|
| `profil.json` (bouchon) | 2 | 1,2 % | 16 |
| `sample.ts` (mixte légère) | 5 | 2,0 % | 25 |
| `exclusive.ts` (acné sévère) | 5 | **12,0 %** | **111** |
| `exclusive2.ts` (barrière HS) | 7 | 9,8 % | 91 |
| mature (taches + rides) | 7 | 7,5 % | 65 |

111 sérums strictement à égalité à 100/100. Le tri de `alternatives/route.ts:31`
(`b.perso - a.perso || b.formule - a.formule`) retombe alors sur la note formule : les
« 3 meilleurs pour ta peau » redeviennent « les 3 meilleurs », pour tout le monde.
Vérifié : sérum, toner, masque et contour des yeux rendent le **même top 3** pour six
profils différents.

Et c'est régressif à l'envers : **plus la peau est abîmée, plus le score sature**. Ceux qui
ont le plus besoin d'être départagés le sont le moins.

## 4. Le correctif tient dans la couche de branchement

Deux règles, aucune ligne de `scoring.mjs` touchée :

1. **Au plus 3 familles**, dans l'ordre déjà défini par le produit — `EngineProfile.concerns`
   (q1 déclaré d'abord, puis détecté ≥ 3), complété par les besoins gradués triés comme
   `topConcerns` (IMPORTANCE × niveau). 3 est déjà la doctrine maison : `q1.maxSelect = 3`,
   `topConcerns(result, 3)`, `verdict.plan` à 3 entrées.
2. **Budget de sévérité PLAFONNÉ à 4** : `sev = level − 1` (1-3), et on ne renormalise au
   prorata **que si Σ > 4**. Σ = 4 n'est pas arbitraire : c'est le budget de `profil.json`
   (`{blemishes: 2, oiliness: 2}`), le profil sur lequel le moteur a été calibré le 26/08.

   > **Corrigé après contradiction de bob.** J'avais d'abord proposé une renormalisation
   > **systématique** à Σ = 4. Elle écrase la sévérité absolue dès qu'une seule famille
   > survit : `{blemishes: 1}` (acné légère) et `{blemishes: 3}` (acné sévère) deviennent
   > tous deux `{blemishes: 4}` — moyenne 69,4 sur les 3 152 produits dans les deux cas,
   > identique au dixième. Avec le plafond : 66,4 contre 69,4. Et pour les profils sévères
   > les deux modes sont **identiques** (leur Σ brut dépasse 4 de toute façon : excl1 vaut
   > 3+2+2 = 7) — la renormalisation systématique ne servait donc à rien là où le problème
   > de saturation avait été mesuré, et faisait du dégât là où il n'y en avait pas.
   > Le plafond améliore aussi la saturation sur les peaux calmes : sample 2,2 % → 1,1 %,
   > peau nette 3,0 % → 0,4 %, priorité déclarée sans signe visible 1,1 % → 0,0 %.
   > Coût assumé : la différenciation des top-3 passe de 9,6 à 8,7 produits distincts par
   > catégorie (8 profils, max 24) — c'est le prix correct, une peau presque nette a
   > réellement moins à personnaliser.

Les sévérités fractionnaires ne cassent rien : tous les consommateurs testent `v > 0`
(`avis.ts:115`, `overview.ts:98`, `ficheIngredients` `utile`), et `scorePerso` ne s'en sert
que comme multiplicateur.

Comparatif mesuré (différenciation = produits distincts dans les top-3 de 4 profils, max 12) :

| variante | différenciation | % à 100 (sample/excl1/excl2/mature) | lignes « why » (bouchon : 1,23, dont 0,49 de matchs) |
|---|---|---|---|
| brut ≥ 2, tout (naïf) | 5,4 | 2,0 / 12,0 / 9,8 / 7,5 | 1,37 / 3,11 / 4,04 / 3,45 |
| tout ≥ 2, normalisé Σ=4 | 6,9 | 1,2 / 1,5 / 0,6 / 0,6 | **matchs ≈ 0,00-0,17 → panneau vide** |
| top-3 brut + `plafondMatchs` 12 | 6,8 | 0,6 / 2,7 / 1,2 / 0,8 | exige de toucher `CONFIG` |
| **top-3 + Σ plafonné à 4** | 8,7 (8 profils) | 1,1 / 2,7 / 0,8 / 0,9 | 1,17 / 2,26 / 3,36 / 2,25, matchs 0,43-0,76 |

Attention en lisant la colonne différenciation : les trois premières lignes portent sur
4 profils (maximum théorique 12), la dernière sur 8 (maximum 24). Les chiffres ne se
comparent qu'à l'intérieur d'un même jeu de profils ; sur les 8 profils, la variante retenue
donne 8,7 contre 9,6 pour la renormalisation systématique, et c'est le seul axe sur lequel
elle est en retrait.

Le piège que j'ai failli recommander : la normalisation **seule** règle la saturation mais
fait passer chaque match sous le seuil d'affichage `Math.abs(points) >= 3` de
`factsAffiches` (`scoring.mjs:652`). Score personnalisé, explication vide. Le plafond à 3
familles garde les sévérités au-dessus du seuil.

**Limite honnête, mesurée aussi** : même après correction, le **meilleur** produit de la
plupart des catégories reste à 100 (sérum, hydratant, masque, toner). Le rang 1 ne
discrimine pas ; c'est la **composition du top 3** qui bouge (hydratants et nettoyants :
6 top-3 différents pour 6 profils). Le critère de recette doit donc porter sur le top 3,
pas sur le n° 1, et « le meilleur sérum est le même pour tout le monde » n'est pas un échec.

## 5. Pièges trouvés en plus de celui annoncé

- **`allergies` doit rester vide.** Verser q2 dedans est tentant et faux :
  `scorePerso:561` teste `it.name.includes(a.toUpperCase())` puis applique `capAllergie: 10`.
  « fragrance » matcherait littéralement l'INCI `FRAGRANCE`/`PARFUM` → **836 produits,
  26,5 % du catalogue, plafonnés à 10/100**. q2 déclare une irritation, pas une allergie, et
  le parfum a déjà son canal (`malusParfumSensible × sensitivity`).
- **`overview/route.ts` n'a aucun `try/catch`** (lignes 14-25) — seule des cinq routes qui
  appellent `profilUtilisateur` dans ce cas. Donc `profilUtilisateur` ne doit jamais jeter.
  Et `/api/scan:30` écrit littéralement `answers: answers ?? {}` : un `answers` vide ferait
  planter `buildEngineProfile` sur `answers.q1.flatMap`.
- **`deriveBucket` n'ouvre jamais q5.** « Rougeurs / sensibilité : nouvelles réactions » est
  un signal de réactivité déclaré qui n'atteint aujourd'hui aucun calcul.
- **`Q1_CONCERNS.blemishes` se déplie en `post_acne_marks`** : passer par cette table pour
  le plancher des priorités déclarées crée une préoccupation « taches » fantôme chez
  quelqu'un qui n'a coché que « acné ». Il faut une table q1 → **famille** directe.
- **Cernes et poches sont des orphelins irréductibles.** Aucune famille ne les couvre, et
  `CAFFEINE` est fiché `benefits: ["redness"]` : router les cernes vers `redness` ferait
  dire « ce produit cible tes rougeurs » sur un contour des yeux et gonflerait la note de
  tous les apaisants. Corollaire à assumer : la priorité q1 `eye_area` n'a aucun effet sur
  la note.
- **`moteur.ts:28` `_profil`** est le singleton qui mémorise `profil.json`. Ne jamais y
  ranger un profil d'utilisateur.
- **`SS.historique`** (`public/scan-proto/commun/app.js:539-562`) stocke `{formule, perso}`
  par produit, cap 50, sans horodatage du bilan : après un nouveau scan visage, ces `perso`
  sont ceux de l'ancienne peau et personne ne les invalide.
- **`overview.ts:96-98`** est déjà correct : sa clé de cache inclut une empreinte de profil
  qui correspond exactement aux entrées du prompt. À ne pas casser, juste à borner en taille.
- **Le bouchon masque un bug de vocabulaire dans `overview.ts`.** `LIBELLE_SOUCI`
  (lignes 36-40) porte encore l'ancienne taxonomie à 11 clés de §4.4, pas les 7 familles.
  Croisement des trois listes du code :

  | famille | `scoring.mjs` `libelle()` | `avis.ts:66` | `overview.ts:36` |
  |---|---|---|---|
  | blemishes, oiliness, dehydration, redness, barrier | ok | ok | ok |
  | **aging** | ok | ok | **manque** |
  | **spots** | ok | ok | **manque** |

  `LIBELLE_SOUCI[k] || k` → le prompt d'Anthropic recevra « Flagged concerns: aging, spots ».
  Et les deux seules préoccupations du bouchon (`blemishes`, `oiliness`) sont exactement les
  deux qui existent dans les trois listes : le profil écrit à la main le 26/08 a, par hasard,
  le sous-ensemble qui ne révèle rien. `aging` et `spots` sortent dans 5 de mes 8 profils
  de test. À aligner sur les 7 familles en même temps que le branchement — ça ferme §4.4
  dans le seul fichier qui l'a encore.
- **Libellés à corriger si grain/éclat vont vers `aging`** : `scoring.mjs:657`
  `libelle('aging') = "fine lines"` et `avis.ts:66` `aging: "Fine lines & firmness"`
  feraient dire « cible tes ridules » à quelqu'un de 22 ans dont le problème est le grain.
  Trois chaînes vers un mot de renouvellement, aucune logique touchée.

## 6. L'abonné qui a payé sans bilan — le chemin actuel l'envoie au paywall

`06-result-premium.html:1225` : si `score.perso` manque → `location.replace("03-result-free.html")`.
Le CTA de cet écran (`03-result-free.html:398`) appelle `SS.moi()` et, si connecté avec un
tunnel déjà fait, va au **paywall**. On enverrait donc un abonné payant repayer.
`/api/moi` ne rend que `connecte` / `premium` : le front est aveugle à l'existence d'un bilan.

Position : jamais de profil par défaut — ce serait le bug qu'on corrige, en pire, puisque la
peau inventée serait servie à quelqu'un qui a payé pour la sienne.

## 7. Ce que je ne referais pas

Une seconde dérivation du profil depuis `result`/`answers`. `buildEngineProfile` tourne déjà
en production et porte la définition maison de la tolérance (`deriveBucket`, `derivePhase`,
`strengthCeiling`). Deux dérivations parallèles finiraient par se contredire : « ta barrière
est fragile, va doucement » côté routine, un rétinol à 92/100 côté produit.

## 8. Ligne de base pour la recette

`npx vitest run` avant tout changement : **29 fichiers, 188 tests, tout au vert, 8,9 s**.
Convention maison pour un script de vérification : `scripts/*.mjs` (36 scripts existants),
lancé à la main, pas dans `package.json`.

Précédent utile pour les tests unitaires de l'adaptateur :
`src/features/recommendation/__tests__/profile.test.ts` fabrique un `AnalysisResult`
complet depuis `ATTRIBUTES` avec des surcharges de niveau — exactement le gabarit dont
l'adaptateur a besoin.

## 9. Correction de mes propres chiffres (fin d'enquête)

**Le « 5,4 → 8,7 » que j'ai d'abord annoncé n'était pas comparable** (4 profils contre 8).
Rejoué sur les mêmes 8 profils :

| | branchement naïf | top-3 + Σ ≤ 4 |
|---|---|---|
| % du catalogue à 100/100, au pire | **12,0 %** | **2,7 %** |
| ex æquo au rang 1 des sérums, au pire | **111** | **29** |
| distincts dans les top-3 par catégorie (max 24) | 7,2 | 8,7 |
| catégories dont le top-3 diffère entre ≥ 2 profils | 10/10 | 10/10 |

Conséquence sur l'argumentaire : le branchement naïf **différencie déjà les 10 catégories**.
Ce que la règle achète est uniquement la **saturation** — le score garde son échelle. C'est
plus étroit que ce que je défendais, et le plan le dit désormais ainsi.

Le seuil de recette que j'avais proposé (« ≥ 6 catégories sur 10 différenciées ») ne
protégeait donc rien : 10/10 y compris en naïf. Remonté à 10/10.

## 10. Le piège qui a failli me faire publier des chiffres faux

`scoring.mjs:12` fait `path.join(process.cwd(), "data", "scan")`. Lancé depuis un autre
répertoire que la racine du dépôt, le moteur ne trouve pas le dictionnaire et **dégrade en
silence** : plus aucun `fiche`, zéro match, tous les scores retombent vers la base. J'ai
obtenu des tableaux d'apparence cohérente — moyennes stables, écarts plausibles — et
entièrement faux ; je ne l'ai vu qu'en remarquant que deux variantes censées différer
rendaient le même chiffre au dixième. Symptôme : moyenne perso autour de 44-48 au lieu de
65-70.

Un script de recette doit donc commencer par `if (!moteurDisponible()) throw`. Sans ça,
**les seuils passent d'autant plus facilement que le moteur est cassé** : 0 % du catalogue
à 100, 0 ex æquo, tout au vert.

## 11. Ce que le débat a corrigé chez moi (récapitulatif)

Quatre de mes positions sont tombées sous la contradiction de bob, toutes vérifiées de mon
côté avant d'être concédées :

1. **Σ = 4 systématique → Σ PLAFONNÉ à 4** (§4 ci-dessus). Ma version écrasait la sévérité
   absolue : acné légère et acné sévère, même note.
2. **Mon ordre de sélection des 3 familles était faux.** Je plaçais toutes les familles
   déclarées en q1 devant tout le mesuré. Sur `exclusive.ts` (`acne: 4`) avec
   `q1 = ["hydration","fine_lines"]`, ma règle rendait `{dehydration:1, barrier:1, aging:2}` —
   **`blemishes` absent**. Remplacée par une liste unique triée par sévérité, mesuré avant
   déclaré à égalité.
3. **Plancher des priorités déclarées : 1 → 2.** Sous la règle de tri ci-dessus, un plancher
   à 1 met le déclaré à égalité avec tout signal mesuré de niveau 2 et il perd le départage :
   cocher une priorité ne fait alors **rien** pour presque tout le monde. Mesuré sur
   `sample.ts` + « Fine lines » : à 1, `aging` n'entre même pas dans les 3.
4. **Mon estampille de `ss-historique` → une route de recalcul.** Elle dépersonnalisait
   l'historique juste après un re-scan, et ne pouvait rien pour le cinquième cache.

Et **un cache que j'avais manqué** : `Protocol.products` via `PUT /api/shelf`
(`shelf/route.ts:18` et 47) stocke `perso` **en base**, donc il traverse les appareils, et
`18-bilan.html:549-552` le réaffiche. C'est le pire des cinq et il n'a aucun commentaire
d'avertissement.

Ce que bob a concédé de son côté : son plafond à 4 familles (bon diagnostic, mauvais remède —
il laissait 75 sérums ex æquo), et son objection architecturale contre la réutilisation de
`buildEngineProfile`.

Un point de méthode partagé : nous avons chacun produit **un jeu de mesures cohérent et faux**
(sa regex sensible à la casse sur des INCI en Title Case ; mon `cwd`). Dans les deux cas
l'alerte n'est pas venue du chiffre mais d'une **contradiction interne** — d'où le second
garde-fou du script de recette.

## 12. Le plantage que le plan a failli introduire

Trouvé par bob en relisant le plan, reproduit et élargi ici.

Mon §1.2 proposait `{ ...EMPTY_ANSWERS, ...(row.answers ?? {}) }`. Un spread ne protège que le
**premier niveau**, et seulement contre l'absence :

| stocké | résultat |
|---|---|
| `{}` | ok |
| `{q5:{changed:true}}` | `TypeError … reading 'includes'` (objet partiel : `symptoms` disparaît) |
| `{q1:"blemishes"}` | `TypeError: a.q1.flatMap is not a function` |
| `{q7:null}` | `TypeError … reading 'includes'` (un `null` explicite écrase le défaut) |

Ce qui rend le cas intéressant : **le plan créait lui-même le risque**. J'avais établi que
`deriveBucket` n'ouvre jamais q5 ; mes planchers q5 (§3.1 et §4.3) en faisaient les premiers
lecteurs — dans une fonction dont j'avais écrit qu'elle ne doit jamais jeter, appelée par la
seule route sans `try/catch`. La chaîne allait de bout en bout : donnée mal formée → 500.
Corriger un trou de lecture avait ouvert un chemin de plantage.

## 13. La base locale, que ni l'un ni l'autre n'avait ouverte

`prisma/dev.db` contient **5 lignes `Analysis`** (seed e2e, pas la production) :

- `result.attributes` en compte **3 à 5, pas 16** — `AnalysisResultSchema` déclare
  `z.array(...)` sans longueur minimale, donc un bilan partiel passe `safeParse`. C'est la
  forme *courante* en base, pas un cas limite.
- `answers.age` vaut le **nombre** `28`, alors que le type déclare `string | null` avec des
  valeurs comme `"25_34"`. Personne ne le lit, donc rien ne casse — mais c'est la preuve
  empirique que `answers` en base n'est pas conforme à son type.
- leur `skinType` est **« Mixte »** : le chemin français de `normalizeSkinType` est de la
  donnée vivante, pas une compatibilité héritée théorique.

Leçon de méthode : nous avons écrit tout le dossier — table de correspondance, mesures,
inventaire des caches — avant que l'un de nous ouvre la base. Elle était à un `SELECT` de
distance et elle a corrigé trois hypothèses.
