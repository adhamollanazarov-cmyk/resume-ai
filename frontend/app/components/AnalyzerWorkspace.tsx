"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

import AnalysisResult from "@/app/components/AnalysisResult";
import UpgradeBanner from "@/app/components/UpgradeBanner";
import { AnalyzeResponse, analyzeResume } from "@/lib/api";

const EMPTY_FILE_MESSAGE = "Please upload a PDF resume.";
const EMPTY_JOB_MESSAGE = "Please paste a job description.";
const LIMIT_MESSAGE = "Free analysis limit reached. Upgrade to Pro to continue.";
const MAX_CLIENT_PDF_BYTES = 5 * 1024 * 1024;
const LOADING_STEPS = ["Analyzing resume", "Matching job", "Optimizing output"];

type FeedbackState = {
  title: string;
  description: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LoadingRail({ stepIndex }: { stepIndex: number }) {
  return (
    <div aria-live="polite" className="mt-auto rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {LOADING_STEPS.map((step, index) => {
          const isComplete = index < stepIndex;
          const isCurrent = index === stepIndex;

          return (
            <div key={step} className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-all duration-200",
                  isComplete
                    ? "border-gray-900 bg-gray-900 text-white"
                    : isCurrent
                      ? "border-gray-400 text-gray-700"
                      : "border-gray-200 text-gray-300",
                ].join(" ")}
              >
                {isComplete ? "\u2713" : ""}
              </div>
              <span
                className={[
                  "truncate text-sm transition-all duration-200",
                  isComplete ? "text-gray-700" : isCurrent ? "animate-pulse text-gray-600" : "text-gray-400",
                ].join(" ")}
              >
                {step}
              </span>
              {index < LOADING_STEPS.length - 1 ? <div className="hidden h-px flex-1 bg-gray-200 sm:block" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="grid gap-5 animate-pulse">
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center">
          <div className="h-40 w-40 rounded-full bg-gray-100" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-28 rounded-full bg-gray-100" />
            <div className="mt-4 h-4 w-36 rounded-full bg-gray-100" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full rounded-full bg-gray-100" />
              <div className="h-4 w-11/12 rounded-full bg-gray-100" />
              <div className="h-4 w-8/12 rounded-full bg-gray-100" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <section key={index} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="h-3 w-20 rounded-full bg-gray-100" />
            <div className="mt-4 h-2 w-full rounded-full bg-gray-100" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full rounded-full bg-gray-100" />
              <div className="h-4 w-9/12 rounded-full bg-gray-100" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function AnalyzerWorkspace() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [pdf, setPdf] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<FeedbackState | null>(null);
  const [isLimitError, setIsLimitError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }

    setLoadingStep(0);
    const timers = [
      window.setTimeout(() => setLoadingStep(1), 900),
      window.setTimeout(() => setLoadingStep(2), 2000),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [isLoading]);

  function clearFileSelection() {
    setPdf(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setRequestError(null);
    setIsLimitError(false);

    if (nextFile && nextFile.size > MAX_CLIENT_PDF_BYTES) {
      clearFileSelection();
      setFormError("PDF file must be 5 MB or smaller.");
      return;
    }

    setPdf(nextFile);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pdf) {
      setFormError(EMPTY_FILE_MESSAGE);
      return;
    }

    if (pdf.size > MAX_CLIENT_PDF_BYTES) {
      setFormError("PDF file must be 5 MB or smaller.");
      return;
    }

    if (!jobDescription.trim()) {
      setFormError(EMPTY_JOB_MESSAGE);
      return;
    }

    const formData = new FormData();
    formData.append("pdf", pdf);
    formData.append("job_description", jobDescription.trim());

    setIsLoading(true);
    setFormError(null);
    setRequestError(null);
    setIsLimitError(false);
    setResult(null);

    try {
      const analysisResult = await analyzeResume(formData);
      setResult(analysisResult);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Resume analysis failed.";

      if (message === LIMIT_MESSAGE) {
        setIsLimitError(true);
        setRequestError({
          title: "Free plan limit reached",
          description: message,
        });
      } else if (message.startsWith("Cannot connect to backend.")) {
        setRequestError({
          title: "Cannot connect to backend",
          description: "Make sure FastAPI is running.",
        });
      } else {
        setRequestError({
          title: "Request failed",
          description: message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  const analysis = result?.analysis ?? null;
  const isSubmitDisabled = isLoading || !pdf || !jobDescription.trim();

  return (
    <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
      <form
        id="analyze-form"
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-gray-300"
      >
        <div>
          <label htmlFor="pdf" className="text-sm font-medium text-gray-900">
            Resume PDF
          </label>
          <input
            ref={inputRef}
            id="pdf"
            name="pdf"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="sr-only"
          />
          <label
            htmlFor="pdf"
            className="mt-3 flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-5 transition-all duration-200 hover:border-gray-400 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10"
          >
            <span className="text-sm font-medium text-gray-800">{pdf ? "Replace PDF" : "Choose a PDF resume"}</span>
            <span className="text-sm leading-6 text-gray-500">
              Upload a clean export of the resume you want to tailor.
            </span>
          </label>

          {pdf ? (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">{pdf.name}</p>
                <p className="mt-1 text-xs text-gray-500">{formatFileSize(pdf.size)}</p>
              </div>
              <button
                type="button"
                onClick={clearFileSelection}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-sm text-gray-500 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
                aria-label="Remove selected file"
              >
                {"\u00D7"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <label htmlFor="job_description" className="text-sm font-medium text-gray-900">
            Job description
          </label>
          <textarea
            id="job_description"
            name="job_description"
            rows={15}
            value={jobDescription}
            onChange={(event) => {
              setJobDescription(event.target.value);
              setFormError(null);
              setRequestError(null);
              setIsLimitError(false);
            }}
            placeholder="Paste the full job description here..."
            className="mt-3 w-full resize-y rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {formError ? (
          <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {formError}
          </div>
        ) : null}

        {requestError && isLimitError ? (
          <div className="mt-5">
            <UpgradeBanner currentCount={3} currentPlan="free" isSignedIn limit={3} />
          </div>
        ) : null}

        {requestError && !isLimitError ? (
          <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm">
            <p className="font-medium text-red-600">{requestError.title}</p>
            <p className="mt-1 leading-6 text-red-600">{requestError.description}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="mt-6 w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          {isLoading ? "Working..." : "Analyze & optimize"}
        </button>

        <p className="mt-3 text-center text-xs text-gray-400">Your data is processed securely.</p>
      </form>

      <section className="flex min-h-[760px] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-gray-300">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Latest analysis</p>
        </div>

        <div className="flex-1" aria-live="polite">
          {!result && !isLoading && !requestError ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-sm rounded-2xl border border-dashed border-gray-200 bg-[#FCFCFC] px-7 py-8 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">READY</p>
                <p className="mt-3 text-base font-medium tracking-tight text-gray-900">Your analysis will appear here.</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Upload a PDF and paste a role description to generate your match score, optimized resume, and cover letter.
                </p>
              </div>
            </div>
          ) : null}

          {result && !analysis && !requestError && !isLoading ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm">
              <p className="font-medium text-red-600">AI analysis unavailable</p>
              <p className="mt-1 leading-6 text-red-600">
                AI analysis unavailable. Check AI settings or enable mock mode.
              </p>
            </div>
          ) : null}

          {analysis ? <AnalysisResult analysis={analysis} jobDescription={result?.job_description ?? jobDescription} /> : null}

          {isLoading ? <ResultSkeleton /> : null}
        </div>

        {isLoading ? <LoadingRail stepIndex={loadingStep} /> : null}
      </section>
    </section>
  );
}
