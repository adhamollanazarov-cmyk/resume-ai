import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";

import { syncUserRecord } from "@/lib/backend";

const resolvedAuthUrl =
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
const resolvedAuthSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

if (!process.env.NEXTAUTH_URL && resolvedAuthUrl) {
  process.env.NEXTAUTH_URL = resolvedAuthUrl;
}

if (!process.env.AUTH_URL && resolvedAuthUrl) {
  process.env.AUTH_URL = resolvedAuthUrl;
}

if (!process.env.NEXTAUTH_SECRET && resolvedAuthSecret) {
  process.env.NEXTAUTH_SECRET = resolvedAuthSecret;
}

if (!process.env.AUTH_SECRET && resolvedAuthSecret) {
  process.env.AUTH_SECRET = resolvedAuthSecret;
}

const githubClientId = process.env.GITHUB_CLIENT_ID ?? "";
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET ?? "";
const authSecret = resolvedAuthSecret;

function logAuthIssue(message: string, error?: unknown, context?: Record<string, string | undefined>) {
  const safeError =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
        }
      : error;

  const safeContext = context
    ? Object.fromEntries(Object.entries(context).filter(([, value]) => typeof value === "string" && value.trim().length > 0))
    : undefined;

  console.error("[auth]", message, {
    error: safeError,
    context: safeContext,
  });
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV !== "production",
  secret: authSecret,
  pages: {
    signIn: "/login",
  },
  logger: {
    error(code, metadata) {
      logAuthIssue(`NextAuth error: ${code}`, metadata);
    },
    warn(code) {
      console.warn("[auth]", code);
    },
  },
  providers: [
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        logAuthIssue("GitHub sign-in completed without an email address.", undefined, {
          provider: "github",
        });
        return true;
      }

      try {
        await syncUserRecord({
          email: user.email,
          name: user.name,
          image: user.image,
        });
      } catch (error) {
        logAuthIssue("User sync failed during sign in, continuing with OAuth session.", error, {
          provider: "github",
        });
      }

      return true;
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
      } catch (error) {
        logAuthIssue("User sync failed during JWT refresh, preserving the OAuth token.", error, {
          provider: "github",
        });
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
