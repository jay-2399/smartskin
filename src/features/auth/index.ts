import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "./password";
import { verifyAppleIdToken } from "./apple";

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
    // Sign in with Apple (app iOS native) : le natif obtient un jeton d'identité,
    // le web appelle signIn("apple", { idToken, mode }). On vérifie le jeton, puis
    // `mode` décide si un compte absent doit être créé ou non.
    Credentials({
      id: "apple",
      name: "Apple",
      credentials: { idToken: {}, name: {}, mode: {} },
      authorize: async (creds) => {
        const idToken = String(creds?.idToken ?? "");
        if (!idToken) return null;
        const identity = await verifyAppleIdToken(idToken).catch(() => null);
        if (!identity) return null;

        // mode "login" = bouton « Already have an account? Log in » de l'accueil. Un
        // Apple ID sans compte SmartSkin ne doit RIEN créer : sinon le bouton inscrit en
        // douce puis dépose l'utilisateur sur le questionnaire — le bug signalé par Apple
        // (rejet 2026-07-30, Guideline 2.1(a)). Ici, pas de compte = pas de session.
        if (creds?.mode === "login") {
          const user = await db.user.findUnique({ where: { email: identity.email } });
          if (!user) return null;
          return { id: user.id, email: user.email, name: user.name, lifetimeAccess: user.lifetimeAccess };
        }

        // Sinon (écran d'APRÈS-PAIEMENT) : créer/retrouver le compte est bien le rôle de
        // l'écran. Apple ne fournit le nom qu'au 1ᵉ login → on le pose à la création, et on
        // complète un compte existant qui n'en aurait pas (update seulement si nom fourni).
        const appleName = String(creds?.name ?? "").trim() || null;
        const user = await db.user.upsert({
          where: { email: identity.email },
          update: appleName ? { name: appleName } : {},
          create: { email: identity.email, name: appleName, emailVerified: new Date() },
        });
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
