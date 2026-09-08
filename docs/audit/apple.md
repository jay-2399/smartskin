# Audit App Store — SmartSkin V2 (avant 7ᵉ soumission)

> ## ⚠️ ÉTAT AU 2026-09-01 **19:05:02** — le code est corrigé pendant la rédaction
>
> Audit conduit sur la base **`da78133`**. Depuis, quelqu'un applique ce rapport **en direct**, et
> vite : entre deux de mes commandes espacées de 4 minutes, B3 est passé d'ouvert à corrigé ; B7 a
> suivi 5 minutes plus tard. Les numéros de ligne du rapport désignent **l'état audité**, pas le
> code courant : à l'endroit d'un correctif, la ligne citée porte le remède, plus le défaut.
>
> **Ce document est une pièce datée, pas une carte du code courant.** L'heure est à la seconde et le
> relevé a été fait en **une seule commande** — un état construit par lectures espacées n'est l'état
> d'aucun instant. Chaque ligne porte sa commande : refaites le relevé avant d'agir.
>
> | Constat | État 19:05:02 | Commande |
> |---|---|---|
> | **B1** product id annuel | ❌ **OUVERT** | `grep -c '"9012"' src/app/api/iap/sync/route.ts` → 1 · `grep -c 'annualID = "9012"' ~/dev/smartskin-scan-native/SmartSkinScan/Store.swift` → 1 |
> | **B2** essai sans offre | ❌ **OUVERT** | `grep -c 'var plan = "annual"' public/scan-proto/16-paywall-a.html` → 1 · `grep -c 'for: \[weeklyID\]' …/Store.swift` → 1 |
> | **B5** démo qui invente un produit | ✅ corrigé (fail-safe) | `grep -c 'SS.estLocal()' public/scan-proto/07-confirm.html` → 1 |
> | **B3** prix du mauvais produit | ✅ corrigé | `grep -c 'getPrice", plan' public/scan-proto/commun/app.js` → 1 |
> | **B4** lien `/sources` | ✅ corrigé | `grep -c 'href="/sources"' public/scan-proto/18-bilan.html` → 1 |
> | **B6** `go()` inexistante | ✅ corrigé | `grep -c '^      go();' public/scan-proto/01-scan.html` → 0 |
> | **B7** cul-de-sac capture | ✅ corrigé | `grep -c 'location.replace(SUIVANT)' public/scan-proto/19-questions.html` → 2 |
> | **P17** purge déconnexion | ✅ corrigé | `grep -c 'purgerToutSS()' public/scan-proto/17-reglages.html` → 3 |
> | **P0** garde-fou solaire | ✅ corrigé | `ls src/lib/scan/__tests__/solaire-rince.test.ts` |
> | **S8** premium gratuit | ✅ corrigé | `grep -c 'lifetimeAccess: false' src/app/api/register/route.ts` → 1 |
>
> **Deux bloquants restent. Deux d'entre eux — B1 et B2 — ne se corrigent pas dans le code : ils
> demandent de créer le produit annuel dans App Store Connect et d'y configurer son offre
> d'introduction 7 jours.**
>
> ⚠️ *Nuance apportée par `ecrans`, vérifiée à 18:57:39 et qui corrige ma première lecture.* J'avais
> écrit « tout ce qui se répare dans un fichier a été réparé ». C'est vrai des **bloquants**, faux en
> dessous. Quatre constats mineurs sont du pur code d'écran et **aucun n'a été touché** :
> `Effaclar Duo+M` dans `07-confirm.html` → 1 · « Coming with the App Store release » dans
> `17-reglages.html` → 1 · toggles `placebo` → 2 · `m.premium` dans les deux paywalls → 0.
> Le critère de tri n'a donc pas été « réparable ici » mais **« étiqueté bloquant »** — ce qui est
> le comportement normal face à un rapport priorisé, et non un reproche. Mais ça veut dire que la
> priorisation de ce document décide de ce qui part en production.
>
> **Groupe à remonter, en conséquence — du texte à retirer, pas une architecture à revoir :**
> **B5** (le mode démo qui fabrique « Effaclar Duo+M » et affiche « Demo mode — no photo taken »
> quand la caméra est refusée) et **P1** (« Coming with the App Store release » sur « Rate SmartSkin »).
> Guideline 2.1(a), texte officiel : *« placeholder text, empty websites, and other temporary content
> should be scrubbed before submission »*. C'est un motif qui a déjà valu des refus, et ces deux-là
> se corrigent en minutes.
>
> **Si une seule chose est faite avant l'envoi : B1.** Et tant que le produit annuel n'existe pas,
> remettre `var plan = "weekly"` par défaut, sinon le testeur tape « Start my 7-day free trial » et
> il ne se passe rien — le motif exact des deux rejets 2.1(b) de cet été.

