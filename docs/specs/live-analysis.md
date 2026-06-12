# SmartSkia™ — Live Photo Validation Spec

`[ IMPLEMENTATION SPEC FOR AI CODING ASSISTANT ]`

---

## Contexte

L'app SmartSkia capture **1 seule photo frontale** du visage de l'utilisatrice, qui sera ensuite envoyée à Gemini Vision pour diagnostic. La photo doit être de qualité suffisante pour que l'IA puisse analyser texture, pores, undertone, hydratation.

**Ce qui existe déjà**
- Capture sur `<canvas>`, dé-mirroring, export JPEG 92%
- Zone ovale de cadrage affichée sur le viewfinder
- Animation mesh scan post-capture
- Verdict "Good quality" mais **hardcodé** (à remplacer par du réel)

**Ce qu'on veut implémenter**
- Validation **live** pendant le viewfinder (avant le click capture)
- 6 critères vérifiés à ~15 fps minimum
- Bouton capture **désactivé** tant que les 5 critères bloquants ne sont pas verts
- Feedback UI temps réel pour guider l'utilisatrice

---

## Stack technique requise

- **MediaPipe Face Mesh** (via `@mediapipe/face_mesh` ou `face-api.js`) — détection visage + landmarks + estimation de pose
- **Canvas 2D API** — extraction des pixels de la zone visage pour la luminosité
- **requestAnimationFrame** — boucle de validation (cap à 15-20 fps pour économiser la batterie)

---

## Les 6 critères classés par importance

### `01` Taille du visage — **BLOQUANT** *(le plus critique)*

**Ce qu'on mesure**
- `faceHeight` = hauteur du bounding box du visage en pixels
- `ovalHeight` = hauteur de la zone ovale guide
- `ratio = faceHeight / ovalHeight`
- `projectedHeight` = hauteur estimée du visage sur l'image finale qui sera capturée

**Critères**
- **Bloquant** : `projectedHeight >= 800px` sur la résolution capture finale
- **Guidance UX** : `ratio` entre 0.60 et 0.90

**Messages UI**
- Si `ratio < 0.60` → *"Approche-toi"*
- Si `ratio > 0.90` → *"Recule un peu"*
- Si entre les deux → ✓ vert

---

### `02` Luminosité — **BLOQUANT**

**Ce qu'on mesure** — uniquement sur la zone du visage, JAMAIS sur l'image entière (sinon contre-jour pas détecté)

Pour chaque pixel `(R, G, B)` dans la bounding box du visage :
```
luminance_pixel = 0.299 × R + 0.587 × G + 0.114 × B
```

Calculer ensuite :
- `mean` = moyenne des luminances sur la zone visage
- `stddev` = écart-type des luminances sur la zone visage
- `meanLeft` = moyenne des luminances sur la **moitié gauche** de la zone visage
- `meanRight` = moyenne des luminances sur la **moitié droite** de la zone visage
- `lateralDelta` = `|meanLeft - meanRight|`

**Optimisation** — down-scaler la zone visage à 64×64 avant calcul (gratuit en perf). La séparation gauche/droite se fait sur cette matrice (32×64 pour chaque moitié).

