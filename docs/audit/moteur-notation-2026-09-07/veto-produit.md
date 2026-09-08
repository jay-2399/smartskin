# Veto — angle produit (phase 4)

Vérifications : `variants/FINAL3.mjs` (mon paquet, proche du paquet final) rejoué sur les étalons cités ; chiffres « base → FINAL3 » sauf mention.

## 1. Verdict par modification

- **B1** OK.
- **B2** OK.
- **B3** OK avec réserve : la canonicalisation ne couvre que les parenthèses ; les synonymes vrais (Ceramide 3 = Ceramide NP, Vitamin E = Tocopherol) restent deux fiches (triche 3 ci-dessous).
- **B4** OK avec réserve : (a) « le nom porte SPF/UV/Sun » doit être un mot entier hors nom de marque — SUNDAY RILEY Auto Correct (TiO2 pos 40), SUNGBOON EDITOR Silk Peptide, Cetaphil « with Sunflower » contiennent « Sun » ; sans effet aujourd'hui (drapeau absent, TiO2 au-delà de la position 8), mais un trou dès que le drapeau est recalculé. (b) « jamais vert si catégorie non sûre » : afficher la note comme provisoire, ne pas la modifier.
- **B5** OK.
- **B6** OK.
- **B7** OK. Résiduel « Retinol en dernier » : +3 sur TO Niacinamide, mais +8 mesuré sur un sérum peptides sans actif power 3 en top 5 (70 → 78 = rétinol honnête en position 4) : acté, chiffre à mettre en D.
- **B8** OK avec réserve : The Ordinary AHA 30 % + BHA 2 % passe à 75 = vert de justesse ; un peel à 30 % ne devrait pas être vert. À traiter aux bandes (B11), pas en rouvrant B8.
- **B9** OK (l'exception « rincé » répond à mon objection sur la méthylisothiazolinone ; 45 n'abaisse que 10 produits posés).
- **B10** OK.
- **B11** OK (ouvert, ordre données → règles → recalibration).

## 2. Erreurs factuelles

1. Résumé §4 et §7, B3, B7, tableau E — « Effaclar Adapalene 62 → 78 » : le LRP Effaclar Adapalene est à **47** aujourd'hui (« Adapalene USP 0.1% » non reconnu → −10 « too few actives », −2,4 PG). 62 est le Differin / Neutrogena Evenly Clear (« Adapalene » lisible, 62 → 76). Corriger : LRP 47 → ~78.
2. Tableau E et D — « SKIN1004 Centella Ampoule 49 → 48, à examiner (fiche centella) » : c'est le Tea-Trica Relief Ampoule (23 ingrédients). L'étalon Centella Ampoule (7 ingrédients) fait **53 → 65** (prérequis satisfait par la centella en position 2). Corriger la ligne, retirer l'entrée D.
3. Tableau E — « The Ordinary Squalane 100 % (classé démaquillant) 74 → 72 » : c'est le Squalane Cleanser (20 ingrédients). Le 100 % Plant-Derived Squalane (n = 1, hydratant) reste à **47 → 47** avec « nothing here draws in water » −12 : la règle « minimaliste » de B4(b) note mais ne lève pas le prérequis ; attendu 65. À mettre en D avec Serozinc.
4. Tableau E — « Neutrogena Hydro Boost SPF 50 (octocrylène, parfum) 73 → 73, attendu 60 » : le 73 est le Hyaluronic Acid Moisturizer SPF 50 (sans parfum) ; le libellé et l'attendu 60 sont ceux du Water Gel Lotion Sunscreen SPF 50 (**59 → 58**, parfum + alcool dénaturé). Une ligne par produit.
5. Tableau E — « Weleda Skin Food US 42 → 42, formule sévère (12 allergènes) » : le 42 est la fiche « Travel Size Clear 40 Count », INCI corrompue (jetons « 1 », alcool remonté en position 5). La fiche US propre (Face Care Nourishing Day Cream, 4 allergènes déclarés) fait **55 → 53**. L'écart FR/US est 77 / 53, pas 73 / 42.
6. Section F — « 16 % des produits changent de bande (1 057 montent, 1 350 descendent) » : 2 407 produits ≠ 16 % de 2 916 ; ce sont les notes qui bougent, pas les bandes. Reformuler.

## 3. Triches encore ouvertes, absentes de la section D

1. **Catégorie par le nom (catalogue, pas seulement scan)** : même INCI, CeraVe Hydrating Cleanser en « makeup remover / cleansing milk » **84** contre 69 en nettoyant (+15) ; Vanicream Moisturizing Cream en démaquillant 82 contre 70 (+12), en « indéterminé » 76 (+6). Le « min des deux grilles » de D ne vaut que pour le scan à catégorie incertaine ; au catalogue, le nom vote avec le poids 3 (`categorise.mjs`).
2. **Eau thermale de marque en position 1** : « Avene Thermal Spring Water (Avene Aqua) » est un actif power 2 « redness » → sérum eau + glycérine 50 → **65** (le prérequis B7 est satisfait par l'eau) et « +7 targets your redness » en perso rougeurs. Fermée seulement si l'alias G1 « eaux thermales → base eau » couvre les deux graphies et les autres marques (LRP, Uriage, Vichy volcanique) : à vérifier à l'implémentation.
3. **Synonymes non canonicalisés** : « Ceramide NP » + « Ceramide 3 » (même molécule) comptent deux fois : crème 72 → **79** contre 76 avec un seul (+3) ; idem Tocopherol / Vitamin E, Hyaluronic Acid / Sodium Hyaluronate. B3 ne dédoublonne que par nom exact après retrait des parenthèses.