Audit conduit le 2026-09-01 contre le texte officiel des *App Review Guidelines*
(https://developer.apple.com/app-store/review/guidelines/, section par section) et le code réel.
Chaque constat porte un fichier et une ligne, ce qu'un testeur verrait, et le correctif.
Quand je n'ai pas pu vérifier, je le dis — la section 6 rassemble ces points.

---

## 0. Ce qui est soumis (à lire avant tout le reste)

**Le binaire soumis n'est pas `~/dev/smartskin-ios`.** Ce dépôt est figé au 21/07 et son
répertoire de travail contient des modifications jamais commitées. Le binaire de la V2 est
`~/dev/smartskin-scan-native` :

- `SmartSkinScan.xcodeproj/project.pbxproj:153` — `PRODUCT_BUNDLE_IDENTIFIER = com.davincidigitale.smartskin`
  (le même que la V1 en ligne), `MARKETING_VERSION = 2.0`, `CURRENT_PROJECT_VERSION = 2`.
- Le commit `ae8f583` (31/08) le dit explicitement : « la coquille devient la MISE À JOUR de
  l'app en ligne, pas une seconde app ».

**Ce que charge cette coquille** : `SmartSkinScan/SmartSkinScanApp.swift:26` —
`https://app.smart-skin.ai/scan-proto/index.html`. Les écrans réellement soumis sont donc les
fichiers **statiques** de `public/scan-proto/` de ce dépôt, **pas** les routes Next
(`src/app/(funnel)/…`) ni les composants `src/components/screens/`.

Conséquence structurante pour cet audit : **plusieurs correctifs de rejets passés vivent dans du
code qui n'est plus sur le chemin soumis.** C'est la source du constat B4 ci-dessous.

Trois pages Next restent atteignables depuis les écrans V2 : `/privacy`, `/terms`
(`17-reglages.html:309-310`, `16-paywall-a.html:216`, `16-paywall-b.html:217`,
`21-analyse.html:130`) et les routes `/api/*`. Elles sont donc dans le périmètre de la revue.

Enfin : l'URL `https://app.smart-skin.ai/scan-proto/index.html` est **publiquement accessible**
dans n'importe quel navigateur (vérifié). L'app est donc, littéralement, un site web dans un cadre
— voir P11.

---

## 1. Les six rejets déjà subis : le correctif tient-il toujours ?

| # | Guideline | Correctif | État en V2 |
|---|-----------|-----------|-----------|
| 1 | **1.4.1** allégations médicales | `3936879` — section « Sources » + 6 citations | ❌ **PERDU** → B4 |
| 2 | **2.1(a)** « Log in » qui inscrivait | `aaa11d3` — paramètre `mode` | ✅ **tient** |
| 3 | **2.1(b)** achat qui échoue en silence | `b24f171` + `ce2ed07` | ✅ portés — mais une **nouvelle** cause de 2.1(b) a été créée → B1 |
| 4 | **3.1.2** essai et prix | `8aabbd0` | ❌ **cassé par `7ef4e20` (aujourd'hui)** → B2, B3 |
| 5 | **4 (Design)** boutons Sign in with Apple | `5b37633` | ✅ **tient** |
| 6 | **4.8** Sign in with Apple | — | ✅ sur le chemin soumis ; ⚠️ `/login` reste non conforme → P14 |
| + | **5.1.2(i)** consentement IA | `dcb062e`, `d0dec57` | ✅ **porté** |
| + | **5.1.1(v)** suppression de compte | `dcb062e` | ✅ **porté** |

### Détail des correctifs qui tiennent

**2.1(a) — le bouton qui mentait.** Le mécanisme est intact : `src/features/auth/index.ts:72-76`
— en `mode: "login"`, `findUnique` seul, aucun `upsert`, pas de session si le compte n'existe pas.
Côté V2 le contrat est respecté des deux côtés : `00-welcome.html:126` envoie `"login"` sur
« Sign in with Apple » (et affiche « No SmartSkin account found for this Apple ID », ligne 130) ;
`15-compte.html:155` envoie `"signup"` sous un libellé neutre « Continue with Apple ». Le libellé
suit ce que fait le bouton — c'était exactement la demande d'Apple.

**4 (Design) — HIG des boutons Apple.** `00-welcome.html:76` : bouton pleine largeur, hauteur
52 px, libellé officiel « Sign in with Apple », logo Apple officiel (le tracé SVG est celui
d'`appleid.apple.com`, identique à `src/components/ui/AppleLogo.tsx`), déclinaison blanche à
liseré sur fond clair. `15-compte.html:75` : idem avec « Continue with Apple ». Conforme.

**2.1(b) — l'échec silencieux.** Les deux couches sont portées dans la V2 : le message visible
(`16-paywall-a.html:362` → `toast("Purchase didn't go through")`) et le retry sur échec éclair
(`commun/app.js:179-196` — relance jusqu'à 2 fois à 1,2 s quand l'échec arrive en moins de 600 ms).
Le pont natif remonte bien un booléen dans les deux cas
(`SmartSkinScan/Bridge.swift:41-46`). Rien à redire **sur ce correctif-là**.

**Consentement IA.** `21-analyse.html:120-133` : volet modal explicite nommant Anthropic, affiché
avant tout appel réseau, avec « Agree & analyze » / « Cancel ». Et toute l'UI d'analyse (kicker,
sweep, barre, points) reste `hidden` jusqu'au tap (lignes 216-220) — le deuxième correctif
(`d0dec57`) est porté aussi. C'est propre.

**Suppression de compte.** Atteignable : roue dentée sur les deux tableaux de bord
(`11-dashboard.html:125`, `12-dashboard-free.html:90`) → `17-reglages.html:161` « Delete my
account » → confirmation → `POST /api/account/delete`. Conforme à 5.1.1.

---

## 2. BLOQUANTS — à corriger avant d'envoyer

### B1 — Le plan sélectionné par défaut achète un product id **placeholder** · Guideline 2.1(b)

C'est le rejet 2.1(b) déjà subi **deux fois**, reconstruit à neuf, et cette fois sur le plan coché
par défaut.

- `public/scan-proto/16-paywall-a.html:288` et `16-paywall-b.html:290` : `var plan = "annual";`
  (posé aujourd'hui par `7ef4e20`).
- `smartskin-scan-native/SmartSkinScan/Store.swift:12` :
  `static let annualID = "9012"   // placeholder ALIGNÉ sur ANNUAL_ID de /api/iap/sync`
- `src/app/api/iap/sync/route.ts:9` :
  `const ANNUAL_ID = "9012"; // placeholder — à remplacer par le vrai product id App Store`
- Et le commit `ae8f583` prend soin de préciser : « Les product ids **1234 et 5678** sont ceux
  d'App Store Connect, pas des placeholders ». **9012 n'est pas dans cette phrase.**

**Ce que voit le testeur.** Il ouvre le paywall, l'annuel est déjà coché, il tape « Start my 7-day
free trial ». Côté Swift, `Store.buy` fait
`guard let product = try await Product.products(for: ["9012"]).first else { return false }`
(`Store.swift:27`) : produit introuvable → `return false` **sans jamais présenter de feuille
d'achat**. Le retry relance 2 fois, échoue 2 fois, et le web finit sur un petit toast
« Purchase didn't go through ». Le rapport de rejet dira, mot pour mot comme en août :
*« no purchase prompt or flow is displayed »*.

**Correctif.** Créer le produit annuel dans App Store Connect, le rattacher à la soumission,
et remplacer `"9012"` par son vrai id **aux deux endroits** (`Store.swift:12` et
`iap/sync/route.ts:9`). Tant que ce n'est pas fait : remettre `var plan = "weekly"` par défaut.

### B2 — L'essai est promis sur un produit qui n'en a pas, et l'éligibilité est lue sur un autre · Guideline 3.1.2

Deux erreurs qui se cumulent, toutes deux introduites ou révélées par `7ef4e20`.

1. **Le produit annuel n'a pas d'offre d'introduction.**
   `smartskin-scan-native/SmartSkinScan/SmartSkinScan.storekit:74` — le produit `9012` porte
   `"introductoryOffer" : null`, alors que l'hebdo `5678` porte bien
   `"paymentMode":"free", "subscriptionPeriod":"P1W"` (lignes 45-49).
2. **L'éligibilité interrogée est celle de l'hebdo.**
   `Store.swift:87-92` — `isTrialEligible()` fait
   `Product.products(for: [weeklyID])` puis `subscription.isEligibleForIntroOffer`.
   Le paywall applique cette réponse au badge de l'**annuel** (`16-paywall-a.html:302`,
   `var badge = a.querySelector(".plan-badge")`).

**Ce que voit le testeur.** L'écran affiche « **7 days free** » sur la carte 1 Year, la mention
« No payment due now », le bouton « Start my 7-day free trial » et la ligne de conditions
« **7 days free, then $39.90 / year.** Cancel anytime. » (`16-paywall-a.html:308`). Il tape. Il est
**débité immédiatement**. C'est la définition littérale du motif que la guideline nomme :
*« apps that attempt to trick users into purchasing a subscription under false pretenses or engage
in bait-and-switch »*.

**Correctif.** Configurer l'offre d'introduction 7 jours **sur le produit annuel** dans App Store
Connect et dans le `.storekit`, et faire porter `isTrialEligible()` sur `annualID` (ou, mieux,
lui passer le plan en paramètre, comme `productID(for:)`).

### B3 — Le prix annoncé après l'essai est celui d'un autre produit · Guideline 3.1.2

C'est le point que tu m'as demandé de vérifier « partout, dans les deux variantes ». Il est cassé
dans les deux.

Chaîne complète, vérifiée maillon par maillon :

1. `16-paywall-a.html:328-332` (et `16-paywall-b.html:328-332`) :
   ```js
   SS.natif.prix(function (p) { prixAnnuel = p; document.getElementById("prix-annual").textContent = p; maj(); });
   ```
2. `public/scan-proto/commun/app.js:227-230` : `prix:` poste `{ action: "getPrice" }` — **sans `plan`**.
3. `SmartSkinScan/Bridge.swift:59-62` :
   ```swift
   func requestPrice(plan: String?) {
       let pid = plan.map { Store.productID(for: $0) } ?? Store.lifetimeID
   ```
   → `plan` est `nil` → `pid = "1234"`, le **non-consommable « Lifetime »**.
4. `Store.swift:46-49` renvoie donc le prix du produit à vie.

**Ce que voit le testeur.** La carte « 1 Year » affiche le prix du produit à vie suivi de
« / year », et la ligne de conditions dit « 7 days free, then **⟨prix du lifetime⟩** / year » —
alors que le produit débité est l'annuel. Le prix annoncé au moment de l'engagement n'est pas le
prix débité. Le commit `7ef4e20` a corrigé la chaîne littérale (« $3.99 / week » → « / year ») mais
n'a pas vu que la valeur qui la remplit vient du mauvais produit.

Deux effets de bord du même bug :
- Si le lifetime `1234` est retiré de la vente, `priceString` rend `nil`, le `guard` de
  `Bridge.swift:62` sort sans rappeler le web, et le paywall reste sur le littéral **codé en dur**
  `"$39.90"` (`16-paywall-a.html:289`) — juste par accident.
- Le prix **hebdomadaire** n'est jamais lu depuis StoreKit du tout : « $3.99 » est écrit en dur
  (`16-paywall-a.html:198` et `:315`), comme « $0.77 / week » (ligne 312). Voir aussi S1.

**Correctif.** Faire porter `getPrice` sur le plan affiché — `postNatif({ action: "getPrice", plan: plan })`
dans `commun/app.js` (le pont accepte déjà le paramètre) — et lire les deux prix, annuel **et**
hebdo, depuis StoreKit.

### B4 — Le correctif du rejet 1.4.1 n'est plus atteignable, et une ligne morte promet des sources · Guideline 1.4.1

Le rejet 1.4.1 du 31/07 a été levé par `3936879` : une section « Sources » avec 6 références
institutionnelles (AAD ×3, MedlinePlus ×2, DermNet ×1), page `/sources`. **Ce correctif ne vit que
dans le code V1, hors du chemin soumis.**

- V1 : `src/components/screens/ResultsScreen.tsx:206` —
  `<button type="button" className="src-row" onClick={() => router.push("/sources")}>`
- V2 : `public/scan-proto/18-bilan.html:317-323` — le même bloc visuel a été recopié en
  **`<div class="src-row">`**, titre « Sources & medical disclaimer », **avec un chevron « › »**,
  et **aucun gestionnaire de clic**. Vérifié : `grep -n "src-row" 18-bilan.html` ne rend que du CSS
  (lignes 163, 171, 178, 180) et l'ouverture de la balise ligne 317.
- Vérifié aussi : **aucun** fichier de `public/scan-proto/` ne référence `/sources`
  (`grep -rn "/sources" *.html commun/*.js` → vide). Les citations sont orphelines.

**Ce que voit le testeur.** Une ligne intitulée « Sources & medical disclaimer » avec une flèche qui
invite au tap, sur un écran qui affiche un score de peau et 16 attributs mesurés depuis une photo.
Il tape. Rien. La guideline 1.4.1 exige *« Apps must clearly disclose data and methodology to
support accuracy claims relating to health measurements »* — l'app affiche l'affordance de cette
divulgation sans la fournir. C'est pire que de ne rien afficher.

**Correctif — c'est un lien à rebrancher, pas un contenu à réécrire.** La page existe toujours :
`src/app/(funnel)/sources/page.tsx` + `src/components/screens/SourcesScreen.tsx` (les 6 citations
sont intactes), et elle est atteignable depuis le proto au même titre que `/privacy` et `/terms`.
Il suffit d'entourer le bloc d'un `<a href="/sources">`. Une ligne de code, mais elle porte un rejet
déjà encaissé. (Recoupé avec `moteur` : `grep -rn "sources" public/scan-proto/ | grep -Ei "href|location|push\(|window\.open"` ne rend rien.)

⚠️ *Point de divergence avec `docs/audit/ecrans.md`, tranché par un test en production.* `ecrans`
conclut que la destination serait un 404, sur la foi de `ls src/app/sources` → « No such file ».
C'est le mauvais test : `(funnel)` est un **route group** Next.js, et les parenthèses excluent le
segment de l'URL — `src/app/(funnel)/sources/page.tsx` sert donc bien `/sources`, pas
`/funnel/sources`. Vérifié en direct : **https://app.smart-skin.ai/sources répond, en production,
avec les 6 citations** (AAD ×3, MedlinePlus ×2, DermNet ×1). Le contenu est intact ; il ne manque
que le lien. C'est le correctif le moins cher de tout ce rapport.

> **✅ Corrigé le 2026-09-01, et corrigé DEUX FOIS — relevé à 19:05:02.**
>
> *Premier correctif (18:59)* : `07-confirm.html` renvoyait sur `01-scan.html` quand
> `SS.siteReel()` était vrai. `ecrans` a signalé la faille : `surSiteReel()` commençait par
> `!!location.hostname`, donc **hostname vide → garde inopérante → le produit fabriqué revenait**.
> J'ai tranché depuis la coquille que le cas ne se produisait pas dans ce binaire
> (`SmartSkinScanApp.swift:26` charge `https://app.smart-skin.ai/…`, `:97` un `URLRequest` distant
> ordinaire, zéro `WKURLSchemeHandler`, zéro `.html` embarqué), mais j'ai noté que la garde ne
> tenait que **par l'architecture**, pas par elle-même.
>
> *Second correctif* : la garde a été **inversée en fail-safe**, et c'est mieux que ce que nous
> recommandions l'un et l'autre. `07-confirm.html:924` ne demande plus « suis-je en production ? »
> mais « suis-je en local ? » :
> ```js
> if (!(window.SS && SS.estLocal && SS.estLocal())) { location.replace('01-scan.html'); return; }
> ```
> et `commun/app.js` scinde la logique en deux fonctions indépendantes —
> `estLocal()` (liste blanche de hostnames locaux) et `surSiteReel() { return !!location.hostname && !estLocal(); }`.
>
> **Conséquence : tous les cas douteux tombent du côté prudent.** app.js non chargé, `SS.estLocal`
> absent, hostname vide, WebView servie depuis un bundle → la condition est fausse → redirection →
> **aucun produit fabriqué**. Le scénario que nous redoutions — embarquer les écrans pour supprimer
> l'écran « Serveur injoignable » (S2) et voir le contenu de démo revenir en silence — **ne peut
> plus se produire**.
>
> *Ma recommandation d'utiliser `window.__SMARTSKIN_NATIVE__` est donc caduque, et je la retire* :
> le correctif posé est plus robuste, puisqu'il ne dépend d'**aucun** signal positif.
> Reste un vestige du couplage, du bon côté : la mesure PostHog (`app.js`, `surSiteReel()`) se taira
> toujours sur un hostname vide. Perdre des événements plutôt que publier un faux produit est le bon
> arbitrage.
>
> Et les pastilles disent maintenant **« Camera unavailable »** (`01-scan.html:173`,
> `09-inci.html:199`) au lieu de « Demo mode ». La chaîne « Demo mode — no photo taken » ne subsiste
> que dans le bloc désormais inatteignable hors local.

### B5 — Refus de la caméra → l'app invente un produit et propose de le payer · Guidelines 2.1, 2.2, 3.1.2(a)

Refuser une permission au premier prompt est un test **standard** d'App Review.

Chaîne vérifiée :
1. `public/scan-proto/01-scan.html:255` — `.catch(function(){ boot('demo'); });` : le refus de
   `getUserMedia` bascule silencieusement en mode démo. Aucun message « camera access is off »,
   aucun renvoi vers Réglages.
2. `01-scan.html:236-241` — `boot()` **arme quand même le déclencheur** au bout de 1,2 s
   (`shutter.disabled = false`) et affiche « Hold steady — tap to capture ». Le seul indice est une
   petite pastille « Demo mode — camera unavailable » (ligne 173).
3. Le tap efface la photo de session et navigue (`01-scan.html:272-275`).
4. `public/scan-proto/07-confirm.html:914-919` :
   ```js
   if (!photo) {
     alts = [ {nom:'Toleriane — fragrance-free', …}, {nom:'Blemish Control Gel', …} ];
     renderMatch({nom:'Effaclar Duo+M', marque:'La Roche-Posay', image:'effaclar.png'});
     sub.textContent = 'Demo mode — no photo taken. Is this your product?';
     return;
   }
   ```

**Ce que voit le testeur.** Après avoir refusé la caméra, l'app lui annonce qu'elle a identifié
« La Roche-Posay — Effaclar Duo+M », un produit qu'elle n'a jamais vu, avec un bouton actif pour
confirmer — et de là il peut arriver au paywall et payer une note personnalisée sur un produit
fabriqué. Trois griefs d'un coup : la chaîne « Demo mode » est du contenu de démonstration dans un
binaire de production (2.1(a) : *« placeholder text … should be scrubbed before submission »*),
l'app affirme un résultat qu'elle n'a pas produit, et le tunnel d'achat s'ouvre sur cette
affirmation (3.1.2(a)).

**Correctif.** Sur rejet de `getUserMedia` : ne pas armer le déclencheur, afficher « SmartSkin needs
camera access to scan a product » avec un renvoi vers les Réglages, et proposer les deux vraies
issues (Upload / Search by name — dont l'une est cassée, voir B6). Supprimer le bloc démo de
`07-confirm.html`.

### B6 — « Upload a photo » est un bouton mort · Guideline 2.1

`public/scan-proto/01-scan.html:306` appelle `go();`. Cette fonction **n'existe pas** dans le
fichier — vérifié : `grep -n "function go\|var go" 01-scan.html` ne rend que l'appel de la ligne
306. Le handler écrit bien la photo dans `sessionStorage` puis lève un `ReferenceError` : **la
navigation n'a jamais lieu**, l'écran reste sur la caméra.

`09-inci.html` a la même interface mais un handler correct (`analyser(capturer(img, …))`) — seul
`01-scan.html` est touché.

**Pourquoi c'est bloquant.** C'est la seule sortie quand la caméra est refusée (B5). Un testeur qui
refuse la permission tombe donc sur un écran **sans issue** : le mode démo ment, et le repli ne
répond pas. (Constat trouvé par `ecrans`, revérifié ici.)

---

### B7 — Cul-de-sac : après le questionnaire, la seule sortie est de donner sa photo de visage · Guidelines 2.1, 5.1.1

Constat de `ecrans`, chaîne revérifiée ligne à ligne ici.

1. `public/scan-proto/19-questions.html:639` — à la dernière étape, `SS.visage.memoriser(rep)` pose
   `ss-visage-profil` (compteur de scans à 0, donc `doitDemander()` devient faux), puis
   `location.href = SUIVANT` — le questionnaire **reste dans l'historique**.
2. `public/scan-proto/20-capture.html:743` — la flèche retour, sur la vue « choice », tombe sur
   `if (history.length > 1) { history.back(); return; }` (la fonction `retour()` commence ligne 740).
3. Retour arrière → `19-questions.html:663` :
   `if (!refaire && memoire && !SS.visage.doitDemander()) { location.replace(SUIVANT); return; }`
   → renvoi immédiat sur 20-capture. La boucle est fermée.
4. Et il n'y a pas d'autre issue : `grep -c "SS.tabbar" 20-capture.html` → **0** (idem 19-questions,
   21-analyse et les deux paywalls). Aucune barre de navigation, aucun lien de sortie.

**Ce que voit le testeur.** Il vient de répondre à sept questions sur sa peau. Il veut en corriger
une — le geste le plus naturel qui soit. Il tape la flèche retour : rien. Il retape : rien.
`ecrans` l'a reproduit trois fois d'affilée, `location.href` reste sur `20-capture.html` et
`history.length` ne bouge pas. Les seules issues réelles de l'écran sont « Take a photo »,
« Upload a photo »… ou tuer l'app.

**Pourquoi c'est bloquant et pas un simple bouton mort.** Deux griefs se cumulent. 2.1 d'abord : un
contrôle affiché qui ne fait rien, sur le chemin de toute première utilisatrice. Mais surtout, le
seul moyen d'avancer **et** le seul moyen de sortir sont le même geste : livrer une photo de son
visage. 5.1.1 exige que l'app fournisse « an easily accessible and understandable way to withdraw
consent » — ici l'utilisatrice ne peut même pas revenir en arrière **avant** de la donner. Sur un
point de collecte de donnée sensible, l'absence de sortie n'est pas un détail d'ergonomie.

**Correctif.** Deux lignes suffisent : naviguer en `location.replace` depuis la dernière étape du
questionnaire (pour qu'il ne reste pas dans l'historique), et faire retomber `retour()` de
20-capture sur une destination explicite (`index.html` ou le tableau de bord) plutôt que sur
`history.back()`.

## 3. PROBABLES — un testeur attentif les trouve

### P0 — L'app dit à quelqu'un qui ne met jamais de solaire qu'un masque à l'argile le protège des UV · Guideline 1.4.1

Constat remonté par `moteur`, revérifié ici ligne à ligne.

`src/lib/scan/scoring.mjs:654` :
```js
const grille = CONFIG.RUBRIQUES[categorie] || CONFIG.RUBRIQUES.indetermine;
if (filtresUV && (grille.rince ?? 1) >= 1) {
```
Le garde-fou est censé réserver le bonus solaire à ce qui **reste** sur la peau (le commentaire des
lignes 650-652 le dit explicitement : « un nettoyant avec filtre UV ne protège de rien, il part au
rinçage »). Mais la propriété `rince` n'existe **que** dans `categoriesLegacy` (lignes 82-95), le
barème que le commentaire de la ligne 74 déclare « PLUS UTILISÉ ». Vérifié par extraction du bloc
`RUBRIQUES` (lignes 133 et suivantes) : **zéro occurrence de `rince`**. La condition se réduit donc
à `1 >= 1` — toujours vraie. Le garde-fou ne s'exécute jamais.

**Ce que voit l'utilisatrice** (et potentiellement le testeur) : sur un masque à l'argile, un pain
nettoyant ou un peeling contenant un filtre UV, la fiche affiche une phrase créditée de points dans
les raisons affichées à l'écran. `moteur` l'a mesuré sur les produits rincés porteurs de
`filtresUV`, et **le profil n'est presque jamais une barrière** — j'ai revérifié les quatre cas
dans le code :

| Profil | `besoin` | Points | Phrase affichée | Produits qui changent de bande |
|---|---|---|---|---|
| q4 = `never`, sans pigmentation | 2 | +7 | « UV filters — you say you skip sunscreen » | 2/14 |
| q4 = `sometimes`, sans pigmentation | 1 | +3,5 | « UV filters — you only wear it sometimes » | 1/14 |
| **q4 = `daily`** + pigmentation | 1 | +3,5 | « UV filters — **it protects your dark spots** » | 2/14 |
| q4 = `never` + pigmentation | 3 | +10 | « UV filters — you say you skip sunscreen » | 5/14 |

Les chiffres se déduisent de `bonusSolairePerso: 3.5` (ligne 59), `maxMatchParIngredient: 10`
(ligne 40) et de `besoinSolaireDe` (`src/lib/scan/profil-peau.ts:351-355` — `never` → 2,
`sometimes` → 1, tout le reste → 0).

**Le point que j'avais sous-estimé** (correction de `moteur`) : ligne 656, les deux termes
**s'additionnent** — `besoin = Math.min(3, (profil.besoinSolaire || 0) + pigmentation)`. Il suffit
donc de **l'un des deux**. Le seul profil épargné est « je mets du solaire tous les jours **et** je
n'ai aucune pigmentation ». Or la famille `spots` est alimentée par trois des seize attributs du
bilan (`tone_evenness`, `dark_spots`, `post_acne_marks` — `profil-peau.ts:61-63`) plus la priorité
q1 « dark spots » (ligne 81) : c'est une des familles les plus fréquemment non nulles. Le message de
commit `ece21a6` note d'ailleurs que **zéro** des 11 bilans de production ne répond « daily ».

**Pourquoi c'est 1.4.1 et pas un simple bug de score.** Le troisième cas du tableau est le pire :
« UV filters — it protects your dark spots » sur un masque à l'argile, adressé à quelqu'un qui
déclare **déjà** se protéger correctement. Ce n'est plus un encouragement mal placé, c'est une
affirmation de traitement de l'hyperpigmentation attribuée à un produit qui part au rinçage en
trente secondes. La guideline exige de « divulguer clairement les données et la méthodologie »
derrière les affirmations de santé — et l'app, en V2, ne donne plus accès à sa page de sources (B4).

**Deux chemins d'entrée, et un seul est borné** (correction de `moteur`, revérifiée ici). Ma
première rédaction disait « le seul verrou restant est le catalogue, 14 produits sur 3 232 ».
C'est vrai de `/api/produit/fiche`, qui lit un champ `filtresUV` pré-calculé. C'est **faux** de
`/api/produit/lire-inci` — l'étiquette photographiée, le second chemin, celui que l'app propose
d'elle-même quand la reconnaissance du flacon échoue (`07-confirm.html:936` : « Scanning the
ingredient list works on any product »).

Cette route ne consulte pas le catalogue : elle **recalcule** tout à la volée.
`src/app/api/produit/lire-inci/route.ts:49` appelle `categoriser(nom, inci)`, et
`src/lib/scan/categorise.mjs:105` pose
`filtresUV: trouve(L, FILTRES_ORGA, 14) || trouve(L, FILTRES_MIN, 8)`. Les deux valeurs partent
ensuite directement dans le score (lignes 56 et 58 de la route). Et l'en-tête de la route l'annonce
comme un argument de vente : « le moteur n'a besoin QUE de la liste INCI, donc il peut noter
n'importe quel produit du marché, **y compris absent du catalogue** » (ligne 11-12).

Le critère réel de déclenchement n'est donc pas « être l'une de 14 références », c'est
**« catégorie rincée + `ZINC OXIDE` ou `TITANIUM DIOXIDE` dans les 8 premières positions INCI »**
(`FILTRES_MIN`, `categorise.mjs:55`). Mesuré de mon côté sur `data/scan/catalog.json` : ces deux
ingrédients sont en positions 1-8 dans **152 produits sur les 3 152 qui ont un INCI, soit 4,8 %** —
dont 15 déjà classés en catégorie rincée par le catalogue lui-même (masques à l'argile Murad, La
Roche-Posay Effaclar, SKIN1004, DRMTLGY, peelings TULA et THE ROUTE, nettoyant Rodan + Fields…).

*Réconciliation avec `docs/audit/moteur.md`, qui annonce 5,0 %* : c'est le même comptage sur une
base différente. 152/3 152 = 4,8 % en gardant tout ce qui a un INCI (ma convention) ;
148/2 949 = 5,0 % en écartant les produits `hors-perimetre` (la sienne). `moteur` a vérifié que la
méthode de découpe n'y est pour rien — `parseInci` canonique et découpe naïve sur les virgules
rendent le même nombre. Reste 6 produits de bordure sur ~150 : du bruit, pas un désaccord.
De même, ses 19 cas rincés viennent de repasser tout le catalogue dans `categoriser()` au lieu de
lire le champ pré-calculé — l'écart avec mes 15 va dans le même sens et grossit le problème.

Surtout : le catalogue n'est qu'un échantillon d'un scrape, pas le marché — sur ce chemin il n'y a
pas de plafond.

**Probabilité — arbitrage.** `moteur` me laisse la classe ; je la maintiens en **P**, et je dis
pourquoi. L'axe de classement de ce rapport est le risque que *cette soumission-ci* soit rejetée
pour *ce motif-là*. Il faut, cumulés : être premium, avoir fait le bilan visage complet
(7 questions + capture), **puis** photographier l'étiquette arrière d'un masque à l'argile, d'un
gommage ou d'une pâte asséchante. Un testeur ne réunit pas ça par hasard.

Mais la phrase que j'avais écrite était fausse, et dans le sens dangereux : le verrou n'est pas une
petite liste fixe, c'est une **forme de produit** qu'on trouve dans une salle de bain sur deux, et
le parcours pousse activement vers la route non bornée quand la reconnaissance échoue. Autrement
dit, ce constat est **P pour la revue Apple et proche de B pour les utilisateurs**.

La raison de cet écart tient en une phrase : **le verrou qui subsiste ne protège que le testeur, pas
les utilisateurs.** Ce qui rend le motif improbable en revue — il faut cumuler premium, bilan visage
et le bon type de produit — n'a aucun effet protecteur en usage réel, où ces trois conditions sont
la normale et non la coïncidence. Donc à corriger indépendamment du calendrier de soumission :
c'est la première ligne de mon ordre de traitement après les bloquants.

### P17 — La déconnexion ne purge rien : le compte suivant hérite des données du précédent · Guideline 5.1.1

Piste ouverte par `ecrans` (son constat 5.1, qu'il avait laissé « lu, non reproduit » faute de deux
comptes réels). La moitié locale est décidable par lecture du code, et je l'établis ici.

- `public/scan-proto/17-reglages.html:321` — « Sign out » fait
  `SS.auth.signout().then(function () { location.replace("index.html"); });` et **rien d'autre**.
- `public/scan-proto/commun/app.js` — `SS.auth.signout` termine par `purgerMoi()`, qui retire la
  **seule** clé `ss-moi`, et de `sessionStorage`.
- La fonction qui vide réellement tout (`purgerToutSS`, `17-reglages.html:328`, boucle sur les clés
  préfixées `ss-`) n'est appelée qu'à **une** ligne : 359, dans le flux **suppression de compte**.
  Jamais à la déconnexion.

Survivent donc en `localStorage` sur l'appareil, après un « Sign out » : **`ss-shelf`** (l'étagère),
**`ss-historique`** (les 50 derniers scans), **`ss-ma-routine`**, **`ss-nb-produits`**, et
**`ss-visage-profil`**.

Ce dernier est le plus lourd : `commun/app.js:588-590` — `memoriser` y écrit
`{ reponses: <toutes les réponses du questionnaire>, scans: 0 }`. Or q7
(`19-questions.html:323-336`) collecte grossesse/allaitement, rosacée/eczéma **diagnostiqués**,
traitement dermatologique en cours (Accutane), allergies diagnostiquées. **Des données de santé
d'une personne restent lisibles par la suivante qui se connecte sur le même téléphone.**

**Ce que voit le testeur.** Sur un appareil de test partagé — le cas normal en revue —, se
déconnecter puis se reconnecter avec un autre compte affiche l'étagère et l'historique du compte
précédent. 5.1.1 encadre la collecte et la conservation ; exposer les données d'un utilisateur à un
autre est le défaut que cette section vise en premier.

**Ce qui reste à reproduire à la main** (et pourquoi ce constat est en « probable » et pas en
bloquant) : je n'établis que la **persistance locale**. Ce que fait ensuite la synchronisation
serveur de l'étagère à la reconnexion du second compte — écrasement, fusion, ou affichage du mélange
— demande deux comptes réels. `ecrans` a laissé son 5.1 étiqueté non reproduit pour cette raison, et
je garde la même réserve.

**Correctif.** Appeler `purgerToutSS()` à la déconnexion comme il est appelé à la suppression :
une ligne, la fonction existe déjà.

### P16 — Sur l'étiquette photographiée, le garde-fou « hors périmètre » ne se déclenche jamais · Guidelines 1.4.1, 2.2

Piste ouverte par `moteur`, reproduite et étendue ici. C'est le prolongement direct de P0 : le
second chemin de scan (`/api/produit/lire-inci`) recalcule tout, y compris la barrière qui exclut
les produits qui ne sont pas des soins du visage.

`src/lib/scan/categorise.mjs:94` :
```js
if (HORS_PERIMETRE.test(nom || "")) return { categorie: "hors-perimetre", confiance: "sur", votes: [] };
```
Le garde-fou ne teste **que le nom** — la regex de la ligne 17 cherche « body lotion », « lip balm »,
« foundation », « shampoo », « self tan »… Or sur ce chemin le nom vient de ce que le modèle a su
lire : `src/app/api/produit/lire-inci/route.ts:44` — `const nom = typeof r?.nom === "string" ? r.nom : "";`.
La liste INCI est imprimée **au dos** du produit, le nom **devant**. Étiquette photographiée de dos,
nom hors cadre → `nom = ""` → la regex ne matche rien, et la catégorie est déduite de la seule
composition.

**Mesuré.** Le catalogue compte **212 produits `hors-perimetre`, dont 203 avec un INCI** — c'est ce
sous-ensemble de 203 qui est mesurable, et c'est aussi lui qui explique le dénominateur de la
réconciliation ci-dessus (3 152 − 203 = 2 949). En les repassant dans `categoriser("", inci)` :

| Résultat avec un nom vide | Nombre |
|---|---|
| classés en **vraie catégorie visage** | **181** (89 %) |
| classés `indetermine` — qui a sa propre grille et se fait noter quand même | 22 |
| **encore `hors-perimetre`** | **0** |

Le garde-fou ne s'affaiblit pas : il **disparaît intégralement**. Un gel douche devient un
`cleanser`, un baume à lèvres Tatcha un `makeup-remover`, une lotion corps BYOMA un `cleanser`.

*Réconciliation avec `docs/audit/moteur.md`, qui annonce 121* : nous mesurions deux questions
différentes, les deux chiffres sont bons. 181 = l'état final (combien finissent en soin du visage).
121 = l'ampleur de la régression (combien étaient **protégés par le nom et perdus sans lui**).
La différence, 82, est le troisième groupe ci-dessous.

**Et 15 d'entre eux reviennent classés `sunscreen`** — donc éligibles à la règle de P0. (Mon
premier comptage disait 17 : c'était le nombre de produits portant `filtresUV: true` toutes
catégories confondues, pas le nombre classés `sunscreen`. Correction relevée par `moteur`.)
Les quinze, par nature réelle :

| Nature réelle | N | Exemples |
|---|---|---|
| **soins des lèvres** | **5 ou 6** | Vacation Chardonnay SPF30 **Lip Oil** · Naked Sundays PoutScreen **Lip Treatment** SPF 50 · Naked Sundays Go + Glow **Lip Oil** SPF 50 · Neutrogena 6 Hour Protection **Lip Balm** · Naturium Phyto-Glow **Lip Balm** SPF 45 |
| maquillage | 1 | Naked Sundays BeautyScreen Peptide **Foundation Tint** SPF 50 |
| corps | 5 | Coco & Eve Tan Boosting Body **Oil** · Coco & Eve **Body Highlighter** · Coco & Eve Coconut Body **Milk** · Lierac Sunissime Huile Solaire · Topicrem GIGATEMP Mela **Lait Corps** |
| autres | 3 | Oars + Alps **Face + Scalp Mist** SPF 35 · LRP Cicaplast Baume B5 · LRP Anthelios UVMune 400 **Lait Solaire** |

*Sur « 5 ou 6 » : le seul point litigieux entre nos trois rapports est le **COOLA Zinc Oxide Liplux
Sunscreen Trio** — un baume à lèvres, mais vendu en coffret. `ecrans` retient 5 (le compte strict au
sens de la regex du code, `lip (balm|scrub|mask|oil|treatment)`, qui ne reconnaît pas « Liplux ») ;
`moteur` retient 6 (la nature réelle du produit). Mesuré des deux façons de mon côté : **6** avec un
motif qui attrape « liplux », **5** avec celui du code. Les deux comptes sont justes, ils appliquent
deux critères. Le constat ne dépend pas de l'arbitrage.*

**Et ce produit litigieux est en fait la meilleure démonstration du défaut** (trouvé par `ecrans` en
vérifiant le comptage, revérifié ici). Testé sur son nom **complet et parfaitement lisible** :
```
HORS_PERIMETRE.test("COOLA Zinc Oxide Liplux Sunscreen Trio")  →  false
categoriser("COOLA Zinc Oxide Liplux Sunscreen Trio", inci)    →  { categorie: "sunscreen",
                                                                    confiance: "sur",
                                                                    filtresUV: true }
```
Il n'est protégé **ni avec le nom, ni sans**. Il cumule les deux trous : la forme *Liplux* que
`lip (balm|scrub|mask|oil|treatment)` ne reconnaît pas, et le coffret *Trio* absent de
`kit|bundle|coffret|set`. Sa catégorie `hors-perimetre` dans `catalog.json` vient donc d'ailleurs
que de cette regex — passage manuel ou autre script — et rien ne la rejouerait sur une étiquette
photographiée.
- plus Naked Sundays BeautyScreen Peptide **Foundation Tint** SPF 50, Coco & Eve **Body Highlighter**
  SPF 50, Coco & Eve Coconut Body **Milk** SPF 50, Coco & Eve Tan Boosting Body **Oil** SPF45,
  Topicrem GIGATEMP **Lait Corps**…

**Ce que ça produit à l'écran.** L'app note une huile à lèvres, un fond de teint ou un lait corporel
comme un soin du visage, lui applique la grille d'une catégorie qui n'est pas la sienne, et — pour
peu que l'utilisatrice ait de la pigmentation ou ne se protège pas — lui accroche la phrase
« UV filters — it protects your dark spots ». **Une huile à lèvres qui protège vos taches brunes.**
1.4.1 exige de « divulguer clairement les données et la méthodologie » derrière les affirmations de
santé : ici la méthodologie applique au visage un barème conçu pour autre chose, sans jamais le dire.

**Et sur la voie GRATUITE, il n'y a aucun avertissement du tout** (constat de `ecrans`, compté ici).
`09-inci.html:258` aiguille selon le statut : abonnée → `06-result-premium.html?source=inci`,
gratuite → `02-fork.html?source=inci` puis `03-result-free.html`. Or les garde-fous de lecture
d'étiquette — bandeau « Read from the label you photographed », mention « we're not certain »,
bouton « Change » pour corriger la catégorie — n'existent que sur l'écran premium :

| | `06-result-premium.html` | `03-result-free.html` | `02-fork.html` |
|---|---|---|---|
| bloc `d-lu` (bandeau étiquette) | 12 | **0** | **0** |
| mention « not certain » | 2 | **0** | **0** |
| `confianceCategorie` utilisé | 1 | **0** | **0** |

Une utilisatrice **gratuite** qui photographie la liste INCI de son gel douche reçoit donc un score
de formule présenté **exactement comme celui d'un produit du catalogue** — même jauge, même verdict
— sans une ligne disant que la catégorie a été devinée, ni aucun moyen de la corriger. C'est la
version la plus défendable de ce constat au titre de 1.4.1 : il n'y a pas de seuil à discuter,
l'élément d'interface n'existe pas dans le fichier.

**Troisième groupe, découvert par `moteur` et confirmé ici : 82 produits que la regex rate DÉJÀ,
avec leur nom complet.** `categoriser(p.name, p.inci)` ne les remet pas hors périmètre alors que
`catalog.json` les y range — le code et la donnée sont en désaccord. Deux trous nets dans la regex
de `categorise.mjs:17` :
- **les coffrets** : elle couvre `kit|bundle|coffret|set` mais pas *Trio*, *Duo*, *Dual Pack*,
  *System* → « Tricoci Even Glow Treatment **Trio** » → `treatment`, « ANUA PDRN Deep Hydration
  **Trio** » → `moisturizer`, « Mad Hippie Day & Night **Dual Pack** » → `serum` ;
- **les formes corps manquantes** : `body (wash|lotion|cream|butter|oil|scrub|serum|milk)` n'inclut
  ni *spray* ni *mist* → « PanOxyl Acne Banishing Body **Spray** » → `exfoliant`.

**82 sur 203, c'est 40 %.** Le garde-fou ne tombe donc pas seulement quand la photo est mauvaise :
il est **déjà troué à 40 % quand elle est bonne**. Le cas « dos du flacon » (nom vide) fait passer ce
taux de 40 % à 100 %, il ne le crée pas.

Portée exacte, et elle limite le risque immédiat : **ces 82 ne fuient que par `lire-inci`**. Sur le
chemin catalogue, `src/app/api/produit/fiche/route.ts:30` court-circuite sur le champ `p.category`
stocké (`if (p.category === "hors-perimetre")` → `score: { disponible: false }`), qui dit bien
« hors périmètre » — vérifié. Mais le jour où quelqu'un recalcule le catalogue avec
`categorise.mjs --appliquer`, ces 82 basculent en soin du visage d'un coup, et la fuite passe sur
les deux chemins.

**Correctif — et une correction de ce que j'avais d'abord proposé.** J'avais écrit : « refuser de
noter quand `nom` est vide et que la confiance n'est pas *sur* ». **Cette garde ne suffit pas**, et
`ecrans` a montré qu'elle ne se faisait pas piéger par un cas mais par dix.

Mesuré sur les 203 produits hors périmètre, **avec leur nom complet** : **10 reviennent sur une
catégorie visage erronée en affichant `confiance: "sur"`** — le maximum. Ma garde les laissait tous
passer, en silence :

| Produit | Catégorie rendue |
|---|---|
| COOLA Zinc Oxide Liplux Sunscreen **Trio** | `sunscreen` |
| Benefit POREfessional … Cleansing Oil & Clay Mask **Duo** | `mask` |
| First Aid Beauty Exfoliate AM + Hydrate PM Pads **Duo** | `exfoliant` |
| Paula's Choice 2% BHA **Body** Spot Exfoliant | `exfoliant` |
| Vichy Ideal Soleil Lait Hydratant **Auto-Bronzant** | `moisturizer` |
| LRP Anthelios UVMune 400 **Lait Solaire** · Lierac Sunissime **Huile Solaire** | `sunscreen` |
| A-Derma Exomega **Cleansing Gel** · Ducray Keracnyl **Foaming Gel** · Mixa **Crème Panthénol** | `cleanser` |

Trois d'entre eux sont des coffrets *Trio* / *Duo* — le trou de regex relevé par `moteur`, qui
revient ici par une autre porte. Répartition des dix : 3 `sunscreen`, 2 `cleanser`, 2 `exfoliant`,
2 `moisturizer`, 1 `mask`.

**Et le trou touche d'abord le lot le plus récent du catalogue** (piste de `ecrans`, mesurée ici sur
le champ `source`) : **6 des 10 viennent de `amazon-fr`** — Vichy, La Roche-Posay, A-Derma, Ducray,
Lierac, Mixa, c'est-à-dire les fiches de parapharmacie française intégrées le 30/08. Les 4 autres
viennent de `ulta` (3) et `incidecoder` (1). Ce n'est donc pas un défaut cantonné aux coffrets
anglo-saxons hérités d'un vieux scrape : il frappe le lot ajouté en dernier, et frappera de la même
façon les lots suivants tant que la barrière reposera sur des motifs de nom.