**Pourquoi le split gauche/droite** — un éclairage latéral fort (lumière qui vient d'un seul côté, ombre du nez sur une joue) peut produire un `mean` global correct ET un `stddev` qui passe sous la barre des 50, tout en étant inanalysable. Le delta latéral capture précisément ce cas que le stddev global rate.

**Critères**
- **Bloquant bas** : `mean >= 100`
- **Bloquant haut** : `mean <= 200`
- **Bloquant homogénéité globale** : `stddev < 50`
- **Bloquant latéralité** : `lateralDelta < 30`

**Messages UI**
- Si `mean < 100` → *"Pas assez de lumière"*
- Si `mean > 200` → *"Trop de lumière directe"*
- Si `stddev >= 50` → *"Tu es à contre-jour, tourne-toi face à la lumière"*
- Si `lateralDelta >= 30` → *"Lumière trop forte d'un côté, équilibre ton éclairage"*

---

### `03` Présence du visage — **BLOQUANT**

**Ce qu'on mesure**
- `faceCount` = nombre de visages détectés par MediaPipe

**Critères**
- **Bloquant** : `faceCount === 1`

**Messages UI**
- Si `faceCount === 0` → *"Place ton visage dans le cadre"*
- Si `faceCount > 1` → *"Une seule personne dans le cadre"*

---

### `04` Orientation de la tête — **BLOQUANT**

**Ce qu'on mesure** — extraction des angles d'Euler depuis les landmarks MediaPipe :
- `yaw` (rotation Y, gauche/droite)
- `pitch` (rotation X, haut/bas)
- `roll` (rotation Z, tilt latéral)

**Critères**
- **Bloquant Y** : `-15° ≤ yaw ≤ +15°`
- **Bloquant X** : `-10° ≤ pitch ≤ +10°`
- **Bloquant Z** : `-20° ≤ roll ≤ +20°`

**Messages UI** *(prioriser le plus déviant)*
- Si `|yaw| > 15` → *"Tourne ta tête bien en face"*
- Si `|pitch| > 10` → *"Garde la tête droite, ni trop haut ni trop bas"*
- Si `|roll| > 20` → *"Redresse ta tête"*

---

### `05` Stabilité — **BLOQUANT**

**Ce qu'on mesure**
- Position du centre du visage `(faceX, faceY)` à chaque frame
- `delta` = distance euclidienne entre la position actuelle et celle de la frame précédente
- `imageWidth` = largeur de la preview vidéo

**Critères**
- **Bloquant** : `delta < imageWidth * 0.015` (1.5% de la largeur)
- **Bloquant** : la condition delta doit être vraie pendant **500 ms continus**

**Logique**
- Si delta dépasse le seuil → reset du timer de stabilité
- Si delta sous le seuil pendant 500ms → stabilité validée
- Le timer reset si l'utilisatrice bouge à nouveau

**Messages UI**
- Pendant les 500ms d'attente → *"Tiens-toi stable..."*
- Après 500ms → ✓ vert

---

### `06` Centrage — **SOFT (warning, pas bloquant)**

**Ce qu'on mesure**
- `(faceCenterX, faceCenterY)` = centre du visage
- `(ovalCenterX, ovalCenterY)` = centre de la zone ovale
- `deltaX = |faceCenterX - ovalCenterX| / ovalWidth`
- `deltaY = |faceCenterY - ovalCenterY| / ovalHeight`

**Critères**
- **Warning** : `deltaX > 0.15` ou `deltaY > 0.15`
- **Pas bloquant** — n'empêche pas la capture

**Messages UI**
- Si décentré → *"Centre ton visage dans l'ovale"* (warning soft, pas rouge)

---

## Architecture du module

### Boucle de validation

```
requestAnimationFrame loop (cap à 15-20 fps)
  ↓
1. Récupérer la frame courante du <video> du viewfinder
  ↓
2. MediaPipe Face Mesh → landmarks + bounding box + pose
  ↓
3. Calculer les 6 métriques :
   - faceHeight / ovalHeight
   - luminance (mean + stddev + meanLeft + meanRight + lateralDelta) sur zone visage
   - faceCount
   - yaw / pitch / roll
   - delta position vs frame précédente
   - centerOffset
  ↓
4. Évaluer chaque critère → état { ok | warning | error }
  ↓
5. Mettre à jour l'UI (indicateurs visuels + messages)
  ↓
6. Activer le bouton capture SSI les 5 critères bloquants sont OK
```

### State management

Maintenir un objet d'état :

```
{
  // Statut de chargement du modèle MediaPipe
  isModelLoading:  boolean,         // true tant que MediaPipe n'est pas prêt
  modelError:      string | null,   // message d'erreur si le modèle a fail à charger
  
  // Métriques de validation
  faceSize:    { status, message, value },
  luminance:   { status, message, mean, stddev, meanLeft, meanRight, lateralDelta },
  faceCount:   { status, message, value },
  orientation: { status, message, yaw, pitch, roll },
  stability:   { status, message, stableSince },
  centering:   { status, message, deltaX, deltaY },
  
  canCapture:  boolean  // true si tous les bloquants sont OK ET isModelLoading false
}
```

**Comportement loading**

MediaPipe Face Mesh met **1 à 3 secondes** à charger en RAM au lancement de la caméra. Sans gestion de cet état, l'utilisatrice voit la caméra fonctionner mais le bouton de capture reste mystérieusement bloqué pendant 2 secondes sans message.

- Au montage du composant viewfinder → `isModelLoading: true`
- Afficher un spinner / overlay sur le viewfinder avec le message *"Initialisation de l'IA..."*
- Une fois MediaPipe prêt → `isModelLoading: false`, démarrer la boucle de validation
- Si erreur de chargement → `modelError` rempli, afficher un fallback gracieux *"Impossible d'initialiser l'analyse, recharge la page"*

Le bouton capture ne peut **jamais** être activé tant que `isModelLoading === true`, indépendamment de l'état des autres critères.

### Performance

- **Down-scaler** la frame analysée à 320×240 max pour MediaPipe (suffisant)
- **Down-scaler** la zone visage à 64×64 pour le calcul de luminance
- **Cap la boucle à 15-20 fps** (pas besoin de 60fps, économie batterie significative)
- **Throttle les mises à jour UI** à 5-10 fps même si la boucle tourne plus vite (évite les sauts visuels nerveux)

---

## UX — comportement attendu

### Indicateurs visuels

Chaque critère bloquant a un indicateur dans l'UI :
- ✓ vert quand OK
- ✗ rouge quand erreur (avec le message contextuel)
- ⏳ orange pendant les états transitoires (attente stabilité par exemple)

### Bouton capture

- **Désactivé** (greyed out, non cliquable) tant qu'au moins 1 critère bloquant n'est pas vert
- **Activé** dès que les 5 sont verts
- Animation soft d'activation (ne pas brusquer l'utilisatrice)

