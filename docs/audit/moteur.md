# Audit `moteur` — ce qui calcule et ce qui sert

Périmètre : `src/lib/scan/`, les routes `src/app/api/`, `src/features/analysis/`,
`src/features/recommendation/profile.ts`, `prisma/schema.prisma`.
Base : `da78133`. Suite existante : 261 tests, tous verts avant et après l'audit.
Aucun fichier de production modifié. Les tests de preuve ont été écrits, exécutés, puis supprimés ;
chaque constat ci-dessous porte la mention **REPRODUIT** (exécuté), **MESURÉ** (compté sur les
données réelles) ou **SOUPÇONNÉ** (lu, pas exécuté).

---

## 1. Bloquants

### B1 — La règle solaire s'applique aux produits qui partent au rinçage
`src/lib/scan/scoring.mjs:654` — **REPRODUIT**

```js
const grille = CONFIG.RUBRIQUES[categorie] || CONFIG.RUBRIQUES.indetermine;
if (filtresUV && (grille.rince ?? 1) >= 1) {
```

`rince` n'existe **que** dans `CONFIG.categoriesLegacy` (l'ancien système, marqué
« PLUS UTILISÉ PAR scoreFormule » ligne 74). Les entrées de `CONFIG.RUBRIQUES` ne portent pas ce
champ : `Object.keys(CONFIG.RUBRIQUES.cleanser)` = `label, metier, severite, exposition, prerequis,
merites, penalites`. Donc `grille.rince` vaut toujours `undefined`, `?? 1` vaut toujours `1`,
et le test est toujours vrai.

Le garde-fou annoncé par le commit `ece21a6` (« Réservé à ce qui reste sur la peau : un nettoyant
avec filtre UV part au rinçage ») ne s'exécute jamais.

**Déclenchement — bien plus large qu'il n'y paraît.** `besoin = min(3, besoinSolaire + pigmentation)`
(ligne 656) : les deux termes s'additionnent, donc il suffit de **l'un des deux**. Mesuré sur les 14
produits concernés :

| profil premium avec bilan | bonus | phrase affichée à l'écran | bandes qui basculent |
|---|---|---|---|
| `q4 = never`, aucune tache | +7 | « UV filters — you say you skip sunscreen » | 2/14 |
| `q4 = sometimes`, aucune tache | +3,5 | « UV filters — you only wear it sometimes » | 1/14 |
| **`q4 = daily`** + pigmentation | +3,5 | « UV filters — **it protects your dark spots** » | 2/14 |
| `q4 = never` + pigmentation | +10 | « UV filters — you say you skip sunscreen » | 5/14 |

Le seul profil épargné est celui qui répond « daily » **et** n'a aucune pigmentation. Or la famille
`spots` est alimentée par trois des seize attributs du scan (`dark_spots`, `post_acne_marks`,
`tone_evenness`) plus la priorité q1 « dark spots » : elle est très fréquente. Et selon le message
de commit `ece21a6`, **zéro** des 11 bilans de production ne répond « daily ». En pratique, presque
tout premium ayant un bilan déclenche la règle.

**Deux chemins d'entrée, pas un.** Le catalogue compte 14 produits rincés porteurs de `filtresUV`
(10 masques, 3 nettoyants, 1 exfoliant), la plupart parce que le `TITANIUM DIOXIDE` d'un masque à
l'argile — pigment, opacifiant — est lu comme un filtre UV. C'est le plafond du chemin
`/api/produit/fiche`.

