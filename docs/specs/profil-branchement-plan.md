# Brancher le profil de peau réel sur le moteur de notation V2 — plan

Produit du débat randy × bob (2026-09-01). Tout ce qui suit a été lu dans le code ou mesuré
sur le catalogue réel (3 152 produits notables sur 3 232). Ce document tranche ; ce qui reste
un choix produit est isolé dans la dernière section, et rien d'autre n'est laissé ouvert.

**Le problème** : `profilUtilisateur(uid)` ignore l'`uid` et renvoie `data/scan/profil.json`,
un profil écrit à la main le 26/08. Les 6 comptes premium reçoivent tous la peau de Jayen.

**La conclusion la plus importante de l'enquête** : brancher la vraie donnée est facile, mais
la brancher **telle quelle casse le score**. Le bouchon déclare 2 préoccupations ; un vrai
bilan en produit 5 à 7, et `scorePerso` part de la note formule (déjà bornée à 100) en y
**ajoutant** jusqu'à 30 points de matching. Mesuré sur le catalogue entier :

| profil | familles | % du catalogue à 100/100 | ex æquo au rang 1 des sérums |
|---|---|---|---|
| `profil.json` (bouchon actuel) | 2 | 1,2 % | 16 |
| bilan `exclusive.ts` (acné sévère) | 5 | **12,0 %** | **111** |
| bilan `exclusive2.ts` (barrière abîmée) | 7 | 9,8 % | 91 |

111 sérums strictement à égalité à 100/100 : le tri de `alternatives` retombe alors sur la
note formule et les « 3 meilleurs pour ta peau » redeviennent « les 3 meilleurs », pour tout
le monde. Et c'est régressif à l'envers — **plus la peau est abîmée, plus le score sature**.

Un score dont un huitième du catalogue touche le plafond ne note plus, il tamponne. Le plan
corrige ce défaut **entièrement dans la couche de branchement** : aucune valeur de `CONFIG`
n'est modifiée, aucune formule n'est retouchée, la calibration reste fermée et
`notation-debat.md` avec elle. Les seules lignes de moteur que le plan ouvre sont **trois
recherches de libellé** (§8.2), une par fichier, chacune avec son repli existant conservé.

---

## 1. Les fonctions : quoi, où

Trois couches, une responsabilité chacune. On ne réécrit **pas** de seconde dérivation du
profil : `buildEngineProfile` tourne déjà en production et porte la définition maison de la
tolérance (`deriveBucket`, `derivePhase`, `strengthCeiling`). Deux dérivations parallèles
finiraient par se contredire — « ta barrière est fragile, va doucement » côté routine, un
rétinol à 92/100 côté produit.

```
Analysis (base)  →  buildEngineProfile()  →  versProfilPeau()  →  scorePerso()
   result             EngineProfile            ProfilPeau         avisPour()
   answers            (existant, inchangé)     (NOUVEAU, pur)     overviewPour()
                                                                  ficheIngredients()
```

### 1.1 `src/lib/scan/profil-peau.ts` — NOUVEAU, pur, sans I/O

Aucun import serveur (pas de `db`, pas de `fs`) : c'est ce qui le rend testable unitairement
et impossible à faire planter en production.

```ts
export const FAMILLES = ["blemishes","oiliness","dehydration","barrier","redness","aging","spots"] as const;
export type Famille = (typeof FAMILLES)[number];

export type ProfilPeau = {
  skinType: "oily" | "combination" | "dry" | "normal";  // TEXTURE seule, jamais "sensitive"
  sensitivity: 0 | 1 | 2 | 3;
  strengthCeiling: number;                              // 1-4, tel quel depuis EngineProfile
  concerns: Partial<Record<Famille, number>>;           // au plus 3 clés, Σ ≤ 4
  libelles: Partial<Record<Famille, string>>;           // le mot à AFFICHER par famille — §8.2
  pregnancy: boolean;
  allergies: string[];                                  // TOUJOURS [] en v1 — voir §4.6
};

/** L'unique traduction bilan → profil moteur. Déterministe, ne jette jamais. */
export function versProfilPeau(result: AnalysisResult, answers: Answers): ProfilPeau;
```

Fonctions internes (non exportées sauf pour les tests) : `familleDe`, `Q1_FAMILLE`,
`textureDe`, `sensibiliteDe`, `concernsDe`.

**Deux types, pas un** — et c'est nécessaire, pas décoratif :

```ts
/** Ce qu'on PRODUIT : strict, complet, toujours cohérent. */
export type ProfilPeau = { … ci-dessus … };

/** Ce que les consommateurs ACCEPTENT : tout optionnel, `skinType` en chaîne libre.
 *  C'est exactement le type anonyme déclaré aujourd'hui à `moteur.ts:109`, déplacé ici. */
export type ProfilLu = {
  skinType?: string; sensitivity?: number; pregnancy?: boolean;
  concerns?: Record<string, number>;
};
```

Sans cette paire, `ficheIngredients(inci, dico, pr)` ne compile plus : il reçoit soit un
`ProfilPeau`, soit `PROFIL_NEUTRE`, dont le `skinType: ""` n'appartient pas à l'union stricte.
`ficheIngredients`, `avisPour` et `overviewPour` prennent `ProfilLu` ; `versProfilPeau` rend
`ProfilPeau` ; `PROFIL_NEUTRE` satisfait `ProfilLu` sans être modifié. Le type anonyme de
`moteur.ts:109` disparaît au profit de l'import — une seule définition, dans le fichier qui
la produit.

### 1.2 `src/lib/scan/profil-utilisateur.ts` — RÉÉCRIT, c'est lui qui fait l'I/O

```ts
export type EtatProfil = "ok" | "aucun-bilan" | "indisponible";
export type Resolution =
  | { etat: "ok"; profil: ProfilPeau }
  | { etat: "aucun-bilan" | "indisponible"; profil: typeof PROFIL_NEUTRE };

export async function profilUtilisateur(uid: string | null): Promise<Resolution>;
export function oublierProfil(uid: string): void;   // appelé par POST /api/scan
export function cleProfil(p: ProfilPeau): string;   // empreinte de cache, voir §5
```

Corps, dans cet ordre exact :

1. `if (!uid) return { etat: "aucun-bilan", profil: PROFIL_NEUTRE }`
2. mémo par `uid` (§5.1) — si frais, on rend.
3. `db.analysis.findFirst({ where: { userId: uid }, orderBy: { createdAt: "desc" }, select: { answers: true, result: true } })`
   dans un `try/catch`. Toute exception → `{ etat: "indisponible", profil: PROFIL_NEUTRE }`.
   `photoData` n'est **pas** sélectionné : c'est une data URL base64 en base, la charger à
   chaque consultation de fiche produit serait absurde.
4. pas de ligne → `{ etat: "aucun-bilan", profil: PROFIL_NEUTRE }`.
5. `AnalysisResultSchema.safeParse(row.result)` — échec → `"indisponible"`. C'est déjà ce que
   fait `/api/moi/bilan:32`, on reprend le même garde-fou.
6. `answers` : **normalisation champ par champ**, jamais un spread. Détail ci-dessous.
7. `versProfilPeau(...)`, mise en cache, `{ etat: "ok", profil }`.

**Cette fonction ne doit jamais jeter.** `overview/route.ts` (lignes 14-25) est la seule des
cinq routes appelantes sans `try/catch` : une exception y remonte non rattrapée.

#### `normaliserAnswers()` — champ par champ, et c'est obligatoire

`/api/scan:30` écrit littéralement `answers: answers ?? {}` et **ne valide rien**. Il n'existe
aucun schéma zod pour `Answers`, contrairement à `AnalysisResult`. Ce qui est stocké n'est donc
pas garanti conforme au type — confirmé sur la base locale, où `answers.age` vaut le **nombre**
`28` alors que le type déclare `string | null` avec des valeurs comme `"25_34"`.

Un spread `{ ...EMPTY_ANSWERS, ...row.answers }` ne suffit pas. Il casse sur **trois** formes,
toutes reproduites :

