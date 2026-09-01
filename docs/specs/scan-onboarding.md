# SmartSkin — Structure funnel : scan produit en tête & essai gratuit dans l'onboarding

> **Statut : structure figée le 2026-07-28.** Document de référence pour tout travail d'écran, de spec ou d'implémentation sur l'app iOS.
> Source : session de cadrage du 28-29 juillet 2026 (`02c916c4`). Complète — sans la remplacer — la spec fonctionnelle du scan produit : [`2026-07-09-scan-produit-design.md`](./2026-07-09-scan-produit-design.md).
> Pages de référence visuelles : [Jobs & journeys](https://claude.ai/code/artifact/3fe9bd1a-1435-45cc-ad55-d4e8fe4a0077) · [Storyboard 15 vignettes](https://claude.ai/code/artifact/581526d5-1ab2-41a1-b49d-57aafb4fd672)

---

## 1. Le changement de fond

L'app ne s'ouvre plus sur le face scan mais sur le **scan produit**. Ce n'est pas un déplacement de bouton : le scan gratuit devient le moteur d'acquisition, et le bilan de peau devient ce qu'il débloque.

La boucle, pièce par pièce — c'est son verrouillage qui fait la valeur du modèle :

```
scan gratuit (volume)
   → chaque scan pose la question « et pour TA peau ? »
      → la réponse exige le bilan (payant)
         → le bilan rend chaque scan futur personnalisé
            → le cooldown de 10 jours fait revenir
               → le contenu TikTok se fabrique à partir des scans
                  → ramène du volume
```

Aucune pièce morte dans le système. La réponse à « pourquoi pas Yuka ? » est structurelle : **Yuka note le produit, SmartSkin note le produit *pour cette peau-là***. Différence de nature, visible en un écran, et bouclier juridique en contenu.

---

## 2. Modèle utilisateur : 2 jobs, 3 curseurs

**Pas de personas.** Ils ont été explicitement rejetés (inventés, non fondés sur de la donnée). Le modèle repose sur :

**Les 2 jobs**
1. « Ce produit vaut quoi ? » — job d'évaluation, immédiat, récurrent.
2. « Pourquoi ma peau fait ça ? » — job de compréhension, profond, monétisable.

**Les 3 curseurs de conception** (chaque écran se règle dessus plutôt que de viser un persona)
- **Expertise** — du novice à celle qui lit les INCI.
- **Charge émotionnelle** — de la curiosité au vécu douloureux.
- **Méfiance commerciale** — de la confiance à l'échaudée qui flaire le placement de produit.

Exigence transversale héritée de l'ancien persona « experte » : **chaque score doit être justifiable à un tap** (écran méthode E1).

---

## 3. La structure du funnel

```
                        ACCUEIL MONO-BOUTON
                        « Scan a product »
                   (+ ligne discrète : « ou commence
                      par ton bilan de peau »)
                               │
                          scan + analyse
                               │
                    ┌──── FORK PRÉ-REVEAL ────┐
                    │   (avant le résultat)    │
                    ▼                          ▼
          RÉSULTAT SIMPLE                COMPLET + PERSONNALISÉ
             (gratuit)                        PAR L'IA
                    │                          │
      score de formule honnête        promesse → quiz q1–q7
      + carte verrouillée             → capture visage
      « Bon produit.                  → création de compte
        Mais pour ta peau ? »         → PAYWALL StoreKit
                    │                          │
      scans récurrents gratuits       → DOUBLE SCORE dans la seconde
      (cache par produit)             → bilan + routine
                                      → réévaluation rétroactive
```

### L'accueil
Un seul bouton, « Scan a product ». Une ligne discrète en dessous — « ou commence par ton bilan de peau » — sert le trafic venu du face-reveal TikTok (l'attribution est perdue à l'install, le flow ne doit pas en dépendre).

### Le fork pré-reveal — la pièce centrale
Après le scan et l'analyse, **avant** d'afficher le résultat, deux voies sont présentées honnêtement : « Résultat simple » ou « Complet + personnalisé par l'IA ». Un tap, visibilité réelle des deux options, **zéro dark pattern** (l'anti-pattern du fork dark-patterné est documenté dans le storyboard).

