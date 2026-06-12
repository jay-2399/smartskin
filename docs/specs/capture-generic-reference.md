# Prise de photo avec vérification en temps réel

## 1. Objectif

Cet écran permet à l'utilisateur de prendre une photo dont la **qualité est contrôlée en direct**, avant même la capture. Plutôt que de prendre une photo « à l'aveugle » puis de la rejeter après coup, l'application analyse le flux de la caméra en continu et guide l'utilisateur pour obtenir une image conforme du premier coup.

Cas d'usage typiques : photo de document, photo d'identité, photo de produit, justificatif, scan d'objet.

---

## 2. Vue d'ensemble du fonctionnement

```text
┌─────────────────────────────────────────────┐
│              FLUX CAMÉRA (live)              │
│                                             │
│        ┌───────────────────────┐            │
│        │   Cadre de visée       │           │
│        │   (zone de capture)    │           │
│        └───────────────────────┘            │
│                                             │
│   ● Éclairage   ● Angle   ● Stabilité       │   ← indicateurs live
│                                             │
│            [  Déclencheur  ]                │   ← actif uniquement si OK
└─────────────────────────────────────────────┘
                     │
                     ▼
        Analyse image par image (temps réel)
                     │
        ┌────────────┴────────────┐
        │  Tous critères OK ?      │
        └────────────┬────────────┘
            Non ◄─────┴─────► Oui
             │                 │
   Guide l'utilisateur   Déclencheur activé
   (messages + couleurs)  → Capture autorisée
```

---

## 3. Les paramètres analysés en temps réel

À chaque image (frame) du flux caméra, l'application calcule plusieurs indicateurs. Chacun a un seuil de validation et un état visuel (vert = OK, orange = à corriger, rouge = bloquant).

### 3.1 Éclairage (luminosité)
- **Ce qui est mesuré** : la luminosité moyenne des pixels de la zone de capture, ainsi que les zones de sur-exposition (trop clair) et sous-exposition (trop sombre).
- **Pourquoi** : une image trop sombre ou éblouie rend le contenu illisible.
- **Retour utilisateur** : « Trop sombre, rapprochez-vous d'une source de lumière » / « Reflet détecté, changez d'angle ».

### 3.2 Angle / perspective
- **Ce qui est mesuré** : l'inclinaison de l'appareil (via l'accéléromètre/gyroscope) et la déformation de perspective du sujet (détection des bords/du cadre).
- **Pourquoi** : une photo prise de biais déforme le document ou l'objet.
- **Retour utilisateur** : un niveau à bulle visuel + message « Tenez le téléphone bien à plat / face au sujet ».

### 3.3 Stabilité
- **Ce qui est mesuré** : le niveau de mouvement entre deux images successives (différence de pixels) et/ou les données de mouvement du capteur.
- **Pourquoi** : un appareil qui bouge produit une image floue.
- **Retour utilisateur** : « Maintenez l'appareil immobile… » avec un court compte à rebours de stabilisation.

### 3.4 Netteté (mise au point)
- **Ce qui est mesuré** : le niveau de détail / contraste local (estimation du flou).
- **Pourquoi** : garantir que le sujet est net.
- **Retour utilisateur** : « Image floue, attendez la mise au point ».

### 3.5 Cadrage / distance
- **Ce qui est mesuré** : la position et la taille du sujet par rapport au cadre de visée.
- **Pourquoi** : éviter que le sujet soit coupé ou trop petit.
- **Retour utilisateur** : « Rapprochez-vous » / « Centrez le document dans le cadre ».

---

## 4. Logique de validation

1. L'application ouvre le flux caméra et l'affiche en plein écran.
2. À chaque image (idéalement plusieurs fois par seconde), elle analyse **tous les paramètres** ci-dessus.
3. Chaque paramètre renvoie un statut : **OK / À corriger / Bloquant**.
4. Les indicateurs à l'écran se mettent à jour en direct (couleurs + textes).
5. Le bouton de **déclenchement n'est activé que lorsque tous les critères critiques sont au vert**.
6. (Option) **Capture automatique** : dès que toutes les conditions sont réunies et stables pendant ~1 seconde, la photo est prise automatiquement.
7. Après capture, une dernière vérification est faite sur l'image figée ; si elle échoue, on propose de recommencer.

---

## 5. Parcours utilisateur

1. L'utilisateur ouvre l'écran de prise de photo.
2. Il pointe l'appareil vers le sujet.
3. Les indicateurs le guident en temps réel (ex. l'éclairage passe au vert, mais l'angle reste orange).
4. Il ajuste sa position jusqu'à ce que tout soit au vert.
5. Il déclenche (ou la capture se fait automatiquement).
6. Aperçu de la photo : il **valide** ou **reprend**.

---

## 6. Détail technique (pour l'équipe de développement)

### Accès caméra
- Web : API `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`, rendu dans une balise `<video>`.
- Mobile natif : module caméra (ex. Capacitor Camera / API native), avec accès au flux de prévisualisation.

### Analyse des images en direct
- Une boucle `requestAnimationFrame` (ou un intervalle) lit chaque image.
- L'image est dessinée dans un `<canvas>` masqué pour accéder aux pixels (`getImageData`).
- Calculs effectués sur ces pixels :
  - **Luminosité** : moyenne des valeurs de luminance.
  - **Sur/sous-exposition** : pourcentage de pixels saturés (proche de 0 ou 255).
  - **Netteté** : variance d'un filtre type Laplacien (estimation du flou).
  - **Stabilité** : différence moyenne entre l'image courante et la précédente.
- **Angle/inclinaison** : événements `DeviceOrientation` / `DeviceMotion` (web) ou capteurs natifs.
- **Détection des bords / cadrage** : détection de contours pour repérer le document et sa perspective.

### Performance
- Réduire la résolution analysée (ex. sous-échantillonner l'image) pour rester fluide.
- Ne pas analyser chaque pixel : échantillonner 1 pixel sur N.
- Limiter l'analyse à ~5–10 fois par seconde suffit pour un ressenti « temps réel ».

### États et seuils
- Définir pour chaque critère un seuil `min`/`max` et une marge d'hystérésis pour éviter le clignotement vert/rouge.
- Centraliser l'état dans un objet : `{ lighting, angle, stability, sharpness, framing }`, chacun avec `status` et `message`.
- Le déclencheur est activé si tous les `status` critiques valent `OK`.

---

## 7. Accessibilité et bonnes pratiques
- Messages courts, clairs et **un seul à la fois** (le plus prioritaire) pour ne pas noyer l'utilisateur.
- Indications par couleur **doublées d'un texte/icône** (ne pas se fier qu'à la couleur).
- Retour haptique (vibration) au moment de la capture.
- Toujours offrir un mode « prendre quand même » pour ne pas bloquer l'utilisateur en cas de cas limite.
- Demander la permission caméra avec une explication claire de l'usage.

---

## 8. Résumé

| Étape | Ce qui se passe |
|-------|-----------------|
| 1 | Ouverture du flux caméra |
| 2 | Analyse image par image (éclairage, angle, stabilité, netteté, cadrage) |
| 3 | Indicateurs live + guidage de l'utilisateur |
| 4 | Déclencheur activé quand tout est conforme |
| 5 | Capture (manuelle ou automatique) |
| 6 | Vérification finale + aperçu → valider / reprendre |

L'idée centrale : **vérifier avant de capturer**, pour garantir une photo exploitable du premier coup.
