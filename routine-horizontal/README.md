# Routine — carte produit en carrousel horizontal (3 vues)

Variante de la carte produit du deck storytelling (`routine-storytelling.html`). Au lieu d'un **scroll vertical** unique, chaque carte produit est un **carrousel horizontal de 3 vues**, avec un **indicateur en pill**. Le geste « Tinder » (garder/changer) est préservé. Le reste de la page (intro, deck jour/soir, protocole) est identique aux autres versions.

## Contenu du dossier
| Fichier | Rôle |
|---|---|
| `routine-storytelling.html` | Page complète, self-contained (HTML+CSS+JS). |
| `capture-face.jpg`, `logo-smartskin.png` | Visage (intro) + logo. |
| `prod-*.png` (×5) | Visuels des produits recommandés. |

Stack : Manrope, HTML/CSS/JS purs, **0 lib**.

---

## Les 3 vues de la carte

Chaque carte produit = un **pager horizontal** (`.card-pager`) de panneaux pleine largeur (`.card-pane`) :

1. **Cover** — image (en grand) + catégorie · marque + titre + note (`4.5 ★ · 38k avis`) + prix.
2. **Pourquoi on vous le recommande** — la justification (centrée).
3. **Ce que disent les clients** — synthèse IA + chips d'aspects + **avis vérifiés** (scroll vertical si long).

> Les **alternatives** (produits sans données d'avis) n'ont que **2 vues** (cover + pourquoi) → 2 points.

### Indicateur (pill)
En bas de la carte, `.card-dots` : des points dans le bleu de la charte ; le point de la **vue active s'élargit en pill** (`width:40px`), les autres restent des points (6px). Tappables pour sauter à une vue.

---

## ⭐ Modèle de gestes (le point délicat)

Une carte n'a que **2 axes**. Le glissé horizontal sert au **like/dislike** (Tinder) — donc on **ne peut pas** aussi naviguer les vues au glissé horizontal (même axe = conflit). On distingue donc les gestes par **leur nature : taper ≠ glisser** (modèle exact de Tinder pour ses photos) :

| Geste | Action |
|---|---|
| **Glisser la carte** (mouvement horizontal) | **Décider** : like (droite) / dislike (gauche), avec stamps ♥/✗ — seuil ±95px |
| **Taper** un **côté** de la carte (sans bouger) | **Changer de vue** : côté droit = suivante, gauche = précédente |
| **Tap sur un point** | Aller directement à cette vue |
| **Glissé vertical** | Scroll natif du contenu (panneau Avis) |
| Boutons ♥ / ✗ | Décision aussi (avec l'animation de fling) |

**Pourquoi tap et pas swipe pour les vues ?** Un *scroll* et un *swipe* partagent le même axe horizontal → impossible de les séparer de façon fiable (la détection par vélocité est trop fragile). Le **tap** (aucun mouvement) vs le **glissé** (mouvement) sont en revanche **non ambigus**.

### Implémentation (JS, fonction `attachCard`)
- Position des vues via `transform: translateX(-panel*100%)` sur `.card-pager` (`overflow:hidden`, pas de scroll natif) — `go(i)` anime + met à jour la pill.
- Sur `pointerup` : si **aucun mouvement** (`|dx|,|dy| < 8`) → tap → change de vue selon le côté ; sinon si **glissé > 95px** → `decide()` ; sinon retour.
- `touch-action:pan-y` sur la carte → le vertical scrolle nativement (avis), l'horizontal va au handler.
- Couvre souris **et** tactile (Pointer Events).

---

## Données (avis)
Map `REVIEWS` (clé = `prod.name`) en démo. En prod = l'objet **`couche3`** du catalogue (`customers_say`, `sentiment`, `aspects`, `reviews[]`) — cf. `docs/donnees-avis-pour-design.md`. Helpers : `stars5`, `fmtN`, `fmtDate`, `csBlock`, `revBlock`. Avis en EN (Amazon US) → ici mockés en FR.

## Notes runtime / iOS
- **Tester le ressenti sur un vrai iPhone** (ou en émulation tactile) — le drag/scroll/inertie ne se juge pas à la souris.
- **Swipe depuis le bord gauche** = « retour » de Safari : à neutraliser en web-app plein écran (`overscroll-behavior`, marge de sécurité).
- Cadre fixe (mockup) → conteneur responsive `100dvh` pour la prod.
- Brancher `REVIEWS` sur le catalogue ; produits/images réels via le protocole.
- Affordance possible si « taper les côtés » n'est pas assez évident : petits chevrons ‹ › sur les bords, ou micro-animation au 1ᵉʳ affichage.
