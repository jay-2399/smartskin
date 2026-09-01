# bob — notes d'enquête (branchement du profil réel)

> Aucune ligne de `src/` ni `data/` touchée. Mesures faites depuis
> `/private/tmp/.../scratchpad/exp*.mjs`, qui importent `scoring.mjs` tel quel.

## 1. Ce que `scorePerso` demande VRAIMENT (lecture ligne à ligne, scoring.mjs:540-660)

Le profil consommé n'a que **7 champs utiles**. Tout le reste de `profil.json` est mort.

| champ | type attendu | où il agit |
|---|---|---|
| `skinType` | `"oily" \| "combination" \| "dry" \| "normal"` **anglais** | malus comédogène (`["oily","combination"]`), malus alcool (`["dry"]`), `CONFIG.richesse.riche/legere[peau]`, `CONFIG.sulfates[peau]`, libellés |
| `sensitivity` | entier 0-3 | malus parfum (`×sensitivity`), malus sensibilisant (`×sensitivity/3`), seuil `≥2` → HE, sulfates, exfoliant fort, bonus filtre minéral |
| `concerns` | `Record<famille, 1..3>` | **le cœur** : `bonusMatch(3.5) × sev × w(pos)`, plafond 10/ingrédient, 30 au total |
| `strengthCeiling` | entier (défaut 2) | `strengthMax - ceiling` × −5 |
| `pregnancy` | booléen | **cap dur à 15** |
| `allergies` | `string[]` (sous-chaîne INCI, MAJUSCULES) | **cap dur à 10** |
| `avoid` | — | **jamais lu.** Champ mort de `profil.json`. |

Deux autres consommateurs mangent le MÊME objet et doivent donc être servis par la
même fonction : `ficheIngredients` (moteur.ts:112) → `sensitivity`, `skinType`,
`pregnancy`, `concerns` ; et `avisPour`/`overviewPour` (`ProfilAvis`) → `skinType`,
`concerns`. Une seule conversion suffit pour les trois.

### Le piège `skinType` (vérifié)
`CONFIG.richesse.riche = { oily, combination, normal, dry }` — **pas de clé
`sensitive`/`sensible`**, et l'accès est `?? 0`. Donc si on passe `"sensitive"`
comme type de peau, **tout le bloc adéquation richesse/texture se tait en
silence** : ni bonus ni malus, aucune erreur, personne ne le voit.
Corollaire : `skinType` doit porter **la texture seule**. La réactivité passe
intégralement par `sensitivity`.
(Bizarrerie confirmée : `CONFIG.sulfates` mélange les langues — clé `sensible`
française au milieu de clés anglaises. Elle n'est atteinte que par le booléen
`sensible`, jamais par `[peau]`.)

## 2. Les 7 familles de bénéfice, mesurées dans le dictionnaire

`dictionnaire.json` : 3 165 entrées, 1 572 actifs, et **exactement 7 familles** :
`dehydration` 453 · `aging` 547 · `blemishes` 118 · `oiliness` 72 · `barrier` 213 ·
`redness` 353 · `spots` 132.

Les clés de `concerns` DOIVENT être ces 7 mots. Pas d'`id` d'attribut, pas de
`pores`, pas de `texture` : une clé inconnue ne lève aucune erreur, elle ne
matche simplement jamais.

Vérification des actifs canoniques (pour choisir la correspondance sur des faits,
pas sur des intuitions) :

```
SALICYLIC ACID    [blemishes]                  KAOLIN          [oiliness]
NIACINAMIDE       [blemishes,oiliness,aging]   ZINC PCA        [oiliness]
GLYCOLIC ACID     [aging,spots,blemishes]      CERAMIDE NP     [barrier]
LACTIC ACID       [aging,spots,dehydration]    PANTHENOL       [dehydration,barrier]
MANDELIC ACID     [aging,spots,blemishes]      UREA            [dehydration,barrier]
ASCORBIC ACID     [aging,spots]                CENTELLA        [redness,barrier]
RETINOL           [aging]                      ALLANTOIN       [redness]
AZELAIC ACID      [blemishes,spots]            CAFFEINE        [redness]  ← pas "poches"
TRANEXAMIC/ARBUTIN[spots]                      HYALURONIC ACID [dehydration]
```

Conséquences directes :
- **`pores` n'a pas de famille.** Ses actifs (salicylique, niacinamide, kaolin)
  sont tagués `blemishes` + `oiliness`. → `pores` doit viser ces deux-là.
- **`texture` n'a pas de famille.** Ses actifs (AHA) sont tagués `aging`.
- **`radiance` n'a pas de famille.** Son actif (vit. C) est tagué `aging`+`spots`.
- **`under_eye_puffiness`/`under_eye_circles` n'ont aucun actif.** La caféine est
  rangée en `redness` : mapper les poches sur `redness` ferait dire au moteur
  « l'allantoïne cible tes poches ». Ce sont de **vrais orphelins**.

## 3. Chaque famille activée produit une PHRASE à l'écran

`scorePerso` pousse `label: "${ingrédient} targets your ${libelle(b)}"` et
`libelle()` (scoring.mjs:657) traduit : blemishes→"breakouts", oiliness→"oily
T-zone", aging→"fine lines", spots→"dark spots", dehydration, redness, barrier.

Donc la table de correspondance n'est pas un détail interne : **mapper `texture`
sur `aging` fait écrire « Glycolic acid targets your fine lines » à quelqu'un de
22 ans qui a coché « texture »**. Ce n'est pas acceptable tel quel.

La correction est d'une ligne, et elle a déjà un précédent maison : `avis.ts`
appelle `blemishes` « **Breakouts & clogged pores** ». Il suffit d'aligner
`libelle()` sur des formulations qui restent vraies pour les deux sources :

```
blemishes  → "breakouts & clogged pores"   (acne, comedones, pores)
oiliness   → "oil & visible pores"         (shine, pores)
aging      → "fine lines & skin texture"   (fine_lines, wrinkles, texture)
spots      → "uneven tone & dark spots"    (dark_spots, post_acne_marks, tone_evenness, radiance)
dehydration, redness, barrier : inchangés
```

## 4. Table de correspondance retenue (16 → 7)

| attribut (1-4) | famille(s) | sévérité |
|---|---|---|
| acne | blemishes | `level−1` |
| comedones | blemishes | `level−1` |
| pores | blemishes + oiliness | `level−1` |
| post_acne_marks | spots | `level−1` |
| texture | aging | `level−1` |
| flaking | dehydration + barrier | `level−1` |
| tone_evenness | spots | `level−1` |
| radiance | spots | `level−1` |
| dark_spots | spots | `level−1` |
| redness | redness | `level−1` |
| shine | oiliness | `level−1` |
| visible_vessels | redness | `level−1` |
| fine_lines | aging | `level−1` |
| wrinkles | aging | `level−1` |
| under_eye_circles | **orphelin** | — |
| under_eye_puffiness | **orphelin** | — |

