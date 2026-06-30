# Comment on choisit un produit (moteur de recommandation)

Référence simple de la logique de suggestion. État courant du moteur.
Code : `src/features/recommendation/` (orchestrateur `index.ts`, adéquation `fit.ts`,
filtres `engine.ts` + `medical-guard.ts`, profil `profile.ts`, choix IA `llm-choice.ts`).

---

## L'idée de base : 2 axes séparés

Une routine se construit sur **deux choses indépendantes** :

- **Le TYPE DE PEAU** (grasse · mixte · normale · sèche · sensible) → décide les **produits de base** (crème, nettoyant, SPF). C'est une question de **texture / hydratation**.
- **Les PROBLÈMES / besoins** (acné, points noirs, taches, rougeur, rides, déshydratation…) → décident les **soins ciblés** (traitement, sérum). C'est une question d'**actifs**.

> Exemple : peau **mixte + acné** → crèmes légères (mixte) **＋** un traitement anti-acné. Le « mixte » décide la base, l'« acné » décide le soin.

Le **type de peau** vient de l'analyse photo (`skinType`). Les **besoins** viennent des 16 attributs notés 1→4 (un attribut ≥ 2 devient un besoin gradué) + des priorités déclarées en question 1.

---

## Comment un produit est choisi, pour chaque étape (4 temps)

### 1. Sécurité — on élimine d'abord (filtre dur, jamais contournable)
On écarte d'office : grossesse / allaitement (produits non sûrs), peau sensible (produits non sûrs sensible), actif que l'utilisateur a déclaré mal tolérer (q2), produit trop irritant pour la tolérance de la peau, produit noté « négatif » pour ce type de peau. *(Plus aucun filtre prix : le budget a été retiré du produit.)*

### 2. Éligibilité — « ce produit a-t-il un sens pour CETTE personne ? »
La condition d'entrée dépend de l'étape :

| Étape | Condition d'entrée |
|---|---|
| **Crème jour / nuit** | bon **TYPE DE PEAU** (filtre dur) — une crème = hydratation adaptée à la peau, pas un soin ciblé |
| **Nettoyant · SPF · démaquillant** | adapté au type de peau (pas négatif) |
| **Soin ciblé / Traitement** | doit traiter un **BESOIN réel** ; aucun besoin traitable → **pas de soin ciblé** |
| **Sérum · Exfoliant · Masque** | si un besoin est présent → produits qui le visent ; sinon → entretien **doux** |

> C'est pour ça qu'une crème oil-free (peau grasse) ne sort **jamais** sur une peau sèche, même si elle « calme la rougeur » : la rougeur se traite par le **sérum/soin**, pas par la crème.

### 3. Classement par ADÉQUATION — *sans* popularité (`fitScore`)
Parmi les produits éligibles, on classe sur « à quel point ça colle à cette peau » :
1. **Couverture des besoins** — traite-t-il tes soucis, pondéré par leur gravité × importance ; *(terme dominant)*
2. **Intensité dosée** — la force du produit (`activeStrength`) doit coller à la sévérité du besoin, **plafonnée par la tolérance** (peau nette / sensible / débutante → doux ; problème sévère + peau tolérante/expérimentée → plus fort) ;
3. **Match du type de peau** (`skinTypes`) ;
4. **Type de peau** (avis-par-profil) + **preuve scientifique** (`evidenceLevel`).

👉 **Aucun signal de popularité ici** (ni note, ni nombre d'avis).

### 4. Popularité = départage seulement
Entre des produits **également adaptés** (même niveau d'adéquation), on prend le mieux noté / le plus d'avis. La popularité **ne fait jamais remonter** un produit moins adapté.

### 5. L'IA tranche (si clé Anthropic présente)
Sur la shortlist, **Claude** lit les **vrais avis clients** (`customers_say` + `aspects` : ex. « 26 mentions irritation ») et choisit le meilleur pour cette peau (drapeaux d'irritation pour une peau sensible…) + écrit le « pourquoi ». Sans clé → on garde le classement déterministe (étape 3-4), qui est déjà bon.

### 6. Réconciliation irritation (sécurité)
Plus aucun arbitrage de prix (le budget n'existe plus). On vérifie seulement que la **charge d'irritation cumulée** de la routine reste sous la tolérance de la peau ; si elle déborde, on échange le produit le plus irritant contre l'alternative plus douce de sa shortlist. Le prix reste affiché à titre **informatif**, jamais filtrant.

---

## En une phrase

> **Sécurité → on garde ce qui est ADAPTÉ (type de peau pour les bases, besoin pour les ciblés) → on classe par ADÉQUATION → la popularité départage → l'IA tranche avec les vrais avis → on vérifie la charge d'irritation.**

---

## Données qui pilotent tout ça (catalogue `data/catalog-final.json`)

| Champ | Rôle |
|---|---|
| `category` | l'étape (nettoyant, hydratant, serum, traitement, exfoliant…) |
| `skinTypes` | type(s) de peau du produit. **Crèmes = 1 seul type** (gel→grasse, riche→sèche…) pour que la crème colle à la peau. |
| `targets` | les besoins/concerns que le produit traite |
| `activeStrength` (1-4) | la force de l'actif → pour l'intensité dosée |
| `irritationCost`, `unsafePregnancy`, `unsafeSensitive` | sécurité |
| `couche3.byProfile` | avis « positif/caution/négatif » par type de peau |
| `couche3.customers_say` + `aspects` | ce que disent les vrais clients → l'IA + l'affichage |
| `rating`, `reviews` | popularité → **uniquement le départage** |