Mais `/api/produit/lire-inci` (l'étiquette photographiée) ne consulte pas le catalogue : il
**recalcule** la catégorie ET le drapeau à la volée, `categoriser(nom, inci)` — `lire-inci/route.ts:49`,
`categorise.mjs:105` : `filtresUV: trouve(L, FILTRES_ORGA, 14) || trouve(L, FILTRES_MIN, 8)`.
En repassant le catalogue dans cette fonction, on obtient **19** cas au lieu de 14, dont
**5 invisibles par le chemin catalogue** (Bioderma Cicabio, Uriage Hyséac pâte SOS, Proactiv
Redness Correcting, Mario Badescu Blemish Repairing Powder…).

Et 19 n'est pas non plus le plafond : ce chemin accepte **n'importe quel produit du marché**. Le
critère réel est « une catégorie rincée + `ZINC OXIDE` ou `TITANIUM DIOXIDE` dans les 8 premières
positions » — deux ingrédients présents en positions 1-8 dans **5,0 % du catalogue** (148 produits
sur 2 949), toutes catégories confondues. *(Dénominateur : produits notables, `hors-perimetre` exclu.
En incluant le hors-périmètre : **152 sur 3 152, soit 4,8 %** — la convention retenue par
`docs/audit/apple.md`. L'écart 148 ↔ 152 s'explique exactement par l'exclusion : le catalogue
compte **212** produits `hors-perimetre`, dont 203 ont un INCI, et **4 d'entre eux** portent les
filtres en positions 1-8 — Naked Sundays BeautyScreen Foundation Tint SPF 50, COOLA Zinc Oxide
Liplux, bareMinerals Complexion Rescue SPF 30, Naturium KP Body Scrub. Arithmétique vérifiée :
2 949 + 203 = 3 152 et 148 + 4 = 152. La méthode de découpe n'entre pas en jeu — `parseInci` et
une découpe naïve sur les virgules rendent le même chiffre.)* Le catalogue n'est donc qu'un échantillon : le nombre de
produits du monde réel qui déclenchent la règle n'est pas borné par lui.

Côté App Store, `apple` le classe **P0 / 1.4.1 Physical Harm** — le motif du rejet du 31/07.

Mesuré sur les 14, profil « jamais de solaire + taches » :

| produit | perso | sans le bug | bande |
|---|---|---|---|
| Murad Rapid Relief Acne Sulfur Clay Mask | 77 | 67 | **vert ← orange** |
| Peter Thomas Roth Even Clearer Sulfur Mask | 77 | 67 | **vert ← orange** |
| Drunk Elephant Pekee Face Cleansing Bar | 76 | 66 | **vert ← orange** |
| ROSEN Break-Out Clearing Cleanser | 75 | 65 | **vert ← orange** |
| TULA Detox in a Jar Exfoliating Mask | 51 | 41 | **orange ← rouge** |
| (9 autres) | +10 | | bande inchangée |

+10 points sur les 14, et **5 changent de couleur**. Pire que le chiffre : la ligne apparaît
dans `factsAffiches`, donc à l'écran, sur les 14 — « **UV filters — you say you skip sunscreen** »
sur un masque à l'argile, un pain nettoyant et un peeling maison. C'est faux, et c'est une
affirmation de protection solaire.

Correctif à un mot : tester une propriété qui existe. Les catégories visées par l'intention
d'origine sont `cleanser`, `makeup-remover`, `mask`, `exfoliant`.

---

### B2 — `/api/analyze` n'attrape rien, et n'authentifie personne
`src/app/api/analyze/route.ts:18-24` — **REPRODUIT** (2 des 4 chemins)

C'est le cœur du produit : la route du scan visage. Elle n'a aucun `try/catch`.

1. `const { answers, image } = await request.json();` — pas de `.catch()`, contrairement à
   toutes les autres routes du dépôt. Un corps non-JSON jette. **REPRODUIT**
   (`await expect(POST(req)).rejects.toThrow()`).
2. `Buffer.from(image, "base64")` — `image` n'est vérifié que par `!image`. Un objet ou un nombre
   passe le test puis fait jeter `Buffer.from` (`TypeError: The first argument must be of type
   string…`). **REPRODUIT**.
3. `analyzeWithAnthropic` (`src/features/analysis/anthropic.ts:54`) fait
   `AnalysisResultSchema.parse(JSON.parse(extractJson(raw)))` : le `JSON.parse` jette sur une sortie
   tronquée, le `.parse` zod jette sur un bilan incomplet. **SOUPÇONNÉ** (non exécuté : il faut la
   vraie clé).
4. `client.messages.create` jette sur 429 / 529 / timeout. **SOUPÇONNÉ**.

Dans les quatre cas, le client reçoit un 500 nu. Les routes de scan **produit** savent pourtant
distinguer les cas : `moteur.ts:53` définit `PanneService` et `erreur()` rend
`service_indisponible` (200) vs `erreur` (500) — « surcharge du modèle » n'est pas « mauvaise
photo ». Le scan **visage** n'a rien de tout ça.

Deuxième face, signalée aussi par `ecrans` et confirmée ici : **aucune auth, aucun gating premium**
sur cette route (commentaire ligne 6 : « Pas d'auth ni de sauvegarde pour l'instant »). Seule
barrière : `aiRateLimit`. Un visiteur anonyme déclenche un appel Opus 4.8 à 16 000 tokens de sortie.

---

### B3 — `/api/produit/overview` n'a pas de `try/catch`
`src/app/api/produit/overview/route.ts:19` — **REPRODUIT**

C'est la seule des cinq routes qui appellent `profilUtilisateur` sans filet — le commentaire
d'en-tête de `profil-utilisateur.ts:14` le dit lui-même. `profilUtilisateur` ne jette effectivement
jamais (vérifié, cf. §4), mais **`sessionPremium()` juste au-dessus, si** : il appelle
`userHasAccess(uid)` → `db.user.findUnique`, sans `.catch`.

Preuve : `db.user.findUnique` mocké en rejet → `GET(...)` rejette avec `db down`.
Base indisponible = 500 non rattrapé au lieu du `{overview: null}` que la route sait produire
partout ailleurs.

---

### B4 — `ref` non validé dans `/api/produit/overview` → lecture de fichier arbitraire
`src/app/api/produit/overview/route.ts:15-16` + `src/lib/scan/avis.ts:185` — **REPRODUIT**

La route ne vérifie que `if (!ref)`. `ref` part ensuite dans
`tousLesAvis(ref)` → `fs.readFileSync(path.join(DOSSIER, dossier, ref + ".json"))`.
`path.join` normalise les `..`, donc :

```
ref = "../scan/profil"   → data/scan/profil.json          (LU)
ref = "../byprofiles"    → data/byprofiles.json           (LU)
ref = "../../../../../../etc/hosts" → /etc/hosts.json
```

Vérifié : les deux premiers renvoient bien le contenu du fichier hors dossier.

La route sœur `/api/produit/avis` **est** protégée (`avis/route.ts:16`,
`/^[A-Za-z]{0,12}[A-Z0-9]{6,20}$/i` interdit `.` et `/`). Overview a été écrite sans reprendre ce
garde-fou. L'exploitation reste étroite — il faut un `.json` lisible portant un tableau `avis`, et
le contenu ne ressort que résumé par le modèle — mais c'est un `readFileSync` piloté par
l'utilisateur dans une route qui part chez Apple. Correctif : la même regex, une ligne.

---

### B5 *(déclassé — masqué par accident, voir l'encadré)* — un premium **sans bilan** perd la note et le nombre d'avis
`src/app/api/produit/fiche/route.ts:42-63` — **MESURÉ**

Avant `a83c6f7`, `profilUtilisateur` rendait `data/scan/profil.json` à tout le monde, donc
`avisPour()` renvoyait toujours un objet et l'écran avait sa note étoiles. Depuis, quand
`r.etat !== "ok"` :

```js
const pr = r?.etat === "ok" ? r.profil : PROFIL_NEUTRE;
const a = avisPour(p, pr);                       // ← calculé avec le profil NEUTRE
const brut = a ? null : tousLesAvis(...);        // ← donc `brut` reste null
…
avis: r?.etat === "ok" ? a : null,               // ← null
avisBrut: a ? null : …                           // ← null aussi
```

`avisPour(p, PROFIL_NEUTRE)` retourne un objet non nul pour **1978 fiches enrichies sur 1980
(99,9 %)** : `PROFIL_NEUTRE.concerns` est vide et `skinType` vaut `""`, mais les `aspects` sans
`concerne` suffisent à passer le `if (!pourElle && !problemes.length && !aspects.length)` de
`avis.ts:148`. Donc `a` est truthy, donc le repli `avisBrut` est mort.

Résultat : un abonné qui n'a pas encore de bilan visage (ou dont la base est en panne, ou dont
le `result` est corrompu) voit la fiche produit **sans note, sans nombre d'avis, sans extrait** —
alors que les 1978 fiches concernées en ont une. Les deux champs `avis` et `avisBrut` sont `null`
en même temps, ce que l'écran ne peut pas distinguer de « ce produit n'a pas d'avis ».
Un gratuit est dans le même cas, mais pour lui c'est le gating voulu.

