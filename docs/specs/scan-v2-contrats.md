# Scan V2 — Contrats gelés (source de vérité des lots parallèles)

Document de référence pour l'intégration des écrans V2 au proto `public/scan-proto/`.
Toute divergence avec ce document est un bug du lot, pas une liberté d'interprétation.
Maquettes : `design/v2-canvas/` (15 planches). Plan : `~/.claude/plans/whimsical-twirling-hamming.md`.

## 1. Fichiers

Nouvelles pages (`public/scan-proto/`) : `index.html`, `02-fork.html`, `03-result-free.html`,
`10-promesse.html`, `11-dashboard.html`, `12-dashboard-free.html`, `13-historique.html`,
`14-historique-free.html`, `15-compte.html`, `16-paywall.html`, `17-reglages.html`, `18-bilan.html`.
Socle : `public/scan-proto/commun/base.css`, `public/scan-proto/commun/app.js`.
Serveur : `src/app/api/moi/route.ts`, `src/app/api/moi/bilan/route.ts`, `src/app/api/shelf/route.ts`,
`src/lib/scan/acces.ts`, `src/lib/scan/profil-utilisateur.ts`.

## 2. Endpoints

### GET /api/moi  (public, jamais de cache)
```json
{ "connecte": false, "premium": false, "prenom": null, "email": null }
```
`premium` = `userHasAccess(uid)` (lecture DB fraîche via src/features/checkout/access.ts).

### GET /api/moi/bilan  (auth requis ; 401 sinon)
```json
{ "bilan": null }
{ "bilan": { "score": 84, "potentiel": 92, "skinType": "Combination", "skinAge": 27,
  "date": "2026-08-21T00:00:00Z", "photo": "data:image/jpeg;base64,...",
  "curseurs": [ { "id": "blemishes", "label": "Blemishes", "niveau": 45, "libelle": "mild" } ],
  "evolution": [ { "date": "2026-06-01", "score": 76 } ] } }
```
`curseurs` = les 4 attributs les plus dégradés de la dernière Analysis (niveau 0-100, 100 = pire).
`evolution` = toutes les Analysis du user, asc, {date, score}.

### GET|PUT /api/shelf  (auth requis)
GET → `{ "items": [ShelfItem] }` · PUT `{ "items": [ShelfItem] }` → `{ "ok": true }`
PUT remplace tout (le client est source de vérité). Stockage : modèle Prisma `Protocol`
(findFirst par userId → update/create, items dans `products` Json). AUCUNE migration.
```ts
ShelfItem = { nom: string, marque?: string, image?: string, categorie?: string,
              formule?: number|null, perso?: number|null, ajoute: string /*ISO*/ }
```

### Gating des routes produit (src/lib/scan/acces.ts)
`sessionPremium(): Promise<{uid:string|null, premium:boolean}>` — auth() + userHasAccess.
`PROFIL_NEUTRE = { skinType: "", sensitivity: 0, concerns: {}, avoid: [], pregnancy: false, allergies: [] }`.
Si **!premium** :
- `produit/fiche` : `score.perso` ABSENT, `avis: null`, `ingredients` calculés avec PROFIL_NEUTRE.
  `score.formule`, `produit.*`, `avisBrut` (note+nb+source) inchangés.
- `produit/score` et `produit/lire-inci` : même règle (pas de perso, ingrédients neutres).
- `produit/overview` : `{ "overview": null }`.
- `produit/alternatives` : `{ "alternatives": [] }`.
Si **premium** : comportement actuel, mais `profil()` remplacé par `await profilUtilisateur(uid)`
(v1 : renvoie data/scan/profil.json pour tous — la couture existe, le contenu viendra plus tard).
`identifier`, `recherche`, `avis` (bruts) restent publics et inchangés.

### /api/iap/grant + /api/iap/sync (existants — extension)
`grant` accepte `plan: "weekly"|"annual"|"lifetime"` ; `annual` → `accessUntil = now + 365j`.
`sync` : const `ANNUAL_ID` placeholder à côté de LIFETIME_ID/WEEKLY_ID.

### /api/register (existant — extension)
Body accepte `sansAcces: true` → crée le compte SANS `lifetimeAccess: true`. Sans le flag,
comportement V1 inchangé (checkout).

## 3. Clés de stockage navigateur

