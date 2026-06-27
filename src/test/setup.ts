// En test, le client Prisma local est généré pour SQLite (dev) → on force une URL
// « file: » pour que src/lib/db.ts sélectionne l'adapter SQLite correspondant.
process.env.DATABASE_URL ||= "file:./prisma/dev.db";

import "@testing-library/jest-dom/vitest";