`barrier` reçoit aussi, et surtout, le `bucket` : `fragile → 3`, `sensible → 2`.
C'est la meilleure source : aucun des 16 attributs ne mesure la barrière, alors
que `deriveBucket()` la déduit déjà (et est testé).

Agrégation par famille : **MAX**, jamais somme — la sévérité est un multiplicateur
1-3 dans `bonusMatch × sev`, une somme sortirait de l'échelle.

Échelle : l'IA note **1-4 avec 1 = idéal/absent** (vérifié dans `prompt.ts`, y
compris pour les trois attributs affichés « binaires » : la consigne dit bien
« 1=absent · 4=present », donc `level−1` marche pour eux aussi, contrairement à ce
que laisse croire `attributes.ts`). `CONFIG` attend 1-3. Donc **`sev = level − 1`,
on garde ≥ 1**. Zéro conversion arbitraire, et « niveau 1 = rien vu » donne bien
« pas de préoccupation ».

## 5. MESURE — la saturation est le vrai danger (515 sérums notés)

| familles actives | moyenne | écart-type | % à 100/100 | % au plafond de matchs |
|---|---|---|---|---|
| 0 | 62,9 | 19,2 | 0,0 % | 0 % |
| 2 | 67,0 | 20,5 | 2,7 % | 0 % |
| 3 | 75,7 | 20,0 | 12,6 % | 0 % |
| 4 | 78,1 | 19,9 | 17,3 % | 1,2 % |
| 6 | 84,4 | 18,5 | 34,2 % | 28,5 % |
| 7 | 85,1 | 18,2 | 36,1 % | **39,4 %** |

**Un profil qui a tout n'a rien.** À 7 familles, 36 % des sérums affichent
100/100 et 39 % butent sur `plafondMatchs` : le score cesse de classer. Or un
profil réel y arrive facilement — 3 choix q1 (jusqu'à 5 familles) + ce que la
photo voit. → **il faut plafonner à 4 familles**, triées par sévérité décroissante,
puis priorité déclarée (q1), puis `IMPORTANCE` de l'attribut source.

## 6. MESURE — le branchement change VRAIMENT ce que les gens voient

Top-3 par catégorie, comparé au top-3 du bouchon `profil.json` :

| profil | sérums | nettoyants | solaires | traitements |
|---|---|---|---|---|
| grasse acnéique | 2/3 | 2/3 | 3/3 | 1/3 |
| sèche réactive | 1/3 | **0/3** | **0/3** | 1/3 |
| mature taches | 1/3 | 1/3 | 2/3 | **0/3** |

Moyennes des nettoyants : 67,0 (bouchon) vs 49,1 (sèche réactive) vs 70,4 (grasse).
Le moteur est donc bien discriminant : le bouchon ne « fausse un peu » rien du tout,
il sert littéralement les recommandations d'une autre personne.

## 7. Ce qui casse si on branche naïvement (pièges vérifiés)

1. **`answers` peut être `{}`.** `src/app/api/scan/route.ts:30` écrit
   `answers: answers ?? {}` et ne valide RIEN. `buildEngineProfile` fait
   `answers.q7.includes(...)`, `answers.q2.filter(...)` → **TypeError** sur un
   scan enregistré sans questionnaire. Il faut normaliser sur `EMPTY_ANSWERS`
   avant tout appel. Il n'existe aucun schéma zod pour `Answers` (contrairement à
   `AnalysisResult`) — c'est le trou.
2. **`result` n'est pas validé non plus** à l'écriture (seul `result.score` est
   contrôlé). → `AnalysisResultSchema.safeParse` obligatoire à la lecture, comme
   le fait déjà `/api/moi/bilan`.
3. **`normalizeSkinType` renvoie `"sensible"`**, valeur qui éteint silencieusement
   le bloc adéquation (§1). Et elle renvoie du **français** (`grasse`, `seche`,
   `mixte`) là où le moteur veut de l'anglais. `buildEngineProfile` n'est donc
   **pas** réutilisable tel quel : il faut une traduction explicite.
4. **q2 → `allergies` serait un désastre.** `allergies` déclenche un **cap à 10**
   par simple sous-chaîne INCI ; y mettre `"FRAGRANCE"` mettrait à 10/100 tout
   produit parfumé. q2 doit alimenter `sensitivity`, pas `allergies`.
   `allergies` reste `[]` tant qu'on ne demande pas d'ingrédient nommé.
5. **`profil()` et `data/scan/profil.json` deviennent du code mort** — seul
   `profil-utilisateur.ts` les lit.
6. **`/api/produit/overview/route.ts` n'a pas de `try/catch`** autour de
   `profilUtilisateur(uid)`, contrairement aux 4 autres routes.

## 8. Les caches — il y en a QUATRE, pas un

| # | où | clé aujourd'hui | verdict |
|---|---|---|---|
| 1 | `alternatives/route.ts:17` `Map` module | **catégorie seule** | ❌ à corriger. Empreinte profil dans la clé **+ borne de taille** (Map non bornée = fuite mémoire sur Render) |
| 2 | `overview.ts:96` `Map` | `ref + empreinteProfil` | ✅ **déjà correct** — l'empreinte couvre exactement les entrées du prompt (`skinType` + noms de soucis). Ne rien changer. |
| 3 | `ss-historique` (localStorage) | — | ❌ stocke `perso` figé, réaffiché par `11-dashboard.html:350` et `13-historique.html:166` |
| 4 | **`Protocol.products`** (Postgres, via `/api/shelf`) | — | ❌ le plus grave : `perso` figé **côté serveur**, donc il suit l'utilisateur d'un appareil à l'autre. `ShelfItemSchema` a bien un champ `perso`. |

Le point 2 est intéressant : quelqu'un a déjà résolu le problème correctement à
un endroit. Le commentaire d'avertissement n'est que sur `alternatives`.

**Mesure de coût** : noter **tout** le catalogue (3 152 produits avec INCI) prend
**329 ms** ; 50 produits, 16 ms. Donc la bonne réponse à 3+4 n'est pas
d'inventer une invalidation : c'est une route `POST /api/produit/scores`
(liste de noms → `{formule, perso}` frais) que le dashboard, l'historique et le
shelf appellent au chargement. Coût réel < 20 ms, et le problème disparaît
pour de bon au lieu d'être versionné.

## 9. Sensibilité, force, grossesse

- `sensitivity` ← `bucket` : `fragile → 3`, `sensible → 2`, sinon `0`.
  Plancher à 1 si q2 contient `fragrance` ou `essential-oils`, ou si
  `redness ≥ 2`. Motif : quelqu'un qui déclare réagir au parfum doit voir le
  parfum pénalisé même si sa photo est calme (`malusParfumSensible = 4 × sensitivity`).
