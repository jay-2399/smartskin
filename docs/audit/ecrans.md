# Audit des 23 écrans V2 — `public/scan-proto/`

Agent `ecrans`, 2026-09-01. Binômes : `apple` (coquille iOS / App Store), `moteur` (routes et notation).

**Méthode.** Serveur `next dev` sur le port 4010 (le `smartskin-dev` annoncé n'existe pas dans
`.claude/launch.json` — il n'y a que `dev`/3000 et `dev-4001..4003` ; j'ai lancé le port à la main).
Navigation réelle dans Chrome, viewport 375×812. Parcours payant déroulé avec `SCAN_TEST_PREMIUM=1`
dans un `.env.local` **supprimé depuis**, et un compte `audit-ecrans@test.local` + son bilan
**supprimés de `prisma/dev.db`** (7 users et 5 Analysis avant, 7 et 5 après — vérifié).
Aucun fichier de `public/scan-proto/` ni de `src/` n'a été modifié.

Chaque constat est marqué **REPRODUIT** (vu à l'écran) ou **LU** (établi dans le code, pas mis en scène).
Les numéros de ligne sont ceux d'aujourd'hui, **revérifiés un par un contre le contenu réel du fichier**
après que `apple` a relevé une citation fausse : ma première passe donnait des offsets internes au bloc
`<script>` extrait, pas les lignes du fichier. La section 4.3 porte aussi une correction de fond.

**Deux contrôles automatiques, et leur limite.** Le premier vérifie que chaque référence pointe dans les
bornes du fichier réellement servi (`public/scan-proto/`, résolu en dur — il existe un homonyme
`product-scan-liquidglass/06-result-premium.html` qui n'a jamais servi ici) : **69 citations, 0 hors
bornes**. Le second remesure chaque affirmation chiffrée depuis le catalogue puis vérifie qu'elle arrive
au texte : **21 mesures, 21 présentes**.

Le second sens — mesure → texte — est le seul qui trouve un **manque**, et il a payé deux fois : le taux
de 40 % de la section 2.1 et le dénominateur 212/203 étaient mesurés et absents du texte. C'est la faute
la plus sournoise, parce qu'un rapport amputé se relit parfaitement bien ; aucune relecture ne l'attrape.

Sa limite, à savoir avant de s'y fier : **le filet contrôle une forme, pas une valeur.** Sur mes deux
passes, 4 alertes pour 2 vrais trous — les autres venaient de la mise en forme (un nombre en gras, un
séparateur de milliers `3 152` que le motif cherchait collé, un « zéro » en lettres). Chaque alerte se
lit donc à la main ; l'exercice ne s'automatise pas jusqu'au bout. Méthode mise au point avec `apple`,
qui l'a rejouée sur son propre rapport et y a trouvé le même type d'omission.

---

## État · relevé atomique du 2026-09-01 à **18:52:46**

Audit mené contre l'arbre au-dessus de `da78133`. **Les correctifs sont tombés pendant la rédaction**, et
vite : un constat a changé d'état en quatre minutes entre deux de mes lectures, un autre entre deux
relevés espacés de 90 secondes. Ce tableau vient donc d'**une seule commande** — un état relevé en
plusieurs fois n'est l'état d'aucun instant.

**Ce document est une pièce datée, pas une carte du code courant.** Les commandes de la colonne de
droite sont là pour que vous refassiez le relevé vous-même : c'est la seule parade à une cible qui bouge.

### Corrigés pendant l'audit

| constat | vérifier par |
|---|---|
| **1.1** paywall contournable — *versant écran* | `grep -c 'm.premium' public/scan-proto/21-analyse.html` → 1 (garde posée ligne 220) |
| **1.2** `go()` inexistant | `grep -c 'go();' public/scan-proto/01-scan.html` → 0 |
| **1.3** cul-de-sac de l'écran selfie | `grep -c 'location.replace(SUIVANT)' public/scan-proto/19-questions.html` → 2 |
| **4.3** chevron « Sources » sans destination | `grep -c 'href="/sources"' public/scan-proto/18-bilan.html` → 1 |
| **5.1** données de santé laissées à la déconnexion | `grep -c 'purgerToutSS();' public/scan-proto/17-reglages.html` → 2 |
| **2.6** produit fabriqué en mode démo | `grep -c 'SS.siteReel' public/scan-proto/07-confirm.html` → 1 : garde posée, la démo ne survit qu'en local. **Réserve levée** (voir ci-dessous) |

Le correctif de **1.3** est celui que je proposais : `location.replace(SUIVANT)` au lieu de `href` à la
fin du questionnaire, pour qu'il ne reste pas dans l'historique — plus le repli de `retour()` renvoyé sur
`index.html`. La boucle est fermée. `20-capture` n'a toujours pas de barre de navigation
(`grep -c 'SS.tabbar'` → 0), mais la flèche retour fonctionne : il y a une sortie.

### Encore ouverts

| constat | vérifier par |
|---|---|
| **1.1** paywall — *versant serveur* | `grep -cE 'sessionPremium\|auth\(\)' src/app/api/analyze/route.ts` → **0**. Le tunnel ne contourne plus, l'**endpoint** reste appelable sans compte. Idem `src/app/api/moi/bilan/route.ts`, aucun test premium |
| **2.6 bis** la chaîne « Demo mode » est sur **trois** écrans | `grep -n "Demo mode" public/scan-proto/*.html` → `01-scan.html:173`, `07-confirm.html`, `09-inci.html:199` |
| **6.1** paywall sans garde premium | `grep -c 'm.premium' public/scan-proto/16-paywall-a.html` → **0** (idem `-b`) |
| **4.4** trois interrupteurs placebo | `grep -c placebo public/scan-proto/17-reglages.html` → 2, aucune écriture `localStorage` |
| **4.5** « Coming with the App Store release » | présent dans `17-reglages.html` |

**Les trois bloquants sont refermés côté écran ; il reste le versant serveur du 1.1** — l'analyse IA
appelable sans compte — et quatre constats mineurs, dont deux (2.6 et 4.5) affichent du contenu de
démonstration dans un binaire soumis.

**La lecture d'`apple`, dans sa forme corrigée :** ce qui a été réparé est ce qui se répare **dans le
code de l'écran**. Ce qui résiste demande d'aller ailleurs — une route serveur, ou App Store Connect.
Ce n'est pas une question d'effort, c'est une frontière d'outil.

**Une nuance, vérifiée à 18:55:57, qui restreint cette lecture aux bloquants.** Elle ne tient plus en
dessous : mes quatre constats mineurs encore ouverts — **2.6**, **6.1**, **4.4**, **4.5** — sont *tous*
du code d'écran, tous réparables dans un fichier, et aucun n'a été touché. Le critère de tri n'a donc pas
été « réparable ici », mais « étiqueté bloquant ». C'est une remarque de méthode, pas un reproche — sauf
sur deux d'entre eux : **2.6** (« Demo mode — no photo taken » et un produit La Roche-Posay fabriqué
quand la caméra est refusée) et **4.5** (« Coming with the App Store release ») laissent du contenu de
démonstration et un « bientôt » dans un binaire soumis. C'est le motif 2.2, celui qu'aucun de nous n'a
classé bloquant et qui a pourtant déjà valu des refus.

Autrement dit : les trois écrans qui pouvaient faire échouer le parcours sont réparés ; ce qui reste dans
mon périmètre tient en quatre correctifs d'une à trois lignes, dont deux retirent des chaînes visibles.

**Et il y en a plus que je ne l'avais écrit.** `apple` m'a signalé une seconde occurrence de « Demo mode » ;
en cherchant j'en ai trouvé une **troisième** que ni lui ni moi n'avions relevée. `grep -n "Demo mode"
public/scan-proto/*.html` rend :

- `01-scan.html:173` — `<span class="demo-chip">Demo mode — camera unavailable</span>`
- `09-inci.html:199` — la même pastille, sur l'écran de lecture d'étiquette
- `07-confirm.html:925` — « Demo mode — no photo taken. Is this your product? »

**Le correctif de 2.6, dans sa forme finale — réserve levée, et la faille que j'avais signalée est
fermée à la source.** J'avais relevé que la première version de la garde
(`if (window.SS && SS.siteReel && SS.siteReel())`) dépendait de `location.hostname` : vide → la garde ne
se déclenche pas → le produit fabriqué revient. `apple` a vérifié la coquille — `SmartSkinScanApp.swift:26`
charge `https://app.smart-skin.ai/scan-proto/index.html` par un `URLRequest` ordinaire, sans
`WKURLSchemeHandler` ni HTML embarqué — donc le hostname est renseigné et la garde tenait déjà.

Mais elle a depuis été **réécrite en fail-safe**, ce qui est mieux que de dépendre d'une vérification
externe. `07-confirm.html` teste désormais *« suis-je en local ? »* et non *« suis-je en production ? »* :

    if (!(window.SS && SS.estLocal && SS.estLocal())) { location.replace('01-scan.html'); return; }

`SS.estLocal` est bien défini (`commun/app.js:875-881`), et `surSiteReel()` a été scindé en
`!!location.hostname && !estLocal()` pour que la mesure garde son comportement sans que la démo hérite du
même test. Conséquence : app.js non chargé, hostname vide, WebView servie depuis un bundle — **tous les
cas douteux tombent du côté prudent**, pas de démo. Le couplage que je signalais entre la garde anti-démo
et la mesure PostHog est rompu : ce sont maintenant deux fonctions distinctes.

Les deux pastilles ont par ailleurs été reformulées en **« Camera unavailable »** (`01-scan.html:173`,
`09-inci.html:199`) — la chaîne « Demo mode » ne subsiste que dans le bloc de démonstration lui-même,
désormais inatteignable hors local.

*Sur `09-inci`* : sa pastille « Demo mode » n'appelle pas la même garde, et elle n'en a pas besoin —
vérifié, l'écran ne fabrique aucun produit (`grep -c "Effaclar|renderMatch|alts ="` → **0**, `07-confirm`
→ **0**). Sans caméra, son déclencheur affiche « No camera here. Use "Upload a photo instead" ». Le seul
défaut y est la chaîne elle-même.