> **Déclassé après recoupement avec `ecrans`.** La régression n'est pas visible aujourd'hui, pour
> une raison invisible depuis les routes : `06-result-premium.html:1234` rebondit **avant** de
> regarder les avis — `if (!pe || typeof pe.score !== "number") { location.replace("03-result-free.html" + q); return; }`
> — et `03-result-free.html` ne contient aucun bloc avis (`grep -c d-avis` → 0). Vérifié
> moi-même sur les deux fichiers. La charge utile `avis: null` + `avisBrut: null` n'est donc jamais
> rendue : la page qui s'en servirait n'est pas atteinte.
>
> Reste à corriger quand même : le masquage tient à un rebond qu'on a de bonnes raisons
> d'assouplir (il envoie une abonnée sur une page intitulée « Your result (free) »). Le jour où il
> saute, 1978 fiches perdent leur note d'un coup. **Bombe à retardement, pas bloquant.**

---

### B6 — `/api/register` offre l'accès à vie, sans authentification
`src/app/api/register/route.ts:35` — **MESURÉ** (verrouillé par un test existant)

```js
await db.user.create({ data: { email, passwordHash, lifetimeAccess: !parsed.data.sansAcces, … } });
```

Endpoint public, sans auth. Un POST `{email, password}` sans `sansAcces` crée un compte avec
`lifetimeAccess: true`, donc `userHasAccess` vrai, donc tout le premium. Le comportement est
délibéré (le test `src/app/api/register/__tests__/sans-acces.test.ts:33` le verrouille : « sans le
flag → comportement V1 intact ») et le proto V2 envoie bien `sansAcces: true`
(`public/scan-proto/commun/app.js:308`) — mais `src/components/screens/AuthScreen.tsx:101-104`,
lui, ne l'envoie pas, et surtout le flag est **côté client**. Un `curl` suffit.

À l'échelle du produit c'est un contournement du paiement ; du point de vue Apple c'est du
contenu vendu en IAP obtenu hors IAP. La forme sûre est l'inverse du défaut actuel :
`lifetimeAccess: false` toujours, et l'accès posé par le seul chemin d'achat.

### B7 — « Restore purchases » accorde l'accès à vie, quoi qu'on ait restauré
`src/app/api/iap/grant/route.ts:21-28` + `public/scan-proto/commun/app.js:217` — **REPRODUIT**
*(piste signalée par `apple`, vérifiée ici)*

```js
const { plan } = await request.json().catch(() => ({ plan: "lifetime" }));
…
} else { await db.user.update({ … data: { lifetimeAccess: true } }); }
```

Le seul appelant de cette route dans le proto V2 est le restore :
`fetch("/api/iap/grant", { method: "POST" })` — **sans corps**. Vérifié en Node :
`new Request(url, {method:"POST"}).json()` rejette (`SyntaxError: Unexpected end of JSON input`),
donc le `.catch` pose `plan = "lifetime"`, donc la branche `else` pose `lifetimeAccess: true`.

Autrement dit : **chaque appui sur « Restore purchases » convertit n'importe quel abonnement en
accès permanent**, et `computeHasAccess` (`checkout/access.ts:11`) court-circuite ensuite sur ce
booléen pour toujours. `/api/iap/sync` ne le redescend jamais (ligne 35 : « productId
absent/inconnu → aucun changement »), donc c'est irréversible sans intervention en base.

Le défaut est à l'envers : un corps illisible devrait donner **aucun** accès, pas le plus généreux.

---

## 2. Importants

### I1 — Course : une lecture de profil en vol réécrit l'ancien profil après l'oubli
`src/lib/scan/profil-utilisateur.ts:99-143` — **REPRODUIT**

Séquence :

1. Requête A (une fiche produit) : mémo vide → `db.analysis.findFirst` part.
2. Pendant l'aller-retour, `POST /api/scan` enregistre le **nouveau** bilan et appelle
   `oublierProfil(uid)` — le mémo est déjà vide, l'appel ne fait rien.
3. La requête A revient avec l'**ancienne** ligne et fait `ecrireMemo(uid, ancienProfil)`.
4. Les 5 minutes suivantes, toutes les notes perso sortent de l'ancienne peau.

Test écrit et vert : après la séquence, `profilUtilisateur("u1")` rend `skinType: "oily"` alors que
la base contient déjà le nouveau bilan `"dry"`.

