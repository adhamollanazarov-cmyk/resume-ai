export type AIAnalysisResult = {
  match_score: number;
  score_reasoning: string;
  missing_skills: string[];
  keyword_gaps: string[];
  resume_improvements: string[];
  rewritten_bullets: string[];
  optimized_resume: string;
  cover_letter: string;
  risk_flags: string[];
};

export type AnalysisListItem = {
  id: number;
  job_description: string;
  match_score: number | null;
  created_at: string;
};

export type AnalysisDetail = {
  id: number;
  resume_text_preview: string;
  job_description: string;
  analysis_json: AIAnalysisResult;
  created_at: string;
};

export type AnalyzeResponse = {
  resume_text_preview: string;
  job_description: string;
  analysis: AIAnalysisResult | null;
  status: string;
};

export type DownloadFile = {
  blob: Blob;
  fileName: string;
};

export type CheckoutSessionResponse = {
  url: string;
};

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL;

function getBackendApiUrl(path: string): string {
  if (!BACKEND_API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }

  const baseUrl = BACKEND_API_URL.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");

  return `${baseUrl}/${cleanPath}`;
}

function getDownloadFileName(response: Response, fallbackName: string): string {
  const disposition = response.headers.get("Content-Disposition") ?? response.headers.get("content-disposition");
  if (!disposition) {
    return fallbackName;
  }

  const match = disposition.match(/filename="([^"]+)"/i);
  return match?.[1] ?? fallbackName;
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = typeof errorBody?.detail === "string" ? errorBody.detail : fallbackMessage;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function analyzeResume(formData: FormData): Promise<AnalyzeResponse> {
  let response: Response;

  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("Cannot connect to backend.");
  }

  return parseResponse<AnalyzeResponse>(response, "Resume analysis failed. Please check the file and try again.");
}

export async function createCheckoutSession(): Promise<CheckoutSessionResponse> {
  let response: Response;

  try {
    response = await fetch("/api/billing/create-checkout-session", {
      method: "POST",
    });
  } catch {
    throw new Error("Cannot connect to billing.");
  }

  return parseResponse<CheckoutSessionResponse>(response, "Could not start the upgrade checkout.");
}

export async function createPortalSession(): Promise<CheckoutSessionResponse> {
  let response: Response;

  try {
    response = await fetch("/api/billing/create-portal-session", {
      method: "POST",
    });
  } catch {
    throw new Error("Cannot connect to billing.");
  }

  return parseResponse<CheckoutSessionResponse>(response, "Could not open the billing portal.");
}

export async function getAnalyses(): Promise<AnalysisListItem[]> {
  let response: Response;
  const searchParams = new URLSearchParams({
    limit: "20",
    offset: "0",
  });

  try {
    response = await fetch(`${getBackendApiUrl("/api/analyses")}?${searchParams.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot connect to backend.");
  }

  return parseResponse<AnalysisListItem[]>(response, "Failed to load analyses.");
}

export async function getAnalysis(id: number): Promise<AnalysisDetail> {
  let response: Response;

  try {
    response = await fetch(getBackendApiUrl(`/api/analyses/${id}`), {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot connect to backend.");
  }

  return parseResponse<AnalysisDetail>(response, "Failed to load analysis detail.");
}

export async function downloadOptimizedResume(optimizedResume: string): Promise<DownloadFile> {
  let response: Response;

  try {
    response = await fetch("/api/download-optimized", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ optimized_resume: optimizedResume }),
    });
  } catch {
    throw new Error("Cannot connect to backend.");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      typeof errorBody?.detail === "string" ? errorBody.detail : "Could not prepare the optimized resume download.";
    throw new Error(message);
  }

  return {
    blob: await response.blob(),
    fileName: getDownloadFileName(response, "optimized-resume.txt"),
  };
}
