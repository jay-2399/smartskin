# Output de l'analyse (scan) → page Reveal

> **But.** Documenter **tout ce que produit l'analyse IA** (le « scan ») et **comment chaque
> champ alimente la page reveal** (`/resultats`). Sert de référence pour **compléter / enrichir**
> cette page : on y voit ce qui est déjà affiché et ce qui est produit mais **pas encore utilisé**.
>
> Sources de vérité dans le code :
> - schéma de sortie : `src/features/analysis/schema.ts`
> - catalogue des attributs : `src/features/analysis/attributes.ts`
> - calcul du score : `src/features/analysis/score.ts`
> - mise en forme : `src/features/analysis/format.ts`
> - rendu : `src/components/screens/ResultsScreen.tsx`

---

## 1. Le flux en une ligne

Questionnaire (q1-q7) + photo → appel IA vision (`prompt.ts`) → **JSON validé** (`schema.ts`) → le **score est recalculé** côté serveur (`score.ts`) → bilan en mémoire (`resultStore`) → **page reveal**.

---

## 2. Le JSON de sortie (exemple réel = `sample.ts`)

```json
{
  "observations": "Front : peau plutôt nette, légère brillance près de la racine des cheveux. Zone T : brillance et quelques pores un peu visibles sur le nez. Joues : rougeurs légères et localisées sur les ailes du nez, quelques points noirs. Menton : RAS. Yeux : cernes légers, pas de poches. Teint d'ensemble : globalement uniforme et frais.",
  "score": 73,
  "state": "Bon état général",
  "sub": "Ta peau est globalement équilibrée : surtout de la brillance en zone T et de petites imperfections à accompagner en douceur.",
  "photoQuality": { "ok": true, "issue": null },
  "profile": {
    "skinType": "Mixte",
    "ageRange": "25–35 ans",
    "carnation": 3, "carnationLabel": "Intermédiaire",
    "undertone": 2, "undertoneLabel": "Plutôt chaud",
    "phototype": 3, "phototypeSub": "brûle modérément, bronze progressivement"
  },
  "attributes": [
    { "id": "acne",                "level": 2, "tip": "légères",     "situation": "Quelques imperfections inflammatoires ponctuelles…" },
    { "id": "comedones",           "level": 2, "tip": "rares",       "situation": "Points noirs rares et localisés sur le nez…" },
    { "id": "post_acne_marks",     "level": 1, "tip": "aucune",      "situation": "Pas de marque ni cicatrice notable…" },
    { "id": "pores",               "level": 2, "tip": "légers",      "situation": "Pores légèrement visibles sur la zone T…" },
    { "id": "texture",             "level": 1, "tip": "lisse",       "situation": "Grain de peau régulier et lisse…" },
    { "id": "flaking",             "level": 1, "tip": "absente",     "situation": "Aucune desquamation détectée…" },
    { "id": "tone_evenness",       "level": 2, "tip": "léger",       "situation": "Teint plutôt uniforme…" },
    { "id": "radiance",            "level": 2, "tip": "correct",     "situation": "Teint plutôt frais, légère perte d'éclat…" },
    { "id": "dark_spots",          "level": 1, "tip": "aucune",      "situation": "Pas de tache pigmentaire visible…" },
    { "id": "redness",             "level": 2, "tip": "localisées",  "situation": "Rougeurs légères et localisées sur le nez…" },
    { "id": "shine",               "level": 2, "tip": "zone T",      "situation": "Brillance présente sur la zone T…" },
    { "id": "visible_vessels",     "level": 1, "tip": "absents",     "situation": "Aucun vaisseau apparent…" },
    { "id": "fine_lines",          "level": 1, "tip": "aucune",      "situation": "Pas de ridule notable…" },
    { "id": "wrinkles",            "level": 1, "tip": "absentes",    "situation": "Aucune ride installée…" },
    { "id": "under_eye_circles",   "level": 2, "tip": "légers",      "situation": "Cernes légers sous les yeux…" },
    { "id": "under_eye_puffiness", "level": 1, "tip": "absentes",    "situation": "Aucune poche détectée…" }
  ]
}
```