C'est exactement le scénario du parcours V2 : l'écran de résultat sauvegarde le scan et charge des
fiches produit dans la foulée. Correctif classique : un compteur de génération par uid, incrémenté
par `oublierProfil`, comparé avant d'écrire.

### I2 — Sept routes sans `try/catch` autour de leurs appels base
**SOUPÇONNÉ** (lecture ; le mécanisme est prouvé par B3)

| route | ligne | ce qui peut jeter |
|---|---|---|
| `analyze` | 18, 23, 24 | cf. B2 |
| `overview` | 19 | cf. B3 |
| `scan` | 16, 24 | `auth()` (les autres routes font `.catch(() => null)`), `db.analysis.create` |
| `moi` | 20 | `userHasAccess` |
| `moi/bilan` | 18 | `db.analysis.findMany` |
| `shelf` | 28, 45-49 | `db.protocol.*` |
| `iap/sync`, `iap/grant` | 24-33, 15-28 | `auth()`, `db.user.update` |
| `register` | 30, 34-35 | `db.user.*` |

Les deux qui comptent pour la soumission : **`iap/sync` et `iap/grant`**. Un 500 juste après
l'achat est avalé en silence côté web (`app.js:255` : `.catch(function () {})` puis `purgerMoi()`),
donc l'utilisatrice a payé et se retrouve en gratuit sans un mot. Et `db.user.update` jette par
construction si la ligne User n'existe plus (P2025).

### I3 — `/api/iap/sync` : `NaN` passe la garde de type
`src/app/api/iap/sync/route.ts:32-33` — **REPRODUIT** (partie JS)

```js
} else if ((productId === WEEKLY_ID || productId === ANNUAL_ID) && typeof expiresAt === "number") {
  await db.user.update({ … data: { accessUntil: new Date(expiresAt) } });
```

`typeof NaN === "number"` → vrai. `new Date(NaN)` → `Invalid Date` → Prisma refuse l'argument et
jette, dans une route sans `try/catch` (I2). Même chose pour `Infinity`.
Et une valeur en **secondes** au lieu de millisecondes donnerait `accessUntil` en 1970, donc un
abonné payant sans accès, sans erreur visible. Le natif envoie bien des ms
(`Bridge.swift:12`, `Store.swift:68` : `timeIntervalSince1970 * 1000`), mais rien côté serveur ne
le vérifie et le corps n'est pas signé. Une borne (`Number.isFinite` + fenêtre `[maintenant,
maintenant + 2 ans]`) coûte deux lignes.

### I4 — `/api/moi/bilan` charge toutes les photos pour dessiner une courbe
`src/app/api/moi/bilan/route.ts:18-22` — **SOUPÇONNÉ** (lecture, non chronométré faute de base)

```js
const scans = await db.analysis.findMany({ where: { userId: uid }, orderBy: { createdAt: "asc" },
  select: { createdAt: true, score: true, skinType: true, skinAge: true, photoData: true, result: true } });
```

`photoData` est une data URL base64 (`schema.prisma:80`), et `result` le bilan complet. Seul
`scans.at(-1)` s'en sert ; `evolution` (ligne 92) n'utilise que `createdAt` et `score`.
Avec N scans, la route lit N photos et N bilans pour en afficher un. La route est appelée par le
dashboard V2. Deux requêtes (une `findMany` maigre pour la courbe, un `findFirst` complet pour le
dernier) suppriment le problème.

À noter aussi : `/api/scan:30` n'impose **aucune borne de taille** à `photo`
(`typeof photo === "string" && photo.startsWith("data:")`), alors que `moteur.ts:95`
`imageDepuisDataUrl` en impose une (9 Mo) pour le scan produit.

### I5 — `classement()` bloque l'instance 76 à 243 ms par catégorie et par profil
`src/app/api/produit/alternatives/route.ts:25-44` — **MESURÉ**

Chronométré sur le catalogue réel (Node 24, ce Mac ; Render sera plus lent) :

| catégorie | sans allergie | avec les 3 allergies (212 INCI) |
|---|---|---|
| serum (515) | 82 ms | 226 ms |
| moisturizer (545) | 76 ms | 243 ms |
| cleanser (383) | 43 ms | 118 ms |

C'est du CPU **synchrone** : pendant ce temps l'instance Node ne sert rien d'autre. Le surcoût
×3 vient de `scorePerso` ligne 568 :
`profil.allergies?.some((a) => it.name.includes(a.toUpperCase()))` — O(ingrédients × 212), et
le `.toUpperCase()` est refait à chaque ingrédient de chaque produit alors que la liste est déjà
en majuscules. Un `Set` + une passe de normalisation en amont annulent l'essentiel.

Deux effets de bord du cache lui-même :
- `MAX_CACHE = 200` en FIFO, clé = `categorie + "::" + cleProfil(pr)`. Avec 11 catégories, ~18
  profils distincts remplissent le cache ; au-delà il se vide en boucle et chaque requête repaie
  les 243 ms.
- `categorie` vient du client **sans validation**. 200 requêtes avec des catégories inventées
  (chacune coûte un filtre sur 3 232 produits et rend `[]`) évincent toutes les entrées réelles.
  Réservé aux premium avec bilan, donc faible risque, mais gratuit à corriger : refuser une
  `categorie` absente de `CONFIG.RUBRIQUES`.

### I6 — Shelf : course sur le double PUT, deux lignes `Protocol` possibles
`src/app/api/shelf/route.ts:28, 45-49` — **SOUPÇONNÉ**

`findFirst({ where: { userId } })` **sans `orderBy`**, puis `update` ou `create`. Deux PUT
concurrents (un double tap sur « ajouter au shelf ») voient tous deux `proto === null` et créent
deux lignes. Ensuite, `GET` fait le même `findFirst` sans ordre : Postgres ne garantit pas laquelle
revient, et elle peut changer après un `UPDATE`. Le shelf se met alors à osciller entre deux états.
`schema.prisma:28` autorise bien `protocols Protocol[]`. Le correctif propre est un `@unique` sur
`Protocol.userId` + un `upsert`.

### I6bis — `PUT /api/shelf` enregistre une note perso fournie par le client, jamais recalculée
`src/app/api/shelf/route.ts:18` — **REPRODUIT** *(signalé côté écran par `ecrans`, versant serveur ici)*

`ShelfItemSchema` accepte `perso: z.number().nullable().optional()` : la route stocke le nombre
tel quel dans `Protocol.products`, sans jamais le recalculer. C'est justement le chiffre que
`/api/produit/scores` a été écrit pour rafraîchir (cf. l'en-tête de cette route : « le `perso`
stocké devient un simple repli d'affichage hors ligne »).

Vérifié dans le proto : `SS.rafraichirScores` est bien appelé sur l'étagère, mais **seulement sur
une page d'affichage** (`18-bilan.html:636`), jamais sur le chemin de décision.
`modalRemplacer` (`commun/app.js:465`) lit `actuel[champ]` — la note **stockée** au moment de
l'ajout — et la compare à `nouveau[champ]` — la note **fraîche** de la fiche ouverte. Le verdict
« we would keep it » est donc calculé sur deux notes qui ne viennent pas du même bilan.

Le versant serveur aggrave le cas : comme la valeur périmée est persistée en base par le PUT, elle
**suit le compte d'un appareil à l'autre**, au lieu de mourir avec le `localStorage`.

### I7 — INCI vide : le moteur affirme une texture qu'il n'a pas lue
`src/lib/scan/scoring.mjs:340-356` et `631-643` — **REPRODUIT**

`natureProduit([])` rend `richesse: 0`, donc `legere: 0 <= seuilLegere(2)` → **vrai**.
Une liste d'ingrédients vide est donc classée « produit léger, à base d'eau ».

```
INCI = ""  →  formule 47 (analysePartielle: true)
              perso peau grasse 52, fact affiché :
              « Light, water-based texture — right for your oily skin »  (+5)
              perso peau sèche 40, fact affiché :
              « Light texture — not nourishing enough for your dry skin » (−7)