**Le signal de confiance est inutilisable des deux côtés**, et je l'ai vérifié dans les deux sens :
- **nom manquant → jamais `sur`.** Sur le catalogue entier (3 152 produits avec INCI), un nom vide
  rend `confiance: "sur"` **zéro fois** — uniquement `incertain`, `probable` ou `aucune`.
  L'avertissement est donc permanent, donc ignoré au deuxième scan.
- **nom présent → `sur` sur une erreur** (les 10 ci-dessus). L'avertissement s'éteint précisément
  au moment où il servirait.

Ce n'est pas un signal trop bruyant ni trop discret : c'est un signal **décorrélé de la vérité**.
Toute garde qui s'appuie dessus hérite du défaut.

*Formulation de `ecrans`, que je retiens pour arbitrer le correctif :* les deux premiers arguments
— le cas COOLA et les dix `confiance: "sur"` — montrent que la barrière actuelle est **cassée**.
Le troisième — le trou frappe le lot importé en dernier — montre qu'elle est **de la mauvaise
nature**. On peut réparer une barrière cassée ; on ne répare pas une barrière qui mesure la mauvaise
chose. C'est ce qui disqualifie le correctif « ajouter *Trio*, *Duo*, *spray*, *mist* à la regex » :
il ne ferait que repousser l'échéance au prochain import, chaque lot arrivant avec ses propres
conventions de nommage. Il faut faire porter la barrière sur la **composition**, pas seulement sur le nom ni sur le
niveau de confiance — un gel douche se reconnaît à ses tensioactifs et à son volume, un fond de
teint à ses pigments, un baume à lèvres à ses cires et beurres. À défaut, l'issue honnête est de ne
pas noter du tout quand l'identité du produit n'est pas établie : l'écran sait déjà proposer de
corriger la catégorie (`lire-inci/route.ts:67` renvoie `confianceCategorie` précisément pour ça),
mais ce signal ne vaut que ce que vaut la détection qui l'alimente.

