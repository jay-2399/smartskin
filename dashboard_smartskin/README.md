# Dashboard SmartSkin — espace de suivi

Le **dashboard** = l'écran de suivi/accompagnement post-achat. Il ne livre pas un protocole figé : il **accompagne l'implémentation** de la routine au quotidien (la vraie valeur de rétention).

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `dashboard.html` | La page complète — self-contained (HTML + CSS + JS inline). |
| `capture-face.jpg` | Photo du scan, utilisée comme avatar du header. |

## Stack / dépendances

- **Police** : Manrope (Google Fonts, déjà liée).
- **Aucun framework** — HTML/CSS/JS purs, animations CSS.
- **Glassmorphisme léger** sur les cartes (`backdrop-filter`), sur un fond à dégradé doux.
- Mockup en cadre fixe (`.phone 430px / .screen 932px`) → à passer en responsive `100dvh` pour la prod.

## Structure (haut → bas)

1. **Check-in modal** (au chargement, centré) — *« How's your skin today? »* → 4 options.
2. **Skin score** — courbe d'évolution (hero) + `Goal` + re-scan.
3. **Your 3 priorities** — Sebum / Marks / Barrier, en **spectre vert→rouge** avec marqueur « avant » + handle « maintenant » + commentaire.
4. **Tonight** — la routine du jour, **dynamique**.
5. **Your routine plan** — la timeline d'évolution du protocole.
6. **Running low** — l'alerte **restock contextuelle** (voir plus bas).

---

## Le check-in (garde-fou de sécurité)

But unique : **« push or pull » sur les actifs** — vérifier que les actifs de ce soir conviennent à la peau du jour, pour ne jamais l'aggraver en suivant le plan aveuglément.

- Les options sont des **déviations actionnables** (pas le type de peau) : `Good · Sensitive · Irritated · Breakout`.
- Effet sur la carte **Tonight** :
  - **Irritated / Sensitive** → on **met le BHA en pause** (bandeau « GENTLE NIGHT »).
  - **Breakout** → conseil ciblé (garder le BHA + cibler la zone).
  - **Good** → on déroule.

## Tonight — routine dynamique (asymétrie matin/soir)

L'utilisatrice ne revient en général que **le soir**. Donc :
- **Soir (Evening)** = **checklist interactive** (elle coche en appliquant) + adaptation check-in.
- **Matin (Morning)** = **référence numérotée non cochable** + **un seul bouton « I did my morning routine »** (confirmation rétrospective, le soir ou via la notif). Pas 4 cases qu'elle ne cochera jamais.

La routine **varie** (BHA 2-3 soirs/sem, SPF + Vit C le matin only…) → le kicker indique ce qui est différent (« EXFOLIANT NIGHT » vs « GENTLE NIGHT »), avec garde-fous (« No Vitamin C tonight — morning step »).

## Routine plan — évolutif

La routine grandit avec la peau : `Start → BHA 2× → BHA 3× → +Retinoid → Maintain`. Chaque palier est **conditionné** (tolérance via check-ins + progrès via re-scan), et la roadmap se **recalcule à chaque re-scan**. Paliers proches = concrets/conditionnels, paliers lointains = indicatifs.

---

## ⭐ Le mécanisme de RESTOCK (quantité × routine × posologie)

C'est le point demandé. L'alerte « Running low » estime un **« jours restants » par produit**, et n'affiche **que** ceux qui sont bientôt finis (contextuel).

### La formule

```
durée_de_vie (jours) = quantité_produit ÷ (dose_par_usage × usages_par_jour)
jours_restants       = durée_de_vie − jours_écoulés_depuis_l'achat
% consommé           = jours_écoulés ÷ durée_de_vie
```

### Les 3 ingrédients (et d'où ils viennent)

| Élément | Source | Exemple |
|---|---|---|
| **Quantité** | `catalog-final.json` → **`size_ml`** (normalisé) | EltaMD SPF = `50` ml |
| **Posologie** (dose par usage) | **table par catégorie** (constante maintenue côté code, pas dans le catalogue) | spf ~1,2 ml · sérum ~0,5 ml · crème ~1,2 ml · nettoyant ~2 ml · exfoliant ~1 ml |
| **Routine** (usages/jour) | `catalog-final.json` → **`frequency`** + **`moment`** | `daily` = 1/j · `3x/sem` = 3/7 · `1-2x/sem` = 1,5/7 · `daily` + `moment:both` = **2/j** (matin+soir) |

À quoi s'ajoutent :
- **`startDate`** = date d'achat (loggée au tap « Restock » → c'est aussi la **conversion d'affiliation**),
- **les cochages** (optionnel) → affinent `jours_écoulés` avec la **conso réelle** plutôt que théorique (super réutilisation des données d'adhérence déjà captées).

### Exemple vérifié

EltaMD SPF : `50 ml ÷ (1,2 × 1) = ~42 j` de durée de vie. À J+38 → **~4 jours restants** → l'alerte se déclenche.
CeraVe (340 ml, 2×/j) → ~142 j → **n'apparaît pas** (contextuel).

### Deux modèles de consommation

- **Au volume** (146/155 produits) → `size_ml` ÷ (dose_ml × usages). ✅
- **Au compte** (9 produits : patchs, pads, peels → `size_unit:"count"`) → `size_value (unités) ÷ unités_par_usage`. *(Un `if` sur l'unité.)*

### L'action

Bouton **Restock** → `https://www.amazon.com/dp/{asin}?tag=…` (lien Amazon affilié, l'`asin` est dans le catalogue). Le rachat **re-logge la date** → compteur remis à zéro.

### Garde-fou

L'estimation est **approximative** (les gens dosent différemment) → l'afficher **flou** (« ~4 days », pas « 3 j 7 h ») et laisser **corriger** (« je viens d'en racheter » / « je suis à court ») pour recalibrer.

---

## ⚠️ Données mockées (à brancher en prod)

- **Score chart + 3 priorités** : valeurs de démo → sortent du **dernier re-scan** (continu interne, affiché en niveau/spectre).
- **Routine (Tonight)** : 5 produits câblés en dur, icônes flacon placeholder → vrais produits + photos via le protocole.
- **Restock** : tableau `MOCK` en dur → remplacer par `catalog-final.json` + `startDate` + cochages. La fonction `estimate()` ne bouge pas.
- **Re-scan, check-ins, cochages** : à persister (alimentent suivi, plan, restock — et une future couche récompenses).
- **Header date** en français, le reste en anglais → à harmoniser (refresh anglais à finir).

## Contexte produit

Le dashboard est la couche **« accompagnement à l'implémentation »** : protocole = l'ordonnance (one-time, vendu au paywall) · dashboard = le suivi qui fait que la routine **marche** dans la durée (rétention + rachat affilié). La gamification/récompenses (système type WeWard, financé par les marques) est **différée** à plus tard, une fois l'échelle atteinte.