| ce qui est stocké | résultat |
|---|---|
| `{}` | ok |
| `{ q5: { changed: true } }` | `TypeError: Cannot read properties of undefined (reading 'includes')` |
| `{ q1: "blemishes" }` | `TypeError: a.q1.flatMap is not a function` |
| `{ q7: null }` | `TypeError: Cannot read properties of null (reading 'includes')` |

Le spread ne protège que le **premier niveau**, et seulement contre l'absence — pas contre un
`null` explicite ni contre un type inattendu. `q5` est un objet : un `q5` partiel écrase
entièrement le défaut, `symptoms` disparaît.

Donc :

```ts
function normaliserAnswers(v: unknown): Answers {
  const a = (v ?? {}) as Partial<Answers>;
  const liste = (x: unknown) => (Array.isArray(x) ? x.filter((s) => typeof s === "string") : []);
  return {
    age: typeof a.age === "string" ? a.age : null,
    q1: liste(a.q1), q2: liste(a.q2), q3: liste(a.q3),
    q4: typeof a.q4 === "string" ? a.q4 : null,
    q5: { changed: typeof a.q5?.changed === "boolean" ? a.q5.changed : null,
          symptoms: liste(a.q5?.symptoms) },
    q6: typeof a.q6 === "string" ? a.q6 : null,
    q7: liste(a.q7),
  };
}
```

> **C'est ce plan qui crée le risque, pas le code existant.** Aujourd'hui personne ne lit
> `q5.symptoms` — on a établi que `deriveBucket` ne l'ouvre jamais. Le plancher de §3.1 et
> celui de §4.3 en sont les **premiers lecteurs**, dans la fonction dont on vient d'écrire
> qu'elle ne doit jamais jeter, appelée par la seule route sans `try/catch`. La chaîne allait
> de bout en bout : donnée mal formée → 500. Trouvé par bob.
>
> Et ce n'est pas théorique : `isStepValid` interdit un `q5` partiel côté client, mais
> `/api/scan` ne valide rien, et `SS.visage` conserve les réponses en `localStorage` **entre
> les versions de l'app** — une entrée écrite par un ancien schéma survit indéfiniment.

### 1.3 Les cinq routes appelantes

Toutes suivent le même patron. Exemple sur `fiche/route.ts` :

```ts
const { uid, premium } = await sessionPremium();
const r = premium ? await profilUtilisateur(uid) : null;
const pr = r?.etat === "ok" ? r.profil : PROFIL_NEUTRE;
// … ficheIngredients(inci, dictionnaire(), pr) inchangé …
if (r?.etat === "ok") score.perso = scorePerso(p.inci ?? "", pr, p.category, f, p.filtresUV);
else if (premium) score.profilManquant = r.etat;      // "aucun-bilan" | "indisponible"
```

| route | premium + bilan | premium sans bilan | gratuit |
|---|---|---|---|
| `fiche` | inchangé | `score.perso` absent + `score.profilManquant`, `avis: null` | inchangé |
| `score`, `lire-inci` | inchangé | idem | inchangé |
| `overview` | inchangé | `{ overview: null }` | `{ overview: null }` |
| `alternatives` | inchangé | `{ alternatives: [] }` | `{ alternatives: [] }` |

**Invariant à préserver** : un visiteur gratuit ne déclenche **aucune** lecture en base.
Aujourd'hui `profilUtilisateur` n'est appelé qu'après la porte premium ; ça doit le rester,
sinon chaque consultation de fiche anonyme coûte une requête. Testé en §7.2.

`PROFIL_NEUTRE` (`acces.ts:10`) n'est **pas** modifié — ni son champ `avoid` mort, ni son
`skinType: ""`. Passer `""` à `"normal"` changerait le comportement du chemin gratuit
(`avis.ts` servirait le segment « normal skin ») pour aucun bénéfice.

### 1.4 Ce qui disparaît

`moteur.ts` : supprimer `export const profil` (ligne 34) et le slot `_profil` (ligne 28).
`profil-utilisateur.ts` en est le seul appelant ; une fois branché, ce singleton n'a plus
d'usage — et le laisser en place, c'est laisser un endroit où quelqu'un rangera un jour un
profil d'utilisateur par mégarde, avec fuite entre comptes à la clé.

`data/scan/profil.json` **reste** sur le disque : il devient la fixture de référence (§7.1),
c'est le seul profil sur lequel le score perso ait jamais tourné.

---

## 2. La table de correspondance : 16 attributs → 7 familles

Les 7 familles sont les seules qui existent, comptées dans `data/scan/dictionnaire.json`
(3 165 entrées, 1 572 actifs) : `aging` 547, `dehydration` 453, `redness` 353, `barrier` 213,
`spots` 132, `blemishes` 118, `oiliness` 72. `avis.ts:66` liste exactement les mêmes.

| attribut du scan | famille(s) | pourquoi |
|---|---|---|
| `acne` | `blemishes` | direct |
| `comedones` | `blemishes` | direct |
| `pores` | `blemishes`, `oiliness` | `SALICYLIC ACID` → `blemishes` ; `NIACINAMIDE` → `blemishes, oiliness`. Ce sont les actifs pores. |
| `shine` | `oiliness` | direct |
| `flaking` | `dehydration`, `barrier` | `UREA`, `PANTHENOL` portent les deux |
| `texture` | `aging` | `GLYCOLIC`/`LACTIC`/`MANDELIC ACID` portent `["aging","spots","blemishes"]` : dans ce dictionnaire `aging` est la famille du **renouvellement**, pas des seules rides |
| `radiance` | `aging` | même raison ; `ASCORBIC ACID` → `["aging","spots"]` |
| `tone_evenness` | `spots` | direct |
| `dark_spots` | `spots` | direct |
| `post_acne_marks` | `spots` | hyperpigmentation post-inflammatoire |
| `redness` | `redness` | 2ᵉ famille du dictionnaire, 353 actifs |
| `visible_vessels` | `redness` | direct |
| `fine_lines` | `aging` | direct |
| `wrinkles` | `aging` | direct |
| `under_eye_circles` | **aucune** | orphelin irréductible — voir ci-dessous et §10, choix n° 1 |
| `under_eye_puffiness` | **aucune** | idem |

Table q1 → famille, **directe et distincte** de `Q1_CONCERNS` :

| valeur q1 | famille(s) |
|---|---|
| `hydration` | `dehydration`, `barrier` |
| `radiance` | `aging` |
| `blemishes` | `blemishes` |
| `pores` | `blemishes`, `oiliness` |
| `dark_spots` | `spots` |
| `fine_lines`, `firmness` | `aging` |
| `redness` | `redness` |
| `oiliness` | `oiliness` |
| `texture` | `aging` |
| `eye_area`, `discover` | aucune |