### Messages prioritaires

Si plusieurs critères sont en erreur, **n'afficher qu'un seul message à la fois**, dans l'ordre de priorité du classement (1 → 5). Évite la cacophonie d'instructions contradictoires.

### Centrage soft

Le centrage est en warning, pas bloquant. Afficher un indicateur subtil mais ne **jamais empêcher** la capture si c'est le seul critère en jaune.

---

## Calibrage des seuils

⚠️ **Important** — les seuils donnés sont des **valeurs par défaut justifiées théoriquement**. Ils doivent être **calibrés empiriquement** après les premiers tests réels :

1. Logger les valeurs `mean`, `stddev`, `yaw`, `pitch`, etc. pour chaque capture réussie ET échouée
2. Stocker dans Supabase pour analyse
3. Après 50-100 captures, ajuster les seuils si nécessaire (rejet abusif, ou laxisme)

Stocker les seuils dans un objet `VALIDATION_CONFIG` pour pouvoir les ajuster sans toucher la logique.

---

## Tableau de référence rapide

| # | Critère | Bloquant | Seuils |
|---|---|---|---|
| 1 | Taille visage | OUI | proj ≥ 800px / ratio 0.60-0.90 |
| 2 | Luminosité | OUI | mean 100-200 / stddev < 50 / **lateralDelta < 30** |
| 3 | Présence visage | OUI | exactement 1 visage |
| 4 | Orientation | OUI | yaw ±15° / pitch ±10° / roll ±20° |
| 5 | Stabilité | OUI | delta < 1.5% width / 500ms continus |
| 6 | Centrage | NON | offset < 15% (warning seulement) |

⚠️ **Précondition transverse** — `isModelLoading === false` avant tout. Le bouton capture est bloqué tant que MediaPipe n'est pas chargé, même si les 5 critères seraient verts.

---

## Hors scope de cette spec

Ce document couvre **uniquement la validation live** pendant le viewfinder. Le traitement post-capture (résolution finale, netteté Laplacien, détection filtres beauté) fait l'objet d'une spec séparée.

---

`[ DOCUMENT · SmartSkia™ Live Photo Validation Spec · v1.1 ]`
