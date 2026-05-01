import "server-only";

import type { AnalysisDetail, AnalysisListItem } from "@/lib/api";

type SyncedUser = {
  analysis_count: number;
  email: string;
  id: number;
  image: string | null;
  name: string | null;
  plan: "free" | "pro";
};

function getBackendBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!value) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured on the frontend.");
  }

  return value;
}

function getInternalApiSecret(): string {
  const value = process.env.INTERNAL_API_SECRET?.trim();
  if (!value) {
    throw new Error("INTERNAL_API_SECRET is not configured on the frontend.");
  }

  return value;
}

async function parseBackendJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = typeof errorBody?.detail === "string" ? errorBody.detail : fallbackMessage;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function syncUserRecord(payload: {
  email: string;
  image?: string | null;
  name?: string | null;
}): Promise<SyncedUser> {
  const response = await fetch(`${getBackendBaseUrl()}/api/auth/sync-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-API-Secret": getInternalApiSecret(),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not sync the signed-in user.");
  }

  return response.json() as Promise<SyncedUser>;
}

export async function forwardAnalyzeRequest(formData: FormData, userId?: string): Promise<Response> {
  const headers = new Headers();

  if (userId) {
    headers.set("X-Internal-API-Secret", getInternalApiSecret());
    headers.set("X-User-Id", userId);
  }

  return fetch(`${getBackendBaseUrl()}/api/cv/analyze`, {
    method: "POST",
    headers,
    body: formData,
    cache: "no-store",
  });
}

export async function createUpgradeCheckoutSession(userId: string): Promise<Response> {
  const headers = new Headers({
    "X-Internal-API-Secret": getInternalApiSecret(),
    "X-User-Id": userId,
  });

  return fetch(`${getBackendBaseUrl()}/api/billing/create-checkout-session`, {
    method: "POST",
    headers,
    cache: "no-store",
  });
}

export async function createBillingPortalSession(userId: string): Promise<Response> {
  const headers = new Headers({
    "X-Internal-API-Secret": getInternalApiSecret(),
    "X-User-Id": userId,
  });

  return fetch(`${getBackendBaseUrl()}/api/billing/create-portal-session`, {
    method: "POST",
    headers,
    cache: "no-store",
  });
}

export async function getUserAnalyses(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<AnalysisListItem[]> {
  const headers = new Headers({
    "X-Internal-API-Secret": getInternalApiSecret(),
    "X-User-Id": userId,
  });
  const searchParams = new URLSearchParams({
    limit: String(options.limit ?? 20),
    offset: String(options.offset ?? 0),
  });
  const response = await fetch(`${getBackendBaseUrl()}/api/account/analyses?${searchParams.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  return parseBackendJsonResponse<AnalysisListItem[]>(response, "Could not load your analyses.");
}

export async function getUserAnalysis(userId: string, analysisId: number): Promise<AnalysisDetail | null> {
  const headers = new Headers({
    "X-Internal-API-Secret": getInternalApiSecret(),
    "X-User-Id": userId,
  });
  const response = await fetch(`${getBackendBaseUrl()}/api/account/analyses/${analysisId}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  return parseBackendJsonResponse<AnalysisDetail>(response, "Could not load that analysis.");
}
