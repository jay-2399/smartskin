# Enrichissement du catalogue — crèmes de nuit

> **Statut :** recommandation (à exécuter). Rédigé le 2026-06-25.
> **Périmètre :** catégorie `hydratant` du catalogue (`data/catalog-final.json`).
> **Origine :** discussion V1 sur le modèle « 2 crèmes distinctes » (jour léger / nuit riche).

---

## 1. Le problème

Le moteur impose **2 crèmes distinctes** dans la routine (crème jour légère + crème nuit riche),
mais le catalogue ne contient que **15 hydratants au total** pour remplir **les deux** créneaux,
**tous profils confondus** (5 types de peau × sensibilité × grossesse).

Deux faiblesses identifiées :

1. **Volume insuffisant.** Toutes les autres catégories remplissent **1 créneau** ; l'hydratant en
   remplit **2**. C'est donc la catégorie qui devrait être la **plus grosse**, et elle est dans la moyenne.
2. **Classification « riche = nuit » bancale.** Le code sépare jour/nuit par **mots-clés dans le nom**
   (`cream`, `repair`, `rich`…). Mais une CeraVe / Cetaphil / Vanicream est un hydratant **passe-partout**,
   pas une crème **formulée pour la nuit**. On *fait passer* des crèmes de jour pour des crèmes de nuit
   → risque de crédibilité pour un utilisateur averti.

---

## 2. La base dermatologique (pourquoi 2 crèmes)

Position dermato dominante = **deux produits distincts**, car ils font deux boulots différents :
jour = **protéger** (texture légère, compatible SPF) ; nuit = **réparer** (riche, peptides, occlusion).

- **Cleveland Clinic** (centre médical académique, source neutre), Dr Melissa Piliang :
  *« Day and night creams differ in what they are supposed to do for your skin »* — la crème de nuit
  est faite pour *« pénétrer plus profond pour réparer »*. Elle **recommande deux produits distincts**.
- Le « une seule crème suffit » existe mais comme **repli toléré**, jamais comme idéal recommandé.

**Conséquence :** garder 2 crèmes est le bon choix produit *à condition* que le créneau nuit soit rempli
par de **vraies crèmes de nuit**, pas des hydratants génériques relabellisés.

Sources :
- https://health.clevelandclinic.org/day-or-night-what-to-look-for-in-a-facial-cream (la plus neutre)
- https://health.clevelandclinic.org/proper-skin-care-product-order
- https://anjalimd.com/blogs/bright-blog/do-you-really-need-a-different-moisturizer-during-the-day-and-night

---

## 3. Combien de crèmes de nuit — le raisonnement

Le nombre n'est **pas** « X par type de peau » à plat. Il se dimensionne pour **garantir une shortlist
de 3 candidates valides dans le cas le plus filtré**.

### 3.1 Ce qui fragmente le vivier nuit (2 axes simultanés)

- **Texture.** Une crème de nuit très riche (karité, occlusive) est souvent **byProfile négatif pour une
  peau grasse** (trop lourde → comédons). Le **pôle « riche »** et le **pôle « léger-nuit »** sont donc
  **deux sous-viviers quasi étanches**.
- **Filtres sécurité.** Sur chaque pôle, il faut encore des options **sans parfum** (peau sensible)
  **ET** **grossesse-safe**.

### 3.2 Le cas qui vide tout

**Grasse + sensible + grossesse** (et symétriquement **sèche + sensible + grossesse**). Pour garder **3**
candidates là, il faut **3 crèmes qui sont à la fois : bon pôle texture + sans parfum + grossesse-safe**,
**sur chaque pôle**.