- `strengthCeiling` ← `buildEngineProfile` **sans conversion** : même échelle que
  `strength` du dictionnaire. Vérifié : `strength` vaut 0 (3 035 entrées), 1 (114),
  2 (14), 3 (**2** : adapalène, hydroquinone). Donc en pratique le plafond ne mord
  que pour `bucket = fragile` (ceiling 1). Constat de calibration, pas de
  branchement — à signaler, pas à corriger ici.
- `pregnancy` ← `q7.includes("pregnancy")`. Cap 15 : c'est violent et c'est voulu
  (registre sécurité). Rien à changer.

## 10. Abonné sans bilan

`/api/moi` ne dit pas si un bilan existe ; `/api/moi/bilan` renvoie `{bilan:null}`.
Trois options, une seule tient :
- servir `PROFIL_NEUTRE` → il a payé et voit une « note perso » qui n'est pas
  personnalisée, sans savoir pourquoi. Mensonge par omission.
- ne rien renvoyer → l'écran ne distingue pas « pas abonné » de « pas de scan ».
- **renvoyer un statut explicite** (`profil: "absent"`) pour que l'écran affiche
  « Fais ton scan visage pour débloquer ta note personnelle » + CTA. Retenu.

## 11. Ce que j'écris, et où

1. `src/lib/scan/profil-peau.ts` (nouveau) — la conversion pure, testable, sans DB :
   - `ATTRIBUT_VERS_FAMILLES: Record<string, Famille[]>` (§4)
   - `profilPeauDepuis(result, answers): ProfilPeau` — la seule fonction qui
     traduit. Pure, synchrone, aucun accès réseau/DB.
   - `empreinteProfil(p): string` — pour les clés de cache.
2. `src/features/funnel/answers.ts` (nouveau) — `AnswersSchema` (zod) +
   `normaliserAnswers(unknown): Answers` sur `EMPTY_ANSWERS`. Bouche le trou du §7.1.
3. `src/lib/scan/profil-utilisateur.ts` (réécrit) — lit la dernière `Analysis`
   du `uid`, `safeParse`, appelle `profilPeauDepuis`, renvoie `null` si pas de
   bilan. Cache mémoire court (60 s) par `uid`, borné.
4. `alternatives/route.ts` — clé de cache `categorie + "::" + empreinteProfil`, Map bornée.
5. `scoring.mjs` `libelle()` — les 4 libellés du §3.
6. `POST /api/produit/scores` (nouveau) — re-notation en lot (§8).