---

## 3. Champ par champ

| Champ | Type / valeurs | Source | Sens |
|---|---|---|---|
| `observations` | string (optionnel) | **IA** | Narratif **zone par zone** rédigé AVANT de noter (ancre le raisonnement). Front · Zone T · Joues · Menton · Contour des yeux · Teint. |
| `score` | entier 0-100 | **Calculé** (`score.ts`) — pas l'IA | Note globale (cf. §5). |
| `state` | string | **Calculé** (`scoreState`) | Titre d'état cohérent avec le score (cf. §5). |
| `sub` | string (peut contenir `<b>`) | IA | Phrase d'encouragement / synthèse courte. |
| `photoQuality.ok` | bool | IA | La photo était-elle exploitable. |
| `photoQuality.issue` | string \| null | IA | Raison si `ok=false` (flou, sombre…). |
| `profile.skinType` | string | IA | Type de peau (Baumann simplifié : Sèche/Mixte/Grasse/Normale/Sensible). |
| `profile.ageRange` | string | IA | Tranche d'âge estimée (ex. « 25–35 ans »). |
| `profile.carnation` | 1-6 + `carnationLabel` | IA | Carnation (ITA°), du plus clair (1) au plus foncé (6). |
| `profile.undertone` | 1-4 + `undertoneLabel` | IA | Sous-ton : 1=froid, 2=chaud, 3=neutre, 4=olive. |
| `profile.phototype` | 1-6 + `phototypeSub` | IA | Phototype Fitzpatrick (réaction au soleil). |
| `attributes[].id` | enum (16 ids) | — | Cf. catalogue §4. |
| `attributes[].level` | 1-4 | IA | **1 = idéal/absent, 4 = sévère** (même sens pour les 16). |
| `attributes[].tip` | string court | IA | Mot-clé affiché sur la jauge (ex. « légères », « zone T »). |
| `attributes[].situation` | string | IA | Phrase d'analyse détaillée de l'attribut. |

---

## 4. Catalogue des 16 attributs (4 sections)

`level` va de 1 (bas = idéal) à 4 (haut = sévère). Le bas est **toujours** le bon côté (gradient vert→rouge sur la jauge).

| Section | id | Libellé | Bas (1) | Haut (4) | Binaire |
|---|---|---|---|---|---|
| **Imperfections** | `acne` | Imperfections | aucune | sévères | |
| | `comedones` | Points noirs | aucun | très nombreux | |
| | `post_acne_marks` | Marques post-acné | aucune | marquées | |
| | `pores` | Pores | invisibles | dilatés | |
| | `texture` | Grain de peau | très lisse | très rugueux | |
| | `flaking` | Desquamation | absente | présente | ✓ |
| **Teint & Éclat** | `tone_evenness` | Irrégularités | très uniforme | très irrégulier | |
| | `radiance` | Teint terne | lumineux | très terne | |
| | `dark_spots` | Taches | aucune | très marquées | |
| | `redness` | Rougeurs | aucune | diffuses | |
| | `shine` | Brillance | mate | très grasse | |
| | `visible_vessels` | Vaisseaux | absent | présent | ✓ |
| **Signes d'âge** | `fine_lines` | Ridules | aucune | marquées | |
| | `wrinkles` | Rides | absentes | profondes | |
| **Zone yeux** | `under_eye_circles` | Cernes | absents | marqués | |
| | `under_eye_puffiness` | Poches yeux | absentes | présentes | ✓ |

Profil — nuanciers : `CARNATION_SWATCHES` (6 teintes) · `UNDERTONE_SWATCHES` (4 teintes) · phototype = échelle I→VI.

---

## 5. Le score (calculé, pas l'IA)

**Addition + plafond** (`score.ts`) :
- On part de **100**, chaque défaut retire des points selon son **poids** (gros/moyen/petit) × sa **sévérité** (niveau).
  - Gros (`acne`, `redness`, `dark_spots`) : niv. 2 → −5 · 3 → −14 · 4 → −29
  - Moyen (`comedones`, `pores`, `post_acne_marks`, `texture`, `shine`, `tone_evenness`, `radiance`) : 2 → −3 · 3 → −10 · 4 → −19
  - Petit (`flaking`, `visible_vessels`, `fine_lines`, `wrinkles`, `under_eye_circles`, `under_eye_puffiness`) : 2 → −2 · 3 → −5 · 4 → −10