> **Règle de curation (la vraie garantie, plus que le chiffre d'affiche) :**
> **≥ 4-5 crèmes sans parfum + grossesse-safe sur le pôle léger-nuit**, et **idem sur le pôle riche-nuit**.

### 3.3 « Survivre » ≠ « bien recommander »

Si exactement 3 survivent, le moteur n'a **aucun choix** : il montre les 3 restantes, qualité ou pas.
Or la valeur de l'app = « on a choisi **la meilleure** ». Il faut donc un vivier survivant **> 3** sur les
profils durs, pour que le scoring ait de quoi trancher. → **marge nécessaire au-dessus du plancher.**

### 3.4 Le chiffre

| Niveau | Vivier nuit | Ce que ça donne |
|---|---|---|
| **Plancher** | **12** | 3-en-profondeur partout, *seulement si* parfaitement curé sur l'intersection dure — **zéro marge** |
| **Confortable (cible)** | **~15** | couverture 3-en-profondeur **+** marge de qualité sur les profils durs |
| **Plafond utile** | **~16** | au-delà = gaspillage (l'app n'affiche que 3) |

**Point de départ :** ~4-5 crèmes déjà utilisables comme crèmes de nuit dans le catalogue actuel
(First Aid Ultra Repair, Drunk Elephant Lala Retro, Weleda Skin Food, Kiehl's Ultra Facial,
+ LRP Toleriane / Avène Tolerance côté sensible).

> ### ➜ Recommandation : viser **~15 crèmes de nuit**, soit **ajouter ~10**.

---

## 4. Répartition des ~10 à ajouter (segments, avec recouvrement)

| Segment nuit | À couvrir | Sert aussi | Actifs attendus |
|---|---|---|---|
| **Sensible / réactif** | sans parfum, apaisant | grossesse-safe + sèche | céramides, centella/cica, panthénol |
| **Sec / très sec** (pôle riche) | riche occlusif | normale | karité, squalane, céramides, glycérine |
| **Gras / mixte** (pôle léger-nuit) | nourrissant mais **non comédogène**, plus léger | — | niacinamide, HA, céramides légères |
| **Anti-âge / mature** | réparation nocturne | normale, sèche | **peptides**, niacinamide *(pas de rétinol — voir ci-dessous)* |

**Objectif de structure final :** ≥ 4-5 sans parfum + grossesse-safe **par pôle de texture** (léger / riche).

### Garde-fous
- **Pas de rétinol dans la catégorie hydratant.** Le rétinol reste dans `traitement` (et est filtré en
  grossesse). On garde ainsi le **vivier nuit grossesse-safe par défaut** → le filtre grossesse ne le vide
  presque pas.
- Privilégier des crèmes **réellement différenciées « nuit »** (peptides, occlusion plus riche, apaisant
  ciblé), pour ne pas re-proposer une crème basique déjà vue le jour.

---

## 5. Prérequis technique — taguer jour/nuit dans le catalogue

Aujourd'hui la coupe jour/nuit est **devinée par regex sur le nom** (`splitCreams` dans
`src/features/recommendation/engine.ts`). Fragile. À remplacer par une **donnée explicite**.

Ajouter un champ sur chaque produit `hydratant` du catalogue :

```jsonc
{
  // ... champs existants ...
  "moment": "jour" | "nuit" | "both"   // créneau visé
  // (option : "texture": "legere" | "riche" pour affiner le scoring)
}
```

Puis `splitCreams` lit `moment`/`texture` au lieu de la regex → coupe **fiable et auditable**.

---

## 6. L'arbitrage à valider consciemment

À **~15 nuit + ~10 jour**, l'hydratant devient **~25 produits = la plus grosse catégorie de loin**
(≈ 18 % d'un catalogue de 140).

- **Défendable** : seule catégorie en *double service* (jour+nuit) ET la plus fragmentée aux filtres.
- **Mais** c'est un choix assumé de déséquilibrer le catalogue en faveur de l'hydratant.

---

## 7. Prochaines étapes

1. **Brief de sourcing** des ~10 crèmes de nuit (segment par segment, avec critères : sans parfum,
   grossesse-safe, actifs attendus, fourchette de prix, marques candidates).
2. **Spec du champ `moment`/`texture`** + mise à jour de `splitCreams` pour lire la donnée au lieu de la regex.
3. Re-vérifier en navigateur qu'après enrichissement, **chaque profil dur** (grasse-sensible-enceinte,
   sèche-sensible-enceinte) obtient bien **3 crèmes de nuit** distinctes.
