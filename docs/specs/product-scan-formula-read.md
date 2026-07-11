# Scan produit — « Why 23 : the formula, read straight »

> Spec du bloc **check-list de formule** de l'écran de résultat du **scan produit**
> (prototype `product-scan-liquidglass/`). Décrit *comment* le bloc se construit et
> *d'où* viennent ses lignes. Version **v1 = indépendante du scan de visage**.

---

## 1. Ce que fait ce bloc (son job)

Rendre le **score du produit lisible et crédible** en montrant, en clair, **pourquoi**
il vaut ce qu'il vaut. Au lieu d'un « 23/100 » tombé du ciel, on affiche **les 3-4
ingrédients qui pèsent le plus** dans la note, chacun avec sa conséquence en français
simple.

Règle d'or : **on montre des RAISONS, jamais des points.** Un humain comprend
« parfum = irritant fréquent » ; il ne comprend pas « −18 ».

---

## 2. Principe : v1 **sans scan de visage**

Le bloc juge **la formule en elle-même**, pas « pour ta peau ». Avantages :

- **Zéro friction** : on scanne un produit et on a de la valeur tout de suite, même
  sans compte ni scan de visage (utilisable en magasin, dès la 1ʳᵉ fois).
- **Défendable** : chaque ligne repose sur un **fait d'ingrédient**, pas sur des
  données perso.
- La personnalisation (« pour TA peau ») devient une **couche ajoutée plus tard**
  (cf. §7), branchée sur le même moteur.

---

## 3. Les entrées (inputs)

| Entrée | D'où elle vient |
|---|---|
| **Liste INCI** du produit (les ingrédients) | Scan **code-barres** → base produits (ex. Open Beauty Facts) **ou** OCR de l'étiquette |
| **Base de référence des ingrédients** | Notre table interne : chaque ingrédient connu porte des **étiquettes** de risque/bénéfice (cf. §4) |

Aucune donnée utilisateur n'est nécessaire en v1.

---

## 4. Comment chaque ingrédient est classé

Pour chaque ingrédient de l'INCI, on le fait correspondre à notre base de référence,
qui porte des **étiquettes** :

- **Étiquettes de risque** : `fragrance/parfum`, `allergène` (les 26 allergènes UE),
  `comédogène` (note 0-5), `alcool asséchant`, `occlusif lourd`, etc.
- **Étiquettes de bénéfice** : `apaisant`, `antioxydant`, `humectant`,
  `réparateur de barrière`, etc.

Chaque ingrédient tombe alors dans **un des trois seaux** :

| Seau | Icône | Condition |
|---|---|---|
| **Watch out** | ✗ (rouge) | porte une étiquette de risque significative |
| **Good for you** | ✓ (vert) | porte un bénéfice réel, sans risque fort |
| **Neutral** | — | base / texture / stabilisant, pas de signal fort (eau, glycérine…) |

---

## 5. Comment on choisit les lignes affichées

On n'affiche **pas** les 20+ ingrédients — seulement **les plus impactants** :

1. **Pondération par position** — un ingrédient **haut dans la liste** INCI est présent
   en plus grande quantité → son signal pèse plus. C'est pourquoi on écrit
   « Alcohol — drying, **high up the ingredient list** » : la position fait le poids.
2. **Regroupement** — les ingrédients de même famille se fondent en une ligne
   (« Lanolin & beeswax », « Fragrance — 5 listed allergens »).
3. **Tri par impact** — on remonte les 3-4 plus lourds (les ✗ d'abord), plus 1 ✓
   pour rester honnête (« Calendula & chamomile — genuinely soothing »).

**Gabarit d'une ligne** : `{Ingrédient} — {ce qu'il fait / pourquoi il est signalé}`.
En v1, la conséquence est **générique** (« clog acne-prone skin »), pas personnelle.

---

## 6. Le lien avec le score

Le score **n'est pas séparé** de cette check-list : c'est **la même chose, vue de deux
façons**.

```
score = f( somme des risques pondérés  −  somme des bénéfices pondérés )  → 0..100
```

- La **check-list** = le visage lisible de ce calcul (les plus gros contributeurs).
- Bandes de couleur : **≥70 vert · 40-69 orange · <40 rouge**.

Donc « 23 » et « 3 lignes rouges lourdes + 1 verte » racontent **la même histoire** :
la check-list *est* la preuve du score.

> ⚠️ **Point YMYL / honnêteté** : la règle de pondération (combien coûte un parfum, un
> comédogène…) doit être **cohérente et documentée** — sinon on retombe sur le
> « chiffre au pif ». C'est de la logique back-end, à figer dans une table de poids.

---

## 7. La couche personnalisée (plus tard, pas en v1)

Quand l'utilisateur **a fait son scan de visage** + profil, on **re-pondère** le même
moteur :

- Un ingrédient `fragrance` reçoit une **pénalité plus forte** si l'utilisateur a
  déclaré une **sensibilité au parfum** ou montre de la **rougeur** au scan.
- La copie de la ligne gagne le lien perso : « — *feeds the redness you're calming* ».
- Le bloc « Best for / Avoid if » (générique en v1) devient « **For your skin : 23 ✗** ».

**Même moteur, poids personnels.** L'écran ne change pas de structure — juste les poids
et quelques mots.

---

## 8. Exemple concret — Weleda Skin Food (23/100)

| Ligne | Seau | Pourquoi |
|---|---|---|
| Fragrance | ✗ | 5 allergènes listés, irritant fréquent |
| Lanolin & beeswax | ✗ | occlusifs, bouchent les peaux à tendance acnéique |
| Alcohol | ✗ | asséchant, **haut** dans la liste |
| Calendula & chamomile | ✓ | réellement apaisants |

→ Synthèse générique : **Idéal pour** peau très sèche / corps · **À éviter si** peau
grasse, acnéique, sensible au parfum.

---

## 9. Données à réunir pour construire ça

1. **Produit → INCI** : source d'identification (base code-barres type Open Beauty
   Facts, complétée par OCR de l'étiquette quand le produit est absent).
2. **Base de référence ingrédients** : à amorcer depuis des sources publiques
   (listes de comédogénicité, les 26 allergènes UE, CosIng pour les fonctions), puis
   nos propres étiquettes de risque/bénéfice.
3. **Table de poids** : combien coûte chaque étiquette dans le score (§6).

---

## 10. Limites (à assumer)

- La **comédogénicité** est débattue (notes variables selon les sources) → à traiter
  comme un **signal**, pas une vérité absolue.
- La **sensibilité au parfum** varie d'une personne à l'autre → d'où l'intérêt de la
  couche perso (§7).
- C'est une **guidance cosmétique, pas un diagnostic médical** → garder le disclaimer.