### La branche gratuite
- Score de **formule** : utile, réel, mais structurellement incomplet.
- **Carte verrouillée sur chaque résultat** : « Bon produit. Mais pour ta peau ? » — la surface d'upsell la plus vue de l'app.
- Scans récurrents gratuits, **à vie**, avec cache par produit identifié.
- **Zéro compte** sur toute cette branche, à vie.
- Règle de rythme : **30 secondes maximum**. C'est de l'utilité immédiate, elle ne se dilue pas.

### La branche IA
Promesse du bilan → quiz q1–q7 → capture visage → création de compte → paywall. Contrairement à la branche gratuite, **elle doit être longue** : c'est un tunnel de persuasion (voir §6).

---

## 4. L'essai gratuit et la monétisation

**L'essai gratuit est géré par Apple**, pas par l'app : c'est un *introductory offer* StoreKit. (L'idée initiale de « 3 scans offerts avec le face scan » a été abandonnée au profit de ce mécanisme natif.)

| Offre | Prix | Rôle |
|---|---|---|
| Essai | **7 jours gratuits** (introductory offer) | porte d'entrée |
| Hebdomadaire | **3,99 $/semaine** (≈ 3,39 $ nets) | **ancre de prix** |
| **Annuel** | **39,90 $/an** (≈ 33,90 $ nets à 15 %) | **l'offre phare**, présélectionnée « Best value » |