Et les symptômes de q5 (« qu'est-ce qui a changé récemment ? »), qui tombent **exactement**
sur des familles — trouvaille de bob, et une source de plancher au même titre que q1 :

| symptôme q5 | famille |
|---|---|
| `breakouts` | `blemishes` |
| `dry` | `dehydration` |
| `oily` | `oiliness` |
| `redness` | `redness` |
| `spots` | `spots` |

q5 est aujourd'hui de la donnée collectée et jamais lue : `deriveBucket` ne l'ouvre pas, et
rien d'autre ne s'en sert.

> **Pourquoi une seconde table plutôt que réutiliser `Q1_CONCERNS`.** `Q1_CONCERNS.blemishes`
> se déplie en `["acne","comedones","post_acne_marks"]`. Passer par là pour le plancher des
> priorités déclarées créerait une préoccupation « taches » chez quelqu'un qui n'a coché que
> « acné » et dont la photo ne montre aucune marque. Vérifié sur le bilan `sample.ts` : la
> famille `spots` y entrait par ce chemin.

**Deux décisions contre le routage proposé en §4.9 de `notation-debat.md`** (proposition de
« ouest », arrivée au dernier round et jamais contredite — §6 du même document) :

- §4.9 voulait `redness`/`visible_vessels` en **corroboration de `sensitivity` seulement,
  jamais en matching**. On tranche l'inverse — mais pas pour la raison qu'on croyait.

  L'argument intuitif (« sans `redness`, un toner Centella et un toner glycolique ne seraient
  départagés que par ce que le second a de mauvais ») **ne survit pas à la mesure**. Sur le
  profil `exclusive2.ts`, en retirant `redness` des concerns, les apaisants ne tombent pas du
  top 20 — ils **montent** chez les hydratants (7/20 → 10/20). Raison : Centella porte
  `["redness","barrier"]` et le panthénol `["dehydration","barrier"]` ; privés de `redness`,
  ils gagnent leurs points sur `barrier` et `dehydration`, les deux autres familles de ce
  profil. Le toner Centella orphelin n'existe pas dans ce dictionnaire.

  Ce qui tient, et fortement, ce sont les **lignes d'explication positives** :

  | catégorie | avec `redness` | sans |
  |---|---|---|
  | toner | 3,93 | 2,67 |
  | moisturizer | 4,29 | 3,30 |
  | serum | 3,96 | 2,88 |

  Un tiers des raisons positives disparaît, et ce sont précisément celles qui parlent de ce
  que l'utilisatrice voit dans le miroir. **Exclure `redness` ne fait pas remonter de mauvais
  produits : ça rend la note muette sur son sujet n° 1.** Conclusion de randy, mécanisme de
  bob, qui a mesuré l'un et l'autre.

  Pas de double comptage non plus, vérifié par lecture : `sensitivity` ne fait que **retirer**
  des points (parfum, HE, sensibilisants, sulfates, exfoliants forts), `concerns.redness` ne
  fait qu'en **ajouter**. Les deux canaux ne se croisent nulle part. Seul chevauchement réel :
  `visible_vessels ≥ 2` bascule `deriveBucket` sur `sensible` **et** alimente `redness` — deux
  effets disjoints du même signal, pas un doublon.
- §4.9 classait `pores`, `texture` et `radiance` **orphelins**. Faux : voir la colonne
  « pourquoi » ci-dessus, les actifs existent et sont fichés. Seuls les deux attributs de la
  zone des yeux le sont vraiment.

---

## 3. Les concerns : sélection, échelle, budget

### 3.1 Sévérité

`sev = level − 1`. Niveau 1 (idéal/absent) → aucune préoccupation ; 2 → 1 ; 3 → 2 ; 4 → 3.
`CONFIG.bonusMatch` documente « × sévérité (1-3) » : les échelles coïncident, sans conversion.
Sévérité d'une famille = **max** des `sev` de ses attributs, **jamais une somme** — deux
signaux moyens ne font pas un problème grave.

Une famille **déclarée** (q1, ou un symptôme q5 — table §2) que la photo ne voit pas entre
avec une sévérité **plancher de 2**. Justification en §3.2, parce qu'elle dépend de la règle
de tri.

### 3.2 Une seule liste, triée par sévérité — au plus 3 familles

```
1. sévérité décroissante
2. à sévérité égale : le MESURÉ passe devant le DÉCLARÉ
3. à égalité encore : IMPORTANCE × niveau de l'attribut source
→ on garde les 3 premières
```

3 est déjà la doctrine maison partout : `q1.maxSelect = 3`, `topConcerns(result, 3)`,
`verdict.plan` à 3 entrées.

> **Cette règle remplace la mienne, qui était fausse — démontré par bob, reproduit ici.**
> Je proposais d'abord un empilement en trois étapes, dont la première plaçait **toutes** les
> familles déclarées devant tout le mesuré, sans condition de sévérité. q1 autorise 3 choix et
> une seule valeur peut déplier 2 familles : les 3 places étaient donc mangées par les
> déclarations avant que la photo ait son mot à dire. Sur le bilan `exclusive.ts`
> (`acne: 4`, `redness: 3`, `comedones: 3`, `shine: 3`) avec `q1 = ["hydration","fine_lines"]` :
>
> ```
> mon ancienne règle : {dehydration:1, barrier:1, aging:2}   ← blemishes ABSENT
> la règle retenue   : {blemishes:1.714, redness:1.143, spots:1.143}
> ```
>
> Le scan voit une acné inflammatoire étendue et la note personnalisée n'en tient **aucun**
> compte, parce que l'utilisatrice a coché « hydratation » et « ridules ». Ça ne casse pas
> qu'une note : ça casse l'argument du scan — voir ce qu'on ne déclare pas.
>
> Nuance de reproduction : sur ce cas le top-3 des sérums reste **identique** entre les deux
> règles (les sérums sont la catégorie la moins discriminante, §3.4), contrairement à ce que
> bob avait mesuré de son côté. Le défaut est prouvé par l'objet `concerns` lui-même et par
> les lignes d'explication, pas par ce classement-là.

**Pourquoi le plancher est à 2 et pas à 1.** Ce n'est pas un réglage d'intensité, c'est ce
qui décide si une préoccupation déclarée obtient un siège. Avec la règle de départage
ci-dessus, un plancher à 1 met le déclaré à égalité avec n'importe quel signal mesuré de
niveau 2 — et il perd le départage. Mesuré sur le bilan `sample.ts` (mixte quasi nette) dont
l'utilisatrice coche « Fine lines » alors que la photo n'en voit aucune :

| plancher | concerns retenus | lignes « why » | lignes de match |
|---|---|---|---|
| 1 | `{blemishes:1, redness:1, oiliness:1}` — **`aging` n'entre même pas** | 1,12 | 0,38 |
| **2** | `{aging:2, blemishes:1, redness:1}` | **1,57** | **0,83** |

À 1, cocher une priorité ne fait **rien** dès que la personne a le moindre attribut à
niveau 2 — c'est-à-dire presque tout le monde. À 2, la déclaration prend son siège sans
écraser le mesuré grave : sur `exclusive.ts` ci-dessus, plancher 1 et plancher 2 donnent
**exactement le même résultat**, parce que l'acné à 3 et les signaux à 2 gardent la main.

Coût mesuré à assumer : sur ce profil léger, la saturation passe de 0,6 % à 3,6 % du
catalogue — la valeur la plus haute de tout le plan, encore sous le seuil de recette de 4 %
(§7.3), mais c'est elle qu'il faudra surveiller.

### 3.3 Budget de sévérité PLAFONNÉ à 4

Si `Σ sev ≤ 4`, on ne touche à rien. Si `Σ sev > 4`, on renormalise au prorata
(`sev × 4 / Σ`), chaque valeur restant plafonnée à 3.

Σ = 4 n'est pas un chiffre en l'air : c'est exactement le budget de `profil.json`
(`{blemishes: 2, oiliness: 2}`), le seul profil sur lequel le score perso ait jamais tourné.
Sous plafond il passe **inchangé**, donc aucun réglage existant ne bouge.

> Nuance de rigueur relevée par bob : le commentaire « calibré 2026-08-26 » de `CONFIG` porte
> sur `bonusActif`, côté **formule**. Que le côté perso ait été réglé sur ce Σ = 4 est une
> inférence, pas une trace écrite. Ce qui est vérifiable — et suffit — c'est que le profil de
> référence traverse le plafond sans être modifié.

> **Ce plafond a été obtenu par contradiction.** La première proposition était une
> renormalisation **systématique** à Σ = 4. Elle écrase la sévérité absolue dès qu'une seule
> famille survit : `{blemishes: 1}` (acné légère) et `{blemishes: 3}` (acné sévère)
> deviennent tous deux `{blemishes: 4}` — moyenne 69,4 sur les 3 152 produits **dans les deux
> cas**. Avec le plafond : 66,4 contre 69,4. Et pour les profils sévères les deux modes sont
> identiques, leur Σ brut dépassant 4 de toute façon (`exclusive.ts` : 3+2+2 = 7). La
> renormalisation systématique ne servait donc à rien là où la saturation avait été mesurée,
> et faisait du dégât là où il n'y en avait pas.

Les sévérités fractionnaires ne cassent rien : tous les consommateurs testent `v > 0`
(`avis.ts:115`, `overview.ts:98`, `ficheIngredients` `utile`), et `scorePerso` ne s'en sert
que comme multiplicateur.

### 3.4 Ce que ça donne, mesuré

Table produite par la règle **finale** de ce document (liste unique, plancher 2, Σ ≤ 4) sur
les 3 152 produits — pas par une version antérieure :