- **Plafond** = le défaut le plus grave impose un maximum : gros 3 → 66, gros 4 → 40 ; moyen 3 → 75, moyen 4 → 55 ; petit 4 → 70.
- Score final = `min( max(5, 100 − total), plafond )`.

**Libellés d'état (`state`)** : ≥80 « Très bel état général » · ≥65 « Bon état général » · ≥50 « État correct, à surveiller » · ≥35 « À accompagner de près » · sinon « Peau à rééquilibrer ».

---

## 6. Mapping output → page reveal (état actuel)

| Bloc de la page | Champs utilisés |
|---|---|
| **Hero — photo** (`ResultPhotoMesh`) | la photo capturée (objet en mémoire) + mesh facial MediaPipe. *(n'utilise pas le JSON)* |
| **Hero — jauge de score** (`ScoreGauge`) | `score`, `state`, `sub` |
| **Profil de peau** | `skinType`, `ageRange`, `carnation`+`carnationLabel`, `undertone`+`undertoneLabel`, `phototype`+`phototypeSub` |
| **4 sections d'attributs** (jauges) | pour chacun des 16 : `label`, `level` (→ position + couleur du gradient), `tip` (mot-clé), `low`/`high` (bornes), `situation` (texte sous la jauge) |
| **CTA bas** | bouton vers `/routine` |

---

## 7. Produit par l'analyse mais PAS encore affiché ⚠️

C'est la matière disponible pour **compléter** la reveal :

| Champ | État | Potentiel pour la reveal |
|---|---|---|
| **`observations`** (narratif zone par zone) | **non affiché** | Bloc « Ce que l'IA a vu, zone par zone » (Front, Zone T, Joues, Menton, Yeux, Teint) — très crédibilisant. |
| **`photoQuality.ok / issue`** | non affiché (sert au contrôle) | Petit badge « photo validée » ou message si qualité limite. |
| **Synthèse « priorités »** | **non calculée/affichée** | Bloc « Tes 3 priorités » en tête (dérivable des `attributes` de niveau le plus élevé) — voir §8. |
| **`tip`** | affiché sur la jauge | OK, mais sous-exploité (pourrait servir de résumé d'une carte). |

---

## 8. Idées pour compléter / enrichir la reveal

1. **Bloc « Tes priorités » en tête** — dériver les 3 attributs de `level` le plus élevé (pondérés par leur poids `gros/moyen/petit`), afficher des chips « À travailler en premier ». *(C'est aussi ce qui doit alimenter la construction de routine → même logique que `topConcerns`.)*
2. **Section « Observations zone par zone »** — afficher `observations` (Front · Zone T · Joues · Menton · Yeux · Teint) en accordéon ou en carte « rapport d'examen ».
3. **Synthèse forces / faiblesses** — séparer visuellement ce qui va bien (niveaux 1) de ce qui est à surveiller (≥ 2).
4. **Lien direct vers la routine** — chaque priorité renvoie à l'étape de routine qui la traite (cohérence reveal ↔ routine).
5. **Badge qualité photo** — rassurer sur la fiabilité (`photoQuality.ok`).
6. **Évolution dans le temps** (futur, avec compte) — comparer le score et les niveaux à une analyse précédente.

---

### Annexe — contraintes
- Le **`score` est recalculé** côté serveur après l'IA (cohérence/sécurité) : ne jamais réafficher un score « brut » de l'IA.
- La **photo n'est jamais stockée** (objet en mémoire, détruit après usage).
- C'est un **bilan, pas un diagnostic médical** (à conserver sur la page).
- Les 16 `level` ont **tous** la même polarité (1 = bon) → gradient de jauge uniforme vert→rouge (cf. `betterHigh` dans `attributes.ts` pour une future métrique « plus = mieux »).
