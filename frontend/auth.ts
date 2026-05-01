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

function logAuthIssue(
  message: string,
  error?: unknown,
  context?: Record<string, string | undefined>
) {
  const safeError =
    error instanceof Error
      ? { name: error.name, message: error.message }
      : error;

  const safeContext = context
    ? Object.fromEntries(
        Object.entries(context).filter(
          ([, value]) => typeof value === "string" && value.trim().length > 0
        )
      )
    : undefined;

  console.error("[auth]", message, { error: safeError, context: safeContext });
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
    // FIX 1: Removed redundant syncUserRecord call here.
    // The jwt callback always runs right after signIn and handles syncing.
    async signIn({ user }) {
      if (!user.email) {
        logAuthIssue(
          "GitHub sign-in completed without an email address.",
          undefined,
          { provider: "github" }
        );
      }
      return true;
    },

    // FIX 2: Only sync on initial sign-in or explicit session update,
    // not on every request. The `user` object is only present on sign-in.
    async jwt({ token, user, trigger }) {
  if (!user && trigger !== "update") return token;
  if (!token.email) return token;

  try {
    const syncedUser = await syncUserRecord({ ... });
    token.userId = syncedUser.id;
    token.plan = syncedUser.plan;
    token.analysisCount = syncedUser.analysis_count;
    token.name = syncedUser.name ?? token.name;
    token.picture = syncedUser.image ?? token.picture;
  } catch (error) {
    // Backend missing endpoint — allow login anyway
    console.error("[auth] syncUserRecord failed:", error);
    token.plan = "free";
    token.analysisCount = 0;
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