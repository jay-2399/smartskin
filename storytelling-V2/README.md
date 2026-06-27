# Storytelling V2 — reveal de la routine

Écran qui **raconte** la routine après l'analyse : une intro d'anticipation, puis le **reveal produit par produit** (jour, puis soir), avec produits **swappables** et justification « pourquoi on te le recommande ».

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `routine-storytelling.html` | L'écran complet — self-contained (HTML + CSS + JS). |
| `capture-face.jpg` | Photo du scan (médaillon de l'intro). |
| `logo-smartskin.png` | Logo. |
| `prod-effaclar / niacinamide / typology / dralthea / paula .png` | Visuels des **produits recommandés** (1er choix de chaque étape). Les alternatives retombent sur une icône flacon. |

## Stack
Manrope (Google Fonts), HTML/CSS/JS purs, animations CSS. Aucune lib. **Tout est en Manrope** (`--fd` et `--fm`).

---

## 1. L'intro (anticipation · « skin → selection »)

Séquence de ~10 s, non skippable, puis dissolution vers le deck :

- **Médaillon visage** (langage face-reveal) : photo dans un cercle + **mesh facial connecté** (lignes de triangulation + nœuds) + un **balayage de scan** qui descend → lit clairement « analyse de ta peau ».
- **Phase 1** : *« Lecture de ton diagnostic… »*, un **compteur** défile (2 000+ produits analysés).
- **Phase 2** : *« On associe les produits à ta peau… »* → **4 cartes catégorie** (Cleanse · Exfoliate · Vitamin C · Moisturize) se **matérialisent** une par une.
- **Fin** : pastille verte ✓ **« Sélection prête »** + **« 9 · produits retenus pour toi »**.

Hiérarchie : **visage = hero** → cartes = le résultat → statut + compteur = support (volontairement discret).

## 2. Le deck (le reveal de la routine)

- **Jour puis soir** : on déroule la routine du matin, un **interstitiel** (*« Routine du jour validée → Passons à ta routine du soir »*), puis la routine du soir.
- Chaque **étape** (Nettoyant, Sérum, Crème, Exfoliant…) a :
  - un **produit recommandé** (1er de la liste) avec sa justification **« Pourquoi on te le recommande »**,
  - des **alternatives swappables** (3 autres options par étape, prix affichés),
  - la **posologie** (fréquence + mode d'emploi).
- Une **tray « Ta sélection »** récapitule les produits retenus + liens **affiliés** vers les marques.

### Gabarit du texte « Pourquoi on te le recommande »
~**350 caractères / 3 phrases**, structure : *diagnostic ciblé → actif/mécanisme → bénéfice*. (Ex. Effaclar = 351 car.) À respecter pour tous les produits (cohérence + tenue dans la carte).

## 3. Avis & « Ce que disent les clients » (sur la carte produit)

En **scrollant** la carte, après le « Pourquoi on te le recommande » :

- **Note + nombre d'avis** : affichés **sans scroller** (sous le titre, comme élément de tête) → 5 étoiles + `4.5` + `38k avis`.
- **« Ce que disent les clients »** : synthèse IA (`customers_say`) + **chips d'aspects** (`aspects`, ex. `Efficacité 2.7k`) + mention obligatoire *« Synthèse générée par IA à partir des avis »*.
- **Avis vérifiés** : liste de vrais avis — initiale + auteur + **badge « Vérifié »** + étoiles + date + texte.

**Données** : map `REVIEWS` (clé = `prod.name`) en démo. En prod = l'objet **`couche3`** du catalogue (`customers_say`, `sentiment`, `aspects`, `reviews[]` avec `author`/`rating`/`date`/`text`) — cf. `docs/donnees-avis-pour-design.md`. Les **avis sont en EN** (Amazon US) ; ici mockés en FR pour la démo (décider traduire/non en prod).
**États gérés** : produit sans entrée → note + blocs **masqués** (les alternatives sans data n'affichent rien) ; `aspects` vide → chips masqués ; `customers_say` absent → encart masqué ; 0 à 5 avis.

---

## Données (dans le `<script>`)
- **`REVIEWS`** : map des avis par produit (démo) → en prod, l'objet `couche3` du catalogue ; helpers `stars5()`, `fmtN()`, `fmtDate()`, `csBlock()`, `revBlock()`.
- Listes d'options par étape : `CLEANSER`, `SERUM_NIA`, `SERUM_HYDRA`, `CREAM`, `EXFO` (chaque entrée : `brand`, `name`, `price`, `p`, `img?`, `why?`, `freq?`).
- `ROUTINE = { day:[…4 étapes], night:[…4 étapes] }` — chaque étape pointe vers une liste d'options ; `withWhy()` injecte la justification sur l'option recommandée.
- `STATE` : ce que l'user a coché/swappé par routine.

---

## ⚠️ Le « 9 produits » — à aligner en prod

L'intro annonce **« 9 produits retenus »** = le **protocole complet** (routine de jour + routine de soir + SPF). Aujourd'hui le deck est câblé sur **jour (4 étapes) + soir (4 étapes)** avec des recouvrements (le nettoyant/sérum/crème sont communs) + le SPF mentionné → ~9 produits-instances.
→ En prod : **brancher le deck sur le vrai protocole (9 produits) issu du catalogue**, et vérifier que le **compteur de l'intro = le nombre réel** de produits du protocole. (Le « 9 » est en dur dans le JS : `num.textContent = '9'`.)

## Autres notes runtime
- **Produits & images** : remplacer les listes d'options + les `prod-*.png` par les vrais produits du **catalogue** (`asin`, `price`, `img`, `frequency`…). Les alternatives sans image retombent sur l'icône flacon.
- **« Why »** : généré par produit (LLM), gabarit ~350 car.
- **Liens d'achat** : via l'`asin` du catalogue (affiliation).
- **Langue** : FR ici ; le reste du funnel récent est passé en EN → à harmoniser si besoin.
- Mockup en cadre fixe → passer le conteneur en responsive `100dvh` pour la prod.
