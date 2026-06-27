# Cartes produit — update « Avis & header collapsible »

Update de la **carte produit** du reveal storytelling (`routine-storytelling.html`, deck jour/soir). Ajoute les **avis clients** sur la carte et un **header qui se réduit au scroll** pour gagner en lisibilité. Le reste de la page (intro, deck swipe, protocole) est inchangé — voir `storytelling-V2/`.

## Contenu du dossier
| Fichier | Rôle |
|---|---|
| `routine-storytelling.html` | La page complète, self-contained (HTML+CSS+JS). |
| `capture-face.jpg`, `logo-smartskin.png` | Visage (intro) + logo. |
| `prod-*.png` (×5) | Visuels des produits recommandés. |

Stack : Manrope, HTML/CSS/JS purs, **0 lib**.

---

## Anatomie de la carte (haut → bas)

```
┌─────────────────────────────┐
│  IMAGE PRODUIT  (collapsible)│ ← 180px en haut · 100px au scroll
├─────────────────────────────┤
│  Catégorie · Marque          │  ┐
│  Nom du produit              │  │ TOUJOURS VISIBLE
│  4.5 ★ · 38k avis            │  ┘ (note compacte, sous le titre)
│  ┌───────────────────────┐  │
│  │  ZONE SCROLLABLE       │  │
│  │  • Pourquoi on te le…  │  │
│  │  • Ce que disent les…  │  │
│  │  • Avis vérifiés (×5)  │  │
│  │            [fondu blanc]│  │ ← scrollbar en bas-droite
│  └───────────────────────┘  │
│  $18.99            ⏱ freq   │  ← foot (pas de ligne grise)
└─────────────────────────────┘
```

### Toujours visible (sous le titre)
**Note compacte** : `4.5` (gras) + **une** étoile dorée + `· 38k avis`. Pas besoin de scroller pour voir note + volume d'avis. Le compte est formaté (`38412 → 38k`).

### Zone scrollable (le « pourquoi » + les avis)
1. **Pourquoi on te le recommande** — la justification (gabarit ~350 car.).
2. **Ce que disent les clients** — synthèse IA (`customers_say`) + **chips d'aspects** (`Efficacité 2.7k`…) + mention *« Synthèse générée par IA à partir des avis »* (transparence imposée).
3. **Avis vérifiés** — jusqu'à **5 avis** : initiale + auteur + **badge « Vérifié »** + étoiles + **note chiffrée** (`5.0`) + date (à droite) + texte.

- **Fondu blanc** en bas (dégradé `transparent → #FFFFFF`, 42px) au lieu d'une ligne : signale « ça continue ».
- **Mini-scrollbar** en **bas à droite** de la zone scrollable (thumb proportionnel à la position de lecture).

---

## ⭐ Comportement clé : le header collapsible au scroll

C'est le point central de l'update.

- **En haut de la zone scrollable** : l'image produit est à **180px** (hero, bien visible).
- **Dès qu'on scrolle** : l'image **se réduit à 100px**, ce qui **agrandit la zone de lecture d'environ 80px** → avis et texte bien plus lisibles.
- **Quand on remonte tout en haut** : l'image **reprend 180px**.
- Transition douce **0.42s** (`cubic-bezier(.4,0,.2,1)`), l'image/flacon scale avec le conteneur.

**Implémentation :**
- CSS : `.card-img { height:180px; transition:height .42s … }` + `.swipe-card.scrolled .card-img { height:100px; }`.
- JS (dans `initScrollCue`, sur l'event `scroll` de `.card-scroll`) — toggle avec **hystérésis** (anti-clignotement) :
  ```js
  if (sc.scrollTop > 12) card.classList.add('scrolled');
  else if (sc.scrollTop < 4) card.classList.remove('scrolled');
  ```
- La carte est à **hauteur fixe** (`calc(100% - 30px)`) ; comme l'image est `flex-shrink:0`, réduire sa hauteur transfère l'espace à `.card-scroll` (`flex:1`).

---

## Données d'avis

Map **`REVIEWS`** (clé = `prod.name`) — démo sur les 5 produits recommandés. En prod = l'objet **`couche3`** du catalogue :
- `customers_say` (synthèse IA), `sentiment` (0–1), `aspects` ({nom: nb}), `reviews[]` (`author`, `rating`, `date`, `text`).
- Cf. `docs/donnees-avis-pour-design.md`.

Helpers JS : `stars5()`, `fmtN()` (102671→`103k`), `fmtDate()` (→ « mai 2026 »), `csBlock()`, `revBlock()`.

**États gérés** (cas-limites du doc) :
- Produit **sans entrée** (ex. les alternatives) → note + blocs **masqués**.
- `aspects` vide → chips masqués · `customers_say` absent → encart masqué · **0 à 5** avis.

## Notes runtime
- **Avis en EN** (Amazon US) ; ici mockés en **FR** pour la démo → décider traduire/non en prod.
- Brancher `REVIEWS` sur `couche3` du catalogue ; auteur (`author`) = re-scrape en cours côté data.
- « Voir tous les avis » → lien Amazon affilié (via `asin`).
- Mockup en cadre fixe → conteneur responsive `100dvh` pour la prod.
