# Scan produit — Design (2026-07-09)

## Contexte

SmartSkin AI analyse la peau (photo + questionnaire) et recommande une routine. La feature **scan produit** ajoute le geste inverse : l'utilisateur scanne un produit skincare (en rayon ou chez lui) et l'app lui dit **si ce produit est approprié à SA peau**.

Rôle stratégique : **outil d'acquisition**. Le scan est gratuit et ouvert à tous avec une analyse générique du produit ; la réponse personnalisée « pour TA peau » nécessite le bilan SmartSkin (payant). C'est aussi le premier pont concret vers la Phase 2 (catalogue interne + affiliation) via les alternatives proposées.

**Livrable de cette itération : un prototype mocké** (dossier plat à la racine du repo, HTML self-contained, convention `Q-liquid-glass/`), PAS l'infrastructure de production. L'architecture cible est documentée ici à titre de référence pour l'implémentation future.

## Décisions validées (brainstorm 2026-07-09)

| Sujet | Décision |
|---|---|
| Scénario d'usage | **Les deux, même flux** : verdict rapide lisible en 3 s (en rayon) + détail scrollable (chez soi) |
| Contenu du résultat | Verdict + score global · détail par ingrédient · compatibilité routine · alternatives produits |
| Accès / business | **Gratuit et générique** pour tous ; personnalisation « pour TA peau » réservée aux utilisateurs avec bilan (payant) |
| Persistance | **Éphémère** : rien n'est sauvegardé. La compat routine se calcule contre la routine officielle du bilan (`Protocol`), pas entre scans |
| Moteur de reconnaissance | **Photo → LLM vision** (pas de code-barres/base externe). Le LLM extrait les faits produit ; le score vient du moteur déterministe existant |
| Une seule photo (amendement 2026-07-09) | Pas de 2e photo « liste INCI » : l'IA identifie le produit depuis la face et **retrouve l'INCI elle-même** (connaissances modèle / base interne). Confiance insuffisante → échec honnête, jamais de faux verdict |
| Livrable | **Prototype mocké** `product-scan-liquidglass/` avec vraie caméra (getUserMedia arrière, fallback simulé) |

## Parcours utilisateur (validé)

Deux points d'entrée, un seul flux :
- **Public (gratuit)** : route `/scan` sans compte, partageable en marketing, mise en avant sur la landing.
- **Espace client** : carte « Scan a product » sur le `DashboardScreen`, à côté du bloc rescan.