| Clé | Portée | Contenu |
|---|---|---|
| `ss-scan-photo`, `ss-scan-produit`, `ss-inci-resultat` | session | INCHANGÉS (proto actuel) |
| `ss-moi` | session | `{connecte,premium,prenom,email,t:epochMs}` — cache /api/moi, TTL 60 s, purgé après login/logout/achat |
| `ss-shelf` | local | `ShelfItem[]` — REMPLACE `ss-ma-routine` (migration : noms seuls → items `{nom, ajoute:now}`) |
| `ss-historique` | local | `[{nom,marque,image,categorie,formule,perso,date}]`, cap 50, plus récent en tête |
| `ss-routine-checks` | local | `{date:"YYYY-MM-DD", coches:[nom]}` — reset si date ≠ aujourd'hui |
| `ss-nb-produits` | local | entier — produits ajoutés au shelf (cumul) |
| `ss-compte-propose` | local | `"1"` si le modal SaveShelf a déjà été montré (jamais re-proposé) |

## 4. API du socle front (`window.SS`, commun/app.js)

```
SS.moi(force?)                 → Promise<{connecte,premium,prenom,email}>  (cache ss-moi)
SS.natif.est()                 → boolean  (window.__SMARTSKIN_NATIVE__)
SS.natif.signInApple(ok, err)  → bridge action "signInWithApple" ; callbacks globaux
SS.natif.achat(plan, cb)       → action "purchase" (retry <600ms comme native-purchase.ts)
SS.natif.restaurer(cb) / SS.natif.prix(cb) / SS.natif.syncEntitlement()
SS.auth.apple(idToken, name, mode)      → POST REST /api/auth/callback/apple (csrf + X-Auth-Return-Redirect)
SS.auth.loginEmail(email, mdp)          → POST /api/auth/callback/credentials  (mode ?dev=1 UNIQUEMENT)
SS.auth.signup(email, mdp)              → POST /api/register {sansAcces:true} puis loginEmail
SS.auth.signout()                       → POST /api/auth/signout + purge ss-moi
SS.shelf.liste() / SS.shelf.sync() / SS.shelf.addFlow(produit)
SS.historique.ajouter(entree) / SS.historique.liste()
SS.tabbar(actif)               → injecte la pilule ; actif ∈ "home"|"histo"
```
- `addFlow(produit)` : slot `categorie` libre → ajout direct + toast ; occupé → modal AddRoutine
  (comparaison, recommande le meilleur score — perso si premium sinon formule) ; après ajout,
  `ss-nb-produits`++ ; si ∈{2,3} et !connecte et !ss-compte-propose → modal SaveShelf
  ("Not now" → ss-compte-propose=1, aucune relance).
- PAS de Google nulle part. Apple uniquement (+ email/mdp derrière `?dev=1`).

## 5. Pont natif (contrat V1 — NE PAS MODIFIER)

Recopié de `src/features/checkout/native-purchase.ts` :
envoi `window.webkit.messageHandlers.native.postMessage({action, ...})` ;
actions `signInWithApple | purchase {plan} | restore | getPrice | getEntitlement` ;
callbacks globaux `__smartskinAppleAuth(idToken, name)`, `__smartskinAppleAuthError(r)`,
`__smartskinPurchaseDone(ok)`, `__smartskinPrice(p)`, `__smartskinRestoreDone(ok)`,
`__smartskinEntitlement(productId, expiresAt)` ; drapeau `window.__SMARTSKIN_NATIVE__` (user script).
Côté Swift : porter `FunnelWebView.swift` + `Purchases/Store.swift` de ~/dev/smartskin-ios.

## 6. Navigation (résumé)

```
index → (jamais scanné & déconnecté) 01-scan ; sinon 11-dashboard ou 12-dashboard-free
01-scan → 07-confirm → [premium? 06-result-premium : 02-fork]
09-inci → [premium? 06?source=inci : 02-fork?source=inci]     08-search → même fork que 07
02-fork → "free" 03-result-free?p= | "for your skin" → (connecté? 16-paywall : 15-compte?next=paywall)
03-result-free : carte verrouillée → 16-paywall · add routine → SS.shelf.addFlow · retour → 01-scan
16-paywall : succès → (ss-scan-produit? 06?p= : 11-dashboard) · croix → history.back()
15-compte : succès → purge ss-moi, SS.shelf.sync(), redirige ?next
tabbar (11,12,13,14 uniquement) : Home | Scan(01) | Historique — variante free/premium selon SS.moi()
17-reglages ← engrenage des dashboards/historiques · 18-bilan ← carte score du 11 · 10-promesse ← CTA face scan
```

## 7. Styles

`base.css` : tokens :root du proto (06-result-premium.html:14-22), `.phone`, `.nav`, la tabbar
des maquettes (DashboardAbonnee.dc.html:538-556 + 727-730), scrim+modal, CTA plein/ghost,
cartes verre. Police Manrope (Google Fonts, poids 300-800). Chaque page ajoute son CSS
spécifique INLINE (pattern du proto). Les 5 pages existantes ne chargent PAS base.css.
