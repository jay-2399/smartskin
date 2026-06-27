import { defineConfig } from "prisma/config";

// Prisma 7 : l'URL de connexion vit ici (CLI migrate), plus dans schema.prisma.
// En local, exporter DATABASE_URL avant les commandes prisma (le CLI ne lit pas .env).
// Dev SQLite (DATABASE_URL « file:… ») → schéma dérivé ; sinon Postgres (prod/Render).
const sqlite = (process.env.DATABASE_URL ?? "").startsWith("file:");

export default defineConfig({
  schema: sqlite ? "prisma/schema.sqlite.prisma" : "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