| profil de test | concerns produits | % à 100 | ex æquo sérum | lignes « why » |
|---|---|---|---|---|
| `profil.json` (référence) | `{blemishes:2, oiliness:2}` | 1,2 % | 16 | 1,23 |
| `sample.ts` + q1 « acné » | `{blemishes:2, redness:1, oiliness:1}` | 2,0 % | 23 | 1,30 |
| `exclusive.ts` + q1 « acné » | `{blemishes:1.71, redness:1.14, spots:1.14}` | 2,7 % | 29 | 2,26 |
| `exclusive2.ts` + q1 « hydratation » | `{redness:1.33, dehydration:1.33, barrier:1.33}` | 0,8 % | 4 | 3,36 |
| mature + q1 « taches, ridules » | `{spots:2, aging:1.33, redness:0.67}` | 0,9 % | 13 | 2,25 |
| peau nette, « pas sûre » | `{spots:1, aging:1}` | 0,4 % | 6 | 0,42 |
| peau nette, déclare « taches » | `{spots:2}` | 0,5 % | 8 | 0,26 |
| **`exclusive.ts` + q1 « hydratation, ridules »** | `{blemishes:1.71, redness:1.14, spots:1.14}` | 2,7 % | 29 | 2,26 |

La dernière ligne est le contrôle : c'est le cas qui faisait disparaître l'acné de niveau 4
sous l'ancienne règle de sélection (§3.2). Sous la règle retenue, deux déclarations sans
rapport ne changent **rien** au profil d'une peau gravement atteinte — il est identique à la
ligne `exclusive.ts` du dessus.

Comparé au branchement naïf **sur exactement les mêmes 8 profils** :

| | branchement naïf | règle retenue |
|---|---|---|
| part du catalogue à 100/100, au pire | **12,0 %** | **2,7 %** |
| ex æquo au rang 1 des sérums, au pire | **111** | **29** |
| produits distincts dans les top-3, par catégorie (max 24) | 7,2 | 9,2 |
| catégories dont le top-3 diffère entre au moins deux profils | 10/10 | 10/10 |

Le gain qui justifie la règle est la **saturation**, pas la différenciation : celle-ci ne
progresse que de 7,2 à 9,2, et les deux variantes différencient déjà les 10 catégories. Ce
qu'on achète, c'est un score qui garde son échelle — sans quoi 12 % du catalogue est à
100/100 et le classement des sérums est décidé par 111 ex æquo.

> Une version antérieure de ce plan annonçait « 5,4 → 8,7 ». Les deux chiffres ne portaient
> pas sur le même jeu de profils (4 contre 8) et n'étaient donc pas comparables. Le bon
> chiffre, sur un jeu identique et sous la règle finale, est 7,2 → 9,2.

**Deux limites mesurées, à assumer plutôt qu'à cacher.**

- Le **meilleur** produit de la plupart des catégories reste à 100 pour tous les profils
  (sérum, hydratant, masque, toner). Le n° 1 ne discrimine pas ; c'est la **composition du
  top 3** qui bouge (hydratants et nettoyants : 6 top-3 différents pour 6 profils). La
  recette porte donc sur le top 3, pas sur le n° 1.
- Une peau presque nette reçoit une note perso très proche de sa note formule et un panneau
  « why » quasi vide (0,14 ligne). C'est honnête — il y a peu à personnaliser — mais l'écran
  doit savoir le dire (§10, choix n° 2).

---

## 4. Les autres champs

### 4.1 `skinType` — la texture, jamais la réactivité

`result.profile.skinType` est une chaîne libre. Le prompt (`analysis/prompt.ts:92`) est passé
à l'anglais et demande « Oily / Combination / Normal / Dry » avec « sensitive » **ajouté**
(« Normal, sensitive ») ; les anciennes lignes sont en français (« Mixte »).
`normalizeSkinType` absorbe les deux et rend une clé française.

| `normalizeSkinType` | `ProfilPeau.skinType` |
|---|---|
| `grasse` | `oily` |
| `mixte` | `combination` |
| `seche` | `dry` |
| `normale` | `normal` |
| `sensible` | **déduit des attributs**, voir ci-dessous |

Il faut le traduire : `CONFIG.richesse` n'a **aucune** entrée `sensitive`, donc lui passer
`"sensitive"` retomberait sur `?? 0` sans la moindre erreur — tout le jugement d'adéquation
de texture disparaîtrait en silence.

Ce n'est pas une déduction, c'est mesuré. À concerns et `sensitivity` identiques, en ne
faisant varier que le type de peau :

| catégorie | notes différentes entre `"dry"` et `"sensitive"` | écart max | `"sensitive"` ≡ `""` ? |
|---|---|---|---|
| moisturizer (545) | 233 (43 %) | 13 pts | **oui, identique partout** |
| cleanser (383) | 238 (62 %) | 13 pts | oui |
| serum (515) | 321 (62 %) | 13 pts | oui |

`"sensitive"`, `"sensible"` et `""` produisent des notes **strictement identiques sur tout le
catalogue**. Et `normalizeSkinType` rend précisément `"sensible"` sur le bilan figé
`exclusive2.ts` (« Sensitive, compromised barrier »). Réutiliser `EngineProfile.skinType` tel
quel coûterait donc à ce profil jusqu'à 13 points d'adéquation sur 43 à 62 % du catalogue,
sans une ligne d'erreur nulle part.

### 4.2 Le cas « sensible » : un mot qui mélange deux axes

