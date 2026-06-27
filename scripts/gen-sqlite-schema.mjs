// Dérive prisma/schema.sqlite.prisma depuis le schéma Postgres (source de vérité,
// committé pour Render) en basculant le provider en sqlite. Le fichier dérivé est
// gitignored et sert uniquement au dev local (`npm run db:push`).
// Prérequis : le schéma reste SQLite-compatible (Json/TEXT, pas d'enum ni d'array).
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "prisma/schema.prisma";
const OUT = "prisma/schema.sqlite.prisma";

const pg = readFileSync(SRC, "utf8");
const sqlite = pg.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');

if (sqlite === pg) {
  console.error(`[gen-sqlite-schema] provider "postgresql" introuvable dans ${SRC}`);
  process.exit(1);
}

writeFileSync(
  OUT,
  `// ⚠️ GÉNÉRÉ — ne pas éditer. Dérivé de ${SRC} par scripts/gen-sqlite-schema.mjs (dev SQLite).\n` + sqlite
);
console.log(`[gen-sqlite-schema] ${OUT} généré (provider=sqlite).`);
