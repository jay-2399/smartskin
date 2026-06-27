# Avis & « Customers say » — données pour l'intégration UX/UI

> **Pour qui :** designer UX/UI.
> **But :** décrire **les données d'avis disponibles par produit** et **leur forme exacte**, pour concevoir les composants (note globale + bloc « ce que disent les clients » + liste d'avis).
> **Où vivent ces données :** dans le catalogue produit (`catalog-final.json`). Tout arrive avec la fiche produit — rien à aller chercher ailleurs côté front.

---

## 1. Vue d'ensemble : 3 éléments

| Élément | C'est quoi | Niveau dans la donnée | Usage UI typique |
|---|---|---|---|
| **0. Note globale** | La **note moyenne** (ex. 4.8★) + le **nombre total d'avis** (ex. 102 671) | **racine du produit** | L'en-tête « 4.8 ★ · 102k avis » |
| **A. « Customers say »** | Une **synthèse IA** + des **aspects** chiffrés + un score de sentiment | `couche3` | Un encart résumé |
| **B. Avis individuels** | Jusqu'à **5 vrais avis** (auteur, note, date, commentaire) | `couche3` | Une liste de cartes |

> ⚠️ **Piège de nommage à connaître :** au niveau **produit**, le champ `reviews` = **un NOMBRE** (le total d'avis). Dans `couche3`, la liste des avis s'appelle **`reviews`** (un TABLEAU). Ce sont **deux choses différentes** — ne pas les confondre.

---

## 2. Schéma des données (ce que le front reçoit)

```jsonc
{
  // ─────── NIVEAU 0 : note globale (racine du produit) ───────
  "rating": 4.8,                  // note moyenne /5
  "reviews": 102671,              // NOMBRE total d'avis

  "couche3": {

    // ─────── BLOC A : « Customers say » ───────
    "customers_say": "Customers find this facial cleanser effective, particularly for oily skin…",
    "sentiment": 0.86,            // 0 → 1  (part de positif ; sert à un badge/indicateur)
    "aspects": {                  // aspect → nombre de mentions (pour des "chips")
      "Effectiveness": 2700, "Skin compatibility": 1800, "Gentle": 646,
      "Moisturizing": 547, "Value for money": 467, "Ease of removal": 290
    },

    // ─────── BLOC B : avis individuels (0 à 5) ───────
    "reviews": [
      {
        "author": "Sarah M.",                 // nom/pseudo de l'auteur
        "rating": 5,                           // note de CET avis, /5
        "verified": true,                      // achat vérifié → badge "✓ Vérifié"
        "date": "2026-05-04",                  // date (ISO AAAA-MM-JJ)
        "text": "Been using this CeraVe foaming cleanser daily for months…"
      }
      // … jusqu'à 5 objets
    ]
  }
}
```

---

## 3. Détail des champs

### Niveau 0 — Note globale (racine du produit)

| Champ | Type | Description | Peut être vide ? |
|---|---|---|---|
| `rating` | nombre `0–5` | Note moyenne du produit (1 décimale). Ex. `4.8` | Non |
| `reviews` | entier | **Nombre total** d'avis. Ex. `102671` → afficher « 102k » | Non |

### Bloc A — « Customers say »

| Champ | Type | Description | Peut être vide ? |
|---|---|---|---|
| `customers_say` | texte | Résumé des avis généré par IA (~30-60 mots) | Rare, mais oui |
| `sentiment` | nombre `0–1` | Score de positivité global. Ex. `0.86` = très positif | Non |
| `aspects` | objet `{nom: nombre}` | Thèmes les plus cités + nb de mentions → **chips**. Montrer **4 à 6 max**, triés décroissant | Parfois `{}` |

### Bloc B — un avis (`reviews[i]`)

| Champ | Type | Description | Peut être vide ? |
|---|---|---|---|
| `author` | texte | Auteur, style Amazon : **« Sarah M. »** (prénom + initiale). Parfois « Amazon Customer » | Rare |
| `rating` | entier `1–5` | Note en étoiles **de cet avis** | Non |
| `verified` | booléen | Achat vérifié → afficher le badge **« ✓ Vérifié »** | Non (défaut `false`) |
| `date` | texte `AAAA-MM-JJ` | Date de l'avis | Non |
| `text` | texte | Le commentaire. **Longueur très variable** (1 ligne à 1 paragraphe) | Non |

> **Champs bonus disponibles via l'API** (non inclus par défaut, à demander si le design en a besoin) : **titre de l'avis** (`review_header`), **votes « utile »** (`helpful_count`), **pays**, badge **Amazon Vine**, et la **répartition des étoiles du produit** (`5★ : 68 000, 4★ : 18 000…` → pour un graphe de distribution de notes).

---

## 4. Exemple complet réel (CeraVe Foaming Facial Cleanser)

```jsonc
{
  "rating": 4.8,
  "reviews": 102671,
  "couche3": {
    "customers_say": "Customers find this facial cleanser effective, particularly for oily skin, and appreciate that it doesn't dry out their skin while leaving it smooth and hydrated. It is gentle and removes makeup well.",
    "sentiment": 0.86,
    "aspects": {
      "Effectiveness": 2700, "Skin compatibility": 1800, "Gentle": 646,
      "Moisturizing": 547, "Value for money": 467, "Ease of removal": 290
    },
    "reviews": [
      { "author": "Sarah M.", "rating": 5, "verified": true, "date": "2026-05-04",
        "text": "Been using this CeraVe foaming cleanser daily for months and my skin has never looked better. It removes oil without stripping." },
      { "author": "James T.", "rating": 5, "verified": true, "date": "2026-06-17",
        "text": "I searched a long time to find the right cleanser for my sensitive skin. This one is gentle and never leaves it tight." },
      { "author": "Priya K.", "rating": 4, "verified": false, "date": "2026-04-02",
        "text": "Great everyday cleanser, foams nicely. Took off one star because the pump can be a bit much." }
    ]
  }
}
```

---

## 5. Suggestions de présentation (pistes, libre au designer)

**En-tête (Niveau 0)**
- **`rating` en étoiles** (4.8 ★★★★★) + **`reviews` formaté** (« 102k avis »). C'est le bandeau de réassurance en haut de la section.

**Bloc A — encart « Ce que disent les clients »**
- Un **paragraphe** = `customers_say`.
- Une rangée de **chips d'aspects** (`aspects`), ex. `Efficace 2.7k` · `Doux 646` (formater : `2700 → 2.7k`).
- Un **indicateur de sentiment** (optionnel) dérivé de `sentiment` : barre, %, ou pastille (`0.86` → « 86 % positif »).
- ⚠️ **Mention de transparence obligatoire** : *« Synthèse générée par IA à partir des avis clients »*.

**Bloc B — liste d'avis**
- Carte = **initiale/avatar + `author`** · **`rating` en étoiles** · **`date`** · **`text`**.
- Prévoir la **troncature** du `text` long (« voir plus »).
- **Lien sortant** « Voir tous les avis » → page Amazon (lien d'affiliation).

---

## 6. Cas limites à designer (important)

- **Nombre d'avis affichés : 0 à 5.** Prévoir l'**état vide** (produit sans avis) + les états 1 à 5.
- **`customers_say` parfois absent** → masquer le Bloc A.
- **`aspects` parfois `{}`** → masquer la rangée de chips.
- **Longueur du `text` très variable** → la carte doit encaisser 1 ligne comme 8 lignes.
- **Langue : les avis sont en anglais** (Amazon US). Décider : afficher tel quel, ou traduire.
- **`author` parfois générique** (« Amazon Customer ») → fallback d'avatar (initiale/icône).

---

## 7. État de la donnée (transparence)

| Donnée | Statut actuel |
|---|---|
| `rating` + `reviews` (note globale + nombre) | ✅ **155 / 155** |
| `customers_say` + `aspects` + `sentiment` | ✅ **155 / 155** |
| `couche3.reviews` : **5 avis** avec `author` + `rating` + `verified` + `date` + `text` | ✅ **155 / 155** (775 avis, tous champs remplis) |

> ✅ **Données complètes — le catalogue (`catalog-final.json`) contient 100 % de ce que la carte affiche.** Le design **et** l'intégration peuvent partir dessus directement.