`normalizeSkinType` rend `sensible` seulement quand le libellé ne contient **aucun** mot de
texture (« Sensitive, compromised barrier » d'`exclusive2.ts`). Ce n'est donc pas une texture :
c'est une texture **manquante**. On la déduit des attributs, avec les signaux que le prompt
d'analyse utilise lui-même :

```
shine ≥ 3                    → oily
flaking ≥ 2 et shine ≤ 2     → dry
shine = 2                    → combination
sinon                        → normal
```

Sur `exclusive2.ts` (shine 2, flaking 3) la règle rend `dry`, cohérent avec son propre
`skinTypeBreakdown` (« compromised, peeling barrier »). La réactivité n'est jamais perdue :
elle vit dans `sensitivity`, où le moteur sait s'en servir.

> **Pas de règle « et `sensitivity` passe à 2 » ici.** Une première version du plan en
> ajoutait une ; elle est morte à la naissance. `buildEngineProfile` calcule déjà
> `reactiveStr = /sensible|sensitive|réactive|reactive/i.test(result.profile.skinType)` et le
> verse dans `sensitive`, que le §4.3 traduit en 2. Un libellé qui fait rendre `sensible` à
> `normalizeSkinType` contient forcément le mot, donc arrive ici avec `sensitive: true`. Une
> règle inatteignable est une règle qui pourrira. Relevé par bob.

### 4.3 `sensitivity` (0-3)

Base, depuis `EngineProfile` (donc depuis `deriveBucket`, déjà en production) :

| origine | valeur |
|---|---|
| `bucket === "fragile"` | 3 |
| `EngineProfile.sensitive` (bucket sensible/fragile, ou libellé réactif) | 2 |
| au moins un irritant coché en q2 | 1 |
| sinon | 0 |

Puis **un plancher** : `answers.q5.symptoms` contient `redness` → au moins 2.

Il comble un trou réel : **`deriveBucket` n'ouvre jamais q5**. « Rougeurs / sensibilité :
nouvelles réactions » est aujourd'hui un signal déclaré qui n'atteint aucun calcul, ni pour
la routine ni pour le score. (Le même symptôme alimente aussi la famille `redness` par le
plancher de §3.1 — deux effets disjoints, comme pour `visible_vessels`.)

Ce n'est pas une falaise, contrairement à ce qu'on pouvait craindre pour un cran qui
déclenche d'un coup −8 sur les HE, −8 sur les sulfates et −10 sur un exfoliant fort. Mesuré
sur `exclusive2.ts`, 515 sérums, en ne faisant varier que `sensitivity` : moyennes 83,9 →
78,0 → 71,8 → 68,3 pour 0 → 1 → 2 → 3. Gradient régulier de −5 à −6 par cran, et l'écart-type
**double** (13,7 → 30,1) : plus la sensibilité monte, mieux le moteur sépare les produits.

### 4.4 `strengthCeiling`

`EngineProfile.strengthCeiling` (1-4) passe **tel quel**. Le `strength` du dictionnaire vaut
0 (3 035 entrées), 1 (114), 2 (14), 3 (2) : les échelles sont déjà compatibles, un plafond à
4 signifiant « rien de ce catalogue n'est trop fort », ce qui est exact.

### 4.5 `pregnancy`

`EngineProfile.pregnant` (= `answers.q7.includes("pregnancy")`) passe tel quel. Le cap à 15
est volontairement brutal et c'est correct : 9 ingrédients du dictionnaire portent
`pregnancyFlag` (rétinoïdes + hydroquinone).

### 4.6 `allergies` : `[]`, et c'est une décision

Verser q2 (« à quoi réagis-tu ? ») dans `allergies` est tentant et **faux**.
`scorePerso:561` teste `it.name.includes(a.toUpperCase())` puis applique `capAllergie: 10` :
« fragrance » matcherait littéralement l'INCI `FRAGRANCE`/`PARFUM` → **836 produits,
26,5 % du catalogue, plafonnés à 10/100**.

q2 déclare une **irritation**, pas une allergie, et chaque item a déjà son canal :
parfum → `malusParfumSensible × sensitivity` ; huiles essentielles → `malusHEReactive` ;
sulfates → `CONFIG.sulfates` via `natureProduit` ; alcool → `dryingAlcohol`. La contribution
de q2 est donc de **remonter `sensitivity`** (§4.3), pas de déclencher une exclusion.

Le questionnaire n'a aucun champ « allergie déclarée ». Tant qu'il n'en a pas,
`allergies: []`. En ajouter un est un chantier produit, pas une conversion.

### 4.7 `avoid`

Champ mort : lu nulle part (`scoring.mjs`, `avis.ts`, `overview.ts` vérifiés). Il n'entre pas
dans `ProfilPeau`. On le laisse dans `PROFIL_NEUTRE` pour ne pas modifier un contrat publié.

---

## 5. Caches

Il y en a **cinq** à traiter, et le plus grave n'est pas celui que le commentaire du code
annonce : le nouveau mémo par utilisateur (§5.1), le cache d'`alternatives` (§5.2), celui
d'`overview` (§5.3, déjà correct), et **deux notes perso figées** dont une en base de données
(§5.4). Un sixième, `moteur.ts` `_profil`, disparaît (§1.4).

### 5.1 Le mémo par utilisateur (nouveau)

Dans `profil-utilisateur.ts` : `Map<uid, { r: Resolution; t: number }>`, **TTL 5 minutes**,
plafond 200 entrées en FIFO. Sans lui, un seul écran de fiche produit déclenche deux lectures
en base (`fiche` puis `alternatives`).

Invalidation : `oublierProfil(uid)` exporté et appelé par `POST /api/scan` juste après
`db.analysis.create`. Sur Render multi-instance, seule l'instance qui écrit oublie ; les
autres expirent par le TTL. La borne de fraîcheur est donc de 5 minutes après un nouveau
scan visage, et c'est une décision assumée (§10, choix n° 5).

**Interdit** : ranger ce mémo dans `moteur.ts` `_profil` — c'est un singleton sans clé, il
ferait fuiter le profil d'un compte vers les autres.

### 5.2 `alternatives/route.ts` — le cache annoncé par le commentaire

Ligne 17-20, clé = catégorie seule, avec un commentaire qui prévient. Nouvelle clé :
`categorie + "::" + cleProfil(pr)`.

`cleProfil` doit couvrir **tout** ce que `scorePerso` lit : `skinType`, `sensitivity`,
`strengthCeiling`, `pregnancy`, `allergies` triées, et les entrées de `concerns` triées
**avec leurs valeurs** (deux sévérités différentes donnent deux classements différents).
Elle ne contient **pas** l'`uid` : deux personnes de même peau doivent partager l'entrée.

**Arrondir les sévérités à 2 décimales dans la clé.** La renormalisation produit des valeurs
comme `1.714…` ; sans arrondi, chaque profil a une clé quasi unique, le partage annoncé
ci-dessus ne se produit jamais et la `Map` de 200 tourne en rond. L'arrondi ne change aucune
note, il ne sert qu'à la clé. Relevé par bob.

Deux bornes à ajouter en même temps : ne mémoriser que les **20 premiers** du classement (la
route en sert 6 au maximum ; aujourd'hui on garde les ~450 produits notés d'une catégorie), et
plafonner la `Map` à 200 clés en FIFO.

### 5.3 `overview.ts` — déjà correct, à ne pas casser

Ligne 96-98 : la clé inclut déjà une empreinte de profil, et cette empreinte (type de peau +
noms des préoccupations) correspond **exactement** aux entrées du prompt. Rien à changer sinon
un plafond de taille (500 entrées, FIFO). Le filtre `v > 0` supporte les sévérités
fractionnaires.

Nommer la nouvelle fonction `cleProfil` et non `empreinteProfil` : `overview.ts` a déjà une
`empreinteProfil` privée, au périmètre volontairement plus étroit.

### 5.4 Les deux notes perso FIGÉES — dont une en base de données

Ce ne sont pas des caches au sens propre : ce sont des scores personnalisés **recopiés** à
côté d'un produit, qui survivent au changement de peau.

1. **`ss-historique`** (`public/scan-proto/commun/app.js:539-562`) : `{nom, …, formule, perso,
   date}`, cap 50, en `localStorage`. Réaffiché par `11-dashboard.html:350` et
   `13-historique.html:166`.
2. **`Protocol.products`** — le pire, et il n'a aucun commentaire d'avertissement.
   `PUT /api/shelf` valide les items avec `ShelfItemSchema`, qui contient
   `perso: z.number().nullable().optional()` (`shelf/route.ts:18`), et les persiste dans
   `db.protocol.update({ … products: … })` (ligne 47). C'est un score personnalisé **figé en
   base**, qui suit donc l'utilisateur d'un appareil à l'autre, et que `18-bilan.html:549-552`
   réaffiche tel quel (`item.perso + " for you"`).

**Correctif retenu : ne rien estampiller, tout recalculer.** Une route
`POST /api/produit/scores` (liste de noms de produits → notes fraîches), appelée au chargement
du dashboard, de l'historique et du bilan. Le champ `perso` stocké devient un simple repli
d'affichage hors ligne.

C'est bon marché, mesuré : noter le catalogue **entier** (3 152 produits) prend **329 ms** ;
50 produits, **16 ms**. La liste servie ici est de l'ordre de la dizaine.

> **Ce correctif remplace l'estampille** que proposait une version antérieure du plan (marquer
> chaque entrée avec la date du bilan et masquer les `perso` périmés). Bob a relevé le coût
> qu'elle ne nommait pas : après un re-scan, l'écran **retire** la note perso et retombe sur
> la formule — l'utilisatrice vient de refaire son scan et son historique se dépersonnalise.
> Recalculer coûte 16 ms et rend le bon chiffre au lieu d'en cacher un mauvais. Et
> l'estampille ne réglait de toute façon que le point 1 : elle ne pouvait rien pour le shelf,
> qui est écrit côté serveur.

### 5.5 Ce qui n'a pas besoin d'être touché

`avis.ts` `_parRef`/`_parNom` (données brutes, indépendantes du profil) et `scoring.mjs`
`_maxCache` (indexé par libellé de grille métier).

---

## 6. L'abonné qui a payé et n'a pas encore de bilan

**Ce cas n'existe pas aujourd'hui — c'est le branchement qui le crée.** Le bouchon rend
toujours un profil, donc `score.perso` est toujours présent pour un premium. Dès que
`profilUtilisateur` peut répondre « aucun bilan », deux chemins déjà écrits s'activent, et
aucun des deux n'est bon :

- `06-result-premium.html:1225` : `score.perso` absent → `location.replace("03-result-free.html")`.
  Un abonné payant se retrouve donc sur l'écran gratuit, devant une carte verrouillée
  « Get my personal score » — on lui propose d'acheter ce qu'il a déjà.
