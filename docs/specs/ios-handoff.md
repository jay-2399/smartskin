# SmartSkin — Handoff portage iOS natif (audit + décisions)

> Doc de vérité partagé entre **la session « web codebase »** (qui a rédigé ce doc après
> audit du code réel) et **la session « Xcode/Swift »** (qui construit l'app iOS).
> Remplace le handoff initial rempli de `[À CONFIRMER]` : tout est **confirmé sur le code**.
> Dernière MAJ : 2026-07-14.

---

## 0. Statut & objectif

Porter SmartSkin en **app iOS native Swift/SwiftUI**, caméra 100 % native. Le **backend
ne bouge pas** (Next.js sur Render) ; l'app iOS s'y branche via API HTTPS. Le mobile
devient le cœur produit, le web reste maintenu (clients multiples, **un seul cerveau**).

---

## 1. Décisions figées

| Sujet | Décision |
|---|---|
| Techno | **Swift/SwiftUI natif** (pas Capacitor/WebView) |
| Cerveau d'analyse | **Reste côté serveur** (LLM vision cloud) — non portable on-device |
| Détection visage | **On-device Apple Vision / ARKit** (remplace MediaPipe) |
| Monétisation iOS | **IAP Apple** (obligatoire, règle 3.1.1) — **pas** Stripe in-app |
| Plomberie IAP | **RevenueCat** (validation reçu + webhook) — **paywall SwiftUI 100 % custom** |
| Auth mobile | **Auth par token** pour l'API + **Sign in with Apple** (obligatoire si Google gardé, règle 4.8) |
| Backend | **Inchangé** : ne pas réécrire la logique métier, s'y brancher |

---

## 2. Contrat d'API réel (backend Render, base `https://app.smart-skin.ai`)

| Endpoint | Auth (aujourd'hui) | Entrée | Sortie |
|---|---|---|---|
| `POST /api/analyze` | ❌ aucune *(à sécuriser)* | `{ answers, image }` — `image` = **base64 JPEG** (sans préfixe `data:`) | `AnalysisResult` · `422 {error:"photo_quality", issue}` si photo mauvaise |
| `POST /api/routine` | ❌ aucune *(à sécuriser)* | `{ result: AnalysisResult, answers }` | `{ routine, totaux:{prix,irritation}, avertissements:[] }` |
| `POST /api/scan` | ✅ session | `{ result, answers, photo }` — `photo` = data URL base64 | `{ ok:true }` (persiste le scan sous le compte) |
| `POST /api/register` | ❌ | `{ email, password, name? }` | crée le compte |
| `POST /api/checkout` | ❌ | — | `{ url }` Stripe (web only, **pas pour iOS**) |
| `POST /api/stripe/webhook` | signature Stripe | événement Stripe | pose `lifetimeAccess` |
| `POST /api/contact` | ❌ | `{ name, email, message }` | envoi Resend |

### `AnalysisResult` (source : `src/features/analysis/schema.ts`)
```
{
  score: int 0..100,            // CALCULÉ côté serveur (score.ts), PAS par l'IA — l'app l'affiche tel quel
  state: string,               // ex. "Good overall condition"
  sub: string,
  observations?: string,
  photoQuality: { ok: bool, issue?: string|null },
  profile: { skinType, ageRange, carnation:1..6, carnationLabel, undertone:1..4, undertoneLabel, phototype:1..6, phototypeSub },
  attributes: [16] { id, level:1..4, tip, situation },   // ids dans attributes.ts (acne, redness, pores, flaking, …)
  skinAge?: int, skinTypeBreakdown?: string,
  verdict?: { title, body, behavioralLink, plan:[{label, sub}] }
}
```
`answers` (source : `src/features/funnel/types.ts`) = `{ age, q1:[], q2:[], q3:[], q4, q5:{changed,symptoms:[]}, q6, q7:[] }`. Peut être **vide** (`EMPTY_ANSWERS`) — l'analyse est surtout pilotée par la photo.

---

## 3. Capture : critères de gating à reproduire (Apple Vision)

Aujourd'hui (web) : MediaPipe `FaceLandmarker` + `src/features/capture/`. **6 critères
bloquants** (`evaluate.ts`), capture **auto après 3 s** tout-vert (pas de bouton). À
refaire avec Apple Vision. Seuils **live** (`config.ts`, calibrés sur vraie caméra) :

| Critère | Seuil (live) |
|---|---|
| Visage détecté | exactement 1 visage |
| Distance (taille) | hauteur projetée ≥ **470 px**, ratio visage/cadre **0.52–0.95** |
| Centrage | offset ≤ **0.15** (soft) |
| Orientation (face caméra) | yaw ≤ **20°**, pitch ≤ **20°**, roll ≤ **25°** |
| Lumière | luminance moyenne **145–200**, stddev ≤ 50, ombre (range grille 3×3) ≤ **65** |
| Netteté | variance (Laplacien) ≥ **60** |
| Stabilité | delta ≤ 1.5 %/frame pendant **500 ms** ; auto-capture après **3000 ms** |

Photo **importée** (galerie) = seuils assouplis (bloc `upload` du `config.ts`). Image
finale : **JPEG qualité 0.92, borné à 1280 px** de côté avant envoi à `/api/analyze`.

---

## 4. Chantiers BACKEND requis avant/pendant le portage

1. **Auth par token pour l'API** — NextAuth actuel = session **cookie/JWT web**, pas
   consommable par une app native. Ajouter un flux token (Bearer) : Sign in with Apple →
   échange contre un token app → toutes les routes protégées le lisent.
2. **Sécuriser `/api/analyze` + `/api/routine`** — aujourd'hui **ouverts, aucun
   rate-limit trouvé dans le code** (malgré la note CLAUDE.md). Chaque appel = un appel
   vision **payant** → exiger un token + rate-limit avant d'exposer à l'app.
3. **Webhook RevenueCat** — nouvel endpoint (façon `/api/stripe/webhook`) qui pose
   `lifetimeAccess = true` sur le compte quand RC confirme l'achat Apple. L'accès reste
   **account-based** en base Render → l'app iOS demande à **son** backend « a payé ? ».

---

## 5. Conformité (points de rejet App Store)

- **IAP (3.1.1)** — débloquer le rapport/routine = contenu numérique → **IAP obligatoire**.
  ⚠️ Ne rien vendre/mentionner/linker vers Stripe **dans l'app**. *(Les liens d'affiliation
  Amazon = produits **physiques** → autorisés hors IAP.)*
- **Sign in with Apple (4.8)** — obligatoire si Google login est proposé.
- **Biométrie faciale (BIPA / Texas CUBI / CCPA)** — **consentement explicite écrit AVANT
  toute capture**, minimiser les données, politique de rétention/destruction. Pas encore
  implémenté (ni web ni iOS). ⚠️ À faire valider par un juriste avant publication.
- `NSCameraUsageDescription` dans Info.plist (déjà posé au scaffolding).

---

## 6. À NE PAS faire

- Ne pas réécrire la logique métier (analyse, scoring, moteur de reco) → elle vit sur Render.
- Ne pas calculer le score côté app (il vient de `/api/analyze`).
- Ne pas vendre via Stripe dans l'app iOS.
- Ne pas toucher la vitrine/blog Lovable.

---

## 7. Ordre de phases conseillé (ajusté)

1. **Backend d'abord** : token auth + sécuriser analyze/routine + webhook RevenueCat.
2. **Socle app** : MVVM, navigation, design system SwiftUI (charte liquid-glass), client API (`Codable` sur le contrat §2).
3. **Capture** : AVFoundation + Apple Vision (critères §3) + écran de **consentement biométrique AVANT capture**.
4. **Analyse → résultat → routine** : appels API, écran reveal (score + 16 attributs), deck routine.
5. **Paywall custom SwiftUI + RevenueCat** (achat non-consommable « lifetime »).
6. **Auth** : Sign in with Apple + compte.
7. **Polish + conformité + soumission** (labels de confidentialité « données visage »).

---

## 8. Référence design — écrans déployés + code source (PAS les maquettes)

⚠️ **Ne PAS utiliser `reference/User_flow_screens/`** : ces maquettes sont **périmées**
(elles s'arrêtent à l'analyse, avant les vrais écrans results/routine/dashboard). La
**vérité** = l'**app déployée** (`https://app.smart-skin.ai`) + le **code des composants
actuels** (c'est exactement ce qui est déployé, donc à jour).

Pour chaque écran : **ouvrir l'URL** pour voir le rendu réel, **lire le composant + CSS**
pour les valeurs exactes (couleurs, rayons, espacements, animations). Chemins depuis
`/Users/jayenbellili/dev/smartskin.app/` — composants dans `src/components/screens/`.

| Écran | URL déployée (à voir) | Code source (valeurs exactes) |
|---|---|---|
| Landing | `/` | `HomeLanding.tsx` + `home.css` |
| Questionnaire q1–q7 | `/questions/age` | `QuestionScreen.tsx` + `questions-glass.css` + `funnel.css` |
| Capture caméra | `/capture` | `CaptureScreen.tsx` + `funnel.css` |
| Analyse en cours | `/analyse-2` | `AnalyseScreen.tsx` + `funnel.css` (`.analyse`) |
| Reveal résultat | `/exclusive-2` | `ResultsScreen.tsx` + `results-glass.css` |
| Routine (deck) | `/exclusive-2/routine` | `RoutineScreen.tsx` + `routine-v2.css` |
| Paywall | *(derrière `/checkout`)* | `PaywallB.tsx` + `paywall-b.css` |
| Dashboard | *(login requis)* | `DashboardScreen.tsx` + `dashboard.css` |
| Tokens globaux | — | `src/app/globals.css` |

Les pages `/exclusive-2`, `/analyse-2`, `/exclusive-2/routine` + le funnel public couvrent
la quasi-totalité des écrans sans login.

### Design tokens (source : `globals.css`) — à recréer en `enum`/`Color` SwiftUI

```
Base/encre : bg #F1F3F6 · ink #1A1D21 · card #FFFFFF · cloud #EDEFF7 · smoke #D3D6E0
             steel #BCBFCC · space #9DA2B3 · graphite #6E7180 · arsenic #40424D
Accent bleu: accent #A6C3D6 · accent-d #7FA6BE · accent-bg rgba(166,195,214,0.16)
Sémantique : green #1FC977 · green-d #13A35F
Bandes score: ≥70 vert #2BC182 (dégradé depuis #7ED3A6) · 40-69 orange #EA9A54 (#F2C083)
              <40 rouge #E06657 (#EE9C90)
```

- **Typo** : **Manrope** (display + body, poids 300→800) + **JetBrains Mono** (petits
  labels/uppercase/chiffres). → embarquer les 2 polices dans le bundle.
- **Rayons** : cartes **18–22px**, boutons **15–16px**, inputs **12px**, pastilles/pills
  **100px** (capsule), avatars/FAB **50%**.
- **Recette « liquid-glass »** (cartes `.vcard`, hero, modales) :
  fond `linear-gradient(180deg, rgba(255,255,255,0.80) → 0.62)`, **backdrop blur 16–28px
  saturate ~1.4**, bord `1px rgba(255,255,255,0.62)`, liseré interne haut
  `inset 0 1px 0 rgba(255,255,255,0.75)` + ombre douce `0 8–24px rgba(40,55,75,0.07–0.20)`.
  → en SwiftUI : `.ultraThinMaterial`/`.regularMaterial` + overlay bord blanc + shadow.
- **CTA principal (sombre)** : `linear-gradient(180deg,#2A2D34,#1A1D21)` (≈ `ink`), texte
  blanc, hauteur **54–58px**, rayon **15–16px**, ombre `0 6–8px 18–24px rgba(26,29,33,0.24)`.
- **Fond ambiant** : orbes froids (radial-gradients accent bleu + lavande translucides) sur
  le `bg` clair — voir `.phone::before` dans les CSS.
- **Animations** : reveal au scroll (fade+translateY), score qui monte (count-up + knob de
  jauge), maillage facial. Courbe signature : `cubic-bezier(.22,1,.36,1)`.