Je NE réutilise PAS `buildEngineProfile` comme source : il produit un
`EngineProfile` pour le moteur de routine (skinType français, `concerns` = ids
d'attributs, `needs` = niveaux 2-4), pas un `ProfilPeau`. Je réutilise en revanche
`deriveBucket`, `derivePhase` et `topConcerns` — déjà testés — à l'intérieur de
`profilPeauDepuis`. Écrire une deuxième traduction serait un deuxième vocabulaire
à maintenir.

## 12. Comment on vérifie

1. **Test unitaire de la conversion** — 6 bilans figés (`sample.ts`, `exclusive.ts`,
   `exclusive2.ts` existent déjà comme fixtures) → 6 `ProfilPeau` attendus, en dur.
2. **Test « answers pourries »** — `{}`, `null`, `{q1:"blemishes"}` (string au lieu
   d'array), `result` amputé de `attributes` → aucune exception, profil dégradé.
3. **Test anti-saturation** — pour chacun des 6 profils : `≤ 4` familles.
4. **Test de discrimination (le seul qui prouve le branchement)** — deux profils
   opposés (grasse acnéique / sèche réactive) sur les 388 nettoyants : le top-3
   doit être **disjoint**, et l'écart de moyenne > 10 points. C'est exactement
   la mesure du §6, transformée en test.
5. **Test de gating étendu** — `gating.test.ts` existe déjà ; y ajouter le cas
   « premium sans bilan » → `perso` absent + `profil: "absent"`.
6. **Test de cache** — deux `uid` différents sur `/api/produit/alternatives?categorie=serum`
   → deux listes différentes. Ce test échoue AUJOURD'HUI ; c'est le test qui
   prouve que le piège est fermé.
7. **Sur les 7 comptes réels** — un script de lecture seule qui imprime, pour
   chaque `userId`, le `ProfilPeau` produit et le top-3 sérums. Aucun profil ne
   doit être vide, aucun ne doit être identique à un autre.

---

## 13. Deuxième vague de mesures (après envoi de ma position à randy)

### A. Le piège `skinType = "sensitive"`, prouvé au chiffre
Mêmes `concerns`, même `sensitivity`, on ne change QUE le type de peau :

| catégorie | produits notés différemment entre `"dry"` et `"sensitive"` | écart max | `"sensitive"` ≡ pas de type du tout ? |
|---|---|---|---|
| moisturizer (545) | **233 (43 %)** | 13 pts | **OUI, identique partout** |
| cleanser (383) | **238 (62 %)** | 13 pts | **OUI** |
| serum (515) | **321 (62 %)** | 13 pts | **OUI** |

`skinType:"sensitive"`, `skinType:"sensible"` et `skinType:""` donnent des notes
**strictement identiques** sur tout le catalogue. Passer « sensible » comme type
de peau, c'est donc littéralement ne pas passer de type de peau — et se priver
d'un effet qui vaut jusqu'à 13 points sur 43 à 62 % des produits.

**Règle de dérivation de la texture** quand le libellé IA n'en donne pas une
(« Sensitive, compromised barrier » = le cas réel d'`exclusive2.ts`), dans cet
ordre — calé sur la consigne de `prompt.ts` (« flaking/tightness = Dry ») :
`shine ≥ 3 → oily` · sinon `flaking ≥ 2 → dry` · sinon `shine = 2 → combination`
· sinon `normal`.

### B. Le plafond de familles, repris sur des bilans RÉELS
Mon tableau du §5 faisait varier N familles toutes à sévérité 2 : il **surestime**
la saturation. Sur les trois bilans figés du dépôt, les sévérités sont graduées et
l'effet est plus modeste — mais il existe :

| bilan | familles nues | % à 100/100 sans plafond | avec plafond 4 | avec plafond 3 |
|---|---|---|---|---|
| `sample.ts` (Combination) | 4 | 2,3 % | 2,3 % (inchangé) | 1,0 % |
| `exclusive.ts` (acné) | 6 | 23,7 % | **14,6 %** | 13,8 % |
| `exclusive2.ts` (barrière) | 7 | 20,0 % | **13,2 %** | 9,7 % |

Le plafond à 4 coupe donc ~40 % des scores parfaits sur les profils chargés, et
ne touche pas un profil ordinaire. Passer de 4 à 3 ne gagne presque rien
(14,6 → 13,8 ; 13,2 → 9,7) et ampute un profil légitimement multi-problèmes.
**4 est le bon réglage**, et je le tiens désormais sur des bilans réels, pas
sur un profil synthétique.

### C. `sensitivity` : je me suis inquiété pour rien
Je craignais une falaise à `sensitivity = 2`. Mesuré (profil `exclusive2`, 515 sérums) :

| sensitivity | moyenne | écart-type |
|---|---|---|
| 0 | 83,9 | 13,7 |
| 1 | 78,0 | 20,0 |
| 2 | 71,8 | 27,4 |
| 3 | 68,3 | 30,1 |

C'est un **gradient régulier** (−5 à −6 points par cran), et surtout l'écart-type
**double** : plus la sensibilité monte, mieux le moteur SÉPARE les produits. Ce
n'est pas une falaise, c'est le contraire d'un problème. Je retire l'objection (c)
de mon message à randy : `fragile → 3 · sensible → 2 · sinon 0` tient.

### D. Le plancher q1 (mon point le plus discutable), mesuré
Profil `sample.ts` (mixte quasi nette), l'utilisatrice coche « Fine lines » en q1
alors que la photo ne voit rien (`fine_lines=1`, `wrinkles=1`). 515 sérums :

| plancher `aging` | moyenne | top-3 |
|---|---|---|
| aucun (q1 ignoré) | 68,1 | ANUA Niacinamide · Dr. Althea Vit C · Bloomeffects |
| 1 | 70,8 | ANUA Niacinamide · Naturium Vit C · Dr. Althea |
| **2** | **74,0** | ANUA Niacinamide · PEACH & LILY · Naturium Vit C |
| 3 | 76,7 | **Estée Lauder ANR** · ANUA · PEACH & LILY |

À 3, une préoccupation *déclarée mais invisible* **prend la première place** et
détrône ce que la photo a vraiment mesuré : trop. À 1, le classement bouge à peine :
l'utilisatrice a coché quelque chose et il ne se passe presque rien. **2 est le seul
réglage où la déclaration pèse sans écraser la mesure** — le n°1 mesuré reste n°1,
les places 2-3 se réorganisent. C'est le comportement voulu.

### E. Ce qu'un abonné à la peau nette voit aujourd'hui (à trancher côté produit)
16 attributs à 1, aucun q1 → `concerns = {}` : moyenne 69,0 et **0,68 ligne
« facts » affichée en moyenne** sur les 515 sérums. Autrement dit, un abonné à la
peau parfaite paie pour une « note personnelle » quasi muette. Une seule famille
déclarée fait passer à 1,41 ligne. C'est un argument de plus pour le plancher 2
sur q1 — mais le fond (que montrer à quelqu'un qui n'a rien à corriger ?) est un
choix produit, pas un choix de branchement.

### F. Les orphelins du contour de l'œil : vérifié, il n'y a pas d'issue au scoring
Recherche des actifs oculaires canoniques dans le dictionnaire (127 correspondances) :
`CAFFEINE` → `redness` · `ESCIN` → `redness` · `HESPERIDIN METHYL CHALCONE` → `redness` ·
`CHRYSIN` → `aging` · `PALMITOYL TETRAPEPTIDE-7` → `aging`.
Autrement dit les composants d'Haloxyl et d'Eyeliss sont éparpillés entre `aging`
et `redness` : **aucune famille ne porte le contour de l'œil**. Mapper
`under_eye_puffiness → redness` ferait écrire « Escin targets your redness » à
quelqu'un qui n'a pas de rougeurs — un énoncé faux à l'écran. Les orphelins
restent orphelins.

Mais l'option **« Eye area » existe en q1** : l'utilisatrice peut la cocher et il
ne se passe rien. La sortie honnête n'est pas dans le score, elle est dans le
**routage** : `eye_area` déclaré → l'app met en avant la catégorie `eye-cream`
(144 produits au catalogue) au lieu de tenter d'inventer une famille. À remonter
comme choix produit.

### G. Correction de mon §11 : pas de cache dans `profilUtilisateur`
J'avais proposé un cache mémoire 60 s par `uid`. Je le retire : la lecture est
**une** requête sur un index existant (`@@index([userId, createdAt])`), et un
cache de 60 s introduirait une fenêtre où un re-scan tout juste terminé ne change
rien à l'écran — exactement le défaut qu'on est en train de corriger. Le seul
cache qui vaut le coup est celui du **classement** dans `alternatives` (545
hydratants ≈ 60 ms), et il doit être borné et porter l'empreinte du profil.

### H. Inventaire complet des écrans qui affichent un `perso` FIGÉ
- `11-dashboard.html:350` — depuis `ss-historique`
- `13-historique.html:166` — depuis `ss-historique`
- `18-bilan.html:549` — depuis le **shelf**, donc depuis `Protocol.products` en base
Les autres (`06-result-premium.html`) recalculent en direct via `/api/produit/*` :
eux n'ont aucun problème. Aucun test ni aucun écran ne dépend du TEXTE des `facts`
(`grep "targets your"` ne sort que `scoring.mjs:576`) : le changement de `libelle()`
est donc sans risque de régression.

---

## 14. Après le débat avec randy — ce que je concède, et ce que je maintiens

### Je concède : mon plafond de familles était le bon diagnostic, le mauvais remède
randy a mesuré ce que je n'avais pas regardé — les **ex æquo au rang 1**. Quand
beaucoup de produits butent sur 100/100, le tri de `alternatives`
(`b.perso - a.perso || b.formule - a.formule`) retombe sur la note formule, qui
ne dépend pas du profil : les « 3 meilleurs pour TA peau » redeviennent les mêmes
pour tout le monde. J'ai reproduit la mesure, 6 catégories × 4 bilans :

| schéma | ex æquo moyens rang 1 | produits distincts dans les 4 top-3 (max 12) |
|---|---|---|
| naïf (toutes familles, sévérité absolue) | 34,1 | 4,2 |
| **bob : plafond 4 familles, absolu** | **19,3** | **5,2** |
| plafond 3 familles, absolu | 17,1 | 6,3 |
| **randy : top-3 + renormalisation Σ=4** | **6,1** | **7,2** |

Mon plafond atténue, il ne règle pas : 75 ex æquo sur les sérums pour le profil
acné, 3 produits distincts sur 12. **Position abandonnée.**

Je concède aussi l'architecture (`buildEngineProfile` + adaptateur). Mon objection
— « pour dériver la texture il faut `result`, donc double lecture » — est **fausse** :
`EngineProfile.needs` porte `shine` et `flaking` avec leur niveau dès ≥2. Et les
priorités q1 non mesurées sont récupérables (`topConcerns` filtre à ≥3, `needs` à
≥2 : tout id de `engine.concerns` avec `needs[id] < 3` vient de q1).

randy a aussi trouvé deux choses que je n'avais pas : **`deriveBucket` n'ouvre
jamais q5** (or les 5 symptômes tombent exactement sur des familles :
breakouts→blemishes, dry→dehydration, oily→oiliness, redness→redness,
spots→spots) ; et **`06-result-premium.html:1225` renvoie vers `03-result-free`,
dont le CTA envoie un abonné payant au paywall** (vérifié ligne à ligne). Son
chiffre allergies vérifié aussi : 836 produits contiennent `FRAGRANCE`/`PARFUM`
sur 3 152, soit exactement 26,5 %.

### Je maintiens : « ≤ 4 » et non « = 4 »
La renormalisation systématique **efface la sévérité absolue**. Une seule famille,
on ne fait varier que le niveau vu sur la photo (515 sérums) :

| niveau photo | sev absolue | sev après Σ=4 | moyenne absolu | moyenne Σ=4 |
|---|---|---|---|---|
| 2 (léger) | 1 | 4,0 | 64,8 | **69,0** |
| 3 (modéré) | 2 | 4,0 | 66,7 | **69,0** |
| 4 (sévère) | 3 | 4,0 | 68,2 | **69,0** |

Acné légère et acné sévère : mêmes 69,0, mêmes 26 ex æquo, mêmes 0,84 ligne
d'explication. Le moteur ne les distingue plus. (Et Σ=4 sur une famille unique
donne `sev = 4`, hors de la plage 1-3 documentée par `CONFIG.bonusMatch`.)

**Correctif : plafonner Σ à 4, ne redescendre que ce qui dépasse.**

| schéma | ex æquo moyens | diversité | légère vs sévère |
|---|---|---|---|
| top-3 Σ **=** 4 | 6,1 | 7,2/12 | 69,0 vs 69,0 |
| **top-3 Σ ≤ 4** | **5,8** | **7,5/12** | **64,8 vs 68,2** |

Strictement dominant sur les deux métriques de randy, et la sévérité survit. Pour
3 de nos 4 bilans (Σ des top-3 = 7) le résultat est identique au sien : ce sont
exactement les profils chargés que sa normalisation devait mater. La différence
ne porte que sur le profil léger, qui garde une personnalisation discrète — le
comportement juste. Et son argument de calibration survit : `profil.json`
(`{blemishes:2, oiliness:2}`) fait Σ=4, donc il passe inchangé sous plafond.

---

## 15. Troisième tour — `redness`, les libellés, et un bug de mesure chez moi

### Avertissement de méthode : j'ai failli publier un chiffre faux
Ma première mesure des « apaisants dans le top 20 » disait **0/20** alors que le
top-3 affichait un toner Centella. La contradiction visible m'a fait rouvrir le
test. Cause : les INCI du catalogue sont en **Title Case** (« Centella Asiatica
Extract »), pas en majuscules — c'est `parseInci` qui les met en majuscules, en
interne. Toute regex sur `p.inci` doit être insensible à la casse. Consigné ici
parce que la même erreur invalide silencieusement n'importe quelle mesure par
motif d'ingrédient.

### `redness` doit matcher — bonne conclusion, mauvais mécanisme
`notation-debat.md` §4.9 (proposé par `ouest`, jamais contredit) veut que
`redness`/`visible_vessels` ne servent qu'à corroborer `sensitivity`, jamais au
matching produit. randy s'y oppose au motif qu'un apaisant ne pourrait plus
gagner de points. **Mesuré, ce motif est faux.** Profil `exclusive2` (rougeur 3,
barrière fragile, sensitivity 3), apaisants dans le top 20 :

| catégorie | AVEC `redness` | SANS `redness` |
|---|---|---|
| toner (292) | 15/20 | 14/20 |
| moisturizer (545) | 7/20 | **10/20** |
| serum (515) | 12/20 | 11/20 |

Les apaisants ne tombent pas, ils **montent** chez les hydratants : Centella porte
`["redness","barrier"]`, le panthénol `["dehydration","barrier"]`, le
madécassoside `["redness","barrier"]` — retirer `redness` ne les prive pas de
canal, ils gagnent sur les deux autres familles du profil.

**Ce qui tient vraiment**, ce sont les lignes d'explication POSITIVES par produit :

| catégorie | AVEC | SANS |
|---|---|---|
| toner | 3,93 | 2,67 |
| moisturizer | 4,29 | 3,30 |
| serum | 3,96 | 2,88 |

Un tiers des raisons positives disparaît, et ce sont celles qui parlent de ce
qu'elle voit dans le miroir. Le classement bouge peu, le **discours** s'appauvrit
beaucoup. Conclusion de randy retenue, argument remplacé.

Pas de double comptage : `sensitivity` ne fait que **retirer** des points,
`concerns.redness` ne fait qu'en **ajouter**. Seul chevauchement, sans gravité :
`visible_vessels ≥ 2` bascule `deriveBucket` sur `sensible` **et** alimente
`redness` en sévérité 1 — deux effets disjoints sur un même signal.

### Libellés : ni sa chaîne, ni la mienne — le profil porte les siens
Le routage `texture, radiance → aging/spots` est bon (établi sur le dictionnaire).
Le problème est la phrase produite : `"${Ingrédient} targets your ${libelle(b)}"`.
- « fine lines & skin texture » (moi) ne couvre pas l'éclat → ment pour `radiance`.
- « skin renewal » (randy) se lit mal dans le gabarit : « Retinol targets your
  skin renewal » n'est pas de l'anglais courant.
- Défaut commun : **une chaîne fixe est fausse pour quelqu'un.**

**Troisième voie : le profil transporte ses propres libellés.** La couche de
branchement sait quels attributs ont alimenté chaque famille — c'est notre table.
Elle produit donc, à côté de `concerns`, un `libelles: Record<famille, string>` :

| famille alimentée par | libellé |
|---|---|
| `texture` seul | skin texture |
| `fine_lines` seul | fine lines |
| les deux | fine lines & texture |
| `radiance` seul | dullness |
| `dark_spots` seul | dark spots |
| les deux | dullness & dark spots |

Côté moteur : **une ligne**, `libelle(b)` → `profil.libelles?.[b] ?? libelle(b)`.
Vérifié, `libelle()` n'a qu'un seul point d'appel (`scoring.mjs:576`) ; `avis.ts:118`
a le même besoin et la même correction d'une ligne. Le repli existant reste, donc
`PROFIL_NEUTRE` ne bouge pas. Chaque phrase devient vraie **pour cette personne-là**,
ce qu'aucune chaîne fixe ne peut faire.

### Qui écrit
Je cède la plume à randy (il l'a demandée, il a la table et l'inventaire au
propre) et je prends la relecture en démolition. Je lui ai transmis mes valeurs
arrêtées et les mesures qui les justifient pour qu'il n'ait rien à recalculer.

---

## 16. Le bug que le bouchon masquait (trouvé par randy, vérifié et élargi ici)

`overview.ts` `LIBELLE_SOUCI` (ligne 36) porte encore l'ancienne taxonomie à
**11 clés** : `blemishes, oiliness, dehydration, redness, darkspots, wrinkles,
pores, texture, dullness, barrier, sensitivity`.

Deux défauts, pas un :
- **`aging` et `spots` manquent** → `LIBELLE_SOUCI[k] || k` laisse passer le mot
  interne brut.
- **6 des 11 clés sont MORTES** (`darkspots`, `wrinkles`, `pores`, `texture`,
  `dullness`, `sensitivity`) : elles ne peuvent jamais être atteintes, puisque les
  clés de `concerns` ne peuvent être que les 7 familles du dictionnaire.

Compte réel : **5 clés utiles, 6 mortes, 2 manquantes.** `avis.ts` a bien ses 7
(vérifié) : le correctif ne concerne qu'`overview.ts`.

**Pourquoi le bouchon le masquait** : `blemishes` et `oiliness` — les deux seules
préoccupations de `profil.json` — sont précisément les deux familles présentes
dans les trois listes à la fois. Le profil écrit à la main tombe pile sur le
sous-ensemble qui ne révèle rien.

**Pourquoi c'est plus grave qu'un libellé d'écran** : `overview.ts:118` fabrique
la ligne `Flagged concerns: …` du **prompt** envoyé au modèle. Écrire « aging,
spots » au lieu de « fine lines, dark spots » change **ce que le modèle cherche
dans les avis**, donc le paragraphe qu'il écrit. C'est le seul des trois libellés
qui modifie une sortie d'IA — et c'est un argument de plus pour les libellés
portés par le profil (§15), qui donnent ici « dullness » ou « dark spots » selon
l'attribut réellement à l'origine de la famille.

**Ligne de base des tests, vérifiée indépendamment** : `npx vitest run` →
**29 fichiers, 188 tests, tout au vert, 8,75 s**. C'est le repère contre lequel
le branchement devra se mesurer.

## 17. Répartition finale du travail
randy tient la plume de `docs/specs/profil-branchement-plan.md`. Je lui ai
transmis l'ensemble des valeurs arrêtées et les mesures qui les justifient, et je
passe en relecture — en cherchant ce qui cloche, pas en cherchant à être d'accord.

---

## 18. Relecture en démolition du plan de randy

Sept remarques, dans l'ordre de gravité. Les quatre premières sont des trous
vérifiés, les deux suivantes des désaccords, la dernière du ménage.

### 1. BLOQUANT — l'ordre de sélection du §3.2 supprime une acné de niveau 4
L'étape 1 place **toutes** les familles déclarées en q1 devant tout le mesuré,
sans condition de sévérité. q1 autorise 3 choix et une valeur peut déplier 2
familles : les 3 places sont mangées avant que la photo parle.

Bilan `exclusive.ts` (`acne: 4`, `redness: 3`, `comedones: 3`, `pores: 3`,
`shine: 3`) + `q1 = ["hydration","fine_lines"]` :

```
ordre randy : {dehydration:1, barrier:1, aging:2}      ← blemishes ABSENT
ordre bob   : {blemishes:1.714, redness:1.143, spots:1.143}
```

Les top-3 sérums diffèrent réellement. Ce n'est pas une note ratée, c'est
l'argument de vente du scan qui tombe : *voir ce que tu ne déclares pas*.

**Et ses propres mesures ne viennent pas de sa règle** : la ligne `exclusive.ts`
de son §3.4 donne `{blemishes:1.71, spots:1.14, redness:1.14}`, soit un tri par
sévérité. Les fixtures du dépôt sont des `AnalysisResult` **sans `answers`** :
q1 y est vide, son étape 1 n'a jamais été exercée. La partie qu'il signale comme
la plus faible est celle que ses chiffres ne couvrent pas.

**Règle unique proposée** : une seule liste triée par sévérité décroissante ; le
déclaré y entre avec son plancher et se classe comme les autres ; à sévérité
égale le **mesuré** passe devant le **déclaré** ; puis IMPORTANCE × niveau.
Une intention n'est pas une étape : « ce que je dis compte » se traduit par un
**plancher**, pas par une priorité absolue.

### 2. Le cinquième cache manque
`grep -i "protocol\|shelf\|18-bilan"` sur le plan : **aucune occurrence**. Or
`/api/shelf` persiste les items dans `Protocol.products`, `ShelfItemSchema` a un
champ `perso`, et `18-bilan.html:549` le réaffiche. Score personnalisé **figé en
base**, qui suit l'utilisateur d'un appareil à l'autre — pire que `ss-historique`.

Son correctif §5.4 par estampille a en outre un coût non nommé : après un re-scan
l'écran **retire** la note perso et retombe sur la formule. 16 ms pour 50 produits
(mesuré) : une route `POST /api/produit/scores` rend le bon chiffre au lieu d'en
cacher un, et règle `ss-historique` **et** le shelf d'un coup.

### 3. Les nouveaux champs de `/api/moi` n'atteindront pas le front
`SS.moi()` (`app.js:141-153`) ne relaie pas la réponse, il la **recopie champ par
champ** — et trois endroits filtrent : lecture du cache, recopie, écriture du
cache (plus `MOI_NEUTRE`). `bilan`/`bilanDate` seront jetés en silence. Le §5.4
(estampille) et le §6.3 (CTA) en dépendent tous les deux.

### 4. §1.1 contre §1.3 : ça ne compile pas
§1.1 fait de `ProfilPeau.skinType` l'union stricte `"oily"|"combination"|"dry"|"normal"`
et remplace le type de `moteur.ts:109` (aujourd'hui `skinType?: string`, permissif).
§1.3 laisse `PROFIL_NEUTRE` inchangé, avec `skinType: ""`. Or les cinq routes
passent `PROFIL_NEUTRE` à `ficheIngredients` sur le chemin gratuit.
**Tranche** : un type de **lecture** élargi pour `ficheIngredients`, un type de
**sortie** strict pour ce que produit la conversion.

### 5. Désaccord — le plancher q1 à 1
Sous le schéma final (top-3, Σ≤4), peau nette déclarant « taches » :

| plancher | concerns | moyenne | lignes « why » affichées |
|---|---|---|---|
| 1 (randy) | `{spots:1}` | 71,1 | **0,28** |
| 2 (bob) | `{spots:2}` | 72,8 | **0,50** |

Le plancher **double** l'explication. Et son §10 choix 3 (« panneau why vide pour
une peau nette ») est la conséquence directe de ce réglage : il pose la question
au produit tout en ayant choisi la réponse qui l'aggrave.

### 6. Désaccord — le §10 choix 1 présente une fausse alternative
« Renommer les trois chaînes » ou « accepter qu'on parle de ridules ». La
troisième voie (§15 : le profil transporte ses propres libellés, une ligne à
chacun des 3 points d'appel) n'est pas mentionnée. Rejetable, pas dissimulable.

### 7. Ménage
- §4.2 « `sensitivity` ≥ 2 si le type est `sensible` » est **redondant** :
  `buildEngineProfile:80` teste déjà `/sensible|sensitive|réactive|reactive/i` sur
  le libellé et le verse dans `sensitive`, que le §4.3 traduit en 2. Un libellé
  « Sensitive, … » ne peut pas atteindre le §4.2 sans avoir déjà `sensitive: true`.
- §5.2 : avec des sévérités fractionnaires (`1.714…`), chaque profil a une clé
  quasi unique — le partage annoncé entre personnes de même peau ne se produira
  presque jamais. Arrondir à 2 décimales **dans la clé seulement**.

### Ce que je ne conteste pas
L'architecture en trois couches, la table §2 (y compris les deux décisions contre
§4.9), le budget Σ plafonné, la dérivation de la texture, `allergies: []`,
`strengthCeiling` en passe-plat, l'ordre des travaux et le caractère non
déplaçable de l'étape 4, le §8.1 sur `overview.ts`, et le refus de toucher à
`CONFIG` — sur ce dernier point je le soutiens explicitement : rouvrir la
calibration à J-0 serait une faute.

---

## 19. Audit de mes propres mesures (piège `cwd` signalé par randy)

`scoring.mjs:12` construit le chemin des données avec `process.cwd()`. Si le
dictionnaire est introuvable, le moteur **dégrade sans rien dire** : plus aucune
`fiche`, donc zéro match, et `scorePerso` rend malgré tout des nombres plausibles.
Reproduit, même script, deux répertoires :

```
cwd = /Users/jayenbellili/dev/smartskin.app   → moteurDisponible() = true   → moyenne 64,6
cwd = /private/tmp/.../scratchpad             → moteurDisponible() = false  → moyenne 49,5
```

**Verdict sur mes chiffres : tous mes bancs ont tourné avec `cwd` correct et
`moteurDisponible() = true`** (le harnais rétablit le répertoire du projet entre
chaque appel). J'ai relancé la mesure décisive du §18.1 derrière une garde
explicite : résultat identique. Rien à retirer.

Précision utile pour le plan : `moteurDisponible()` est **déjà** exporté et
appelé par les cinq routes produit, qui le renvoient dans `score.disponible`. La
production a le signal ; seuls les scripts ad hoc ne le lisent pas. La garde
`if (!moteurDisponible()) throw` ne crée pas une règle, elle aligne un fichier
sur le reste du code.

### Le motif : deux bancs de mesure faux en deux jours
| bug | forme | ce qui a alerté |
|---|---|---|
| casse des INCI (moi, §15) | regex sensible à la casse sur du Title Case | un top-3 qui contredisait un compteur |
| `cwd` (randy) | dictionnaire introuvable, dégradation muette | deux variantes censées différer, même chiffre |

Dans les deux cas le banc rendait un résultat **cohérent et faux**, et ce n'est
jamais le chiffre qui a prévenu — c'est une **contradiction interne**. D'où deux
garde-fous à inscrire, pas un :
1. `scripts/verifier-profil.mjs` refuse de tourner si le moteur est indisponible ;
2. il **imprime un invariant de contradiction** — la moyenne perso du profil de
   référence `profil.json`, connue entre 65 et 75. Un banc incapable de se
   contredire est incapable de nous prévenir.

---

## 20. Deuxième relecture — un plantage que le plan INTRODUIT

### 1. BLOQUANT — le merge superficiel du §1.2 ne protège pas `q5`
`{ ...EMPTY_ANSWERS, ...(row.answers ?? {}) }` protège le premier niveau, pas
l'intérieur de `q5`, qui est un objet. Un `q5` partiel écrase le défaut entier :

```
answers = {}                 → q5 = {changed:null, symptoms:[]}   ok
answers.q5 = {changed:true}  → q5 = {changed:true}                PLANTE
                               TypeError: … reading 'includes'
```

Ce plantage est **créé par le plan** : `deriveBucket` n'ouvre jamais q5 (randy
l'a établi), donc personne ne lit `q5.symptoms` aujourd'hui. Le plancher du §4.3
en est le premier lecteur — dans une fonction que le §1.2 déclare « ne doit jamais
jeter », appelée par `overview/route.ts`, la seule des cinq routes sans `try/catch`.

`{changed:true}` sans `symptoms` n'est pas théorique : `isStepValid` l'interdit
côté client, `/api/scan` ne valide rien, et `SS.visage.reponses()` garde les
réponses en `localStorage` **entre les versions de l'app**.

**Correctif** : normaliser champ par champ, jamais par spread — ou un
`AnswersSchema` zod avec `.catch()` par champ, exactement le motif que
`AnalysisResultSchema` emploie déjà (`.catch("")` attribut par attribut).

### 2. De la vraie donnée : 5 lignes `Analysis` en base LOCALE
`prisma/dev.db` contient 5 bilans (utilisateur `seeduser` — des lignes de seed
e2e, **pas** les 7 comptes de production ; à ne pas surinterpréter). Elles
révèlent deux formes que le plan ne prévoit pas :

- **`result.attributes` a 3 à 5 entrées, pas 16.** `AnalysisResultSchema` déclare
  `z.array(...)` **sans longueur minimale** : un bilan partiel passe `safeParse`.
  Rien ne plante (`levelOf` retombe sur `?? 1`), mais le profil produit est très
  maigre et le plan ne dit nulle part que c'est un cas normal.
- **`answers.age` vaut `28`**, un nombre, alors que `Answers.age` est
  `string | null` avec des valeurs comme `"25_34"`. Rien ne le lit, donc rien ne
  casse — mais c'est la confirmation empirique que `answers` en base n'est pas
  conforme au type.

Ces 5 lignes sont lisibles en local (`node:sqlite`, lecture seule) : elles font
passer une partie de la recette du §7.3 de « fabriqué » à « observé ».

### 3. Une correction annoncée qui n'est pas dans le fichier
randy m'a écrit que le plan ne prétendrait plus que Σ = 4 est un point de
calibration documenté. Le fichier dit toujours, lignes 340-341 : « le profil sur
lequel le moteur a été **calibré** le 26/08. La calibration est donc préservée par
construction », et ligne 166 « le profil sur lequel le moteur a été **réglé** ».
La seule mention datée du 26/08 dans `CONFIG` porte sur `bonusActif`, côté
**formule**. La partie vérifiable (Σ de `profil.json` = 4 → passe inchangé sous
plafond) suffit ; le reste est une inférence qu'un document de référence ne doit
pas présenter comme un fait.

### Ce que je ne conteste plus
La réécriture du §3.2 (c'est la règle que je proposais, et l'encadré est honnête
jusqu'à la nuance de reproduction du top-3). L'argument de randy sur le plancher
à 2 est **meilleur que le mien** : je raisonnais sur les places du classement ; il
montre que sous la règle de tri retenue, le déclaré n'obtient **pas de siège** dès
qu'un seul attribut est à niveau 2 — c'est un interrupteur, pas une intensité.
Repris à mon compte. Le §5 à cinq caches, le §6 à quatre endroits dans `SS.moi`,
la paire `ProfilPeau`/`ProfilLu` (j'avais lu une version antérieure) et les
libellés portés par le profil : validés.

---

## 21. Contrôle final du plan (1 012 lignes)

Vérifié **dans le fichier**, pas sur parole — randy avait déjà annoncé une fois
une correction qui n'y était pas.

| point | état |
|---|---|
| affirmations de calibration retirées | ✅ `grep "26/08"` ne rend que la ligne 8, factuelle |
| `normaliserAnswers` écrit et remonté en tête de l'ordre des travaux | ✅ |
| §5 annonce **cinq** caches, `Protocol.products` nommé « le pire » | ✅ |
| estampille remplacée par `POST /api/produit/scores` | ✅ avec l'encadré expliquant ce qu'elle ne réglait pas |
| §7.5 « Ce que ce plan n'a PAS vérifié » | ✅ nomme les 7 bilans de prod, les 3 écrans jamais exécutés, mes 329 ms non rejoués |
| bilan partiel (3 attributs) traité comme forme courante | ✅ |
| libellés portés par le profil | ✅ |

### Seule scorie restante : `bilanDate` n'a plus de consommateur
`grep "bilanDate"` ne rend que deux lignes, toutes deux dans le §6 point 1 qui
l'**ajoute**. Les points 2, 3 et 4 lisent `score.profilManquant` ou `m.premium` ;
aucun ne lit `bilanDate`. C'est un reste de l'estampille — il n'existait que pour
comparer la date d'un score mémorisé à celle du bilan courant, et la route de
re-notation l'a rendu inutile. Un champ ajouté à un contrat d'API public que rien
ne lit : à retirer, ou à justifier en une phrase.

### Ce que randy a trouvé mieux que moi, sur la fin
- Mon point sur le merge superficiel était **trop étroit** : je n'avais testé que
  l'objet imbriqué (`q5`). Il a montré deux autres formes qui plantent —
  `q1: "blemishes"` (chaîne au lieu de tableau → `flatMap is not a function`) et
  `q7: null` (un `null` explicite écrase le défaut aussi sûrement qu'une absence).
  Le spread ne protège ni contre le mauvais type ni contre le `null`.
- Sur `dev.db`, sa 4ᵉ observation vaut mieux que mes trois : les 5 lignes ont
  `skinType = "Mixte"`. Le chemin **français** de `normalizeSkinType` n'est donc
  pas une compatibilité héritée théorique dont on pourrait se débarrasser au
  prochain nettoyage — c'est de la donnée vivante. J'avais relevé la valeur, pas
  ce qu'elle protège.

## 22. Bilan du débat
- randy a gagné sur l'**architecture** (réutiliser `buildEngineProfile`) et il a
  trouvé le mal principal, la **saturation** — les ex æquo au rang 1, que je
  n'avais pas pensé à regarder et qui condamnaient mon plafond de familles.
- mais son premier remède (`Σ = 4` strict) effaçait la sévérité absolue, et il a
  fallu ma contre-épreuve (`Σ ≤ 4`) pour le rendre utilisable. **Ni son diagnostic
  seul ni mon objection seule ne donnaient la règle finale** — correction qu'il a
  lui-même demandée à mon premier bilan, où j'écrivais qu'il « avait gagné sur la
  saturation », ce qui était trop généreux dans un seul sens.
- j'ai gagné sur l'**ordre de sélection** : sa règle supprimait une acné de
  niveau 4.
- chacun a trouvé un **banc de mesure faux chez soi** : casse des INCI pour moi,
  `cwd` pour lui. Dans les deux cas l'alerte est venue d'une contradiction
  interne, jamais du chiffre lui-même.
- le plan dit désormais lui-même ce qu'il n'a pas vérifié.

Aucune ligne de `src/` ni de `data/` n'a été modifiée pendant tout ce travail.

---

## 23. Clôture — coupe finale vérifiée

Mon orphelin `bilanDate` en cachait **trois** : la même cause avait laissé trois
traces, toutes filles de l'estampille que la route de re-notation avait remplacée.

| orphelin | d'où il venait |
|---|---|
| `bilanDate` sur `/api/moi` | comparer la date d'un score mémorisé à celle du bilan |
| `Resolution.date` | n'existait que pour alimenter `bilanDate` |
| `createdAt: true` dans le `select` Prisma | on lisait en base une colonne que plus personne ne consommait |

J'avais vu la feuille ; la branche entière était morte. Vérifié après coupe :
`createdAt` ne subsiste que dans `orderBy: { createdAt: "desc" }` (nécessaire pour
prendre le dernier bilan) et a bien quitté le `select` ; `bilanDate` n'apparaît
plus que dans l'encadré qui explique son retrait ; `/api/moi` expose **un** champ
de plus, pas deux. Plan final : 1 016 lignes.

La règle qui vaut au-delà du cas : **un champ non lu ajouté à un contrat d'API
public ne s'en enlève plus jamais.** Le piège ici n'était pas l'inattention — le
champ avait *eu* une justification une heure plus tôt, et l'a perdue quand la
conception qui le portait a été remplacée.

### Ce que ces notes gardent volontairement
Mes **positions abandonnées** figurent ici au même titre que celles qui ont tenu :
le plafond à 4 familles (§18.1, remplacé), mon mécanisme sur `redness` (§15,
faux — bonne conclusion, mauvais argument), ma chaîne de libellé fixe (§15,
remplacée par les libellés portés par le profil), et ma démonstration trop étroite
du merge superficiel (§20.1, élargie par randy).

C'est délibéré : si quelqu'un rouvre le sujet, savoir ce qui a été essayé et
pourquoi ça n'a pas tenu vaut autant que la conclusion. C'est exactement ce qui a
manqué au §4.9 de `notation-debat.md` — une proposition arrivée au dernier round,
jamais éprouvée, que nous avons dû instruire nous-mêmes six jours plus tard.