- `03-result-free.html:398` : le CTA de cette carte teste `m.connecte && dejaFait`, **jamais
  `m.premium`**. Un abonné qui n'a jamais fait le tunnel part bien sur `19-questions.html`
  (`dejaFait` est faux) ; mais s'il a un tunnel entamé dans la même session — réponses et
  photo en `sessionStorage` — il part sur `16-paywall.html`.

Le premier point est certain et suffit à lui seul ; le second est plus étroit qu'il n'y
paraît, mais il n'y a aucune raison de laisser un test d'accès qui ignore l'accès.

**Jamais de profil par défaut.** Servir une peau inventée à quelqu'un qui a payé pour la
sienne, c'est le bug qu'on corrige, en pire.

1. `/api/moi` expose **un** champ de plus : `bilan: boolean` (= `etat === "ok"`). Aujourd'hui
   la route ne rend que `connecte`/`premium`/`prenom`/`email` : le front est aveugle à
   l'existence d'un bilan. La route fait déjà une lecture en base (`userHasAccess`) ; on
   réutilise la résolution mise en cache de `profilUtilisateur` plutôt que d'ajouter une
   requête.

   > **Un seul champ, pas deux.** Une version antérieure ajoutait aussi
   > `bilanDate: string | null`, et `Resolution` portait un `date` pour l'alimenter. Les deux
   > n'existaient que pour l'estampille de `ss-historique`, que §5.4 a remplacée par une
   > route de re-notation : plus rien ne les lisait. Un champ non lu ajouté à un contrat
   > d'API public ne s'en enlève plus jamais. Orphelin repéré par bob sur `bilanDate` ;
   > `Resolution.date` était mort de la même cause et part avec lui.

   **Côté serveur ne suffit pas.** `SS.moi()` (`app.js:139-153`) ne relaie pas la réponse, il
   la **recopie champ par champ**, à quatre endroits qu'il faut tous toucher :
   `MOI_NEUTRE` (ligne 139), la lecture du cache (ligne 143), la construction de `moi`
   (ligne 148) et l'écriture du cache (ligne 149). Ajouter le champ uniquement côté API le
   ferait jeter en silence, et le CTA du point 3 lirait `undefined`. Relevé par bob ; sans
   cette ligne dans le plan, c'est une soirée à chercher pourquoi `bilan` est vide.
2. `06-result-premium.html` : sur `score.profilManquant === "aucun-bilan"`, ne plus rediriger
   vers l'écran gratuit. Afficher la fiche avec la seule note formule et, à la place du bloc
   perso, un encart « Ta note personnelle attend ton scan visage » → `19-questions.html`.
3. `03-result-free.html` : le CTA verrouillé teste `m.premium` **avant** `dejaFait`. Un
   premium part sur `19-questions.html`, jamais sur le paywall. (À faire même si le point 2
   rend ce chemin rare : un test d'accès qui ignore l'accès finira par se tromper ailleurs.)
4. `score.profilManquant === "indisponible"` (base en panne, bilan corrompu) : ne rien
   promettre et ne rien accuser — le bloc perso est simplement absent, sans encart d'appel au
   scan. Un incident serveur ne doit pas se lire comme « tu n'as pas fait ton scan ».

---

## 7. Comment on vérifie que ça marche vraiment

Ligne de base avant tout changement : `npx vitest run` → **29 fichiers, 188 tests, vert, 8,9 s**.

### 7.1 Tests unitaires de la traduction — `src/lib/scan/__tests__/profil-peau.test.ts`

Gabarit : `src/features/recommendation/__tests__/profile.test.ts`, qui fabrique déjà un
`AnalysisResult` complet depuis `ATTRIBUTES` avec des surcharges de niveau.

- **invariants de forme** : `skinType` toujours dans les 4 valeurs ; `concerns` a au plus
  3 clés, toutes dans `FAMILLES`, toutes `> 0` ; `Σ concerns ≤ 4` ; `allergies` toujours `[]` ;
  `sensitivity` entier de 0 à 3.
- **la table** : un attribut seul à 4, un par ligne du tableau §2, produit la famille attendue
  à la sévérité 3.
- **les orphelins** : `under_eye_circles: 4` + `under_eye_puffiness: 4` et rien d'autre →
  `concerns` **vide** (et le test le dit explicitement, pour qu'un futur lecteur sache que
  c'est voulu).
- **le plancher déclaré** : `q1: ["dark_spots"]` sur un bilan tout à 1 → `{spots: 2}`.
- **la fuite `Q1_CONCERNS`** : `q1: ["blemishes"]` sur un bilan tout à 1 → `{blemishes: 2}`
  **sans** `spots`. C'est le test qui garde la seconde table justifiée.
- **le test de non-régression le plus important — le mesuré grave n'est jamais évincé** :
  `exclusive.ts` (`acne: 4`) avec `q1: ["hydration","fine_lines"]` **doit** contenir
  `blemishes`. C'est le cas exact qui a fait tomber la première version de la règle (§3.2) ;
  sans ce test, rien n'empêche quelqu'un de la réintroduire.
- **le départage** : à sévérité égale, une famille mesurée passe devant une famille seulement
  déclarée.
- **le budget** : acné 2 → `{blemishes: 1}` et acné 4 → `{blemishes: 3}` (la sévérité absolue
  survit) ; trois familles à 3, 3, 2 → renormalisées à Σ = 4.
- **le profil de référence traverse le plafond inchangé** : un bilan produisant
  `{blemishes: 2, oiliness: 2}` (Σ = 4) ressort identique. C'est l'invariant qui garantit que
  le seul réglage sur lequel le score perso ait tourné n'est pas déplacé.
- **« sensible »** : `skinType: "Sensitive, compromised barrier"` + `flaking: 3` → `skinType`
  vaut `dry`, et jamais `"sensitive"` ni `""`.
- **q5** : `q5.symptoms: ["redness"]` sur un bilan calme → `sensitivity ≥ 2` **et** la famille
  `redness` présente au plancher.
- **les libellés** : `aging` venu de `texture` seul → `libelles.aging === "skin texture"` ;
  venu de `fine_lines` seul → `"fine lines"` ; des deux → les deux mots.
- **un bilan PARTIEL est un cas normal, pas une erreur.** `AnalysisResultSchema.attributes`
  est un `z.array(...)` **sans longueur minimale** : un bilan à 3 attributs passe `safeParse`
  sans broncher, et c'est exactement ce que contient la base locale (voir §7.3). Un tel bilan
  doit produire un profil **valide et maigre**, jamais vide ni en erreur. Rien ne plante
  aujourd'hui (`levelOf` retombe sur `?? 1`), mais aucun test ne le dit.
- **deux peaux différentes donnent deux profils différents** : `sample.ts` et `exclusive.ts`
  ne doivent pas produire le même objet. C'est le test qui empêche le retour du bouchon.

### 7.2 Tests de la résolution — `src/lib/scan/__tests__/profil-utilisateur.test.ts`

Avec `db` moqué : ne jette jamais sur un `result` invalide ni sur une erreur de base
(→ `"indisponible"`) ; `uid` nul → `"aucun-bilan"` sans lecture ; le mémo évite la seconde
lecture ; `oublierProfil` la reprovoque.

Et **une table de cas pour `normaliserAnswers`**, avec au minimum les quatre formes du
tableau de §1.2 — `{}`, `{q5:{changed:true}}`, `{q1:"blemishes"}`, `{q7:null}` — chacune
devant produire un `Answers` complet sans jeter. Les trois dernières font aujourd'hui
planter un simple spread ; ce sont elles qui justifient la fonction, donc ce sont elles qui
doivent être écrites, pas seulement le cas `{}` qui passe déjà.

Et dans `gating.test.ts` (à étendre), deux ajouts :

- **un visiteur gratuit ne déclenche aucun appel à `db.analysis`**, sur les cinq routes. C'est
  l'invariant de §1.3, et c'est un espion sur le client Prisma, pas une lecture de code.
- **deux `uid` avec deux bilans différents → deux listes d'alternatives différentes.** Ce test
  **échoue aujourd'hui** (le cache est indexé par catégorie seule) : c'est sa valeur. Il ferme
  le piège de §5.2 et interdit qu'on le rouvre.

### 7.3 Recette sur le catalogue — `scripts/verifier-profil.mjs`

Convention maison : `scripts/*.mjs`, lancé à la main (37 scripts existants), pas dans
`package.json`.

**Le script lit aussi `prisma/dev.db`**, en lecture seule (`node:sqlite`), en plus des bilans
figés. La base locale contient **5 lignes `Analysis` réelles** — des lignes de seed e2e
(`seeduser_…`), pas les comptes de production, mais de la donnée qu'aucun de nous n'a
fabriquée. Elles ont déjà appris deux choses au plan :

- **`result.attributes` y compte 3 à 5 entrées, pas 16.** Le bilan partiel est donc la forme
  *courante* en base, pas un cas limite (test en §7.1).
- **`answers.age` y vaut le nombre `28`**, alors que le type déclare `string | null`. Personne
  ne le lit, donc rien ne casse — mais c'est la confirmation empirique que `answers` en base
  n'est pas conforme à son type, et que la normalisation de §1.2 doit être défensive.
- Leur `skinType` est `"Mixte"` : le chemin **français** de `normalizeSkinType` est de la
  donnée vivante, pas une compatibilité héritée théorique.

Ça ne remplace pas la production, mais ça fait passer une partie de cette recette de
« fabriqué » à « observé ». Trouvaille de bob, que ni lui ni moi n'avions pensé à regarder
avant d'avoir écrit tout le reste. Il note le catalogue entier pour les bilans réels du dépôt (`sample.ts`,
`exclusive.ts`, `exclusive2.ts`, plus un profil mature et un profil quasi net construits dans
le script) et **échoue** si :

