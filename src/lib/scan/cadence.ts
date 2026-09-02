/* CADENCE DU SCAN VISAGE : un bilan tous les 7 jours, pas plus.
   Un seul endroit décide, pour que le serveur (/api/scan refuse), l'API (/api/moi/bilan
   annonce la prochaine date) et les écrans (boutons « Face scan ») disent la même chose.
   La peau ne change pas en trois jours ; deux bilans rapprochés ne font que bruiter la
   courbe et consommer une analyse IA. */

export const JOURS_ENTRE_SCANS = 7;
const JOUR_MS = 24 * 60 * 60 * 1000;

/** Date à partir de laquelle un nouveau scan est permis, après un bilan daté `dernier`. */
export function prochainScan(dernier: Date): Date {
  return new Date(dernier.getTime() + JOURS_ENTRE_SCANS * JOUR_MS);
}

/** Peut-on scanner maintenant ? `dernier` absent = jamais scanné = oui. */
export function peutScanner(dernier: Date | null | undefined, maintenant: Date = new Date()): boolean {
  if (!dernier) return true;
  return maintenant.getTime() >= prochainScan(dernier).getTime();
}
