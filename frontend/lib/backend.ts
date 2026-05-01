import "server-only";

import type { AnalysisDetail, AnalysisListItem } from "@/lib/api";

// ============================================================
// Types
// ============================================================

type SyncedUser = {
  analysis_count: number;
  email: string;
  id: number;
  image: string | null;
  name: string | null;
  plan: "free" | "pro";
};

// ============================================================
// Config helpers
// ============================================================

function getBackendBaseUrl(): string {
  const value = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL)?.replace(/\/+$/, "");

  if (!value) {
    throw new Error("API_URL is not configured.");
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

// ============================================================
// Core fetch helper — timeout + error parsing in one place
// ============================================================

const DEFAULT_TIMEOUT_MS = 8000;

async function backendFetch(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getBackendBaseUrl()}${path}`, {
      ...fetchOptions,
      cache: "no-store",
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Backend request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function parseBackendJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      typeof errorBody?.detail === "string" ? errorBody.detail : fallbackMessage;
    throw new Error(`${message} (status ${response.status})`);
  }
  return response.json() as Promise<T>;
}

function internalHeaders(extra: Record<string, string> = {}): Headers {
  return new Headers({
    "X-Internal-API-Secret": getInternalApiSecret(),
    ...extra,
  });
}

// ============================================================
// Auth
// ============================================================

export async function syncUserRecord(payload: {
  email: string;
  image?: string | null;
  name?: string | null;
}): Promise<SyncedUser> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${getBackendBaseUrl()}/api/auth/sync-user`, {
      method: "POST",
      headers: internalHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Could not sync the signed-in user. Request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  return parseBackendJsonResponse<SyncedUser>(
    response,
    "Could not sync the signed-in user.",
  );
}

// ============================================================
// CV / Resume
// ============================================================

export async function forwardAnalyzeRequest(
  formData: FormData,
  userId?: string,
): Promise<Response> {
  const headers = new Headers();

  if (userId) {
    headers.set("X-Internal-API-Secret", getInternalApiSecret());
    headers.set("X-User-Id", userId);
  }

  return backendFetch("/api/cv/analyze", {
    method: "POST",
    headers,
    body: formData,
    timeoutMs: 60_000, // analysis can take longer
  });
}

export async function requestOptimizedResumeDownload(
  optimizedResume: string,
): Promise<Response> {
  return backendFetch("/api/cv/download-optimized", {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ optimized_resume: optimizedResume }),
  });
}

// ============================================================
// Stripe / Billing
// ============================================================

export async function createUpgradeCheckoutSession(
  userId: string,
): Promise<Response> {
  return backendFetch("/api/stripe/create-checkout", {
    method: "POST",
    headers: internalHeaders({ "X-User-Id": userId }),
  });
}

export async function createBillingPortalSession(
  userId: string,
): Promise<Response> {
  return backendFetch("/api/stripe/portal", {
    method: "GET",
    headers: internalHeaders({ "X-User-Id": userId }),
  });
}

// ============================================================
// Account / Analyses
// ============================================================

export async function getUserAnalyses(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<AnalysisListItem[]> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 20),
    offset: String(options.offset ?? 0),
  });

  const response = await backendFetch(
    `/api/account/analyses?${params.toString()}`,
    {
      method: "GET",
      headers: internalHeaders({ "X-User-Id": userId }),
    },
  );

  return parseBackendJsonResponse<AnalysisListItem[]>(
    response,
    "Could not load your analyses.",
  );
}

export async function getUserAnalysis(
  userId: string,
  analysisId: number,
): Promise<AnalysisDetail | null> {
  const response = await backendFetch(
    `/api/account/analyses/${analysisId}`,
    {
      method: "GET",
      headers: internalHeaders({ "X-User-Id": userId }),
    },
  );

  if (response.status === 404) return null;

  return parseBackendJsonResponse<AnalysisDetail>(
    response,
    "Could not load that analysis.",
  );
}
console.log("SYNC URL:", process.env.NEXT_PUBLIC_API_URL);
console.log("Calling sync-user...");
const apiUrl = process.env.API_URL;

console.log("SYNC URL:", apiUrl);