| seuil | valeur mesurée aujourd'hui |
|---|---|
| part du catalogue à 100/100 ≤ **4 %** par profil | 0,0 à 2,7 % |
| ex æquo au rang 1 ≤ **35** dans chaque catégorie | 29 au pire |
| **les 10 catégories** ont au moins 2 top-3 distincts sur les profils testés | 10/10 |
| pour un profil à ≥ 2 familles, ≥ **1 ligne « why »** en moyenne par produit | 1,17 à 3,36 |

Ces seuils sont les mesures actuelles avec un peu de marge. Le premier est celui qui compte :
c'est le garde-fou contre la saturation, et il aurait échoué à 12 % avec le branchement naïf.
Le sérum est le point faible connu (3 top-3 distincts sur 8 profils, contre 8 pour les
nettoyants) : la recette ne doit pas exiger davantage de lui, mais un futur écart doit se
lire dans le détail par catégorie que le script imprime.

**Deux garde-fous obligatoires en tête de script, pas un.**

1. `if (!moteurDisponible()) throw …`. `scoring.mjs:12` résout `data/scan/` depuis
   `process.cwd()` et, s'il ne trouve pas le dictionnaire, **dégrade en silence** — plus aucun
   match, tous les scores s'effondrent, et les quatre seuils ci-dessus passent alors sans rien
   vérifier. Reproduit des deux côtés : même script, `cwd` à la racine → moyenne 64,6 ;
   `cwd` ailleurs → 49,5, sans une erreur. Ce garde-fou n'invente rien : `moteurDisponible()`
   est déjà exporté et déjà lu par les cinq routes produit, qui le renvoient dans
   `score.disponible`. Seuls les scripts ad hoc l'ignorent.
2. **Un invariant de contradiction.** Le script imprime la moyenne perso du profil de
   référence `data/scan/profil.json` sur tout le catalogue, et échoue si elle sort de
   `[65, 75]`. Mesurée aujourd'hui : **69,1**.

Le second garde-fou existe parce que nous nous sommes fait prendre **deux fois en deux
jours**, par la même forme d'erreur : un banc qui rend un résultat cohérent et faux. Chez bob,
une regex sensible à la casse sur les INCI du catalogue (qui sont en Title Case, la mise en
majuscules se faisant dans `parseInci`) annonçait « 0 apaisant dans le top 20 » pendant que le
top-3 en affichait un. Chez randy, le `cwd`. Dans les deux cas, **ce n'est pas le chiffre qui
a alerté, c'est une contradiction interne** : un compteur qui contredisait une liste, deux
variantes censées différer qui rendaient le même nombre. Un banc de mesure qui ne peut pas se
contredire lui-même ne peut pas nous prévenir.

Corollaire pour qui écrira le script : toute comparaison d'ingrédient par motif sur `p.inci`
doit être insensible à la casse.

**Le seul test qui prouve vraiment que le bouchon est mort** (proposition de bob, revérifiée
indépendamment) : deux profils **opposés** — grasse acnéique contre sèche réactive — sur les
383 nettoyants, en exigeant un **top-3 disjoint** et un écart de moyenne supérieur à 10 points.

```
grasse acnéique  {blemishes:3, oiliness:1, spots:1}   oily,  sens 0  → moyenne 69,9
sèche réactive   {dehydration, barrier, redness ≈1,33} dry,  sens 3  → moyenne 41,9
produits communs dans les deux top-3 : 0 / 3
```

(Bob mesurait 70,4 et 49,1 avec des profils construits un peu différemment ; la forme du
résultat — écart massif, intersection vide — est la même des deux côtés.)

Ce test est plus dur que les quatre seuils ci-dessus et il est plus parlant : un score qui le
passe ne peut pas être un score unique déguisé.

### 7.4 Vérification de bout en bout, à la main

Avec `SCAN_TEST_PREMIUM=1` :

1. Deux comptes, deux bilans réels **différents**, la même fiche produit : les deux notes
   perso doivent différer, et les blocs « why » raconter deux histoires différentes. C'est la
   seule preuve que le bouchon est mort.
2. Le même compte, deux fois la même fiche : note identique (le mémo ne doit pas dériver).
3. Un compte premium **sans** `Analysis` : jamais de note perso, jamais de redirection vers le
   paywall, arrivée sur `19-questions.html`.
4. Un compte premium qui refait un scan visage : la note perso du même produit doit changer
   dans les 5 minutes (TTL) ou immédiatement sur l'instance qui a écrit.
5. Un visiteur gratuit : comportement strictement inchangé.

### 7.5 Ce que ce plan n'a PAS vérifié

À lire avant de traiter le reste comme acquis. Trois zones reposent sur de la lecture de code,
pas sur de l'observation :

- **Les 7 bilans réels de production.** Ni randy ni bob n'y a accès, et aucun des deux n'a
  cherché à y toucher. Tout le dossier chiffré repose sur les 3 bilans figés du dépôt, les
  5 lignes de seed de `prisma/dev.db`, et des profils construits à la main. Le premier geste
  après la mise en place devrait être de passer les 7 profils réels dans
  `scripts/verifier-profil.mjs` et de vérifier que les seuils de §7.3 tiennent — c'est aussi
  le seul moyen de savoir combien de familles un vrai utilisateur produit.
- **Les trois écrans de §6** (`06-result-premium.html`, `03-result-free.html`, `SS.moi`). Lus
  ligne à ligne des deux côtés, jamais exécutés. Le comportement décrit — un abonné payant
  renvoyé vers l'écran gratuit, et le CTA qui ne teste pas `m.premium` — est déduit du code.
- **Les mesures de performance de §5.4** (329 ms pour le catalogue entier, 16 ms pour 50
  produits) viennent du banc de bob et n'ont pas été rejouées par randy.

Le reste du document a été vérifié des deux côtés, souvent indépendamment.

---

## 8. Corrections annexes que ce branchement rend obligatoires

**8.1 `overview.ts` `LIBELLE_SOUCI` (lignes 36-40) porte encore l'ancienne taxonomie à
11 clés** (§4.4 du débat précédent), pas les 7 familles :

| famille | `scoring.mjs` `libelle()` | `avis.ts:66` | `overview.ts:36` |
|---|---|---|---|
| blemishes, oiliness, dehydration, redness, barrier | ok | ok | ok |
| **aging** | ok | ok | **manque** |
| **spots** | ok | ok | **manque** |

