import { defineConfig } from "prisma/config";

// Prisma 7 : l'URL de connexion vit ici (CLI migrate), plus dans schema.prisma.
// En local, exporter DATABASE_URL avant les commandes prisma (le CLI ne lit pas .env).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