### P15 — Le paywall se vend à qui a déjà payé · 3.1.2 / 2.1

`public/scan-proto/16-paywall-a.html:262` (et `16-paywall-b.html:264`, même code) :
```js
SS.moi().then(function (m) {
  if (!m.connecte) location.replace("15-compte.html?next=paywall");
});
```
La garde teste `m.connecte` et **jamais `m.premium`** — alors que `/api/moi` renvoie les deux
(`src/app/api/moi/route.ts:20`). `ecrans` l'a reproduit avec un compte premium : le paywall
s'affiche en entier, « Start my 7-day free trial · 7 days free, then $39.90 / year ».
Le commit `57c4c7e` (« plus jamais revendre son abonnement à quelqu'un qui a déjà payé ») visait ce
problème ; la garde n'a pas suivi sur ces deux écrans.

**Ce que voit le testeur.** S'il achète pour éprouver l'achat intégré (P12) puis revient sur un
écran verrouillé, on lui propose de racheter — et on promet un essai gratuit à quelqu'un qui vient
de payer. En natif, le tap ouvre StoreKit sur un produit déjà possédé : Apple répond « You've
already purchased this », ce qui, côté `Store.buy`, revient comme un échec. Promesse d'essai fausse
(3.1.2) et parcours qui ne peut pas aboutir (2.1).
Correctif : ajouter `if (m.premium) { location.replace("11-dashboard.html"); return; }` dans la
même garde.

### P1 — Placeholder « Coming with the App Store release » · 2.1(a) / 2.3.1
`public/scan-proto/17-reglages.html:317` — la ligne « Rate SmartSkin » affiche le toast
`"Coming with the App Store release"`. Du texte de chantier, dans le binaire soumis à l'App Store.
La guideline 2.1(a) le nomme : *« placeholder text … should be scrubbed before submission »*.
Correctif : `SKStoreReviewController` côté natif, ou retirer la ligne.

### P2 — Trois interrupteurs de notification placebo · 2.3.1
`17-reglages.html:104-115`. Le JS le dit lui-même ligne 260 : « toggles locaux **placebo**
(décision d'architecture) ». Le clic ne fait que changer une classe CSS (lignes 261-270) : rien
n'est persisté, l'app ne demande **jamais** la permission notifications, et il n'y a aucun code de
notification dans la coquille (ni `UNUserNotificationCenter`, ni entitlement `aps-environment` —
`SmartSkinScan.entitlements` ne contient que `applesignin`).
Deux de ces interrupteurs sont **ON par défaut**, et l'un annonce des horaires précis :
« Routine reminders — Morning 8:00 · evening 21:30 ». L'app promet une fonctionnalité qui n'existe
pas. Correctif : retirer la section, ou implémenter les notifications locales.

### P3 — Quatre `mailto:` qui, au mieux, ne font rien · 2.1
`17-reglages.html:314` (« Contact us ») et trois adresses dans `src/app/privacy/page.tsx`
(lignes 26, 82, 102) — page atteignable depuis les réglages **et** depuis les deux paywalls.

Côté Swift : `SmartSkinScanApp.swift:92` pose bien `web.navigationDelegate`, mais le `Coordinator`
n'implémente **que** `didFinish`, `didFailProvisionalNavigation` et `didFail` — **pas**
`decidePolicyFor navigationAction`. Rien ne renvoie donc jamais un `mailto:` à
`UIApplication.shared.open`.

Deux issues possibles, **et je ne peux pas trancher sans un test sur appareil** :
- au mieux, quatre taps morts ;
- au pire, WebKit remonte la navigation échouée dans `didFailProvisionalNavigation`
  (`SmartSkinScanApp.swift:130-132`), qui appelle `onFail()` — et **l'app entière est remplacée par
  l'écran plein écran « Serveur injoignable · Vérifie ta connexion »**, en français. Un testeur qui
  tape « Contact us » verrait une panne serveur inventée.

C'est un test de 30 secondes sur iPhone. À faire.
Correctif : implémenter `decidePolicyFor` et ouvrir `mailto:`/`tel:` via `UIApplication.shared.open`,
en `.cancel`.

### P4 — Le lien vers l'EULA d'Apple est en `target="_blank"` → tap mort · 2.1 / 3.1.2
`src/app/terms/page.tsx:38` — le lien `apple.com/legal/…/stdeula` porte `target="_blank"`.
La coquille est bien `WKUIDelegate` (`SmartSkinScanApp.swift:91`) mais n'implémente **pas**
`webView(_:createWebViewWith:for:windowFeatures:)` : `window.open` rend `nil`, le tap ne produit
rien. C'est précisément le lien que les testeurs vérifient au titre de 3.1.2.
(`ecrans` a confirmé zéro `target="_blank"` dans `public/scan-proto/` — celui-ci est sur une page
Next atteignable depuis les deux paywalls.)
Correctif : implémenter `createWebViewWith` (charger la requête dans la même WebView ou ouvrir
Safari), ou retirer `target="_blank"`.

### P5 — Les CGU ne connaissent ni l'annuel ni l'essai · 3.1.2
`src/app/terms/page.tsx:34` : « SmartSkin offers a one-time **Lifetime** purchase and an
auto-renewable **Weekly** subscription. » L'**annuel** — le plan coché par défaut, celui qui porte
l'essai — n'y figure pas, et l'essai 7 jours non plus. Le testeur qui tape « Terms of Service »
depuis le paywall lit une offre différente de celle que l'écran lui vend. 3.1.2(c) demande de
« clairement décrire ce que l'utilisateur obtient pour le prix ».
À noter au crédit : la mention d'auto-renouvellement et le renvoi vers Réglages → Abonnements sont
bien présents (lignes 34-36). Il manque juste le plan qu'on vend.

### P6 — La politique de confidentialité ne parle pas de la V2 · 5.1.1
`src/app/privacy/page.tsx`, dernière mise à jour **28 juillet 2026**. Elle décrit exclusivement le
scan de **visage**. Rien sur le cœur de la V2 : photo de **produit** envoyée à un modèle pour
reconnaissance (`/api/produit/identifier`), photo d'**étiquette INCI** (`/api/produit/lire-inci`),
étagère, historique local. 5.1.1 exige d'« identifier quelles données l'app collecte, comment, et
tous les usages ».
Erreur factuelle en prime : §7 (ligne 76) dit que la suppression se fait « from your dashboard » —
en V2 elle est dans les réglages.

### P7 — « Under 18 » est une réponse acceptée, alors que les CGU exigent 16 ans · 5.1.4 / 2.3.1
`public/scan-proto/19-questions.html:214` — `{ value: "under_18", label: "Under 18" }`, et le
tunnel continue normalement : photo de visage, envoi à une IA tierce, paywall. Aucune barrière,
aucun consentement parental.
Face à cela : `src/app/terms/page.tsx:29` « You must be at least 16 years old » et
`src/app/privacy/page.tsx:93` « not intended for children under 16 ». **La contradiction est
visible en deux taps** depuis les réglages. Correctif minimal : si `under_18` est choisi, afficher
une barrière d'âge cohérente avec les CGU — ou aligner les CGU sur ce que l'app accepte vraiment.

### P8 — Des données de santé sont collectées mais non déclarées · 5.1.1
`19-questions.html:323-336` (q7) collecte : « Pregnancy / breastfeeding », « Rosacea / eczema —
diagnosed », « Ongoing dermatological treatment — prescription (Accutane, etc.) », « Fragrance
allergy — diagnosed ». Ce sont des données de santé, et elles partent avec la photo vers un modèle
tiers (`21-analyse.html:233`).
La politique (§2, ligne 32) ne mentionne que « Skin questionnaire — your answers (age range, skin
concerns, etc.) ». Grossesse, pathologies diagnostiquées et traitement sur ordonnance ne sont pas
des « skin concerns ». À déclarer explicitement dans la politique **et** dans la fiche App Store
(catégorie *Health & Fitness / Sensitive Info* des nutrition labels).

### P9 — L'app affirme un traitement en UE qui n'a pas lieu · 5.1.1 / 5.1.2
Trois endroits l'affirment :
- `21-analyse.html:129` — « Processing takes place in the **European Union** » (dans le volet de
  consentement lui-même, celui qui a servi à lever le rejet 5.1.2) ;
- `21-analyse.html:117` — « Analyzed securely in the EU » ;
- `src/app/privacy/page.tsx:42` et `:60` — même affirmation.

Le code :
- `src/features/analysis/anthropic.ts:32` — `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`,
  sans `baseURL` : le SDK tape `api.anthropic.com`. Aucun `ANTHROPIC_BASE_URL` dans `src/` ni dans
  `render.yaml`.
- `src/lib/scan/moteur.ts:64` — pire, l'URL est **en dur** :
  `fetch("https://api.anthropic.com/v1/messages", …)`. Aucun override possible.

Ce qui **est** en UE : l'hébergement et la base (service Render `app.smart-skin.ai`, région
`frankfurt` — vérifié via l'API Render). Pas l'appel IA.
**Réserve honnête** : `ANTHROPIC_BASE_URL` pourrait être posé dans le tableau de bord Render sans
figurer au dépôt ; ça sauverait le chemin analyse, pas `moteur.ts` qui est écrit en dur. À vérifier.
5.1.1 exige que la politique soit exacte sur « où » les données vont ; 5.1.2 exige de « fournir
l'accès à l'information sur comment et où les données seront utilisées ». Une affirmation fausse
dans l'écran de consentement lui-même est le pire endroit possible.

### P10 — Analytics sans consentement ni moyen de le retirer · 5.1.1 (« Permission »)
`public/scan-proto/commun/app.js:896-917` — `SS.track` / `SS.trackEcran` chargent PostHog
(`chargerPH`, lignes ~873-894) et capturent chaque écran vu, les vues de paywall, les clics de CTA
et les achats. Aucun écran ne demande le consentement, et `17-reglages.html` n'offre **aucun**
interrupteur analytics (les trois qui existent sont les placebos de notification, P2).
Le texte de la guideline est explicite : *« Apps that collect user or usage data must secure user
consent for the collection, **even if such data is considered to be anonymous** … Apps must also
provide the customer with an easily accessible and understandable way to withdraw consent. »*
Correctif : un consentement au premier lancement + un interrupteur dans les réglages.

### P11 — Fonctionnalité minimale : la V2 a perdu son argument natif · 4.2
La V1 avait une caméra **native** (AVFoundation + Apple Vision, `smartskin-ios/SmartSkin/ViewModels/FaceGating.swift`,
199 lignes de gating) : c'était son argument « ce n'est pas un site web emballé ».
La V2 ne contient que **trois fichiers Swift** — `SmartSkinScanApp.swift`, `Bridge.swift`,
`Store.swift`. Zéro caméra native : `SmartSkinScanApp.swift:115-121` se contente d'accorder
`requestMediaCapturePermissionFor` pour que la **page web** appelle `getUserMedia`
(`01-scan.html:245`, `20-capture.html:590`). Le gating du visage est fait par MediaPipe, chargé
depuis un CDN (`20-capture.html:253`).
Il reste donc : Sign in with Apple, StoreKit, et un cadre autour d'une URL — `https://app.smart-skin.ai/scan-proto/index.html`,
**publiquement accessible dans Safari** (vérifié). 4.2 : *« Your app should include features,
content, and UI that elevate it beyond a repackaged website. »*
Ce n'est pas une certitude de rejet — SIWA + IAP + caméra sont des fonctions natives réelles — mais
c'est le grief le plus difficile à réfuter si un testeur le soulève, et le seul de cette liste qui
demanderait un vrai chantier. À anticiper dans les notes de revue : expliquer ce que la coquille
apporte.

### P12 — Après avoir payé, le testeur doit encore travailler avant de voir ce qu'il a acheté · 3.1.2(a)
`16-paywall-a.html:335-343` — la fonction `apresAchat()` : s'il n'y a pas de photo de visage en
session, elle renvoie `"19-questions.html"`. Le commentaire l'assume (lignes 338-344).
**Ce que vit le testeur** : il achète pour vérifier l'achat intégré (c'est son travail), et il
atterrit sur un questionnaire de 7 étapes, puis sur une capture de visage qui exige un vrai visage
correctement éclairé (`20-capture.html:461` — le déclencheur reste `disabled` tant que les 6
critères ne sont pas verts), avant de voir la moindre valeur payée. S'il teste sur un appareil
posé sur un support, ou s'il refuse de se photographier, **il n'obtient jamais ce qu'il a payé**.
3.1.2(a) : *« should allow a user to get what they've paid for without performing additional
tasks »*.
Correctif : après achat, ouvrir immédiatement quelque chose de payé — au minimum le tableau de bord
premium avec le produit en attente — et proposer le bilan visage comme une amélioration, pas comme
un péage.

### P13 — Avis clients Amazon reproduits mot pour mot, sous le logo Amazon · 5.2.1
`06-result-premium.html:992` et `:1471-1472,1518-1519` affichent le logo Amazon (`amazon.svg`) et
celui d'Ulta (`ulta.png`) comme badges de source, et les lignes 1560 et 1631 rendent des avis
individuels avec **nom d'auteur, titre, note et texte intégral**.
Vérifié dans les données (`data/avis-enrichis/B00017OV9S.json`, champ `extraits`) : ce sont bien des
avis **verbatim** avec de vrais pseudonymes — « natalie », « Jon Rodriguez » — dates et notes.
5.2.1 : *« Make sure your app only includes content that you created or that you have a license to
use. »* Les conditions d'utilisation d'Amazon interdisent la reproduction de leurs avis, et le texte
appartient à ses auteurs. Le risque immédiat n'est pas tant le testeur que la plainte du titulaire —
mais Apple retire les apps sur ce motif.
Correctif : ne garder que les synthèses reformulées (les champs `segments` / `concerns` /
`aspects`, qui sont des paraphrases), retirer les `extraits` verbatim et les logos tiers.

### P14 — `/login` propose Google sans Sign in with Apple · 4.8
`src/components/screens/AuthScreen.tsx:55-57` — bouton « Continue with Google », plus un formulaire
e-mail/mot de passe. **Aucun bouton Sign in with Apple sur cet écran.** 4.8 exige qu'une app
utilisant un service de connexion tiers (Google est nommément cité) offre « as an equivalent
option » un service satisfaisant les trois critères — c'est-à-dire Sign in with Apple.
**Nuance importante** : cet écran n'est pas sur le chemin par défaut de la V2 (les protos ne le
lient jamais). Mais il reste déployé et atteignable, et deux mécanismes y mènent :
`src/features/auth/index.ts:29` (`pages: { signIn: "/login" }`) et
`src/app/(espace)/layout.tsx:8` (`redirect("/login")`).
Correctif, au choix : ajouter Sign in with Apple à `/login`, ou retirer Google de cet écran, ou
sortir `/login` de l'app publique.

