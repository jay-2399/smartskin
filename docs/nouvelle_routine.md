# Nouvelle routine (« storytelling ») — fonctionnement & animations

Documentation de la **partie routine v2** de l'app : l'expérience qui suit le bilan d'analyse
(`/routine`). Elle remplace l'ancien protocole en 3 couches *sans marque* par une expérience
**branded** : intro narrative → **deck de swipe façon Tinder** (jour puis soir) → **protocole**
type ordonnance avec posologie et liens d'achat.

> Virage produit assumé : on passe d'un protocole d'actifs agnostique à des **produits réels**
> (marques, prix, **liens affiliés**). C'est la concrétisation de l'encart « Bientôt : routine
> produits matin & soir » de l'ancienne version.

## Fichiers

| Rôle | Fichier |
|---|---|
| Hôte React (mince) | `src/components/screens/RoutineScreen.tsx` |
| Logique + données + animations (impératif) | `src/features/routine/storytelling.ts` → `initRoutine(root, { onExit })` |
| Styles (scopés `.routine-v2`) | `src/components/screens/routine-v2.css` |
| Route | `src/app/(funnel)/routine/page.tsx` (inchangée) |
| Maquette source de vérité | `reference/User_flow_screens/12-routine.html` (autonome, ouvrable seul) |

**Architecture du port.** Le composant ne fait qu'exposer un conteneur `<div className="routine-v2" ref>`
et appelle `initRoutine(el, { onExit: router.back })` dans un `useEffect` (cleanup au démontage).
`initRoutine` **injecte le squelette HTML** dans `root`, câble les Pointer Events et pilote les
animations en **CSS** (transitions + keyframes). Aucune lib d'animation. Tous les `setTimeout/setInterval`
passent par des wrappers `setT/setI` ; le **cleanup** les vide et retire les listeners `document`.

> Anti-collision CSS : tout est contenu sous `.routine-v2` ; 4 classes génériques renommées
> (`.rv-back`, `.rv-head`, `.rv-nav-logo`, `.rv-sec-head`) et 2 keyframes (`rvRise`, `rvCardIn`)
> pour ne pas écraser `funnel.css`. Les tokens (`--bg`, `--accent`…) viennent de `globals.css` ;
> on ajoute localement `--love/--no/--gold/--gold-d/--keep` et on force `--fm` sur Manrope.

---

## Flux global

```
intro storytelling ──► deck JOUR (4 étapes) ──► interstitiel ──► deck SOIR (4 étapes) ──► génération ──► PROTOCOLE
   (non skippable)        swipe garder/refuser    jour→soir         swipe                   (~2.25s)      (ordonnance)
```