```

**71 produits du catalogue** (hors périmètre exclu) n'ont pas d'INCI. Ils sont invisibles pour
`/api/produit/recherche`, `/alternatives` et `/scores` (tous filtrent sur `p.inci`) — mais pas pour
`/api/produit/identifier`, qui ne filtre que par marque et peut donc les proposer après une photo.
L'écran de fiche affiche ensuite 47/52 et une phrase sur la texture, à partir de rien.
Il faudrait un court-circuit `si aucun ingrédient lisible → pas de note`, comme pour
`hors-perimetre`.

### I7bis — Le filtre « hors périmètre » ne regarde que le NOM, jamais la composition
`src/lib/scan/categorise.mjs:94` + `src/app/api/produit/lire-inci/route.ts:44-49` — **REPRODUIT**

```js
export function categoriser(nom, inci) {
  if (HORS_PERIMETRE.test(nom || "")) return { categorie: "hors-perimetre", … };
```

Le court-circuit qui protège des produits corps / cheveux / lèvres / maquillage teste **uniquement
la chaîne `nom`**. Or `lire-inci` la construit depuis ce que le modèle a su lire sur l'étiquette :
`const nom = typeof r?.nom === "string" ? r.nom : "";` (ligne 44). Une étiquette photographiée de
dos, ou dont le nom commercial n'apparaît pas dans le cadre, donne `nom = ""` — et
`HORS_PERIMETRE.test("")` est faux.

Mesuré en repassant les 203 produits `hors-perimetre` du catalogue qui ont un INCI dans
`categoriser("", inci)`. Le résultat se lit en trois groupes, et **aucun des 203 ne reste
hors périmètre** :

| | nom complet | nom illisible |
|---|---|---|
| **A** — la regex les rate **déjà avec leur nom** | 82 | 82 |
| **B** — protégés par le nom, perdus sans lui | 121 *(hors-perimetre)* | 121 |
| **C** — protégés dans les deux cas | 0 | **0** |

Deux chiffres circulent donc, et les deux sont exacts : **121** est l'ampleur de la *régression*
(protégés par le nom, perdus sans lui) ; **181** est le nombre qui atterrit sur une **vraie
catégorie visage** (les 22 restants tombent sur `indetermine`, qui a sa propre grille et se fait
noter quand même). Répartition, nom illisible : `cleanser` 62, `serum` 33, `moisturizer` 32,
`makeup-remover` 21, `sunscreen` 15, `exfoliant` 13, `mask` 5, `indetermine` 22.

```
VANICREAM Gentle Body Wash             → cleanser
BYOMA Blemish Acne Control Body Lotion → exfoliant
TATCHA The Melting Lip Balm            → makeup-remover
Saltair HA Body Hydrator               → serum
```

**Le groupe A est le plus gênant et n'a rien à voir avec la lisibilité.** Ces 82 produits sont
étiquetés `hors-perimetre` dans `catalog.json`, mais `categoriser(p.name, p.inci)` — avec le nom
complet — ne les y remet pas : le code et la donnée sont en désaccord. En regardant lesquels, la
regex de `categorise.mjs:17` a deux trous nets :

- **les coffrets multi-produits** : elle couvre `kit|bundle|coffret|set`, mais pas *Trio*, *Duo*,
  *Dual Pack*, *System* — « Tricoci Even Glow Treatment **Trio** » → `treatment`,
  « ANUA PDRN Deep Hydration **Trio** » → `moisturizer`, « Mad Hippie Day & Night **Dual Pack** » → `serum` ;
- **les formes corps absentes de la liste** : `body (wash|lotion|cream|butter|oil|scrub|serum|milk)`
  n'inclut ni *spray* ni *mist* — « PanOxyl Acne Banishing **Body Spray** » → `exfoliant`,
  « First Aid Beauty **Body Acne Clearing Mist** » → `exfoliant`.

Ces 82 ne fuient que par `lire-inci` : sur le chemin catalogue, `fiche/route.ts:30` court-circuite
sur le champ `p.category` stocké, qui dit bien `hors-perimetre`. Mais le désaccord code/donnée
mérite d'être tranché — s'il faut un jour recalculer le catalogue, ces 82 basculent en soin du
visage.

**Le cumul avec B1** : 17 des 203 portent `filtresUV`, et **15 reviennent en `sunscreen`** avec ce
drapeau — donc éligibles au bonus solaire perso. Liste complète, vérifiée :

| | produit |
|---|---|
| **lèvres (6)** | Vacation Chardonnay SPF30 Lip Oil · Naked Sundays PoutScreen Lip Treatment SPF 50 · Naked Sundays Go + Glow Lip Oil SPF 50 · COOLA Zinc Oxide Liplux · **Neutrogena 6 Hour Protection Lip Balm** · **Naturium Phyto-Glow Lip Balm SPF 45** |
| maquillage | Naked Sundays BeautyScreen Peptide Foundation Tint SPF 50 |
| corps (5) | Coco & Eve Tan Boosting Body Oil SPF45 · Coco & Eve Body Highlighter SPF 50 · Coco & Eve Coconut Body Milk SPF 50 · Lierac Sunissime Huile Solaire · Topicrem GIGATEMP Mela Lait Corps |
| autres (3) | Oars + Alps Face + Scalp Mist SPF 35 · LRP Cicaplast Baume B5 · LRP Anthelios UVMune 400 Lait Solaire |

**Cinq ou six soins des lèvres sur quinze, selon le critère** — et l'écart est instructif.
Le code n'a qu'une sous-expression « lèvres », `lip (balm|scrub|mask|oil|treatment)`
(`categorise.mjs:17`) : elle en reconnaît **5**. Comptés par nature réelle du produit, ils sont
**6**. Le seul litigieux est **COOLA Zinc Oxide Liplux Sunscreen Trio** — un baume à lèvres dont le
nom ne contient jamais les mots « lip balm », parce que la marque a fait de « Liplux » un nom
propre. Vérifié : `HORS_PERIMETRE.test("COOLA Zinc Oxide Liplux Sunscreen Trio")` rend **false**,
aucune clause de la regex ne l'attrape.

Le désaccord entre les trois rapports (`ecrans` retient 5, moi 6) est donc lui-même une
démonstration du problème : un garde-fou qui lit des mots ne peut pas suivre le marketing.
« Liplux », « PoutScreen », « BeautyScreen » sont des noms déposés qui décrivent la catégorie sans
en employer le vocabulaire. C'est un argument de plus pour faire porter la barrière sur la
composition. *(J'avais d'abord annoncé quatre : mon script n'imprimait que les 8 premiers résultats
sur 15. Corrigé après signalement d'`apple`, revérifié sur la liste entière.)*

**Et sur l'écran gratuit, il n'y a aucun garde-fou du tout** *(constat d'`ecrans`, vérifié ici)*.
Les trois éléments qui signalent une lecture d'étiquette incertaine n'existent que sur la fiche
premium :

| | `06-result-premium` | `03-result-free` | `02-fork` |
|---|---|---|---|
| bandeau `d-lu` | 12 occurrences | **0** | **0** |
| « — we're not certain » | 2 | **0** | **0** |
| bouton « Change » | 1 | **0** | **0** |

L'abonnée a donc un avertissement qui ne s'éteint jamais (donc inaudible), et la gratuite n'a
**rien** : même jauge, même verdict qu'un produit du catalogue, sur un gel douche. Ici il n'y a
même pas de seuil à discuter — l'élément d'interface est absent du fichier.

**Et le dernier garde-fou, `confianceCategorie`, est dégénéré sur ce chemin.** `06-result-premium.html:1181`
n'affiche « — we're not certain » que si la confiance vaut exactement `"sur"`. Or `sur` exige
`n1 >= 4` (`categorise.mjs:103`), les votes de NOM pèsent 3/2/1 (lignes 24-45) et ne s'appliquent
pas sur un nom vide, et les votes de COMPOSITION plafonnent à 3 (lignes 74-85). Donc `n1 <= 3 < 4` :
**`sur` est mathématiquement inatteignable sans nom lisible.** Vérifié sur les 3 152 produits du
catalogue passés dans `categoriser("", inci)` — `sur` sort **0 fois** (incertain 1 678,
probable 1 207, aucune 267).

Conséquence à double tranchant. Le bon côté : aucun produit hors périmètre n'est jamais présenté
avec pleine confiance, l'avertissement tombe sur les 203. Le mauvais : il tombe aussi sur les
2 949 produits visage légitimes scannés de la même façon. Un avertissement qui ne s'éteint jamais
n'informe plus — et c'est précisément lui qu'on charge d'attraper le gel douche. S'y ajoute que la
liste de correction (`CATS`, ligne 1168) ne propose que des catégories visage : l'utilisatrice n'a
aucun moyen de dire « ce n'est pas un soin du visage ».

Le correctif ne peut pas être un meilleur nom : il faut une preuve de composition. Le faisceau
existe déjà (`preuvesComposition`) ; il lui manque des marqueurs négatifs — un tensioactif en
position 1-2 avec un volume de parfum, une base de baume à lèvres, un pigment de maquillage.
À défaut, `lire-inci` devrait au minimum refuser de noter quand `nom` est vide **et** que la
confiance de catégorie est `"incertain"` ou `"aucune"`.

### I8 — Appariement flou des avis : 17 produits reçoivent les avis d'un autre
`src/lib/scan/avis.ts:174-176` — **MESURÉ**

```js
for (const [n, e] of _parNom!) {
  if (n.length >= 12 && (n.includes(nom) || nom.includes(n))) return pourProfil(e, profil);
}
```

Le garde-fou (12 caractères) porte sur le nom de la fiche d'avis, **pas** sur le nom du produit
cherché. 17 produits sont appariés par ce repli, dont 6 sur une base courte :

```
« La Roche-Posay Anthelios »   → avis de « Anthelios Melt-in Milk Body & Face SPF 100 » (4,37★, 605)
« medicube Booster Pro Mini Plus Facial Cleansing Device Head » → avis de « medicube Booster Pro » (3,86★, 36)
« Bioderma Sensibio Ar »       → avis de « Sensibio AR+ CREAM » (4,33★, 78)
« The Ordinary Gf 15% Serum »  → avis du même produit, nom long (acceptable)
« CeraVe Acne Control Gel »    → idem (acceptable)
```

Le cas Anthelios est le plus net : le nom générique désigne une **gamme**, et **12 fiches d'avis**
du dépôt commencent par « la roche posay anthelios ». Laquelle gagne dépend de l'ordre de
`fs.readdirSync` — donc du système de fichiers, donc potentiellement d'un déploiement à l'autre.
La tête de remplacement d'un appareil de nettoyage hérite des avis de l'appareil.

C'est exactement ce que `7a2ed2b` a corrigé côté écran ; il reste ce chemin côté serveur.

### I9 — Un doublon de nom au catalogue, deux notes selon la route
**MESURÉ**

`olay retinol night cream for women` apparaît **deux fois**, avec deux INCI différents.
`/api/produit/fiche` prend le **premier** (`cat.find`), `/api/produit/scores:32` garde le **dernier**
(`parNom.set` écrase). La note de la carte d'historique peut donc différer de celle de la fiche
ouverte depuis cette carte. Un seul produit concerné.

---

## 3. Mesures de calibration (pas des bugs — des chiffres à valider)

- **Allergie parfum : 43,7 % du catalogue plafonné à 10/100**, pas 33 %.
  `profil-peau.ts:299` annonce « soit 33 % du catalogue ». Compté sur les 2 949 produits notables
  avec le dépliage réel (137 INCI) et la règle de sous-chaîne de `scoring.mjs:568` :
  **1 289 produits plafonnés**, soit 43,7 %. Décision produit, mais le chiffre du commentaire est
  faux d'un tiers, et 44 % du catalogue en rouge est un effet visible.
  Dépliages : `allergy-fragrance` → 137 INCI, `allergy-eo` → 120, `allergy-preservative` → 5.

- **Le débordement de sous-chaîne est bien bénin, à une exception près.** Balayage complet du
  catalogue : les 57 sur-matches sont des variantes de la même substance
  (`FRAGRANCE ⊂ PARFUM/FRAGRANCE` ×166, `LIMONENE ⊂ D-LIMONENE`, `TERPINEOL ⊂ 4-TERPINEOL`…).
  L'arbitrage sur `CAMPHOR` (ligne 320) tient. Le seul faux : **`PINENE ⊂ ALPHA-TERPINENE`** —
  l'alpha-terpinène n'est pas un pinène (2 produits). Marginal.

- **`natureProduit` compte les émulsifiants comme de la richesse.** `MOTS_RICHE` cherche
  `STEARATE` / `PALMITATE` / `OIL` par sous-chaîne, ce qui attrape `PEG-100 STEARATE` (213
  occurrences), `SORBITAN ISOSTEARATE` (215), `ASCORBYL PALMITATE` (91), `RETINYL PALMITATE` (52),
  `PEG-40 HYDROGENATED CASTOR OIL` (78) — des émulsifiants et des esters de vitamine, pas des
  corps gras. En les ignorant, **1,6 % des produits perdent le verdict « riche » et 3,8 % gagnent
  « léger »** (≈ 5 % du catalogue), pour un écart de note perso allant jusqu'à **12 points**
  (peau grasse) et 7 (peau sèche). Antérieur à aujourd'hui (v1.2), à revoir en calibration.

- **Deux pièges latents, sans effet aujourd'hui** :
  - `cleProfil` (`profil-peau.ts:392`) annonce « tout ce que scorePerso lit, et rien d'autre »,
    mais **`libelles` n'y est pas** — et `scorePerso:586` et `:662` le lisent pour composer les
    `facts`. Sans conséquence tant que le cache d'alternatives ne stocke que des nombres
    (`nom, marque, image, formule, perso`) ; le jour où il stockera un `fact`, deux profils de même
    peau se partageront les mots de l'autre.
  - `lireMemo` (`profil-utilisateur.ts:74`) rend **la même référence d'objet** à tous les
    appelants. Vérifié par test : muter `r.profil.concerns` depuis un appelant corrompt le profil
    de cet utilisateur pour toutes les requêtes suivantes. Aucune route ne mute aujourd'hui
    (`scorePerso`, `ficheIngredients`, `avisPour` sont en lecture seule).

---

## 4. Ce que j'ai cherché et **pas** trouvé

La mission demandait explicitement les fuites entre comptes. Voici ce qui a été vérifié et tient :

- **Le mémo par uid est étanche.** Deux uid distincts, deux bilans différents en base → deux
  profils corrects, et le 3ᵉ appel sort bien du mémo sans retoucher la base. **REPRODUIT.**

- **`cleProfil` est injective sur les profils atteignables.** Balayage exhaustif de 2 880 profils
  construits depuis de vrais bilans (5 types de peau × 4 combinaisons q1 × 4 valeurs q4 ×
  4 valeurs q7 × 3 q3 × 3 q2 × 6 jeux d'attributs) : **zéro collision** entre deux profils qui se
  notent différemment. Vérifié en plus que toutes les sévérités atteignables après renormalisation
  (0,444 / 0,5 / 0,571 / 0,667 / 0,8 / 0,889 / 1 / 1,143 / 1,333 / 1,5 / 1,6 / 1,714 / 2 / 2,4 / 3)
  restent distinctes à 2 décimales — l'arrondi `toFixed(2)` ne fusionne rien. **REPRODUIT.**
  Aucun classement d'alternatives ne peut donc partir chez quelqu'un d'autre.

- **La clé du cache d'alternatives n'est pas forgeable.** `categorie` est libre, mais pour
  atteindre l'entrée d'un autre il faudrait que sa propre empreinte de profil soit un suffixe de
  celle de la victime après un `::` — impossible tant qu'aucun champ du profil ne contient `::`
  (types de peau fermés, familles fermées, allergies = clés du dictionnaire).

- **L'empreinte du cache d'overview couvre exactement ce qui entre dans le prompt** :
  `skinType` + `concerns` + `libelles` (`overview.ts:106`), et `consigne()` n'utilise rien d'autre.
  Pas de fuite de paragraphe entre deux profils.

- **`normaliserAnswers` résiste à tout ce que la base peut contenir.** Testé sur `null`, une
  chaîne, un nombre, un tableau, `{q1: "blemishes"}`, `{q7: null}`, `{q5: {changed: true}}`,
  `{q5: "oui"}`, `{q2: [null, 3, {}]}` : aucun jet, et `versProfilPeau` derrière non plus.
  **REPRODUIT** — c'est solide.

- **Les bornes du profil tiennent.** `attributes: []` → `concerns` vide, `skinType` valide,
  `strengthCeiling` fini. Les 14 attributs à 4 → au plus 3 familles et Σ sévérités ≤ 4, comme
  annoncé. **REPRODUIT.**

- **Les tables de correspondance couvrent bien le questionnaire réel.** Les 12 valeurs de q1, les
  5 symptômes de q5, les 3 valeurs de q4 et les 7 valeurs de q7 de
  `src/features/funnel/questions.ts` sont toutes présentes dans `Q1_FAMILLES` / `Q5_FAMILLE` /
  `besoinSolaireDe` / `GROUPES_ALLERGENES`. Et le proto V2
  (`public/scan-proto/19-questions.html`, qui duplique le questionnaire) a bien reçu les trois
  options d'allergie aujourd'hui — les deux copies sont en phase. *(À surveiller : cette
  duplication n'a aucun garde-fou.)*

- **`/api/produit/avis` bloque la traversée de chemin** (contrairement à overview, cf. B4), et
  `/api/produit/scores` est à l'abri de la pollution de prototype (index par `Map`, pas par objet).

---

### Une bonne nouvelle d'infrastructure

`app.smart-skin.ai` (`srv-d8vhur68bjmc738ajumg`, plan starter, région **frankfurt**) tourne avec
`numInstances: 1`. Donc, aujourd'hui, `oublierProfil()` est réellement efficace pour toute la
flotte, et la « borne de fraîcheur de 5 minutes » décrite dans
`profil-utilisateur.ts:67-69` ne se produit pas encore — elle apparaîtra le jour où l'on passera à
2 instances. Même remarque pour les caches d'alternatives et d'overview : ils sont cohérents tant
qu'il n'y a qu'un processus.
(L'API Render ne m'expose pas les variables d'environnement : je n'ai pas pu vérifier
`SCAN_TEST_PREMIUM` — cf. la question d'`apple`.)

---

## 5. Réponse aux questions d'`ecrans`

**« La fiche doit-elle afficher `score.raison`, ou la route doit-elle renvoyer un statut
routable ? »** — Un statut routable. `raison` est une phrase française dans une app anglaise, et
elle oblige chaque écran à inventer une mise en page pour un cas qui n'en mérite pas. Le contrat
propre est celui que les écrans savent déjà router : `hors-perimetre` devrait répondre
`{ statut: "hors_perimetre", produit: {…} }` — même famille que `{statut: "inconnu"}` — pour que
l'écran renvoie sur `01-scan` avec « ce n'est pas un soin du visage ». Je n'ai rien modifié.

**`nom: nom || "Produit scanné"`** (`lire-inci/route.ts:63`) : confirmé, seule chaîne française
d'une charge utile anglaise. Et ce nom devient une clé de catalogue côté historique, ce qui donne
un 404 garanti — c'est bien la route qui doit rendre une identité utilisable, pas l'écran qui doit
la deviner.

**`moteurDisponible()`** : d'accord. Aujourd'hui, `DICT = null` (`scoring.mjs:271`) ne coupe rien :
`scoreFormule` continue de rendre un nombre (base 50 moins les prérequis manquants) avec
`disponible: false` à côté. La fiche a donc *toutes* les données pour afficher une note fausse.
La forme sûre serait de ne pas renvoyer `formule` du tout quand le moteur est indisponible.

---

## 6. Contrôle des références

Les **49 citations `fichier:ligne`** de ce rapport ont été vérifiées par script : résolution du
chemin contre `git ls-files` (pour écarter les copies de maquette non suivies — il existe un
`product-scan-liquidglass/06-result-premium.html` de 1 206 lignes qui n'est pas le fichier servi),
puis lecture de la ligne réelle. **49 justes, 0 hors fichier, 0 ambiguë.**