---

## 4. À SURVEILLER

- **S1 — Prix codés en dur, jamais localisés.** `16-paywall-a.html:198` (`$3.99`), `:289`
  (`$39.90`), `:312` (`$0.77 / week`), `:315`. Aucun ne passe par StoreKit. Dans une boutique
  non américaine (ou après un changement de tarif dans App Store Connect), l'écran affiche des
  dollars et débite des euros. Même famille que B3.
- **S2 — L'écran d'erreur réseau est en français.** `SmartSkinScanApp.swift:41-54` :
  « Serveur injoignable », « Vérifie ta connexion — l'app se sert sur app.smart-skin.ai »,
  « Réessayer ». Le reste de l'app est intégralement en anglais et
  `Info.plist` déclare `CFBundleDevelopmentRegion = en`. Un testeur américain hors réseau voit du
  français — et une phrase qui explique que l'app est un site distant.
- **S3 — Un formulaire caché derrière `?dev=1`.** `15-compte.html:86-90` — un formulaire
  e-mail/mot de passe « Dev only » n'apparaît qu'avec `?dev=1` dans l'URL. 2.3.1 : *« Don't include
  any hidden or undocumented features in your app »*. Le testeur ne le trouvera pas, mais le
  retirer coûte cinq minutes.
- **S4 — Pas de `PrivacyInfo.xcprivacy`, pas d'`ITSAppUsesNonExemptEncryption`.** Vérifié :
  `find ~/dev/smartskin-scan-native -name "*.xcprivacy"` → aucun résultat, et `Info.plist` n'a pas
  la clé de conformité export. Le manifeste n'est requis que si le binaire touche des « required
  reason APIs » — le code natif est minimal, donc **le risque d'ITMS-91053 me paraît faible, mais je
  ne l'ai pas vérifié à l'outil**. L'absence d'`ITSAppUsesNonExemptEncryption` n'est pas un rejet :
  juste la question export posée à chaque envoi. En revanche les **nutrition labels** d'App Store
  Connect, eux, sont obligatoires — voir section 6.