Modèle **annuel-dominant assumé** (décision du 25/08/2026 : l'annuel REMPLACE le lifetime — un abonnement récurrent porte la LTV et finance le coût d'analyse dans la durée, ce qu'un non-consommable à 29,90 $ ne fait pas). L'essai 7 jours est porté par l'hebdo ; EXP-3 testera l'essai sur l'annuel aussi.

**La règle absolue — la preuve arrive dans la seconde.** Juste après l'engagement, l'app affiche le **double score sur le produit scanné à l'origine** (« Formule 74 · Pour ta peau 38 »), puis le bilan et la routine, puis la **réévaluation rétroactive de tous les scans passés**. Le paiement doit être immédiatement payé de retour, sur l'objet précis qui a motivé la venue.

---

## 5. Le compte : un seul point, au bon endroit

Ce qui exige réellement un compte, plutôt que de l'imposer par habitude :
- Le **paiement** n'en a pas besoin (StoreKit attache l'achat à l'Apple ID, restauration comprise).
- Les **scans gratuits** n'en ont pas besoin (historique local).
- Le **bilan de peau**, si : il doit survivre à une réinstallation et à un changement d'iPhone (une abonnée qui perd son profil = remboursement + avis 1 étoile), il faut un email pour le réengagement, et c'est ce qui rend le cooldown incontournable.

→ **Le compte apparaît une seule fois : branche IA, après la capture, juste avant le paywall** (écran **B3.5**). Sign in with Apple / Google, deux taps, cadré « sauvegarde ton bilan ».

Avantage stratégique de ce placement : **celle qui abandonne au paywall a déjà un compte**. Ce n'est pas une perte, c'est un lead avec un email et un bilan en attente — le pool de winback (« ton bilan t'attend »). Après le paiement, chaque abandon serait anonyme et définitif.

*Conformité : Sign in with Apple obligatoire (App Store guideline 4.8) dès lors qu'un autre login social est proposé. Suppression de compte obligatoire en réglages.*

---

## 6. L'onboarding de la branche IA : long, parce que long convertit

Décision corrigée en séance (EXP-4 était initialement écrit à l'envers). Les données de l'industrie (State of Subscription Apps de RevenueCat, lignage Noom → Flo → Cal AI) montrent que **les onboardings longs convertissent mieux**. Trois mécanismes réels :

1. **L'investissement engage** — chaque question répondue est un micro-oui ; au paywall, abandonner reviendrait à jeter cinq minutes de soi.
2. **L'onboarding EST l'argumentaire** — chaque écran fait monter la valeur perçue. Le paywall ne vend plus rien : tout est déjà vendu quand il arrive.
3. **Effet de sélection** — un flow long filtre les touristes. D'où la règle de mesure : on juge **en bout-en-bout** (essais démarrés / installs), jamais sur la complétion d'étape.

**La longueur appartient à la branche B uniquement.** La structure à deux branches est précisément ce qui permet d'avoir les deux régimes : 30 secondes sur le scan, tunnel long sur l'IA.

Contenu des écrans ajoutés — du travail, pas du remplissage (*purposeful length*) :
- écrans de valeur (« voici les 12 marqueurs qu'on analyse sur ton visage ») ;
- interstitiels de construction (« Ton profil se précise… barrière : à surveiller ») entre deux questions ;
- micro-engagement émotionnel (« À quel point ça te pèse au quotidien ? ») — qui alimente en plus le curseur charge émotionnelle ;
- rappel du contrat (« on prépare ta réponse sur [le produit que tu as scanné] »).

⚠️ **Pas de preuve sociale inventée** (« 87 % voient un progrès en 3 semaines ») tant que la donnée réelle n'existe pas : illégal-limite, et la cible échaudée le flaire. Au lancement, les interstitiels s'appuient sur ce qui est vrai — ce qu'on analyse, comment, et le profil qui se construit en direct.

---

## 7. Architecture de l'app : 2 onglets + 1 bouton

Pas quatre onglets. Un « profil skin » séparé ferait doublon avec le dashboard, et serait un onglet mort (un cadenas) pour une utilisatrice gratuite.

- **Onglet Accueil (dashboard)** — sa moitié haute *est* le profil skin : score + potentiel, prochain face scan, routine du jour. Un tap ouvre le bilan complet.
- **Bouton Scan central** — proéminent au milieu de la tab bar (pattern Yuka) : ouvre la caméra d'où qu'on soit.
- **Onglet Historique** — tous les scans produits.
- **Réglages/compte** — icône en haut de l'Accueil, pas un onglet.

### Carte des écrans (~20 au total)

**Storyboardés (session 1)**

| Code | Écran | | Code | Écran |
|---|---|---|---|---|
| C1 | Accueil mono-bouton | | B1 | Promesse du bilan |
| C2 | Caméra | | B2 | Quiz q1–q7 |
| C3 | Analyse | | B3 | Capture visage |
| C4 | **Fork pré-reveal** | | B3.5 | **Création de compte** *(ajouté)* |
| C5 | Résultat simple | | B4 | **Paywall StoreKit** |
| C6 | Partage | | B5 | **Double score** *(vignette clé)* |
| E1 | Écran méthode « d'où vient ce score » | | B6 | Bilan |

**Récurrents, à créer (le manque actuel)**

1. **Dashboard — état abonnée** : anneau score + potentiel, compteur « prochain face scan : J-6 », routine du jour cochable, 3 derniers scans, bouton scan.
2. **Dashboard — état gratuite** : mêmes emplacements, mais la zone peau est la carte verre verrouillée. Le dashboard gratuit *est* la surface d'upsell permanente — aucune popup nécessaire.
3. **Historique** : liste des scans (photo produit, nom, score — double score si abonnée), état vide soigné.
4. **Détail d'un scan passé** : l'écran résultat rouvert. C'est là que la réévaluation rétroactive se voit.
5. **Bilan complet** : version longue de la moitié haute du dashboard.
6. **Évolution** : courbe des face scans successifs (84 → 86 → …) vers le potentiel. Justifie l'abonnement dans la durée et alimente les partages.
7. **Cooldown face scan** (voir §8).
8. **Re-scan visage** : capture B3 réutilisée, puis résultat en mode comparaison (« +2 depuis le 18 juillet, voici ce qui a changé »).
9. **Réglages** : abonnement (gérer/restaurer), notifications, confidentialité, **suppression de compte**, support.

---

## 8. Le cooldown de 10 jours

La peau évolue sur des semaines ; des scans rapprochés mesureraient du bruit. Deux vertus cachées : la contrainte **borne le coût Gemini** par utilisatrice — y compris les abonnées annuelles, ce qui adoucit le problème du cap fair-use — et elle crée un **rendez-vous de rétention**.

Design : anneau de compte à rebours sur le dashboard (même langage visuel que l'anneau de score), « Prochain face scan dans 6 jours », avec l'explication assumée (« ta peau évolue sur des semaines ; scanner plus souvent mesurerait du bruit, pas du progrès ») et un opt-in « préviens-moi ». Expliquer la limite au lieu de la cacher est cohérent avec le curseur méfiance, et la notification J-10 devient la meilleure raison légitime de la faire revenir.

---

## 9. Contenu TikTok — 2 moteurs

- **Scan produit** — quotidien, pipeline infini (chaque produit du marché est un sujet).
- **Face reveal** — signature, à fort potentiel viral.

Les deux coexistent, l'un n'empêche pas l'autre.

**Règle éditoriale : compatibilité, pas dénigrement.** On dit « 82 en formule, 23 pour ce profil », jamais « ce produit est nul ». C'est à la fois la différenciation et la protection juridique (cf. les procès intentés à Yuka).

---

## 10. Backlog d'expérimentation

**Règle de volume :** détecter +5 points sur un taux de ~30 % demande ~1 300–1 500 personnes par variante (16·p·(1−p)/δ²) ; +2 points en demande ~8 000. Conclusion : on ne teste que des **changements structurels**, pas des couleurs de bouton. **Un seul test actif à la fois**, seuil écrit avant lancement.

**Phase 0 — préalables, pas des expériences :** événements des 5 KPIs posés · feature flags PostHog · fallback « produit non reconnu » (reprendre la photo / saisir le nom) · cache par produit. *Les fuites évidentes se réparent, elles ne se testent pas.*

| # | Test | Variantes | Métrique de décision |
|---|---|---|---|
| **EXP-1** | **Position du fork** *(test du lancement)* | A = fork pré-reveal dès le 1ᵉʳ scan *(défaut)* · B = 1ᵉʳ résultat simple direct + carte verrouillée, fork au 2ᵉ scan | démarrages d'essai / scans démarrés |
| **EXP-2** | La grande marche du selfie | A = garantie « jamais stockée » sur l'écran caméra *(défaut)* · B = écran intermédiaire pédagogique · C = B + démo du mesh | complétion capture / arrivées capture |
| **EXP-3** | Paywall — ordre & réassurance | A = annuel en avant *(défaut)* vs B = trial hebdo en avant ; puis réassurance « annulable en 2 taps » visible vs absente | démarrages d'essai + part de l'annuel ; conversion essai→payant à J+7 |
| **EXP-4** | Longueur de l'onboarding *(inversé)* | A = onboarding actuel (q1–q7 + capture) vs **B = enrichi (10–14 écrans de persuasion)** | essais démarrés / entrées en branche IA *(bout-en-bout)* |
| **EXP-5** | Texte de la carte verrouillée | « Bon produit. Mais pour ta peau ? » vs « Débloquer mon score personnalisé » vs variante symptôme | taps sur la carte / résultats simples affichés |

Garde-fous : EXP-1 → % qui quittent sans avoir vu *aucun* résultat, retour J7 des gratuites. EXP-2 → durée totale d'onboarding. EXP-3 → remboursements. EXP-4 → conversion essai→payant (un flow qui gonfle les trials de touristes qui annulent ne gagne rien).

*Note EXP-3 : les prix ne se testent pas à la volée, ce sont des SKU — produits StoreKit à créer pour chaque variante. Le test de prix (39,90 vs autre) est un EXP-6 ultérieur.*
*Note EXP-2 : l'option « bilan sans photo » est volontairement exclue — elle change le produit, pas l'écran. À reconsidérer seulement si la chute mesurée dépasse 70 %.*

---

## 11. Décisions encore ouvertes

1. **Calibration du résultat basique** — assez utile pour être crédible, assez incomplet pour donner envie. Le curseur le plus délicat du modèle.
2. **A/B du fork** — pré-reveal dès le premier scan vs après le premier résultat (= EXP-1).
3. **Cap fair-use de l'abonnement** — ~30 scans perso/mois, à trancher.

Et la lucidité qui va avec : **le concept n'est plus le sujet, l'exécution du scoring l'est.** Toute la promesse repose sur la crédibilité du fitScore — le jour où l'app note 92 une crème bourrée de parfum, l'édifice s'effondre en une vidéo. La défendabilité technique est faible (rien n'empêche Yuka d'ajouter une couche « pour ta peau ») : le moat, c'est la vitesse d'exécution et la machine de contenu qui tourne vraiment.

---

## 12. Chantiers prioritaires

1. **Maquetter la branche B enrichie** — le tunnel de persuasion : quiz + interstitiels + capture + paywall aux nouveaux prix. C'est elle qui porte la conversion.
2. **Le trio économique** — fork (C4) → résultat simple + carte verrouillée (C5) → paywall (B4).
3. **La bande 3 du storyboard** — les écrans récurrents : dashboard 2 états, historique, cooldown, évolution.

**À créer :** C1, C4, C5, B4 (nouveaux prix), B5, E1, B3.5.
**Existe déjà en package, à adapter :** `product-scan-liquidglass/`, `Q-liquid-glass/`, capture, face-reveal.
