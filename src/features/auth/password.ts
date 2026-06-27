import bcrypt from "bcryptjs";

/* Hash / vérification de mot de passe (bcrypt). Côté serveur uniquement. */

const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