- **S5 — Le cœur de la capture visage est téléchargé d'un CDN tiers.** `20-capture.html:253-254` —
  `cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35` et un modèle sur
  `storage.googleapis.com`, plusieurs Mo, chargés à l'ouverture de l'écran, sans annonce.
  4.2.3(ii) : *« If your app needs to download additional resources in order to function on initial
  launch, disclose the size of the download and prompt users before doing so. »* Il existe un repli
  (`secoursSansModele`, ligne 620 : le déclencheur s'arme sans guide) — c'est ce qui sauve ce point
  d'être un bloquant.
- **S6 — Preuve sociale invérifiable.** `16-paywall-a.html:167` — « Already **+100 users** » et cinq
  étoiles pleines sans source ni note. Si le chiffre n'est pas exact, c'est 3.1.2(a).
- **S7 — Un échec de navigation quelconque efface toute l'app.** `SmartSkinScanApp.swift:130-136` —
  `didFailProvisionalNavigation` appelle `onFail()` sans filtrer, et `didFail` ne filtre que
  `NSURLErrorCancelled`. Le bouton « Réessayer » recharge l'**URL de départ** : tout l'état en
  cours est perdu. C'est le mécanisme qui rend P3 potentiellement grave.
- **S8 — Deux portes ouvertes vers le premium gratuit (hors périmètre Apple, mais graves).**
  `src/app/api/register/route.ts:35` — `lifetimeAccess: !parsed.data.sansAcces` : un POST public sans
  le champ `sansAcces` crée un compte avec l'accès à vie. Et `commun/app.js:217` appelle
  `/api/iap/grant` **sans corps** après un restore, ce qui fait retomber
  `src/app/api/iap/grant/route.ts:21` sur `plan: "lifetime"` et pose `lifetimeAccess: true` de façon
  permanente — un abonnement hebdo restauré devient un accès à vie. Transmis à `moteur`.
- **S10 — Le cœur du produit rend un 500 nu quand le modèle est surchargé.** Constat de `moteur`,
  qui l'a reproduit : `src/app/api/analyze/route.ts` n'attrape ni `request.json()`, ni
  `Buffer.from(image)`, ni le `parse` de la réponse du modèle, ni un 429/529 d'Anthropic. Côté
  écran, `21-analyse.html:249` traite bien 422 et 429 séparément, mais un 500 tombe dans le fourre-tout
  `rate = true`. Pour la question « ce qui casse si le réseau tombe » : c'est ici. Les routes de scan
  **produit** savent, elles, distinguer « photo illisible » de « service indisponible »
  (`src/lib/scan/moteur.ts:53`, `PanneService`) et `07-confirm.html:940-946` affiche les deux
  messages — l'analyse visage n'a pas cette maturité. Ce n'est pas un motif de rejet en soi, mais
  c'est le chemin par lequel un testeur verrait l'app « ne pas marcher ».
- **S11 — Une valeur d'expiration invalide fait tomber `/api/iap/sync` en silence.** `moteur` :
  `typeof NaN === "number"` passe la garde de `src/app/api/iap/sync/route.ts:32`, `new Date(NaN)`
  est refusé par Prisma, et la route n'a pas de `try/catch` ; côté web l'erreur est avalée
  (`commun/app.js:255`, `.catch(function(){})`). Résultat : quelqu'un a payé, ne reçoit rien, et ne
  voit aucun message. C'est le scénario « j'ai acheté et je n'ai pas eu accès » que les testeurs
  signalent sous 2.1(b).
- **S12 — Un écran mort est embarqué dans le binaire.** `public/scan-proto/10-promesse.html` :
  **zéro** lien entrant dans les 23 écrans et dans `commun/app.js` (compté), et son bouton principal
  (ligne 140) pointe vers `/questions/age` — une route de la V1 React. Inatteignable, donc
  invisible pour le testeur ; à retirer par hygiène (2.1 « scrubbed before submission »).
- **S13 — La session d'un compte supprimé reste valide · 5.1.1(v).** `ecrans` a constaté qu'un
  cookie de session d'un compte effacé de la base faisait encore répondre `{connecte: true}` à
  `/api/moi`. L'explication est dans `src/features/auth/index.ts:27` — `session: { strategy: "jwt" }` :
  le jeton porte l'identité, rien ne le confronte à la base. Les **données** sont bien supprimées
  (cascade de `/api/account/delete`), et le parcours enchaîne sur un `signOut` — donc l'exigence
  5.1.1(v) reste satisfaite sur le papier. Mais tout écran gardé par le seul `m.connecte` laisserait
  entrer ce jeton jusqu'à son expiration. À durcir.
- **S9 — L'adresse de support est une adresse personnelle** (`byllel@davinci-digitale.fr`,
  `17-reglages.html:314` et privacy ×3), sur un domaine qui n'est pas celui de l'app. Ce n'est pas
  un motif de rejet, mais c'est le contact que le testeur utilisera s'il a une question.