Le flux en 3 temps :
1. **Capture** — caméra arrière (`facingMode: "environment"`), cadre de visée produit, validation légère (netteté Laplacien + luminance ; PAS de MediaPipe). **Capture manuelle** (on vise un objet, pas un visage — pas d'auto-capture 3 s). Option « importer une photo » conservée. **Une seule photo** : la face du produit.
2. **Identification + analyse** — le LLM reçoit la photo de face : marque + produit + catégorie, et restitue les données structurées (actifs, INCI, flags) **de ses propres connaissances** — l'utilisateur n'a pas à photographier la liste d'ingrédients. Écran d'attente avec copy escaladante (« Identifying the product… », « Checking its ingredients… »). Le champ `confidence` du schéma décide : confiance insuffisante → échec honnête.
3. **Résultat** — verdict immédiat au-dessus de la ligne de flottaison, détail scrollable dessous. Contenu selon le statut (voir ci-dessous).

Échec honnête : produit non identifié avec confiance → « We couldn't read this product » + conseils (lumière, angle) + retry. Objet non-skincare → « This doesn't look like a skincare product ». Jamais de faux verdict.

## Résultat : deux niveaux (validé)

### Niveau 1 — Gratuit, sans bilan (acquisition)
On analyse *le produit*, pas la personne :
- **Verdict formule** générique (« Well-formulated » / « Contains 3 common irritants ») — jamais de score % (réservé au payant).
- **Ce que fait le produit** : catégorie, actifs clés + bénéfices (« 10% Niacinamide — targets pores & tone »).
- **Flags génériques** : parfum, alcool dénaturant, huiles essentielles, sulfates, comédogènes notoires (mêmes familles que q2).
- **« Best for » générique** : types de peau auxquels le produit convient en général.
- **Teaser verrouillé** : carte « Your personal match score » floutée + CTA « Find out if it's right for YOUR skin → Start your analysis » → tunnel existant.

### Niveau 2 — Personnalisé, avec bilan (payant) = niveau 1 +
- **Match score 0–100 + verdict** (« 82% — Great match for your skin »). Le LLM extrait les faits ; **le score est calculé par le moteur déterministe** (adaptation de `fitScore` × `EngineProfile` : 16 attributs, q2 irritants, q3 tolérance actifs, type de peau). Le LLM ne décide jamais du score.
- **Ingrédients en 3 groupes personnalisés** : ✦ Good for you (actifs ciblant ses attributs niveau 3–4) · Neutral · ⚠ Watch out (irritants q2, comédogènes si acné/comédons élevés…).
- **Garde médical prioritaire** : réutilise `medical-guard.ts` — ex. grossesse (q7) + rétinoïdes = verdict bloquant « Not recommended during pregnancy », quel que soit le score.
- **Compatibilité routine** : croisement avec les produits du `Protocol` (interactions rétinol + AHA, doublons d'actifs, jour vs nuit).
- **Alternatives si score faible** : 2–3 produits du catalogue interne (~140 produits, `fitScore` existant), même catégorie — pont affiliation Phase 2.

Disclaimer « bilan, pas diagnostic médical » sur les deux niveaux.

## Livrable : prototype `product-scan-liquidglass/`

Dossier plat à la racine de `~/dev/smartskin.app` (convention écrans livrés), HTML self-contained + assets à plat + `README.md` d'implémentation. Enchaînement cliquable :

| Fichier | Écran |
|---|---|
| `01-scan.html` | Viseur produit **vraie caméra** (getUserMedia arrière ; fallback visuel simulé si refus/desktop), cadre de visée, hint « Center the product », bouton capture manuel, lien « upload a photo » (file picker fonctionnel) |
| `02-analyzing.html` | Attente : identification + lecture de la formule (ticker INCI), copy escaladante en 3 temps |
| `03-result-match.html` | Résultat personnalisé complet : score, verdict, 3 groupes d'ingrédients, compat routine, alternatives |

**Amendement 2026-07-09 (bis)** : l'écran de résultat **générique/gratuit a été retiré du prototype** — la démo doit impressionner, elle va droit au résultat personnalisé. Les « deux niveaux » ci-dessus restent la vision produit pour la prod ; le traitement du non-membre (même écran avec score verrouillé + CTA tunnel, recommandé, vs scan réservé aux membres) sera tranché à l'implémentation.

**Données mock** : The Ordinary **Niacinamide 10% + Zinc 1%** (INCI réelle vérifiée, actif star, démo-friendly ; packshot officiel DECIEM dans le package). Le `03-result-match` montre un bon match (~82 %) avec au moins 1 ingrédient « Watch out » pour démontrer les 3 groupes. La section alternatives y figure aussi à titre de démo (en production elle n'apparaît que si le score est faible).

**Style** : tokens liquid glass validés (blur 18px saturate 165 %, bordure haute `rgba(255,255,255,.7)`, orbes froids), **accent unique `#A6C3D6`** (glyphe `#6E9AB6`), titres Manrope 800 uniformes, **contenu en anglais**, CTA pilule sombre. **Règles viewport fluides** : `max-width` 430 (cible 390), `min-height: 100dvh` (jamais de hauteur px fixe), `safe-area-inset` — PAS le cadre fixe 430×932 de `Q-liquid-glass/`.

**README.md du package** : notes d'implémentation + résumé de l'architecture cible ci-dessous.

## Architecture cible (référence — PAS dans ce livrable)

- `src/features/product-scan/` : `schema.ts` (zod `ProductScanResult` : `identification { brand, name, category, confidence }`, `inci[]`, `keyActives[]`, `flags`, `genericVerdict`) · `prompt.ts` (vision produit : identification depuis la photo de face + INCI restitué des connaissances du modèle, avec consigne d'honnêteté sur `confidence`) · `match.ts` (mapping faits produit → moteur existant : `fitScore` adapté + `medical-guard` → score, groupes, compat routine ; déterministe, testé en vitest).
- Réutilise le dispatcher LLM existant (Anthropic > OpenAI > Gemini > démo) et `features/capture/camera.ts` (+ métriques sharpness/luminance, sans FaceMesh).
- `POST /api/scan-product` : publique, rate-limitée comme `/api/analyze`, reçoit `{ images: base64[] }`. Si session → charge `Analysis` + `Protocol` côté serveur ; le profil peau ne quitte jamais le serveur ; réponse taggée `generic` | `personalized`.
- **Zéro persistance** : pas de table, pas de migration ; photos produit en mémoire puis jetées (non biométrique, traitement serveur UE conservé).
- Écrans : `ProductScanScreen.tsx`, `ProductScanResultScreen.tsx` ; routes `(home)/scan` + carte dashboard.

## Hors périmètre (YAGNI)

- Code-barres / bases produits externes (Open Beauty Facts).
- Étagère « My Shelf » / historique de scans / routine construite depuis les scans.
- Base d'ingrédients INCI normalisée interne.
- Comparaison multi-produits côte à côte.
- L'implémentation production elle-même (routes, feature folder) — prototype d'abord.

## Vérification du livrable

1. Ouvrir chaque HTML sur mobile (ou responsive dev tools ~390×844) : rendu fluide, safe-area OK, aucun scroll horizontal.
2. `01-scan.html` sur téléphone : la caméra arrière démarre après permission ; refus → fallback simulé visible.
3. Enchaînement cliquable 01 → 02 → 03 → 04/05 sans lien mort.
4. Cohérence des tokens (bleu unique, verre, titres 800, anglais) avec `Q-liquid-glass/` et `face-reveal-liquidglass/`.
