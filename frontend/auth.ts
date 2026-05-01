import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";

import { syncUserRecord } from "@/lib/backend";

if (!process.env.NEXTAUTH_URL && process.env.AUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.AUTH_URL;
}

const githubClientId = process.env.GITHUB_CLIENT_ID ?? "";
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET ?? "";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      try {
        await syncUserRecord({
          email: user.email,
          name: user.name,
          image: user.image,
        });
        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, user }) {
      if (!token.email) {
        return token;
      }

      try {
        const syncedUser = await syncUserRecord({
          email: token.email,
          name: user?.name ?? (typeof token.name === "string" ? token.name : null),
          image: user?.image ?? (typeof token.picture === "string" ? token.picture : null),
        });

        token.userId = syncedUser.id;
        token.plan = syncedUser.plan;
        token.analysisCount = syncedUser.analysis_count;
        token.name = syncedUser.name ?? token.name;
        token.picture = syncedUser.image ?? token.picture;
      } catch {
        return token;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? "");
        session.user.plan = token.plan === "pro" ? "pro" : "free";
        session.user.analysisCount = Number(token.analysisCount ?? 0);
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