---

## 5. Ce qui va bien (à ne pas casser en corrigeant)

- Les deux correctifs 2.1(b) sont bien portés en V2 : message d'échec visible
  (`16-paywall-a.html:362`) et retry sur échec éclair (`commun/app.js:179-196`).
- **Restore** est présent aux deux endroits attendus : sur les deux paywalls
  (`16-paywall-a.html:148`, `16-paywall-b.html:157`) et dans les réglages
  (`17-reglages.html:90`), câblé à `AppStore.sync()` (`Store.swift:76-79`). 3.1.1 satisfait.
- Le drapeau natif est bien injecté : `SmartSkinScanApp.swift:77-81`,
  `WKUserScript(source: "window.__SMARTSKIN_NATIVE__ = true;", injectionTime: .atDocumentStart)`.
  Le restore et le bouton Apple s'affichent donc bien **dans** l'app.
- Sign in with Apple est la **seule** méthode de connexion offerte en V2 (`15-compte.html:13` :
  « SANS Google — Apple uniquement ») : 4.8 est satisfait sur le chemin soumis.
- La vérification du jeton Apple est correcte (`src/features/auth/apple.ts` : JWKS Apple, issuer,
  audience = bundle id).
- Stripe a été entièrement retiré ; aucun lien d'achat externe ni lien d'affiliation dans
  `public/scan-proto/` (vérifié). Pas de sujet 3.1.1.