Les deux premières sont des messages d'état honnêtes — la caméra *est* indisponible — et à ce titre elles
valent mieux que le silence de l'ancien `01-scan`. Mais les mots « Demo mode » dans un binaire soumis
déclenchent la même lecture quelle que soit leur justesse. Si ces pastilles restent, il faut au moins les
reformuler (« Camera unavailable » suffit et dit la même chose). La troisième, elle, est à supprimer :
elle accompagne un produit fabriqué.

**Sur les numéros de ligne.** Ils désignent l'état **audité**. Une dizaine ont glissé dans les fichiers
retouchés (`01-scan`, `16-paywall-a/b`, `17-reglages`, `18-bilan`, `19-questions`, `20-capture`,
`21-analyse`, `commun/app.js`) : à l'endroit du correctif, la ligne citée porte désormais la correction
et non le défaut. Je ne les recale pas — recaler ferait décrire un bug par une ligne qui contient son
remède.

---

## Ce qui va bien, pour situer le reste

Il faut le dire avant la liste, parce que la liste est longue et qu'elle donnerait une fausse impression :
la charpente est saine. `07-confirm` gère **huit** cas d'échec de reconnaissance distincts et ouvre
systématiquement une feuille à trois issues — c'est du travail sérieux, et je n'ai pas trouvé le moyen
de m'y coincer. `20-capture` affiche « CAMERA UNAVAILABLE — Allow camera access, or upload a photo »
quand la permission manque, et refuse proprement une photo sans visage. `08-search` a une sortie
(`SS.tabbar`), et ses six marques suggérées renvoient toutes des résultats (13 à 25). Les pages légales
`/privacy` et `/terms` ont un retour qui fonctionne.

Les défauts ci-dessous sont donc des trous ponctuels dans une structure qui tient, pas un effondrement.
Mais trois d'entre eux sont sur le chemin principal.

---

## 1. Bloquants

### 1.1 — Le paywall est entièrement contourné par toute nouvelle utilisatrice · REPRODUIT

**Le chemin.** `20-capture.html:733-735` :

```js
if (!m.connecte) { location.href = "15-compte.html?next=21-analyse.html"; return; }
if (!m.premium)  { location.href = "16-paywall.html"; return; }
```

Une nouvelle utilisatrice est `!connecte` : elle prend la **première** branche. Or `next=21-analyse.html`,
pas `next=paywall`. `15-compte.html:123-127` (`destination()`) renvoie littéralement ce `next` dès qu'il
ressemble à un nom de fichier. Elle atterrit donc sur `21-analyse` **sans jamais voir le paywall**.
Et `21-analyse.html:208` ne teste que `m.connecte` — jamais `m.premium`.

Le parcours réel est donc :
`01-scan → 07-confirm → 02-fork → 19-questions → 20-capture → 15-compte → 21-analyse → 06-result-premium`,
avec le paywall absent du milieu.

**Reproduit** avec un compte `connecte:true, premium:false` : `21-analyse` s'ouvre et propose
« Agree & analyze ». Je n'ai pas cliqué, pour ne pas brûler un appel Anthropic.

**Rien ne rattrape côté serveur.** `src/app/api/analyze/route.ts` n'a ni auth ni premium — son propre
commentaire l'admet (« Pas d'auth ni de sauvegarde pour l'instant »). `src/app/api/moi/bilan/route.ts:16`
ne teste que `auth()`. Donc la gratuite obtient l'analyse IA, `/api/scan` la persiste, et `18-bilan`
lui sert le **rapport premium entier**. Seule la note perso par produit reste fermée (`sessionPremium`).

