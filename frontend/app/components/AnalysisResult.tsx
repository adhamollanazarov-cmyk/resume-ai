"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import DownloadButton from "@/app/components/DownloadButton";
import { AIAnalysisResult } from "@/lib/api";
import {
  getAnalysisMatchScore,
  getAnalysisRoleSummary,
  getAnalysisScoreReasoning,
  getCoverLetterText,
  getOptimizedResumeText,
  getResumeImprovementSections,
  getRewrittenBullets,
  getRiskFlags,
  getScoreTone,
  getScoreValues,
  isEstimatedAnalysis,
} from "@/lib/analysis";

type AnalysisResultProps = {
  analysis: AIAnalysisResult;
  jobDescription?: string;
};

type FeedbackState = {
  description: string;
  title: string;
};

type RecommendationTabKey = "experience" | "general" | "keywords" | "skills";

const RECOMMENDATION_TABS: Array<{ key: RecommendationTabKey; label: string }> = [
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "keywords", label: "Keywords" },
  { key: "general", label: "General" },
];

const SCORE_CARDS: Array<{ key: keyof ReturnType<typeof getScoreValues>; label: string }> = [
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "keywords", label: "Keywords" },
  { key: "formatting", label: "Formatting" },
];

function deriveRoleSummaryFallback(jobDescription?: string): string {
  const fallback = jobDescription?.trim();
  if (!fallback) {
    return "Analysis result";
  }

  const [firstLine] = fallback.split(/\n+/);
  const normalized = firstLine.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "Analysis result";
  }

  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

function saveTextFile(contents: string, fileName: string): void {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function ScoreCard({
  delayMs,
  isVisible,
  label,
  score,
}: {
  delayMs: number;
  isVisible: boolean;
  label: string;
  score: number;
}) {
  const tone = getScoreTone(score);

  return (
    <article className="rounded-2xl border border-[#DDD7C8] bg-white p-5 shadow-[0_14px_32px_rgba(79,62,30,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">{label}</p>
        <span className={`text-lg font-semibold ${tone.textClass}`}>{score}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: tone.track }}>
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            backgroundColor: tone.ring,
            transitionDelay: `${delayMs}ms`,
            width: isVisible ? `${score}%` : "0%",
          }}
        />
      </div>
    </article>
  );
}