- Le retour depuis `/privacy` et `/terms` fonctionne (`src/components/LegalBack.tsx`,
  `history.back()`), et les deux paywalls portent bien leurs liens légaux.
- L'app a un vrai écran d'erreur réseau au lancement (contrairement à la V1) —
  `SmartSkinScanApp.swift:37-60`. À traduire (S2), pas à supprimer.

---

## 6. Ce que je n'ai pas pu vérifier — à contrôler avant d'envoyer

Ces points sont hors du code ; ils décident pourtant de la moitié des bloquants ci-dessus.

1. **App Store Connect — les produits.** Les ids `1234` (lifetime) et `5678` (hebdo) sont confirmés
   par le commit `ae8f583`. **`9012` (annuel) ne l'est pas** et le code l'appelle lui-même un
   placeholder (B1). Vérifier : le produit annuel existe, il est *Ready to Submit*, il est
   **rattaché à cette version**, et il porte une **offre d'introduction 7 jours gratuits** (B2).
2. **Le Paid Apps Agreement** est-il actif ? C'est la cause racine possible des deux rejets 2.1(b)
   d'août, et elle se joue entièrement dans App Store Connect.
3. **`SCAN_TEST_PREMIUM` sur Render.** `src/lib/scan/acces.ts:20` — si la variable vaut `"1"` en
   production, **tout compte connecté est premium sans payer** (`src/app/api/moi/route.ts:20`), le
   testeur ne voit jamais le paywall et ne peut pas éprouver l'achat → 2.1(b).
   L'API Render ne me rend pas les variables d'environnement ; à lire dans le tableau de bord.
4. **Les nutrition labels d'App Store Connect.** L'app collecte : photo de visage (données
   sensibles / biométriques), photos de produits, données de santé (P8), identifiant Apple + e-mail,
   analytics PostHog. Vérifier que la fiche déclare tout cela, y compris la liaison à l'identité.
5. **Le numéro de build.** 2.0 (build 2) est supérieur à 1.0 (build 1), mais si des builds
   intermédiaires ont été téléversés depuis, l'envoi sera refusé — à confirmer dans TestFlight.
6. **`ANTHROPIC_BASE_URL` sur Render** (P9) — et de toute façon `src/lib/scan/moteur.ts:64` est en
   dur, donc le chemin scan produit sort de l'UE quoi qu'il arrive.
7. **Le test des 30 secondes sur iPhone** : taper « Contact us » dans les réglages, et taper le lien
   EULA dans les CGU depuis le paywall. Ça tranche P3 et P4.
8. **La note d'âge de la fiche App Store** et sa cohérence avec les CGU (16+) et avec la réponse
   « Under 18 » acceptée par le questionnaire (P7).

---

## 7. Ordre de traitement suggéré

Si tu ne corriges qu'une chose : **B1** (le product id annuel). C'est le seul constat qui garantit
un rejet, il reproduit le motif déjà encaissé deux fois, et il est sur le plan coché par défaut.

Puis, par coût croissant :
1. **B1 + B2 + B3** — tout le bloc paywall/StoreKit. Même séance de travail, même écran.
2. **B5 + P1 — le contenu de démonstration.** « Effaclar Duo+M » et « Demo mode — no photo taken »
   dans `07-confirm.html`, « Coming with the App Store release » dans `17-reglages.html`. Du texte
   à supprimer, quelques minutes, et 2.1(a) le nomme explicitement. (B6, la fonction `go()`
   manquante du même repli caméra, est déjà corrigé.)
3. **B7** — le cul-de-sac de 20-capture. Deux lignes : un `location.replace` et une destination
   explicite au retour.
4. **B4** — une ligne à rendre cliquable (la page `/sources` est vivante en production).
5. **P0** — une condition à réparer dans `scoring.mjs` (le garde-fou solaire). Indépendant du
   calendrier de soumission : c'est une affirmation de protection fausse.
6. **P17** — appeler `purgerToutSS()` à la déconnexion, comme elle l'est déjà à la suppression.
   Une ligne, la fonction existe.
7. **P16** — la barrière « hors périmètre » à faire porter sur la composition, pas sur le seul nom.
8. **P15, P1, P2** — trois écrans qui mentent : le paywall qui se vend à qui a déjà payé, le
   placeholder « Coming with the App Store release », les trois interrupteurs placebo. Une garde et
   deux suppressions.
9. **P3, P4** — implémenter `decidePolicyFor` et `createWebViewWith` dans le Coordinator.
10. **P5, P6, P7, P8, P9** — la passe légale : CGU, politique, âge, données de santé, mention UE.
11. **P10, P13** — consentement analytics, et retrait des avis verbatim.
12. **P11, P12** — les deux sujets de fond, à arbitrer plutôt qu'à patcher.