**Ce que ça coûte en plus.** Le commentaire de `20-capture.html:722-728` affirme l'invariant inverse :
« l'analyse (coûteuse, et porte du bilan premium) ne tourne jamais sans abonnement ». Il est faux
aujourd'hui. Et `/api/analyze` étant ouverte à tout le monde, n'importe qui peut déclencher un appel
IA sans compte du tout — seule barrière, `aiRateLimit`.

**Ce que voit l'utilisatrice.** Rien de cassé. C'est justement le problème : personne ne s'en plaindra,
et le chiffre d'affaires sera nul.

---

### 1.2 — « Upload a photo » de la caméra ne fait rien du tout · REPRODUIT

`01-scan.html:306` appelle `go();` — **cette fonction n'existe pas dans le fichier**
(`grep -c "function go" 01-scan.html` → `0` ; seul l'appel existe). Elle vient manifestement d'un
copier-coller depuis `index.html`, où `go` est bien défini.

**Reproduit** en injectant un fichier dans l'`<input type="file">` : la console crache
`Uncaught ReferenceError: go is not defined`, la photo **est** correctement encodée et écrite dans
`sessionStorage` (`ss-scan-photo` présent), et la navigation n'a jamais lieu. L'écran reste sur la caméra.

**Gravité.** C'est la seule issue quand l'accès caméra est refusé — et `01-scan` ne dit jamais que la
caméra est coupée : le refus tombe silencieusement dans `boot('demo')` (`01-scan.html:255`), sans un mot.
La comparaison est cruelle : `09-inci.html:294` et `20-capture.html` ont la **même** interface d'upload,
un handler correct, et un message d'erreur explicite. Seul `01-scan` est cassé.

---

### 1.3 — Après le questionnaire, la flèche retour de la capture est morte · REPRODUIT

`19-questions.html:663` :

```js
if (!refaire && memoire && !SS.visage.doitDemander()) { location.replace(SUIVANT); return; }
```

Au dernier écran du questionnaire, `19-questions.html:639` appelle `SS.visage.memoriser(rep)` — ce qui
pose `ss-visage-profil` avec `scans: 0`, donc `doitDemander()` devient faux — puis navigue en
`location.href` vers `20-capture`. Le questionnaire **reste** dans l'historique.

Résultat : la flèche retour de `20-capture` (`20-capture.html:740-745`) fait `history.back()` → revient
sur `19-questions` → qui `location.replace` immédiatement vers `20-capture`.

**Reproduit trois fois de suite** : `location.href` inchangé (`20-capture.html`), `history.length`
inchangé (5). Le bouton ne fait rien de perceptible.

**Ce que vit l'utilisatrice.** Elle vient de répondre à sept questions sur sa peau. Elle veut corriger
une réponse — le geste évident est la flèche retour. Elle ne mène nulle part. Et `20-capture` **n'a pas
de barre de navigation** (`grep SS.tabbar 20-capture.html` → 0, comme 19, 21, 15 et les deux paywalls).
Les seules sorties de l'écran sont « Take a photo » et « Upload a photo ». Elle est enfermée sur l'écran
du selfie : soit elle donne une photo de son visage, soit elle tue l'app.

C'est un cul-de-sac au sens strict, et il est sur le chemin de toute première utilisatrice.

---

## 2. Chiffres et contenus d'un autre produit

C'est la famille de bugs que la correction d'aujourd'hui visait. Les chiffres sont bien passés à des
tirets — mais **tout le reste de la maquette de démonstration est resté**.

### 2.1 — 212 produits du catalogue ouvrent la fiche de démonstration d'un autre produit · REPRODUIT

`src/app/api/produit/fiche/route.ts:30-35` répond **HTTP 200** pour un produit `hors-perimetre` :

```json
{"produit":{…},"score":{"disponible":false,"raison":"hors périmètre : ce n'est pas un soin du visage"}}
```

— sans `formule`. Les deux fiches jettent cette réponse en silence :

- `03-result-free.html:478` — `if (!d || !d.produit || !d.score || !d.score.formule || d.score.disponible === false) return;`
- `06-result-premium.html:1222` — `if (!d || !d.produit || !d.score || !d.score.disponible) return;`

Ni l'une ni l'autre n'affiche `score.raison`. Le serveur explique poliment, l'écran jette l'explication.

**Reproduit** sur `03-result-free.html?p=TATCHA The Melting Lip Balm…` — un baume à lèvres. L'écran affiche :

| ce qui s'affiche | d'où ça vient |
|---|---|
| ✓ Niacinamide « fades post-breakout marks » | HTML en dur, `03-result-free.html:258-271` |
| ✓ Salicylic acid + LHA « unclogs blocked pores » | idem |
| ✓ Zinc PCA « curbs excess sebum » | idem |
| ✗ Light fragrance « watch if very reactive » | idem |
| BEST FOR **Acne-prone, oily skin** | `03-result-free.html:299` |
| AVOID IF **Fragrance-reactive · very dry skin** | `03-result-free.html:306` |
| GOOD **10** · WATCH OUT **3** · NEUTRAL **22** + liste nommée | `03-result-free.html:347+` |
| jauge **verte remplie à ~71 %** | voir 2.3 |

Seul le chiffre central est un tiret. Une utilisatrice qui scanne son baume à lèvres lit une fiche
détaillée et confiante sur un produit anti-acné qu'elle ne possède pas.

**Volume mesuré** : `212 hors-perimetre sur 3232` dans `data/scan/catalog.json`, soit **6,6 %** — un
scan sur quinze. Sur ces 212, **203 ont un INCI** et 9 n'en ont pas ; toutes les mesures qui suivent
portent sur ces 203, seuls notables par le moteur. (Le dénominateur est explicité parce que le rapport
fait ensuite circuler les deux nombres — 212 et 203 — et qu'un lecteur ne pouvait pas les réconcilier.)

**Et sur l'étiquette photographiée, ce garde-fou ne se dégrade pas : il disparaît.** Le fil vient de
`moteur` ; j'ai refait la mesure moi-même parce qu'elle retourne mon constat.

`HORS_PERIMETRE` (`src/lib/scan/categorise.mjs:17`, appliquée ligne 94) ne teste **que le nom**, jamais
la composition. Or `lire-inci/route.ts:44` construit ce nom avec ce que le modèle a lu sur l'étiquette,
et le laisse vide s'il n'a rien lu — le cas **normal** quand on photographie le **dos** du flacon,
c'est-à-dire là où se trouve la liste INCI qu'on est venu scanner.

Mesuré en exécutant `categoriser('', p.inci)` sur les 203 produits hors périmètre qui ont un INCI :

| ce qu'ils deviennent, nom illisible | nombre |
|---|---|
| `cleanser` 62 · `serum` 33 · `moisturizer` 32 · `makeup-remover` 21 · `sunscreen` 15 · `exfoliant` 13 · `mask` 5 | **181** |
| `indetermine` (qui a sa propre grille et se fait noter quand même) | 22 |
| **restent `hors-perimetre`** | **0** |

Aucun. Mon « 6,6 % est un plancher » était donc encore trop prudent : sur la voie étiquette, la barrière
n'existe pas. Un gel douche n'ouvre pas une fiche muette — il ouvre une fiche **complète et confiante**,
avec un score « pour ta peau ».

**Le garde-fou d'écran se déclenche, mais il est mathématiquement incapable de se taire.**
`06-result-premium.html:1181-1182` : `var sur = d.lecture.confianceCategorie === "sur"`, et
l'avertissement « — we're not certain » s'affiche dès que ce n'est pas `sur`. Il se déclenche donc bien
sur les 203. Sauf que `sur` exige `n1 >= 4` (`categorise.mjs:103`), que les votes de **nom** ne
s'appliquent pas sur un nom vide, et que les votes de **composition** plafonnent à 3 par catégorie
(`preuvesComposition`, lignes 70-87 : chaque catégorie y passe par une chaîne `if/else`, donc une seule
fois). Donc `n1 <= 3 < 4` : **`sur` est inatteignable dès que le nom est illisible.**

Vérifié sur les 3 152 produits du catalogue ayant un INCI, nom vidé : `sur` sort **0 fois**
(incertain 1 678, probable 1 207, aucune 267).

**Et quand le nom est lisible, le signal échoue dans l'autre sens : il se tait sur une réponse fausse.**
Les votes de nom rejouent alors, `sur` redevient atteignable — et j'ai compté **10 des 203 produits hors
périmètre qui reviennent avec `confiance: "sur"` sur une catégorie visage erronée**, nom complet :

| produit | rendu comme |
|---|---|
| COOLA Zinc Oxide Liplux Sunscreen **Trio** | `sunscreen` |
| La Roche-Posay Anthelios UVMune 400 Lait Solaire SPF | `sunscreen` |
| Lierac Sunissime Huile Solaire Soyeuse SPF 50 | `sunscreen` |
| Benefit POREfessional … Cleansing Oil & Clay Mask **Duo** | `mask` |
| First Aid Beauty Exfoliate AM + Hydrate PM … Pads **Duo** | `exfoliant` |
| Paula's Choice 2% Bha **Body** Spot Exfoliant | `exfoliant` |
| A-Derma Exomega Control 2in1 Emollient Cleansing Gel | `cleanser` |
| Ducray Keracnyl Foaming Gel Gentle Cleanser | `cleanser` |
| Mixa Expert Peau Sensible Crème Panthénol Confort | `moisturizer` |
| Vichy Ideal Soleil Lait Hydratant Auto-Bronzant Hydratation | `moisturizer` |

Les dix reviennent avec `confiance: "sur"` — le maximum affichable — sur une catégorie fausse.

**Et ce n'est pas un reliquat d'un vieux scrape.** Réparti par le champ `source` de `catalog.json` :
**6 sur 10 viennent d'`amazon-fr`** (Vichy, La Roche-Posay, A-Derma, Ducray, Lierac, Mixa), 3 d'`ulta`
(Benefit, First Aid Beauty, COOLA) et 1 d'`incidecoder` (Paula's Choice). Autrement dit, la majorité
des cas vient du **lot ajouté en dernier** — les 502 fiches FR intégrées le 30/08 — et non des coffrets
anglo-saxons hérités d'une collecte ancienne.

C'est l'argument décisif pour la forme du correctif, et je le dois à `apple` : boucher les trous connus
de la regex (ajouter *Trio*, *Duo*, *spray*, *mist*) ne ferait que **repousser l'échéance au prochain
import**. Tant que la barrière repose sur des motifs de nom, chaque nouveau lot rouvrira le trou avec ses
propres conventions de nommage. Elle doit porter sur la **composition** : un gel douche se reconnaît à
ses tensioactifs et à leur rang, un fond de teint à ses pigments, un baume à lèvres à ses cires.

Le signal est donc inutilisable des deux côtés : **jamais `sur` quand le nom manque** (avertissement
permanent, donc ignoré), et **`sur` sur une erreur quand le nom est là** (avertissement éteint, donc
absent au moment où il servirait). Toute correction qui s'appuierait sur `confiance` — refuser de noter
tant que ce n'est pas `sur`, par exemple — laisserait passer ces dix-là sans broncher. La barrière doit
porter sur la **composition**, pas sur le nom ni sur le niveau de confiance qu'il alimente.

Ce que ça donne à l'écran : « we're not certain » s'affiche sur **100 % des étiquettes photographiées** —
le gel douche comme le sérum parfaitement identifié. J'avais écrit que ce signal était « mince pour
porter ça tout seul ». C'est pire : un avertissement qui ne s'éteint jamais n'avertit de rien. On apprend
à l'ignorer au deuxième scan, et c'est précisément lui qu'on charge d'attraper le produit corps.

**Et la sortie de secours ne sort pas.** `CATS` (`06-result-premium.html:1168-1170`) ne liste que dix
catégories **de soin du visage**. L'utilisatrice qui comprend que la machine s'est trompée sur son gel
douche n'a aucun moyen de le lui dire : « Change » ne propose pas « ce n'est pas un soin du visage ».

**Côté gratuit, il n'y a même pas l'avertissement dégénéré : il n'y a rien.** Tout ce qui précède décrit
`06-result-premium`. Or `09-inci.html:258` route la non-abonnée vers `02-fork.html?source=inci`, puis
vers `03-result-free.html?source=inci`. Et j'ai compté : `grep -c 'd-lu' 03-result-free.html` → **0**,
`grep -c 'not certain|confianceCategorie' 02-fork.html` → **0**. La fiche gratuite **n'a aucun bloc de
lecture d'étiquette** : ni « Read from the label you photographed », ni la catégorie devinée, ni
« we're not certain », ni le bouton « Change ».

Une utilisatrice gratuite qui photographie la liste INCI de son gel douche reçoit donc un score de
formule présenté **exactement comme celui d'un produit du catalogue** — même jauge, même verdict
« A well-built formula » — sans une ligne pour dire que la catégorie a été devinée, ni le moyen de la
corriger. L'abonnée a un avertissement inutile ; la gratuite n'a pas d'avertissement du tout.

Détail que j'ai vérifié séparément, parce qu'il illustre bien la mécanique : parmi les soins des lèvres
hors périmètre ayant un INCI, **5 ou 6 sont classés `sunscreen`** nom vidé (*Vacation Chardonnay SPF30
Lip Oil*, *Naked Sundays PoutScreen SPF 50*, *Naturium Phyto-Glow Lip Balm SPF 45*…) et 11 en
`makeup-remover`. La composition ne ment pas — ces baumes contiennent réellement des filtres UV — mais ils
sont alors notés sur la grille d'un **solaire pour le visage**, et le sont sans la moindre réserve côté
gratuit.

*Sur le 5 ou 6* : `moteur`, `apple` et moi avons publié deux nombres, et l'écart est réel mais bénin —
il vient du motif qui sert à décider ce qu'est « un soin des lèvres », pas d'une erreur de mesure.
Mon `/lip |lèvres|balm/` donne 24 produits et 5 solaires ; sans l'espace, 26 et 6. Le seul produit
litigieux est le **COOLA Zinc Oxide Liplux Sunscreen Trio** — « Liplux » n'est pas « lip balm ».
Il mérite mieux qu'une note de bas de page, parce qu'il illustre les deux trous de regex d'un coup :
j'ai vérifié que `HORS_PERIMETRE` **ne l'attrape pas même avec son nom complet et lisible**
(`rx.test("COOLA Zinc Oxide Liplux Sunscreen Trio")` → `false` : ni la forme *Liplux*, ni le coffret
*Trio*), et que `categoriser()` le rend alors `sunscreen`. Il n'est donc pas protégé du tout, nom lisible
ou non. Ce n'est pas un cas isolé : j'ai compté **82 des 203** produits hors périmètre que la regex
manque **avec leur nom complet** — chiffre de `moteur`, que je reproduis exactement, soit **40 %**.
Ce taux change la nature du constat, et la formulation est d'`apple` : le garde-fou ne tombe pas
seulement quand la photo est mauvaise, **il est déjà troué à 40 % quand elle est bonne**. Le cas « dos
du flacon » fait passer ce taux de 40 % à 100 % — il ne le crée pas. Ce n'est donc pas « un cas de
figure défavorable », c'est « une barrière qui ne tient pas, aggravée par un cas de figure ».

Deux trous de la regex, à part, qui valent même avec un nom lisible : `HORS_PERIMETRE` connaît
`kit|bundle|coffret|set` mais pas les coffrets *Trio* / *Duo* / *Dual Pack* / *System*, et connaît
`body wash|lotion|cream|butter|oil|scrub|serum|milk` mais pas les formes corps *spray* / *mist*.

### 2.2 — Le même écran muet pour un 404, un 500 ou une coupure · REPRODUIT

Les deux fiches font `fetch(...).then(r => r.json())` **sans tester `r.ok`**, puis `.catch(function(){})`
vide (`03-result-free.html:611`, `06-result-premium.html:1759`).

`/api/produit/fiche?q=<inconnu>` répond **404** avec `{"statut":"inconnu"}` (vérifié au curl).
`rendre()` sort en silence, et l'écran reste sur la démonstration ci-dessus.

**Reproduit** sur `03-result-free.html?p=ZZZZ_PRODUIT_INEXISTANT` : capture d'écran identique au 2.1.
Idem hors ligne, idem sur un 500.

**Où ça arrive vraiment**, sans lien trafiqué : voir 2.4 — l'historique fabrique lui-même ces liens morts.

### 2.3 — La jauge s'anime en vert pendant que le chiffre est un tiret · REPRODUIT

Le passage aux tirets n'a pas touché l'arc :

- `03-result-free.html:283` — `class="gauge-prog good"` + `@keyframes gaugeFill` (ligne 99) → l'arc part
  à 0 et **s'anime en vert jusqu'à `stroke-dashoffset:66.6`**, soit ~71/100, 1,4 s après l'ouverture.
- `06-result-premium.html:963` — `class="gauge-prog mid to62"` + `gaugeFill62` (ligne 776) → arc orange à 62.

`rendre()` coupe l'animation (`arc.style.animation = "none"`) — **mais seulement si les données arrivent**.
Quand elles n'arrivent pas (2.1, 2.2), l'arc reste peint en vert.

Un demi-cercle vert plein sous un tiret ne se lit pas « chargement ». Ça se lit « bon produit ».
Deux autres pastilles partent colorées de la même façon : `d-dot-fw` en `good` et `d-dot-pw` en `mid`
(`06-result-premium.html:1031-1032`).

### 2.4 — Tout produit lu à l'étiquette devient une carte d'historique qui ne s'ouvre plus · LU

`src/app/api/produit/lire-inci/route.ts:63` renvoie `nom: nom || "Produit scanné"` — le nom lu sur le
flacon (et, à défaut, **une chaîne française** dans une app entièrement anglaise). `03`/`06` recopient
ce nom dans `ss-historique`.

Ensuite, les quatre écrans de liste construisent un lien **par nom de catalogue** :

- `11-dashboard.html` et `13-historique.html` → `06-result-premium.html?p=<nom lu à l'étiquette>`
- `12-dashboard-free.html` et `14-historique-free.html` → `03-result-free.html?p=<nom>`

Ce nom n'est pas dans le catalogue → `/api/produit/fiche` répond 404 → **écran de démonstration du 2.2**.
`scores/route.ts:38` (`if (!p) continue;`) est cohérent avec ça côté serveur ; l'écran, lui, propose
quand même le lien.

### 2.5 — `?source=inci` sans son paquet retombe sur le produit d'avant · REPRODUIT

`03-result-free.html:446`, `06-result-premium.html:1159`, `02-fork.html:176` — même code :

```js
var key = q.get("p") || sessionStorage.getItem("ss-scan-produit");
```

Quand on arrive avec `?source=inci` mais que `ss-inci-resultat` est absent (onglet restauré, session
expirée, retour arrière), `depuisEtiquette` est `null` et le repli attrape `ss-scan-produit` — **le
dernier produit catalogue scanné**.

**Reproduit** : `ss-scan-produit = "CeraVe Moisturizing Cream"`, ouverture de
`03-result-free.html?source=inci` → la page affiche « CERAVE / Moisturizing Cream / 91 ». L'utilisatrice
croit lire l'étiquette qu'elle vient de photographier ; elle lit un autre produit.

### 2.6 — En mode démo, l'app affirme avoir identifié un produit qu'elle n'a pas vu · REPRODUIT

`07-confirm.html:914-920` : sans photo en session, l'écran affiche **en dur** :

> **PRODUCT IDENTIFIED** · LA ROCHE-POSAY · **Effaclar Duo+M**
> *Demo mode — no photo taken. Is this your product?*
> [ Yes, analyse this product ]

**Reproduit** en enchaînant : `01-scan` sans caméra → `boot('demo')` → clic sur le déclencheur →
`01-scan.html:273` fait `sessionStorage.removeItem('ss-scan-photo')` → `07-confirm` sans photo.

Trois problèmes empilés : la pastille « PRODUCT IDENTIFIED » ment ; la chaîne « Demo mode » est visible
dans un binaire soumis ; et le bouton actif fait noter à l'utilisatrice un produit La Roche-Posay
qu'elle n'a jamais tenu.

C'est **le** chemin d'un simulateur ou d'un iPhone dont la permission caméra a été refusée.
Transmis à `apple` (2.2 puis 4.2).

---

## 3. Une abonnée qui perd le réseau redevient une inconnue

### 3.1 — `SS.moi()` répond « visiteur anonyme » à la moindre panne · REPRODUIT

`commun/app.js:153` :

```js
.catch(function () { return MOI_NEUTRE; });   // { connecte:false, premium:false, … }
```

**Reproduit** en faisant échouer `/api/moi` (502 Render, démarrage à froid, coupure) : `SS.moi(true)`
rend `{connecte:false, premium:false}`. Ce n'est pas mis en cache — c'est le seul point de prudence.

Or **tous** les écrans branchent une redirection dessus :

| écran | garde | où elle envoie une abonnée hors ligne |
|---|---|---|
| `11-dashboard.html:376` | `if (!m.premium)` | → `12-dashboard-free.html` |
| `13-historique.html:191` | `if (!m.premium)` | → `14-historique-free.html` |
| `06-result-premium.html:1144` | `if (!m.premium)` | → `03-result-free.html` |
| `index.html` | `m.premium ?` | → `12-dashboard-free.html` |
| `00-welcome.html:106` | `if (m.connecte)` | reste sur l'accueil, comme si elle n'avait pas de compte |
| `commun/app.js` (`SS.tabbar`) | `m.premium ?` | les deux onglets pointent vers les écrans gratuits |

Toutes ces redirections sont des `location.replace` : **l'URL est réécrite**, donc le bouton retour ne
la ramène pas. Elle doit relancer l'app.

Ce qu'elle voit alors : la carte verrouillée « Get my personal score · 7-day free trial ». On lui
propose d'acheter ce qu'elle paie déjà, parce qu'une requête a échoué.

### 3.2 — Un incident réseau est présenté comme « vous n'avez jamais scanné » · REPRODUIT (par lecture du code, symétrique de 3.1)

- `11-dashboard.html:384` — `fetch("/api/moi/bilan").catch(function () { rendreScore(null); })`
  → carte « **No face scan yet** — One guided scan gives you your skin score… [ Face scan ] ».
- `18-bilan.html:639` — `.catch(function () { document.getElementById("b-vide").hidden = false; })`
  → écran « **No analysis yet** — Your skin, read once. [ Start my face scan ] ».

Dans les deux cas, une abonnée qui a un bilan complet sur le serveur est informée qu'elle n'en a pas,
et invitée à refaire une analyse de quarante secondes pour rien. Un 502 n'est pas un état vide ;
ces deux écrans les confondent.

---

## 4. Boutons qui ne font rien

### 4.1 — « Add to my routine » d'une alternative n'atterrit dans aucune routine · REPRODUIT

Deux magasins concurrents cohabitent dans `06-result-premium.html` :

- le bouton principal (`06-result-premium.html:1742`) → `SS.shelf.addFlow()` → **`ss-shelf`** ;
- le bouton de la feuille d'alternative (`06-result-premium.html:1734` → `ajouterRoutine()`, ligne 1686)
  → **`ss-ma-routine`**, l'ancienne liste de noms du proto V1.

`11-dashboard.html` lit `SS.shelf.liste()`, donc `ss-shelf`. Et la migration
`ss-ma-routine → ss-shelf` de `commun/app.js:340` **ne joue qu'une fois**, quand `ss-shelf` est encore
`null` : après le premier ajout, elle ne rattrape plus rien.

**Reproduit** : ajout du produit principal (`ss-shelf` = 1 entrée), puis ajout d'une alternative
(`ss-ma-routine` = 1 entrée), puis ouverture de `11-dashboard` → « Today's routine » ne montre **que**
le premier. L'alternative a disparu, alors que son bouton affichait « Added to your routine ».

Effet de bord : `dejaDansRoutine()` (ligne 1693) interroge `ss-ma-routine`, donc un produit déjà sur
l'étagère est proposé à nouveau, et peut finir dans les deux magasins.

**Le même magasin sert à décider, avec des chiffres qui ne datent pas du même jour.** `modalRemplacer`
(`commun/app.js:465`) compare `actuel[champ]` — la note **stockée à l'ajout** — contre `nouveau[champ]`
— la note **fraîche** de la fiche, et en tire un verdict affiché en toutes lettres (« Your current pick
fits you better. X scores 7 points higher — we would keep it »). Ce n'est pas un chiffre périmé
décoratif : c'est la phrase qui décide quel produit reste dans sa routine.

Nuance que je dois à `moteur`, et qui resserre le constat : `SS.rafraichirScores` **est** appliqué à
l'étagère une fois, en `18-bilan.html:636`. Mais `18-bilan` est une page d'**affichage**. La formulation
juste est donc : rafraîchi là où on l'**affiche**, pas là où on **décide**.

Et `moteur` ajoute une aggravation que je n'avais pas vue : `PUT /api/shelf` accepte
`perso: z.number().nullable().optional()` (`shelf/route.ts:18`) et **stocke le nombre du client tel quel
dans `Protocol.products`, sans jamais le recalculer**. La note périmée ne meurt donc pas avec le
navigateur : elle est persistée en base et **suit le compte d'un appareil à l'autre**. L'en-tête de
`/api/produit/scores` affirme pourtant que « le `perso` stocké devient un simple repli d'affichage hors
ligne » — rien n'empêche aujourd'hui le repli de redevenir la source.

### 4.2 — « Add to my routine » sur une fiche vide ne fait rien, sans le dire · REPRODUIT

`03-result-free.html:606` : quand les données n'arrivent pas, `produitCourant` reste `null` et le
repli lit `d-name`, qui vaut `&nbsp;`. Vérifié en direct : `textContent.trim()` → `""`.
`SS.shelf.addFlow()` sort alors en silence (`commun/app.js:399`, `if (!produit || !produit.nom) return;`).
Aucun toast, aucune erreur. Le bouton est mort et personne ne le dit.

### 4.3 — « Sources & medical disclaimer » : un chevron qui ne mène nulle part · REPRODUIT

`18-bilan.html:317` — c'est un `<div class="src-row">` **sans `id`, sans `onclick`, sans écouteur**
(`grep src-row 18-bilan.html` → cette ligne plus quatre lignes de CSS). Il porte pourtant un chevron
« › », le signe universel du « appuie ici ».

**Correction (je m'étais trompé, `apple` a tranché).** J'avais écrit que `src/app/sources` n'existe
pas et qu'un handler tomberait sur un 404. Le dossier n'existe effectivement pas — mais la conclusion
était fausse, parce que `ls src/app/sources` est un test insuffisant : **`(funnel)` est un route group
Next.js**, et les parenthèses sont exclues de l'URL. `src/app/(funnel)/sources/page.tsx` sert donc bien
`/sources`. Vérifié : le fichier est là (209 octets, il rend `SourcesScreen`), et `apple` a testé la
production — **https://app.smart-skin.ai/sources répond**, avec les 6 citations (AAD ×3, MedlinePlus ×2,
DermNet ×1). C'est le même mécanisme qui fait marcher `/welcome`, `/capture` et `/checkout`.

Donc il ne manque **que le lien**. Le correctif est un `<a href="/sources">` autour du bloc — le moins
cher de nos deux rapports, et il referme le rejet 1.4.1.

### 4.4 — Trois interrupteurs de notification qui promettent des horaires et n'écrivent rien · REPRODUIT

`17-reglages.html:105-113` (libellés) et `:100-110` (JS, commenté « toggles locaux placebo ») :

> Routine reminders — *Morning 8:00 · evening 21:30* — **ON par défaut**
> Face scan reminder — *When your next scan is ready* — **ON par défaut**
> Tips by e-mail

**Reproduit** : cliquer change la classe CSS, `localStorage` reste **vide** (aucune clé écrite), donc
l'état est perdu au rechargement. L'app ne demande jamais la permission notifications et n'envoie
jamais d'e-mail. Deux promesses sont affichées comme actives dès l'installation.

### 4.5 — « Rate the app » affiche un « bientôt » · REPRODUIT

`17-reglages.html:317` → `toast("Coming with the App Store release")`. Transmis à `apple`.

### 4.6 — La mesure du répartiteur A/B ne part jamais · REPRODUIT

`16-paywall.html` appelle `SS.trackEcran("paywall_switch")` **sans charger `commun/app.js`** — c'est le
seul des 23 écrans dans ce cas (vérifié en balayant les 23). `SS` est `undefined`, le `try/catch` avale
l'erreur. L'événement du tirage A/B n'existe pas dans PostHog. De toute façon le `location.replace`
part avant, donc le code est doublement mort.

---

## 5. Fuites entre écrans et entre comptes

### 5.1 — Se déconnecter laisse les **données de santé** de la personne précédente sur le téléphone · LU

J'avais d'abord classé ceci comme une fuite d'étagère. C'est plus lourd que ça, et je le dois à `apple`
qui est allé regarder ce que contient la clé oubliée. J'ai revérifié les cinq maillons moi-même.

`17-reglages.html:322` : « Sign out » fait `SS.auth.signout().then(() => location.replace("index.html"))`
et **rien d'autre**. `SS.auth.signout` (`commun/app.js:318`) se termine par `purgerMoi()`, qui retire la
**seule** clé `ss-moi`, et de `sessionStorage`. La fonction de nettoyage complet existe pourtant —
`purgerToutSS()` (`17-reglages.html:328`) vide toutes les clés `ss-` des deux stockages — mais
`grep purgerToutSS 17-reglages.html` ne rend que **deux** lignes : sa définition (328) et son unique
appel (359), dans le flux **suppression de compte**. Jamais à la déconnexion.

Survivent donc en `localStorage` après un Sign out : `ss-shelf`, `ss-historique` (50 derniers scans),
`ss-ma-routine`, `ss-nb-produits`, `ss-routine-checks` et **`ss-visage-profil`**.

C'est le dernier qui change la nature du constat. `commun/app.js:588-590` :
`memoriser` écrit `{ reponses: <toutes les réponses du questionnaire>, scans: 0 }`. Et la question 7
(`19-questions.html:323-336`, « Anything to flag? ») collecte :

| réponse stockée | libellé à l'écran |
|---|---|
| `pregnancy` | Pregnancy / breastfeeding |
| `condition` | Rosacea / eczema — *diagnosed reactive skin* |
| `treatment` | Ongoing dermatological treatment — *prescription (Accutane, etc.)* |
| `allergy-fragrance` | Fragrance allergy — *diagnosed — patch test or doctor* |
| `allergy-eo` | Essential oil allergy — *diagnosed* |

Autrement dit : une grossesse, des pathologies **diagnostiquées** et un traitement dermatologique sur
ordonnance restent lisibles en clair sur le téléphone après déconnexion, et sont **réinjectés dans le
questionnaire** de la personne suivante (`19-questions.html:663` réutilise `SS.visage.reponses()` sans
rien redemander tant que le cycle n'est pas écoulé). Sur un téléphone partagé, ou revendu, ce sont les
données de santé d'une personne qui parlent pour une autre.

**Correctif : une ligne.** Appeler `purgerToutSS()` à la déconnexion comme elle l'est déjà à la
suppression de compte. La fonction est écrite, testée par l'autre flux, et câblée à un seul endroit.

**Ce que je n'établis pas.** Uniquement la persistance **locale**, qui est décidable par lecture. Ce que
fait ensuite `SS.shelf.sync()` (`commun/app.js:371-397`) quand le second compte se connecte — GET de son
étagère, fusion où **le local gagne**, puis **PUT de la fusion sur son compte à lui** — demande deux
comptes réels pour être monté. Le code dit que les produits de la première personne sont écrits
durablement dans le compte de la seconde ; je ne l'ai pas vu se produire.

### 5.2 — Le questionnaire lancé depuis les Réglages traîne un produit abandonné · REPRODUIT

`11-dashboard.html:264-270` et `18-bilan.html:642-649` effacent `ss-produit-attente` avant d'ouvrir le
questionnaire. `17-reglages.html:122` ne l'efface pas :

```js
ligne.addEventListener("click", function () { location.href = "19-questions.html?refaire=1"; });
```

**Reproduit** : `ss-produit-attente` posé sur « La Roche-Posay Effaclar Duo+M », puis Réglages →
« Skin profile ». Le questionnaire s'ouvre avec la pastille
**« La Roche-Posay Effaclar Duo+M — waiting for its verdict »** au-dessus de la première question.

Et au bout du tunnel, `21-analyse.sortie()` (`21-analyse.html:314-320`) lit ce même paquet et l'envoie
sur la **fiche de ce produit** au lieu de son nouveau bilan. Elle a refait son profil de peau ; elle
atterrit sur un tube qu'elle avait abandonné.

### 5.3 — `ss-visage-photo` survit à un échec d'enregistrement · LU

`enTunnel()` (`16-paywall-a.html:253`, `-b:255`) vaut `!!sessionStorage.getItem("ss-visage-photo")`.
`21-analyse` ne l'efface qu'après un `/api/scan` **réussi** (`21-analyse.html:330`). Si l'enregistrement échoue et
qu'elle quitte l'écran, la clé reste : le paywall croira ensuite qu'elle est « en tunnel » et sa croix
la renverra sur `12-dashboard-free` au lieu de sa page d'origine.

### 5.4 — `ss-compte-propose` n'est jamais remis à zéro · LU

`commun/app.js:534` le pose à `"1"` sur « Not now ». Aucune déconnexion ne l'efface. La proposition de
sauvegarder l'étagère ne sera plus jamais faite sur ce téléphone, y compris à une autre personne.

---

## 6. Le paywall

### 6.1 — Une abonnée peut se voir proposer d'acheter son abonnement · REPRODUIT

`16-paywall-a.html:262` (identique en `-b:264`) :

```js
SS.moi().then(function (m) { if (!m.connecte) location.replace("15-compte.html?next=paywall"); });
```

**`m.premium` n'est jamais testé.** Reproduit : compte premium chargeant `16-paywall.html` → la page
s'affiche entièrement, « **Start my 7-day free trial** · 7 days free, then $39.90 / year ». En natif,
le bouton ouvrirait StoreKit sur un produit déjà possédé.

Deux chemins y mènent sans lien trafiqué, tous deux dépourvus de garde premium :
`02-fork.html:247` et `03-result-free.html:429` font `if (m.connecte && dejaFait) location.href = "16-paywall.html"`.
Et 3.1 y conduit aussi : une abonnée dégradée en visiteuse par un incident réseau est routée vers les
écrans gratuits, dont les cartes verrouillées mènent ici.

### 6.2 — `apresAchat()` renvoie au questionnaire une abonnée qui a déjà un bilan · LU

`16-paywall-a.html:335-345` : hors tunnel, le retour d'achat est `19-questions.html`. Le raisonnement du
commentaire est juste pour une **première** souscription. Mais une personne qui se réabonne — et qui a
donc déjà un bilan — est renvoyée refaire les sept questions **et** le selfie, sans raison. Or
`19-questions.html:663` la ferait sauter au selfie si son cycle n'est pas écoulé… et là elle tombe sur le
cul-de-sac du 1.3.

Un test `bilan existant ?` avant de choisir la destination réglerait les deux.

### 6.3 — Commentaire et code ne sont plus d'accord · LU

`16-paywall-a.html:283` annonce encore « plans : hebdo (essai 7 j) sélectionné par défaut » ; la ligne 288
dit `var plan = "annual"`. Même chose en `-b`. Signe que le déplacement de l'essai (7ef4e20) n'a pas été
relu — c'est exactement le point que `apple` documente côté `productId` (`9012 // placeholder`).

### 6.4 — La croix renvoie au tableau de bord **gratuit** · LU

`16-paywall-a.html:268` : `if (enTunnel()) { location.href = "12-dashboard-free.html"; return; }`, sans
regarder le statut. Une premium qui referme le paywall (cas 6.1) atterrit sur l'app gratuite.

---

## 7. Petites choses vraies

- **`10-promesse.html` est orphelin** : zéro lien entrant dans les 23 écrans et dans `app.js` (compté).
  Écran mort embarqué dans le binaire — et son bouton principal (`10-promesse.html:140`) pointe vers
  `/questions/age`, une route de la V1 React.
- **Aucune cible de lien cassée** parmi les 23 écrans (vérifié fichier par fichier).
- **Aucun `target="_blank"`, aucun `tel:`, aucun `window.open`** dans `public/scan-proto/`.
  Un seul `mailto:` (`17-reglages.html:314`, adresse personnelle `byllel@davinci-digitale.fr`).
  `apple` confirme que la coquille n'implémente pas `decidePolicyFor` : tap mort, ou pire, écran
  « Serveur injoignable » en français.
- **`08-search.html:740`** : le `fetch` de recherche n'a pas de `.catch`. Hors ligne, on tape et il ne
  se passe rien — ni résultat, ni message.
- **`03-result-free.html:328`** : la carte verrouillée affiche un score perso factice **62** sous un
  flou CSS. Le texte reste lisible dans l'arbre d'accessibilité, et le flou ne survit pas à une capture
  d'écran. Pour une abonnée renvoyée là par `?profil=aucun-bilan`, on affiche un faux chiffre au moment
  précis où on lui dit qu'on n'en a pas.
- **`11-dashboard.html:227`** affiche « Next face scan in *N* days » avec, juste dessous, un bouton
  « Face scan » parfaitement actif. Le texte dit d'attendre, le bouton dit le contraire.
- **`03-result-free.html:6`** : le titre de l'onglet reste « SmartSkin AI — Your result (**free**) »
  pour une abonnée renvoyée sur cette page. Le rebond `?profil=aucun-bilan` réécrit bien la carte
  (vérifié : « Your personal score is waiting for your scan » + « Scan my skin » + « You're subscribed —
  one scan and it unlocks ») — le titre, lui, n'a pas suivi.
- **`03-result-free.html:391`** : `"use strict"` est placé **après** `SS.tabbar(null)`, donc ce n'est pas
  une directive mais une expression sans effet. Sans conséquence ici, mais le fichier ne tourne pas en
  mode strict alors qu'il croit le faire.
- **`19-questions.html:214`** propose « Under 18 » et le tunnel continue normalement — photo de visage,
  IA, achat — alors que les CGU et la politique de confidentialité annoncent 16 ans minimum
  (`under_18` n'est mappé nulle part ailleurs que sur `age: 17`). Relevé par `apple`.
- **Session fantôme** : un cookie de session d'un compte **supprimé de la base** continuait de faire
  répondre `{connecte:true}` à `/api/moi` (constaté avec `neuf-1788275527086@local.test`, absent de
  `User`). Hors de mon périmètre, mais ça vaut un coup d'œil côté `auth` : tout écran gardé par
  `m.connecte` laisserait entrer ce jeton.

---

## Ce que je corrigerais d'abord

1. **1.1** — le paywall contourné. Une ligne (`next=paywall`) et une garde `m.premium` dans `21-analyse`.
   Sans ça, la V2 ne vend rien.
2. **1.2** — `go()` dans `01-scan`. Un mot à changer ; sans ça, refuser la caméra est un cul-de-sac.
3. **1.3** — le retour mort de `20-capture`. La garde de `19-questions.html:663` doit se taire quand on
   revient en arrière (drapeau, ou `history.length` au premier passage).
4. **2.1 + 2.2 + 2.3** — l'écran de démonstration qui reste. Un vrai état d'échec sur `03` et `06`,
   qui lise `r.ok` et affiche `score.raison`, plus le retrait de l'animation de la jauge tant qu'aucune
   donnée n'est arrivée. 6,6 % du catalogue en dépend, plus tous les liens de l'historique du 2.4.
   Et sur la voie étiquette, deux choses en plus, qui sont de mon côté de la frontière : ajouter à `CATS`
   une sortie « ce n'est pas un soin du visage », et cesser de faire porter l'alerte par un
   `confianceCategorie` qui ne peut pas s'éteindre. Un avertissement affiché 100 % du temps se lit comme
   du décor.
5. **3.1 + 3.2** — distinguer « pas premium » de « je n'ai pas pu savoir ». Aujourd'hui les deux
   partagent le même objet et la même redirection.
6. **5.1** — purger les clés `ss-` à la déconnexion, comme le fait déjà `purgerToutSS()`. **Une ligne**,
   et c'est le meilleur rapport gravité/coût du rapport : sans elle, la grossesse, les pathologies
   diagnostiquées et le traitement sur ordonnance de la personne précédente restent sur le téléphone et
   sont réinjectés dans le questionnaire de la suivante.

Les points 4.x (boutons morts), 6.x (paywall) et 7 (petites choses) sont réels mais tiennent en
quelques lignes chacun.
