import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { JWT } from "next-auth/jwt";

import { getUserById } from "@/data/user";
import { db } from "./lib/db";
import authConfig from "@/auth.config";
import { getTwoFactorConfirmationByUserId } from "./data/two-factor-confirmation";
import { getAccountByUserId } from "./data/account";

declare module "next-auth" {
  interface User {
    role: "ADMIN" | "USER";
    isTwoFactorEnabled: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "ADMIN" | "USER";
    isTwoFactorEnabled: boolean;
    sub: string;
    email: string | null;
    isOAuth: boolean;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  events: {
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      //Allow OAuth without email verification
      if (account?.provider !== "credentials") return true;

      //Prevent sign in without email verification

      const existingUser = await getUserById(user.id!);
      if (!existingUser?.emailVerified) return false;

      if (existingUser.isTwoFactorEnabled) {
        const twoFactorConfirmation = await getTwoFactorConfirmationByUserId(
          existingUser.id
        );

        if (!twoFactorConfirmation) return false;

        //Delete two factor confirmation for next sign in
        await db.twoFactorConfirmation.delete({
          where: {
            id: twoFactorConfirmation.id,
          },
        });
      }

      return true;
    },
    async session({ token, session }) {
      if (session.user) {
        if (token.email) {
          session.user.email = token.email;
        }

        session.user.isTwoFactorEnabled = token.isTwoFactorEnabled;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.id = token.sub;
        session.user.isOAuth = token.isOAuth;
      }

      return session;
    },
    async jwt({ token }) {
      if (!token.sub) return token;

      const existingUser = await getUserById(token.sub);

      if (!existingUser) return token;

      const existingAccount = await getAccountByUserId(existingUser.id);

      token.isOAuth = !!existingAccount;
      token.name = existingUser.name;
      token.email = existingUser.email;
      token.role = existingUser.role;
      token.isTwoFactorEnabled = existingUser.isTwoFactorEnabled;

      return token;
    },
  },
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
});
