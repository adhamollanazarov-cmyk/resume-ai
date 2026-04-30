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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getApiUrl(path: string): string {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }

  return new URL(path, API_URL).toString();
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
    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    response = await fetch(getApiUrl("/api/cv/analyze"), {
    method: "POST",
    body: formData
  });
  } catch {
    throw new Error("Cannot connect to backend.");
  }

  return parseResponse<AnalyzeResponse>(response, "Resume analysis failed. Please check the file and try again.");
}

export async function getAnalyses(): Promise<AnalysisListItem[]> {
  let response: Response;
  const searchParams = new URLSearchParams({
    limit: "20",
    offset: "0",
  });

  try {
    response = await fetch(`${getApiUrl("/api/analyses")}?${searchParams.toString()}`, {
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
    response = await fetch(getApiUrl(`/api/analyses/${id}`), {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot connect to backend.");
  }

  return parseResponse<AnalysisDetail>(response, "Failed to load analysis detail.");
}
