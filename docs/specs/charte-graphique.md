# Charte graphique — SmartSkin AI

Mini-guidelines de design extraites des écrans réels (app + sections web).
Esthétique : **clinique-douce** — palette bleu-gris froide, accents maîtrisés, glassmorphisme léger, beaucoup de respiration.

---

## 1. Typographies

Deux familles, importées depuis Google Fonts.

```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

| Rôle | Police | Variable | Graisses utilisées |
|------|--------|----------|--------------------|
| **Display / texte** | **Manrope** | `--fd: 'Manrope', sans-serif` | 300, 400, 500, 600, 700, 800 |
| **Mono / labels / tags** | **JetBrains Mono** | `--fm: 'JetBrains Mono', monospace` | 400, 500 |

**Principe :** Manrope pour tout le contenu lisible (titres, corps, boutons). JetBrains Mono **uniquement** pour les micro-labels techniques (eyebrows, tags, badges, chiffres d'étape) — toujours en MAJUSCULES avec interlettrage positif.

---

## 2. Échelle typographique

> Règle d'interlettrage (`letter-spacing`) :
> - **Titres Manrope** → négatif (`-0.025em` à `-0.04em`), serré et premium.
> - **Labels JetBrains Mono** → positif (`+0.06em` à `+0.24em`), aéré et MAJUSCULE.

| Élément | Police | Taille | Weight | Letter-spacing | Line-height |
|---------|--------|--------|--------|----------------|-------------|
| **H1 section web** (hero, bento) | Manrope | `clamp(30px, 5vw, 48px)` | 800 | -0.04em | 1.04 |
| **Titre de question** (écran app) | Manrope | 28px | 800 | -0.035em | 1.1 |
| **Titre de carte** (bento, card) | Manrope | 22px | 800 | -0.035em | 1.16 |
| **Sous-titre fort** (type détecté…) | Manrope | 21px | 800 | -0.03em | 1.08 |
| **Gros chiffre** (score, gauge) | Manrope | 58–66px | 800 | — | 1 |
| **Sous-titre / paragraphe** | Manrope | 15px | 400 | — | 1.55 |
| **Label d'option** | Manrope | 15px | 700 | -0.025em | 1.12 |
| **Bouton CTA** | Manrope | 15px (app) / 14.5px (web) | 600 | -0.01em | — |
| **Helper / légende** | Manrope | 12.5px | 400 | — | 1.4 |
| **Sous-texte d'option** | Manrope | 11.5px | 400 | — | 1.25 |
| **Eyebrow / tag** | JetBrains Mono | 10px | 500 | 0.10–0.24em | — |
| **Micro-label** (famille, chip) | JetBrains Mono | 9.5–10px | 400–500 | 0.08–0.12em | — |

**Astuce de hiérarchie :** dans les titres, on mélange souvent **800 (ink)** + **300 (graphite)** sur deux fragments pour un contraste éditorial.
```html
<h1>Chaque ingrédient, <span class="soft">décrypté pour ta peau.</span></h1>
<!-- .soft { font-weight:300; color:var(--graphite); } -->
```

---

## 3. Couleurs

### Base & encre (greyscale froid)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#F1F3F6` | Fond général de l'app |
| `--card` | `#FFFFFF` | Surfaces, cartes |
| `--cloud` | `#EDEFF7` | Fonds doux (icônes, pistes de jauge, chips) |
| `--smoke` | `#D3D6E0` | Bordures de contrôles (radio, traits) |
| `--steel` | `#BCBFCC` | Gris intermédiaire |
| `--space` | `#9DA2B3` | Texte tertiaire / sous-textes |
| `--graphite` | `#6E7180` | Texte secondaire / paragraphes |
| `--arsenic` | `#40424D` | Texte fort secondaire |
| `--ink` | `#1A1D21` | **Texte principal, boutons, bordures actives** |

> Du plus clair au plus foncé : `bg → cloud → smoke → steel → space → graphite → arsenic → ink`.
> Le **noir n'existe pas** : on s'arrête à `--ink (#1A1D21)`.

### Accents (familles & sémantique)

Chaque accent vient avec une déclinaison foncée `-d` (texte/icône) et un fond translucide `-bg` (tuiles).

| Famille / sens | Token | Hex | `-d` (foncé) | `-bg` (fond) |
|----------------|-------|-----|--------------|--------------|
| **Primaire / Hydratation** | `--accent` | `#A6C3D6` | `#7FA6BE` | `rgba(166,195,214,0.16)` |
| **Succès / Détection / Imperfections** | `--green` | `#1FC977` | `#13A35F` | `rgba(31,201,119,0.14)` |
| **Chaud / Éclat & taches** | `--sand` | `#C7B299` | `#A28868` | `rgba(199,178,153,0.18)` |
| **Apaisant / Naturel** | `--sage` | `#9DBCA6` | `#5E876C` | `rgba(157,188,166,0.18)` |
| **Anti-âge / Neutre premium** | `--arsenic` / `--ink` | `#40424D` / `#1A1D21` | `#1A1D21` | `rgba(26,29,33,0.055)` |

**Règles d'usage des accents :**
- Palette **dominante froide + accents rares** — jamais d'aplats de couleur saturée en grande surface.
- `--green` est réservé au **positif** : badge « détecté », état actif, validation.
- Les familles (accent / sand / sage / green / ink) servent à **catégoriser** (ingrédients, concerns) via une pastille + un fond de tuile, le reste de la carte restant monochrome.

---

## 4. Bonus — tokens visuels récurrents

Pour garder la cohérence au-delà de la typo et des couleurs :

| Propriété | Valeurs typiques |
|-----------|------------------|
| **Rayons** | Carte web `26px` · carte app `18–20px` · bouton `14–16px` · tuile icône `13–14px` · pill/tag `100px` |
| **Ombres douces** | `0 14px 34px rgba(40,55,75,0.06)` (carte au repos) · `0 26px 56px rgba(40,55,75,0.12)` (hover) · `0 6px 18px rgba(26,29,33,0.22)` (bouton ink) |
| **Bordures** | `1px solid rgba(26,29,33,0.05–0.07)` (cartes) · `1.5px` sur options |
| **Glassmorphisme** (eyebrow/tag) | `background:rgba(255,255,255,0.42)` + `backdrop-filter:blur(11px) saturate(1.15)` + `border:1px solid var(--ink)` |
| **Fond atmosphérique** (sections web) | mesh radial doux (`--accent`/`--sand`/`--sage` à faible opacité) + grille de points `rgba(26,29,33,0.028)` masquée |
| **Easing signature** | `cubic-bezier(.22,1,.36,1)` (entrées/hover) · `cubic-bezier(.34,1.56,.64,1)` (rebond sur sélections) |
| **Animation d'entrée** | `@keyframes rise { from{opacity:0; transform:translateY(12–16px)} to{opacity:1} }` en cascade (`animation-delay`) |

---

*Document généré à partir des fichiers de design SmartSkin AI (landing, écrans questionnaire, bentobox, LP_ingredient, prop_1).*
