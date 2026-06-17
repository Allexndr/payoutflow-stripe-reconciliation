import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, users } from "@/db";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (!isDatabaseConfigured()) return null;

        const db = getDb();
        const row = (
          await db
            .select()
            .from(users)
            .where(eq(users.email, String(credentials.email)))
            .limit(1)
        )[0];
        if (!row?.passwordHash) return null;
        const ok = await verifyPassword(
          row.passwordHash,
          String(credentials.password),
        );
        if (!ok) return null;
        return { id: row.id, email: row.email };
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const loggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      if (path.startsWith("/login") || path.startsWith("/register")) {
        return true;
      }
      if (path.startsWith("/dashboard") || path.startsWith("/settings")) {
        return loggedIn;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