export default function AnalysisResult({ analysis, jobDescription }: AnalysisResultProps) {
  const copyTimerRef = useRef<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<FeedbackState | null>(null);
  const [activeTab, setActiveTab] = useState<RecommendationTabKey>("skills");
  const [animatedScore, setAnimatedScore] = useState(0);
  const [areScoreBarsVisible, setAreScoreBarsVisible] = useState(false);

  const matchScore = getAnalysisMatchScore(analysis);
  const roleSummary = useMemo(() => {
    const summary = getAnalysisRoleSummary(analysis);
    return summary === "Analysis result" ? deriveRoleSummaryFallback(jobDescription) : summary;
  }, [analysis, jobDescription]);
  const scoreReasoning = getAnalysisScoreReasoning(analysis);
  const scores = getScoreValues(analysis);
  const improvements = getResumeImprovementSections(analysis);
  const rewrittenBullets = getRewrittenBullets(analysis);
  const optimizedResume = getOptimizedResumeText(analysis);
  const coverLetter = getCoverLetterText(analysis);
  const riskFlags = getRiskFlags(analysis);
  const estimated = isEstimatedAnalysis(analysis);
  const tone = getScoreTone(matchScore);

  useEffect(() => {
    const firstTabWithItems = RECOMMENDATION_TABS.find((tab) => improvements[tab.key].length > 0)?.key ?? "skills";
    setActiveTab(firstTabWithItems);
  }, [analysis, improvements]);

  useEffect(() => {
    setAnimatedScore(0);

    let frameId = 0;
    const start = performance.now();
    const duration = 700;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - start;
      const nextValue = Math.round(Math.min(elapsed / duration, 1) * matchScore);
      setAnimatedScore(nextValue);

      if (elapsed < duration) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [matchScore]);

  useEffect(() => {
    setAreScoreBarsVisible(false);

    const timer = window.setTimeout(() => {
      setAreScoreBarsVisible(true);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [analysis]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function copyToClipboard(text: string, key: string) {
    const value = text.trim();
    if (!value) {
      setActionError({
        title: "Copy unavailable.",
        description: "There is no text available to copy in this section yet.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setActionError(null);

      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }

      copyTimerRef.current = window.setTimeout(() => {
        setCopiedKey(null);
      }, 1500);
    } catch {
      setActionError({
        title: "Copy unavailable.",
        description: "Clipboard access is blocked in this browser context.",
      });
    }
  }

  function handleDownloadOptimizedResume() {
    if (!optimizedResume) {
      setActionError({
        title: "Download unavailable.",
        description: "There is no optimized resume available to download yet.",
      });
      return;
    }

    setActionError(null);
    saveTextFile(optimizedResume, "optimized-resume.txt");
  }

  function handleDownloadCoverLetter() {
    if (!coverLetter) {
      setActionError({
        title: "Download unavailable.",
        description: "There is no cover letter available to download yet.",
      });
      return;
    }

    setActionError(null);
    saveTextFile(coverLetter, "cover-letter.txt");
  }

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const activeRecommendations = improvements[activeTab];

  return (
    <div className="grid gap-5">
      {estimated ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <p className="font-medium">Estimated analysis - AI was temporarily unavailable</p>
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm">
          <p className="font-medium text-red-600">{actionError.title}</p>
          <p className="mt-1 leading-6 text-red-600">{actionError.description}</p>
        </div>
      ) : null}

      <section className="rounded-[28px] border border-[#DDD7C8] bg-[#F7F3EA] p-6 shadow-[0_24px_60px_rgba(79,62,30,0.06)]">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative h-40 w-40 shrink-0">
              <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90">
                <circle cx="70" cy="70" r={radius} fill="none" stroke={tone.track} strokeWidth="11" />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={tone.ring}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  className="transition-all duration-200 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-semibold tracking-tight text-[#22211D]">{animatedScore}%</span>
                <span className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7D7668]">Match score</span>
              </div>
            </div>

            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-[#D8D0BD] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6D665A]">
                {roleSummary}
              </span>
              <div className="mt-4 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone.ring }} />
                <span className={`text-sm font-medium ${tone.textClass}`}>{tone.label}</span>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#4C4A43]">{scoreReasoning}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SCORE_CARDS.map((card, index) => (
          <ScoreCard
            key={card.key}
            delayMs={index * 90}
            isVisible={areScoreBarsVisible}
            label={card.label}
            score={scores[card.key]}
          />
        ))}
      </section>

      <section className="rounded-2xl border border-[#DDD7C8] bg-white p-5 shadow-[0_14px_32px_rgba(79,62,30,0.05)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Recommendations</p>
            <p className="mt-2 text-sm leading-6 text-[#5D5A52]">Focused next steps by category, ready to act on.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RECOMMENDATION_TABS.map((tab) => {
              const isActive = tab.key === activeTab;

              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]",
                    isActive
                      ? "border-[#CBBFA5] bg-[#F7F2E6] text-[#403A2E]"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#E5DFD0] bg-[#FCFBF7] p-5">
          {activeRecommendations.length > 0 ? (
            <ul className="space-y-3">
              {activeRecommendations.map((item, index) => (
                <li key={`${activeTab}-${index}`} className="flex gap-3 text-sm leading-7 text-[#4C4A43]">
                  <span className="mt-2 text-[#6A7A5E]">+</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-7 text-[#6D665A]">No recommendations for this section.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#DDD7C8] bg-white p-5 shadow-[0_14px_32px_rgba(79,62,30,0.05)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Rewritten bullets</p>
          <p className="mt-2 text-sm leading-6 text-[#5D5A52]">Sharper accomplishment language you can reuse in the resume.</p>
        </div>

        {rewrittenBullets.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {rewrittenBullets.map((item, index) => (
              <article key={`rewritten-bullet-${index}`} className="rounded-2xl border border-[#E5DFD0] bg-[#FCFBF7] p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Bullet {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void copyToClipboard(item.after, `bullet-${index}`);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
                  >
                    {copiedKey === `bullet-${index}` ? "Copied" : "Copy"}
                  </button>
                </div>

                {item.before ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-[#E2DDD1] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8C8678]">Before</p>
                      <p className="mt-3 text-sm leading-7 text-[#5D5A52]">{item.before}</p>
                    </div>
                    <div className="rounded-xl border border-[#D9D1BF] bg-[#F7F2E6] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6D665A]">After</p>
                      <p className="mt-3 text-sm leading-7 text-[#403A2E]">{item.after}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-[#E2DDD1] bg-white p-4">
                    <p className="text-sm leading-7 text-[#403A2E]">{item.after}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[#E2DDD1] bg-[#FCFBF7] p-5">
            <p className="text-sm leading-7 text-[#6D665A]">No rewritten bullets were returned for this analysis.</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#DDD7C8] bg-white p-5 shadow-[0_14px_32px_rgba(79,62,30,0.05)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Optimized resume</p>
            <p className="mt-2 text-sm leading-6 text-[#5D5A52]">A cleaner, job-aligned draft you can keep refining.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void copyToClipboard(optimizedResume, "optimized-resume");
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
            >
              {copiedKey === "optimized-resume" ? "Copied" : "Copy"}
            </button>
            <DownloadButton label="Download .txt" onClick={handleDownloadOptimizedResume} />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-[#E5DFD0] bg-[#FCFBF7] p-5">
          <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-[#403A2E]">
            {optimizedResume || "No optimized resume returned."}
          </pre>
        </div>
      </section>

      <section className="rounded-2xl border border-[#DDD7C8] bg-white p-5 shadow-[0_14px_32px_rgba(79,62,30,0.05)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Cover letter</p>
            <p className="mt-2 text-sm leading-6 text-[#5D5A52]">A concise draft you can personalize before sending.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void copyToClipboard(coverLetter, "cover-letter");
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
          >
            {copiedKey === "cover-letter" ? "Copied" : "Copy Cover Letter"}
          </button>
          <DownloadButton label="Download .txt" onClick={handleDownloadCoverLetter} />
        </div>
        <div className="mt-4 rounded-2xl border border-[#E5DFD0] bg-[#FCFBF7] p-5">
          <div className="whitespace-pre-wrap text-sm leading-7 text-[#403A2E]">{coverLetter || "No cover letter returned."}</div>
        </div>
      </section>

      {riskFlags.length > 0 ? (
        <section className="grid gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Risk flags</p>
            <p className="mt-2 text-sm leading-6 text-[#5D5A52]">Potential weaknesses or unclear points worth tightening before you apply.</p>
          </div>
          <div className="grid gap-3">
            {riskFlags.map((item, index) => (
              <article key={`${item}-${index}`} className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">
                <div className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-400" />
                  <span>{item}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
