// CE QU'ON RÉPOND QUAND ON NE PEUT PAS NOTER (audit du 7 septembre, B4).
// Le moteur dit `evaluable: false` et pourquoi ; les trois routes qui notent renvoient toutes la
// même forme, pour que les écrans n'aient qu'un seul cas à connaître. Le produit et ses
// ingrédients restent renvoyés : on continue de montrer ce qu'on a lu, on refuse seulement d'en
// tirer un chiffre.

export type Raison = "solaire-sans-filtre" | "liste-courte" | "lecture-partielle";

const MESSAGES: Record<Raison, string> = {
  "solaire-sans-filtre":
    "No UV filter in this ingredient list — a sunscreen always has one, so the list is incomplete. We'd rather not score it than score it wrong.",
  "liste-courte":
    "This ingredient list is too short to be complete. We'd rather not score it than score it wrong.",
  "lecture-partielle":
    "Part of the label was cut off. Retake the photo with the whole list in frame.",
};

const PAR_DEFAUT = "We can't read this ingredient list well enough to score it.";

/** La charge utile `score` d'un produit qu'on ne peut pas noter. `raison` vient du moteur
 *  (`scoreFormule().raison`), qui la type comme une chaîne : un motif inconnu reste affichable
 *  plutôt que de faire tomber la route (contrainte moteur.ts : rien ne doit jeter ici). */
export function scoreNonEvaluable(raison: string | null) {
  return { disponible: false, statut: "non-evaluable", raison,
           message: MESSAGES[raison as Raison] ?? PAR_DEFAUT };
}
