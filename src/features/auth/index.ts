import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "./password";

/* Auth.js (NextAuth v5) — PASSWORDLESS : Google OAuth + lien magique (Resend), via
   l'adaptateur Prisma. Credentials (email + mot de passe) est CONSERVÉ le temps de
   migrer l'inscription du checkout en passwordless (il attache le scan sans redirection).
   Sessions JWT. Protection des routes via le layout serveur (espace), pas de middleware
   Edge (Prisma 7 ne tourne pas sur l'Edge runtime). */

declare module "next-auth" {
  interface Session {
    user: { id: string; lifetimeAccess: boolean } & DefaultSession["user"];
  }
  interface User {
    lifetimeAccess?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Le webhook Stripe pré-crée le User (email payé) SANS Google lié → sans ça,
      // se connecter avec Google au même email échoue (OAuthAccountNotLinked) et
      // renvoie en boucle sur /login. Google vérifie les emails → liaison sûre.
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name, lifetimeAccess: user.lifetimeAccess };
      },
    }),
  ],
  callbacks: {
    // À la connexion : on LIT l'accès réel en base (posé par le webhook Stripe après
    // paiement) et on fige id + lifetimeAccess dans le token. Plus de grant simulé :
    // seul un vrai paiement débloque l'accès.
    jwt: async ({ token, user }) => {
      if (user?.id) {
        const u = await db.user
          .findUnique({ where: { id: user.id }, select: { lifetimeAccess: true } })
          .catch(() => null);
        const t = token as Record<string, unknown>;
        t.uid = user.id;
        t.lifetimeAccess = u?.lifetimeAccess ?? false;
      }
      return token;
    },
    session: ({ session, token }) => {
      const t = token as Record<string, unknown>;
      session.user.id = (t.uid as string | undefined) ?? "";
      session.user.lifetimeAccess = (t.lifetimeAccess as boolean | undefined) ?? false;
      return session;
    },
  },
});
