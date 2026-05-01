import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { syncUserRecord } from "@/lib/backend";

export async function getCurrentSession() {
  return auth();
}

export async function requireCurrentUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
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
    return session.user;
  }
}
