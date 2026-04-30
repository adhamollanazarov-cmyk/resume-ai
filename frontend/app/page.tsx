"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  AIAnalysisResult,
  AnalysisListItem,
  AnalyzeResponse,
  analyzeResume,
  getAnalysis,
  getAnalyses,
} from "@/lib/api";

const EMPTY_FILE_MESSAGE = "Please upload a PDF resume.";
const EMPTY_JOB_MESSAGE = "Please paste a job description.";
const MAX_SUMMARY_ITEMS = 4;
const MAX_CLIENT_PDF_BYTES = 5 * 1024 * 1024;
const LOADING_STEPS = ["Analyzing resume", "Matching job", "Optimizing output"];

type FeedbackState = {
  title: string;
  description: string;
};

type ReopenedHistoryState = {
  createdAt: string;
  id: number;
};

type ResultTab = "current" | "history";

type ScoreTone = {
  ring: string;
  track: string;
  textClass: string;
  label: string;
};

function getScoreTone(score: number): ScoreTone {
  if (score >= 80) {
    return {
      ring: "#4F7A65",
      track: "#E8F0EB",
      textClass: "text-[#3E604E]",
      label: "Strong match",
    };
  }

  if (score >= 60) {
    return {
      ring: "#A4732C",
      track: "#F4ECDD",
      textClass: "text-[#8A6226]",
      label: "Good match",
    };
  }

  return {
    ring: "#A35A5A",
    track: "#F7E8E8",
    textClass: "text-[#874848]",
    label: "Needs work",
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCreatedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortenText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

async function downloadTextAsPdf(title: string, text: string, fileName: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({
    format: "a4",
    unit: "pt",
  });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 56;
  const marginBottom = 56;
  const contentWidth = pageWidth - marginX * 2;
  const lineHeight = 18;
  let cursorY = marginTop;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY + requiredHeight <= pageHeight - marginBottom) {
      return;
    }

    document.addPage();
    cursorY = marginTop;
  };

  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  const titleLines = document.splitTextToSize(title, contentWidth) as string[];
  ensureSpace(titleLines.length * 22);
  document.text(titleLines, marginX, cursorY);
  cursorY += titleLines.length * 22 + 12;

  document.setFont("helvetica", "normal");
  document.setFontSize(11);

  const contentLines = text.split("\n");
  for (const rawLine of contentLines) {
    if (!rawLine.trim()) {
      cursorY += lineHeight * 0.7;
      continue;
    }

    const wrappedLines = document.splitTextToSize(rawLine, contentWidth) as string[];
    ensureSpace(wrappedLines.length * lineHeight);

    for (const wrappedLine of wrappedLines) {
      ensureSpace(lineHeight);
      document.text(wrappedLine, marginX, cursorY);
      cursorY += lineHeight;
    }
  }

  document.save(fileName);
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  const visibleItems = items.slice(0, MAX_SUMMARY_ITEMS);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-gray-300">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {visibleItems.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {visibleItems.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-3 text-sm leading-6 text-gray-700">
              <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-gray-400">No items returned.</p>
      )}
      {hiddenCount > 0 ? <p className="mt-4 text-sm text-gray-400">+{hiddenCount} more</p> : null}
    </section>
  );
}