Le flux est **séquentiel** (plus d'onglets jour/nuit) : une fois les 4 produits du jour gardés, on
bascule automatiquement sur le soir, puis sur le protocole.

---

## 1) Intro storytelling (overlay `#intro`, z-index 60, **non skippable**)

Joue au montage. Deux phrases en **fondu + blur-in** avec, dessous, un **loader d'analyse en direct**.

- **Phase 1 (~0–3,3 s)** : logo + eyebrow « Analyse terminée », phrase *« Composons maintenant ton
  protocole sur-mesure. »* ; statuts qui défilent (*Lecture de ton diagnostic… → Sébum · pores ·
  imperfections ciblés → Définition de tes priorités…*), barre de progression à 34 %.
- **Phase 2 (~3,85–9,3 s)** : l'eyebrow devient la pastille **☀ Routine du jour** ; phrase
  *« Commençons par ta routine de jour. »* ; **compteur qui grimpe 0 → 2 137** « produits analysés ·
  2 000+ en base », statuts (*Connexion à la base… → Analyse en direct… → Recherche du meilleur
  match…*), barre à 100 %.
- **Clôture (~7,7 s)** : le spinner devient une **coche verte**, « Sélection prête », « **4** produits
  retenus pour toi ».
- **~9,85 s** : `render()` (le deck monte) puis l'overlay `.gone` se dissout (opacity .65s).

Animations clés : `introIn`/`introOut` (fondu/translate/blur), `introBg` (halo qui respire),
`introSpin` (spinner). Easings `cubic-bezier(.22,1,.36,1)`.

## 2) Deck de swipe (zone `.stage` / `.deck`)

Pile de **3 cartes** au plus (`.depth-0` devant, `.depth-1/.depth-2` en profondeur, translate+scale
dégradés). La carte de devant est **draggable** (Pointer Events sur `document`, pas de
`setPointerCapture` → robuste si la carte quitte le DOM en plein geste).

- **Drag** : `translateX` + légère rotation (`dx*0.055`). Seuil = **95 px**.
- **Feedback** (fonction `paint`) : teinte progressive de la carte via deux calques `.card-glow`
  en `mix-blend-mode: multiply` — **rose (like)** vers la droite, **rouge (nope)** vers la gauche —
  + un **stamp** qui grandit (cœur rose à gauche / croix rouge à droite).
- **Relâché** :
  - **droite → Garder** : la carte **s'envole** (`translate(780px,-55px) rotate(20deg)`, .5s), on
    enregistre le choix, on passe à l'étape suivante.
  - **gauche → Refuser** : la carte s'envole à gauche, on affiche une **alternative de la même
    catégorie** (cyclage `ptr = (ptr+1) % 4` sur 1 principal + 3 alternatives), **même étape**.
  - sous le seuil → **ressort** retour au centre (`cubic-bezier(.34,1.56,.64,1)`).
- Après l'envol, **re-render propre** : la pile est reconstruite, la nouvelle carte de devant entre
  via `rvCardIn` (montée opaque, pas de fondu). `markFresh` retire la classe `fresh` à la fin de
  l'animation (sinon `animation-fill: both` bloquerait les transforms inline du drag).
- **Boutons** (`.actions`) : **↺ replay** (annule le dernier swipe via une pile `history`,
  grisé si vide) · **✕ refuser** · **♥ garder** — rejouent les mêmes transitions.
- **Plateau « Ta sélection »** (`.tray`) : une rangée de slots qui se **remplit** de vignettes à
  chaque produit gardé, l'étape courante pulse (`trayPulse`), + compteur et total partiel.
- **Mini-scrollbar** dans le coin bas-droit de l'image (`.scroll-cue`) si le texte « pourquoi »
  déborde ; `touch-action: pan-y` autorise le scroll vertical du texte sans casser le swipe.
- **Carte recommandée** : badge doré **★ Recommandé** (`recoGlow` qui pulse) sur le produit
  principal ; **Alternative n/3** sur les alternatives.

## 3) Interstitiel jour → soir (overlay `#phaseShift`, z-index 55)

Quand les 4 produits du jour sont gardés (`render` détecte `step >= 4` côté `day`) : overlay ~2 s
avec badge **✓ Routine du jour validée**, *« Passons à ta routine du soir. »* et une **lune
flottante** (`phaseFloat`). Pendant ce temps `tab='night'`, le deck du soir se construit derrière,
puis l'overlay se dissout.

## 4) Écran de génération (overlay `#protoGen`, z-index 59)

Quand les 4 produits du soir sont gardés : **« On assemble ton protocole… »** (spinner + barre qui se
remplit en 1,5 s) → **« Ton protocole est prêt. »** (coche verte) → à ~2,25 s on construit le
protocole derrière et l'overlay se dissout. Donne un temps de transition doux avant la révélation.

## 5) Protocole (overlay `#protocol`, z-index 58, scrollable)

Format **ordonnance + timeline**. En-tête « Ton protocole sur-mesure · 8 produits » + puces
diagnostic. Deux sections **☀ Matin** / **🌙 Soir** ; chaque produit = un **nœud numéroté** sur un
**rail vertical** (`.tl-track`/`.tl-node`) + une **fiche** :

- vignette · catégorie · nom · marque · prix ;
- **bloc Posologie** : *quand* (☀/🌙) · *fréquence* (ex. « Chaque matin », « 2-3 soirs/sem ») · *comment* ;
- **« Pourquoi : »** = la **1ʳᵉ phrase** du texte produit (reliée au diagnostic, actifs en gras) ;
- **CTA « Acheter le produit »** (bordure sombre, hover → fond sombre + texte blanc) → lien marque
  (`target="_blank"`, affilié).

Bas : **total estimé**, **« Enregistrer mon protocole »** (placeholder, voir limites), **« Tout
recommencer »** (réinitialise et relance), mention liens affiliés. La flèche retour et « Tout
recommencer » réinitialisent l'état et reviennent au deck jour.

---

## Modèle de données & état

- **Catalogue** (`storytelling.ts`) : 5 familles (`CLEANSER`, `SERUM_NIA`, `SERUM_HYDRA`, `CREAM`,
  `EXFO`), chacune = 1 produit recommandé + 3 alternatives (`{ brand, name, img?, price, p, why, url, freq? }`).
- **`ROUTINE`** : `{ day:[4 Step], night:[4 Step] }`, chaque `Step = { cat, icon, freq, use, options }`
  (`freq`/`use` = la **posologie** affichée dans le protocole).
- **État** par moment : `STATE.day / STATE.night = { step, ptrs[4], kept[4], history[] }`.
  `ptrs[i]` = index de l'alternative affichée à l'étape i ; `kept[i]` = index gardé ; `history` =
  pile pour le replay.
- **Total** = somme des `p` des produits gardés (jour + soir).

## Points d'extension (suivis)

1. **Personnalisation depuis le bilan** — ✅ **FAIT (Phase A).** `RoutineScreen` lit `result`
   (`@/features/analysis/resultStore`) + `answers` (`@/features/funnel/store`) et construit la routine
   via `src/features/routine/personalize.ts` → `buildPersonalizedRoutine(result, answers)`, qui réutilise
   `recommend.ts` (préoccupations + sensibilité) et puise dans `src/features/routine/products.ts`
   (catalogue tagué `targets`/`actives`/sécurité). `initRoutine(root, { routine })` reçoit les données
   (défaut = `DEFAULT_ROUTINE` pour la démo). Sécurité q7 appliquée (grossesse → pas de BHA/AHA ;
   rosacée/eczéma → nettoyant doux, pas d'exfoliant), puces diagnostic + nb de produits dynamiques,
   SPF ajouté. **Suivi (Phase B)** : élargir le catalogue (rétinoïde anti-âge, vitamine C taches,
   azélaïque rougeurs…) — sourcing produits réels.
2. **« Enregistrer mon protocole »** : non branché (feedback visuel seul). Cible prévue : créer/garder
   le protocole sur le compte et arriver sur un **dashboard** (routine du jour en checklist, suivi de
   la peau + prochaine analyse, rachat). Maquette dashboard explorée hors-repo.
3. **Achat / affiliation** : liens marque en `target="_blank"` ; à remplacer par les vrais liens
   trackés.

## Limites connues

- **Données fixes** (pas encore reliées à l'analyse) — voir ci-dessus.
- **Code mort signalé (non supprimé)** : `src/features/routine/recommend.ts` (+ son test) et les
  styles `.rt-*` de l'ancienne routine dans `funnel.css` ne sont plus utilisés.
- **`prefers-reduced-motion` volontairement ignoré** (choix produit : l'intro narrative joue toujours).
- Offsets verticaux des overlays (intro/phase/gen) calés pour un grand mobile ; le deck est en flex
  et s'adapte, mais sur très petit écran l'intro peut être un peu serrée.

## Vérifier

`npm run dev` puis ouvrir **`/routine`** : l'intro joue → swipe (boutons ♥/✕/↺) sur les 4 produits du
matin → interstitiel → 4 du soir → génération → protocole (fiches + « Acheter le produit »). Les 5
images produit doivent être dans `public/` (`prod-effaclar/niacinamide/typology/dralthea/paula.png`).
