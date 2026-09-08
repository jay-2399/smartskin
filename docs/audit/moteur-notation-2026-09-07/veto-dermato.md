# Veto dermato sur le rapport final

Chiffres nouveaux : catalogue en périmètre (2 950 produits), moteur actuel, script inline (lecture seule).

## 1. Verdicts B1-B11

- **B1 — OK avec réserve.** `TRIS-BIPHENYL TRIAZINE` (Tinosorb A2B) couvre UVB + UVA2 (jusqu'à ~340 nm), pas l'UVA1 : le mettre `filtre-uvb` seul, par cohérence avec le traitement du TiO2. Sans effet aujourd'hui (0 produit du catalogue, fiche absente).
- **B2 — OK.**
- **B3 — OK avec réserve.** Hamamélis (« à confirmer ») : je confirme power 1 partout (quatre fiches sont encore à power 2 : `WITCH HAZEL`, `HAMAMELIS VIRGINIANA LEAF EXTRACT`, `… (WITCH HAZEL)`, `… BARK/LEAF/TWIG EXTRACT`) et irritant 1 (tanins), mais je GARDE `redness` : le distillat a un effet anti-érythème modeste documenté (Hughes-Formella 1998, *Dermatology*). Retirer le bénéfice serait aussi faux que le power 2.
- **B4 — OK.**
- **B5 — OK avec réserve.** Le coût formule du parfum reste −13 en rincé contre −14 en posé alors que les seuils UE de déclaration sont ×10 (0,01 % vs 0,001 %) ; arbitrage 6 accepté (mesure), mais le point doit figurer en D pour B11 (voir §3).
- **B6 — OK.**
- **B7 — VETO sur la clause (5) uniquement** (`lowDose` : w = 1 en positions 1-10 ou avant la barre, 0,6 au-delà). Fait : sur les 252 occurrences de rétinoïdes `lowDose` du catalogue, **198 (79 %) sont au-delà de la position 10 ou de la barre** ; barre des 1 % médiane dans les produits au rétinol = position 21, rétinol médian = position 16. Un rétinol à 0,3 % est légalement listé n'importe où sous la barre ; la règle rétrograde donc le cas normal (79 % des vrais rétinols, 88 % des peptides) pour un cas de triche que le document reconnaît lui-même indétectable (« la position ne distingue pas 0,3 % de 0,01 % »). Les étalons mesurés (rétinol construit en position 8, PC 1 % Retinol) sont dans les 21 % non touchés. **Remplacement :** `lowDose` → w = 1 quelle que soit la position (326-331 inchangé) ; le résiduel « Retinol en queue » est accepté au même titre que le +3 déjà accepté, et mesuré en D. Clauses (1)-(4) et (6) : OK. Réserve sur (3) : « humectant actif à toute position » est juste pour le hyaluronate (efficace < 1 %, à marquer `lowDose: true` sur `SODIUM HYALURONATE` / `HYALURONIC ACID` / hydrolysés) mais pas pour panthénol ou bétaïne, dosés 1-5 % et donc en trace s'ils sont sous la barre : limiter la clause aux humectants `lowDose`.
- **B8 — OK.**
- **B9 — VETO sur la portée du ban, remplacement d'une ligne.** Le texte traite tout `banniUE` en rincé par « −5 × exposition (la MI reste légale en rincé) ». C'est vrai pour la méthylisothiazolinone seule (Règl. (UE) 2016/1198 posé, 2017/1224 rincé 15 ppm). Lilial (`BUTYLPHENYL METHYLPROPIONAL`, CMR 1B, Règl. (UE) 2021/1902, interdit dans TOUS les cosmétiques depuis le 1er mars 2022), Lyral (`HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE`, Règl. (UE) 2017/1410) et l'hydroquinone sont interdits rincés compris. Catalogue : **5 produits rincés** en contiennent (Jack Black Face Buff et All-Over Wash, Lancôme Galatée Confort, Nip+Fab Glycolic Night Pads, Paula's Choice Triple-Action Dark Spot) et prendraient −2,75 à −4,25 au lieu du plafond. **Remplacement :** champ `banniUEPortee: "tous" | "pose"` ; « tous » (Lilial, Lyral, hydroquinone) → cap 45 quelle que soit l'exposition ; « pose » (MI) → cap 45 si `exposition ≥ 1`, sinon −5 × exposition. Le reste de B9 : OK.
- **B10 — OK.**
- **B11 — OK.**

## 2. Erreurs factuelles

- G1, drapeaux : « `1,3-PROPANEDIOL` : role support (pas humectant) » — le rôle `humectant` est invalide, oui, mais le propanediol EST un humectant : mettre `role: support` ET `fonctions: ["humectant"]` (comme `PROPANEDIOL`, déjà correct), sinon un hydratant à base de propanediol échoue au prérequis `@humectant`. Idem `1,2-HEPTANEDIOL` (humectant/booster).
- B9 et G2 #11 : portée du `banniUE` (voir veto B9) — trois des quatre substances bannies le sont rincé compris.
- D, ligne Thayers / G1 : « hamamélis, benefits sans `redness` » — voir B3 : power 1, `redness` conservé, irritant 1.
- B1 / G1 : `TRIS-BIPHENYL TRIAZINE` n'est pas un filtre UVA1 (voir B1).

## 3. À ajouter à la section D

- **Parfum en rincé : −13 contre −14 en posé** (mérite `sansParfum` non pondéré par l'exposition), contraire aux seuils UE ×10 ; à traiter dans B11 en pondérant le mérite par `exposition` avec compensation du budget de la grille, pour ne pas reproduire la baisse des nettoyants sans parfum qui a fait rejeter D10.
- **Résiduel « rétinol en queue » avec `lowDose` w = 1 partout** (conséquence du veto B7-5) : mesurer sur TO Niacinamide + Retinol et sur les 198 rétinols réels rétrogradés par la clause retirée ; l'écart entre ces deux mesures est le vrai prix de la règle.
- **Portée des bans dans le dictionnaire** : 4 fiches `banniUE` sans champ de portée aujourd'hui ; à documenter avec la référence réglementaire et la date (Lilial 2022, Lyral 2021, MI posé 2017 / rincé 15 ppm 2018) pour que le prochain audit n'ait pas à le retrouver.