`LIBELLE_SOUCI[k] || k` : le prompt d'Anthropic recevra « Flagged concerns: aging, spots ».
Ce qui rend le cas instructif : **les deux seules préoccupations du bouchon — `blemishes` et
`oiliness` — sont exactement les deux qui existent dans les trois listes.** Le profil écrit à
la main a, par hasard, le sous-ensemble qui ne révèle rien. `aging` et `spots` sortent dans
5 des 8 profils de test.

Le compte exact, vérifié par bob : sur les 11 clés d'`overview.ts`, **5 sont utiles, 6 sont
mortes** (`darkspots`, `wrinkles`, `pores`, `texture`, `dullness`, `sensitivity` ne peuvent
jamais être atteintes, puisque les clés de `concerns` ne peuvent être que les 7 familles) et
2 manquent. `avis.ts` a bien ses 7 : le correctif ne concerne qu'`overview.ts`.

**Et c'est le plus grave des trois libellés, pas le moins.** Ailleurs un mauvais libellé
produit une phrase bancale à l'écran. Ici, `overview.ts:118` fabrique la ligne
`Flagged concerns: …` du **prompt** envoyé au modèle : écrire « aging, spots » au lieu de
« fine lines, dark spots » change ce que le modèle va chercher dans les avis, donc le
paragraphe qu'il écrit. C'est le seul des trois qui modifie une sortie d'IA.

**8.2 Les libellés : portés par le profil, pas figés dans le moteur.**

Le problème. `scorePerso:576` pousse `label: "${Ingrédient} targets your ${libelle(b)}"`, et
`libelle('aging')` vaut `"fine lines"`. Puisque grain et éclat sont routés vers `aging` et
`spots` (§2), quelqu'un de 22 ans qui a coché « Texture » lirait « Glycolic acid targets your
fine lines ».

La solution retenue : **`ProfilPeau` transporte ses propres libellés**. La couche de
branchement sait exactement quels attributs ont alimenté chaque famille — c'est la table §2 —
donc elle produit, à côté de `concerns`, un `libelles: Partial<Record<Famille, string>>` :

| famille alimentée par | libellé produit |
|---|---|
| `aging` ← `texture` seul | « skin texture » |
| `aging` ← `fine_lines`/`wrinkles` seuls | « fine lines » |
| `aging` ← les deux | « fine lines & texture » |
| `spots` ← `radiance` seul | « dullness » |
| `spots` ← `dark_spots`/`tone_evenness` | « dark spots » |
| `spots` ← les deux | « dullness & dark spots » |

Côté moteur, **trois points d'appel, une ligne chacun**, avec le repli existant conservé :

| fichier | aujourd'hui | après |
|---|---|---|
| `scoring.mjs:576` | `libelle(b)` | `profil.libelles?.[b] ?? libelle(b)` |
| `avis.ts:118` | `LIBELLE_SOUCI[c] \|\| c` | `profil.libelles?.[c] ?? LIBELLE_SOUCI[c] ?? c` |
| `overview.ts:118` | `LIBELLE_SOUCI[k] \|\| k` | `profil.libelles?.[k] ?? LIBELLE_SOUCI[k] ?? k` |

Vérifié : `grep "targets your"` ne sort que `scoring.mjs:576`, aucun test ni aucun écran ne
dépend de ces chaînes, et `PROFIL_NEUTRE` (sans `libelles`) garde exactement le comportement
actuel. Risque de régression nul.

> **Cette solution est de bob, et elle est meilleure que les deux chaînes fixes que nous
> proposions chacun.** Randy voulait « skin renewal » — qui donne « Retinol targets your skin
> renewal », pas de l'anglais courant. Bob voulait « fine lines & skin texture » — qui ne
> couvre pas l'éclat, donc ment pour `radiance`. Le défaut est commun aux deux :
> **une chaîne fixe est fausse pour quelqu'un**. Un libellé calculé est vrai pour cette
> personne-là, ce qu'aucune constante ne peut être.

---

## 9. Ordre des travaux

1. `profil-peau.ts` + ses tests (§7.1). Pur, sans I/O : il se valide seul, avant toute
   plomberie.
2. `normaliserAnswers()` **et sa table de cas d'abord** (§1.2, §7.2), puis le reste de
   `profil-utilisateur.ts` et `moteur.ts` nettoyé (§1.4). Dans cet ordre : c'est la seule
   fonction du lot dont un défaut produit un 500 plutôt qu'une mauvaise note.
3. Les cinq routes (§1.3) **et** la clé de cache d'`alternatives` (§5.2) — **le même commit**.
   Entre les deux, l'application servirait le classement d'un utilisateur à un autre.
4. Les bornes des deux autres caches (§5.1, §5.3).
5. `scripts/verifier-profil.mjs` (§7.3), ses deux garde-fous, et passage des seuils.
6. Les libellés portés par le profil (§8.2) et l'alignement d'`overview.ts` (§8.1) — à faire
   **avant** les écrans, puisque c'est ce qu'ils afficheront.
7. `/api/moi` (les quatre endroits de `SS.moi`) + les trois écrans (§6).
8. `POST /api/produit/scores` et son branchement sur le dashboard, l'historique et le bilan
   (§5.4) — le seul point qui touche `Protocol.products`.

L'étape 3 n'est pas sécable : c'est la seule où un ordre inversé produit une fuite de données
entre comptes. Les étapes 6 à 8 sont indépendantes entre elles et peuvent être livrées
séparément, mais aucune ne doit précéder l'étape 3.

---

## 10. Ce qui reste un vrai choix produit

1. **L'option q1 « Eye area » n'aura aucun effet sur la note.** Aucune famille ne couvre les
   cernes ni les poches, et `CAFFEINE` est fiché `benefits: ["redness"]` — les y router ferait
   dire « ce produit cible tes rougeurs » sur un contour des yeux. On offre donc à
   l'utilisatrice une case qu'elle peut cocher sans que rien ne se passe. Trois issues :
   l'accepter, retirer l'option du questionnaire, ou taguer des actifs oculaires dans le
   dictionnaire (chantier de contenu, hors de ce plan). Une quatrième, proposée par bob et qui
   ne coûte rien au scoring : `eye_area` déclaré ne change pas la note mais **met en avant la
   catégorie `eye-cream`** (144 produits) dans le parcours. C'est du routage, pas de la
   notation, et ça rend la case honnête.
2. **Que montre-t-on à un abonné qui n'a rien à corriger ?** Bilan à 16 attributs au niveau 1
   et aucune priorité déclarée → `concerns = {}` → **0,68 ligne d'explication en moyenne** sur
   515 sérums (mesuré). Il paie pour une note « personnelle » quasi muette. Ce n'est pas un
   effet de nos règles, c'est structurel : sans préoccupation, le matching n'a rien à
   récompenser. Ni randy ni bob ne pense qu'il faille gonfler artificiellement. Reste la
   question d'écran : le dire (« ta peau va bien, il y a peu à personnaliser ») ou se taire et
   laisser croire à un bug ?
4. **Le n° 1 de chaque catégorie reste à 100 pour tout le monde.** Le top 3 se différencie,
   pas le premier. Accepte-t-on que « le meilleur sérum » soit le même pour tous, ou faut-il
   rouvrir la calibration du score perso — ce qui déborde ce plan et renvoie à
   `notation-debat.md` ?
5. **Les avis d'une peau très réactive.** `avis.ts` route l'utilisateur vers le segment
   d'avis de sa **texture** (mixte, sèche…), alors que les données contiennent un segment
   « sensitive ». Faut-il envoyer les profils `sensitivity ≥ 2` vers ce segment plutôt que
   vers celui de leur texture ?
6. **Fraîcheur du profil.** TTL de 5 minutes après un nouveau scan visage sur les instances
   qui n'ont pas écrit (§5.1). Acceptable, ou faut-il que les notes changent instantanément
   partout — ce qui demande un cache partagé ?
7. **Un champ « allergie déclarée » dans le questionnaire.** Le moteur a une règle d'exclusion
   absolue prête (`capAllergie: 10`) et personne ne l'alimente. C'est une question à ajouter
   au tunnel, avec la prudence qu'impose une exclusion binaire.