function CopyBlock({
  title,
  value,
  copiedKey,
  copyKey,
  onCopy,
  onDownload,
  downloadFileName,
}: {
  title: string;
  value: string;
  copiedKey: string | null;
  copyKey: string;
  onCopy: (value: string, key: string) => Promise<void>;
  onDownload: (title: string, value: string, fileName: string) => Promise<void>;
  downloadFileName: string;
}) {
  const isCopied = copiedKey === copyKey;

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-all duration-200 hover:border-gray-300">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(value, copyKey)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
          >
            {isCopied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => onDownload(title, value, downloadFileName)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
          >
            Download PDF
          </button>
        </div>
      </div>
      <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">{value || "No content returned."}</div>
    </section>
  );
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
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="h-3 w-28 rounded-full bg-gray-100" />
        <div className="mt-4 space-y-3">
          <div className="h-4 w-full rounded-full bg-gray-100" />
          <div className="h-4 w-5/6 rounded-full bg-gray-100" />
          <div className="h-4 w-4/6 rounded-full bg-gray-100" />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="h-36 w-36 rounded-full bg-gray-100" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-24 rounded-full bg-gray-100" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full rounded-full bg-gray-100" />
              <div className="h-4 w-11/12 rounded-full bg-gray-100" />
              <div className="h-4 w-8/12 rounded-full bg-gray-100" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="h-3 w-24 rounded-full bg-gray-100" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full rounded-full bg-gray-100" />
              <div className="h-4 w-10/12 rounded-full bg-gray-100" />
              <div className="h-4 w-8/12 rounded-full bg-gray-100" />
            </div>
          </section>
        ))}
      </div>

      {Array.from({ length: 2 }).map((_, index) => (
        <section key={index} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="h-3 w-32 rounded-full bg-gray-100" />
            <div className="h-8 w-36 rounded-xl bg-gray-100" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full rounded-full bg-gray-100" />
            <div className="h-4 w-full rounded-full bg-gray-100" />
            <div className="h-4 w-11/12 rounded-full bg-gray-100" />
            <div className="h-4 w-10/12 rounded-full bg-gray-100" />
            <div className="h-4 w-9/12 rounded-full bg-gray-100" />
          </div>
        </section>
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="grid gap-5 animate-pulse">
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="h-3 w-20 rounded-full bg-gray-100" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-14 rounded-full bg-gray-100" />
                    <div className="h-3 w-24 rounded-full bg-gray-100" />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-4 w-full rounded-full bg-gray-100" />
                    <div className="h-4 w-5/6 rounded-full bg-gray-100" />
                  </div>
                </div>
                <div className="h-8 w-16 rounded-lg bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScoreRing({
  score,
  reasoning,
  keywordGaps,
}: {
  score: number;
  reasoning: string;
  keywordGaps: string[];
}) {
  const tone = getScoreTone(score);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:border-gray-300">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke={tone.track} strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={tone.ring}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-semibold tracking-tight text-gray-900">{score}%</span>
            <span className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-400">Match score</span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.ring }} />
            <span className={`text-sm font-medium ${tone.textClass}`}>{tone.label}</span>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600">{reasoning}</p>
          {keywordGaps.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Keyword gaps</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {keywordGaps.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CurrentResultView({
  analysis,
  jobDescription,
  copiedKey,
  onCopy,
  onDownload,
}: {
  analysis: AIAnalysisResult;
  jobDescription: string;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => Promise<void>;
  onDownload: (title: string, value: string, fileName: string) => Promise<void>;
}) {
  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-gray-300">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Job description</h2>
        <p className="mt-4 text-sm leading-7 text-gray-700">{jobDescription}</p>
      </section>

      <ScoreRing
        score={analysis.match_score}
        reasoning={analysis.score_reasoning}
        keywordGaps={analysis.keyword_gaps}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryList title="Missing skills" items={analysis.missing_skills} />
        <SummaryList title="Improvements" items={analysis.resume_improvements} />
        <SummaryList title="Rewritten bullets" items={analysis.rewritten_bullets} />
      </div>

      <CopyBlock
        title="Optimized resume"
        value={analysis.optimized_resume}
        copiedKey={copiedKey}
        copyKey="optimized_resume"
        onCopy={onCopy}
        onDownload={onDownload}
        downloadFileName="optimized-resume.pdf"
      />

      <CopyBlock
        title="Cover letter"
        value={analysis.cover_letter}
        copiedKey={copiedKey}
        copyKey="cover_letter"
        onCopy={onCopy}
        onDownload={onDownload}
        downloadFileName="cover-letter.pdf"
      />

      {analysis.risk_flags.length > 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-gray-300">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Risk flags</h2>
          <ul className="mt-4 space-y-3">
            {analysis.risk_flags.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-gray-700">
                <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function HistoryView({
  items,
  selectedId,
  isLoadingList,
  isOpeningItem,
  historyError,
  onSelect,
}: {
  items: AnalysisListItem[] | null;
  selectedId: number | null;
  isLoadingList: boolean;
  isOpeningItem: boolean;
  historyError: FeedbackState | null;
  onSelect: (id: number) => void;
}) {
  if (historyError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm">
        <p className="font-medium text-red-600">{historyError.title}</p>
        <p className="mt-1 leading-6 text-red-600">{historyError.description}</p>
      </div>
    );
  }

  if (isLoadingList && items === null) {
    return <HistorySkeleton />;
  }

  if (items !== null && items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-[#FCFCFC] px-7 py-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">HISTORY</p>
        <p className="mt-3 text-base font-medium tracking-tight text-gray-900">No saved analyses yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-gray-300">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">History</h2>
          {isLoadingList ? <span className="text-xs text-gray-400">Refreshing...</span> : null}
        </div>
        <div className="mt-4 space-y-3">
          {(items ?? []).map((item) => (
            <article
              key={item.id}
              className={[
                "rounded-xl border px-4 py-3 transition-all duration-200",
                selectedId === item.id
                  ? "border-gray-300 bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                      {item.match_score !== null ? `${item.match_score}%` : "N/A"}
                    </span>
                    <p className="text-xs text-gray-500">{formatCreatedAt(item.created_at)}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-700">{shortenText(item.job_description, 110)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  disabled={isOpeningItem && selectedId === item.id}
                  className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99] disabled:cursor-wait disabled:text-gray-400"
                >
                  {isOpeningItem && selectedId === item.id ? "Opening..." : "Open"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isOpeningItem ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-[#FCFCFC] px-7 py-8 text-center">
          <p className="text-base font-medium tracking-tight text-gray-900">Reopening selected analysis...</p>
        </div>
      ) : null}

      {!isOpeningItem ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-[#FCFCFC] px-7 py-8 text-center">
          <p className="text-base font-medium tracking-tight text-gray-900">Select an analysis to reopen it.</p>
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const [pdf, setPdf] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<FeedbackState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("current");
  const [historyItems, setHistoryItems] = useState<AnalysisListItem[] | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryOpening, setIsHistoryOpening] = useState(false);
  const [historyError, setHistoryError] = useState<FeedbackState | null>(null);
  const [reopenedHistory, setReopenedHistory] = useState<ReopenedHistoryState | null>(null);

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

  useEffect(() => {
    if (activeTab === "history" && historyItems === null && !isHistoryLoading) {
      void loadHistory();
    }
  }, [activeTab, historyItems, isHistoryLoading]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function loadHistory() {
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const items = await getAnalyses();
      setHistoryItems(items);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not load history.";
      setHistoryError(
        message.startsWith("Cannot connect to backend.")
          ? {
              title: "Could not load history.",
              description: "Make sure FastAPI is running.",
            }
          : {
              title: "Could not load history.",
              description: message,
            },
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function loadHistoryDetail(analysisId: number) {
    setSelectedHistoryId(analysisId);
    setIsHistoryOpening(true);
    setHistoryError(null);

    try {
      const detail = await getAnalysis(analysisId);
      setResult({
        resume_text_preview: detail.resume_text_preview,
        job_description: detail.job_description,
        analysis: detail.analysis_json,
        status: "OK",
      });
      setJobDescription(detail.job_description);
      setRequestError(null);
      setReopenedHistory({
        createdAt: detail.created_at,
        id: detail.id,
      });
      setActiveTab("current");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not load history.";
      setHistoryError(
        message.startsWith("Cannot connect to backend.")
          ? {
              title: "Could not load history.",
              description: "Make sure FastAPI is running.",
            }
          : {
              title: "Could not load history.",
              description: message,
            },
      );
    } finally {
      setIsHistoryOpening(false);
    }
  }

  function clearFileSelection() {
    setPdf(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setRequestError(null);

    if (nextFile && nextFile.size > MAX_CLIENT_PDF_BYTES) {
      clearFileSelection();
      setFormError("PDF file must be 5 MB or smaller.");
      return;
    }

    setPdf(nextFile);
    setFormError(null);
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);

      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }

      copyTimerRef.current = window.setTimeout(() => {
        setCopiedKey(null);
      }, 1500);
    } catch {
      setRequestError({
        title: "Copy unavailable.",
        description: "Clipboard access is blocked in this browser context.",
      });
    }
  }

  async function handleDownloadPdf(title: string, value: string, fileName: string) {
    try {
      await downloadTextAsPdf(title, value, fileName);
    } catch {
      setRequestError({
        title: "Download unavailable.",
        description: "The PDF could not be generated in this browser context.",
      });
    }
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

    setActiveTab("current");
    setIsLoading(true);
    setFormError(null);
    setRequestError(null);
    setResult(null);
    setSelectedHistoryId(null);
    setReopenedHistory(null);

    try {
      const analysisResult = await analyzeResume(formData);
      setResult(analysisResult);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Resume analysis failed.";
      const isNetworkError = message.startsWith("Cannot connect to backend.");

      setRequestError(
        isNetworkError
          ? {
              title: "Cannot connect to backend",
              description: "Make sure FastAPI is running.",
            }
          : {
              title: "Request failed",
              description: message,
            },
      );
    } finally {
      setIsLoading(false);
    }
  }

  const analysis = result?.analysis ?? null;
  const isSubmitDisabled = isLoading || !pdf || !jobDescription.trim();

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">AI RESUME</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-950">
            Resume &amp; Cover Letter Generator
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-500">
            Upload a resume and match it to a job description. Get AI-powered insights, optimized resume, and cover
            letter.
          </p>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form
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
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("current")}
                  className={[
                    "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10",
                    activeTab === "current" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
                  ].join(" ")}
                >
                  Current result
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={[
                    "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10",
                    activeTab === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
                  ].join(" ")}
                >
                  History
                </button>
              </div>
            </div>

            <div className="flex-1" aria-live="polite">
              {activeTab === "current" ? (
                <>
                  {!result && !isLoading && !requestError ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="w-full max-w-sm rounded-2xl border border-dashed border-gray-200 bg-[#FCFCFC] px-7 py-8 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                          WAITING FOR INPUT
                        </p>
                        <p className="mt-3 text-base font-medium tracking-tight text-gray-900">
                          Your analysis will appear here.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-gray-500">
                          Upload a PDF and paste a job description to generate your match score, optimized resume, and
                          cover letter.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {requestError ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm">
                      <p className="font-medium text-red-600">{requestError.title}</p>
                      <p className="mt-1 leading-6 text-red-600">{requestError.description}</p>
                    </div>
                  ) : null}

                  {result && !analysis ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm">
                      <p className="font-medium text-red-600">AI analysis unavailable</p>
                      <p className="mt-1 leading-6 text-red-600">
                        Check OpenAI billing or enable USE_MOCK_AI=true.
                      </p>
                    </div>
                  ) : null}

                  {analysis ? (
                    <div className="grid gap-4">
                      {reopenedHistory ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                          <span className="font-medium text-gray-800">Reopened from history</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span>#{reopenedHistory.id}</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span>{formatCreatedAt(reopenedHistory.createdAt)}</span>
                        </div>
                      ) : null}
                      <CurrentResultView
                        analysis={analysis}
                        jobDescription={result?.job_description ?? jobDescription}
                        copiedKey={copiedKey}
                        onCopy={copyToClipboard}
                        onDownload={handleDownloadPdf}
                      />
                    </div>
                  ) : null}

                  {isLoading ? <ResultSkeleton /> : null}
                </>
              ) : (
                <HistoryView
                  items={historyItems}
                  selectedId={selectedHistoryId}
                  isLoadingList={isHistoryLoading}
                  isOpeningItem={isHistoryOpening}
                  historyError={historyError}
                  onSelect={(id) => {
                    void loadHistoryDetail(id);
                  }}
                />
              )}
            </div>

            {activeTab === "current" && isLoading ? <LoadingRail stepIndex={loadingStep} /> : null}
          </section>
        </section>
      </div>
    </main>
  );
}
