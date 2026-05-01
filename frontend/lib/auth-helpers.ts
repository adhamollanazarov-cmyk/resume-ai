import "server-only";

import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { syncUserRecord } from "@/lib/backend";

const DEMO_AUTH_ENABLED = process.env.NEXT_PUBLIC_DEMO_AUTH === "true";

function getDemoUser() {
  return {
    id: "demo-user",
    email: "demo@resume-ai.app",
    name: "Demo User",
    image: null,
    plan: "free" as const,
    analysisCount: 0,
  };
}

export function isDemoAuthEnabled() {
  return DEMO_AUTH_ENABLED;
}

export async function getCurrentSession() {
  if (DEMO_AUTH_ENABLED) {
    return {
      user: getDemoUser(),
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    } satisfies Session;
  }

  return auth();
}

export async function requireCurrentUser() {
  if (DEMO_AUTH_ENABLED) {
    return getDemoUser();
  }

  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  try {
    const syncedUser = await syncUserRecord({
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    });

    return {
      ...session.user,
      id: String(syncedUser.id),
      email: syncedUser.email,
      name: syncedUser.name,
      image: syncedUser.image,
      plan: syncedUser.plan,
      analysisCount: syncedUser.analysis_count,
    };
  } catch {
    return {
      ...session.user,
      id: session.user.id ?? "",
      plan: session.user.plan ?? "free",
      analysisCount: session.user.analysisCount ?? 0,
    };
  }
}
