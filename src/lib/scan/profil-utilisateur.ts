import { profil } from "@/lib/scan/moteur";

/** Profil de peau d'UN utilisateur — la couture entre le moteur et le compte.
 *  v1 : tout le monde reçoit data/scan/profil.json (même lecture que moteur.ts) ; le quiz
 *  in-app branchera plus tard le vrai profil ici, sans toucher aux routes qui l'appellent. */
export async function profilUtilisateur(uid: string | null) {
  void uid; // pas encore utilisé — v1 sert le même profil à tous
  return profil();
}
