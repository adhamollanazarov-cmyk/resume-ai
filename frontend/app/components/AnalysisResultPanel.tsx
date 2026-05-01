"use client";

import { useEffect, useRef, useState } from "react";

import CoverLetterCard from "@/app/components/CoverLetterCard";
import DownloadButton from "@/app/components/DownloadButton";
import Recommendations from "@/app/components/Recommendations";
import ScoreBreakdown from "@/app/components/ScoreBreakdown";
import { AIAnalysisResult, downloadOptimizedResume } from "@/lib/api";

type FeedbackState = {
  title: string;
  description: string;
};

function saveDownloadedFile(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export default function AnalysisResultPanel({
  analysis,
  jobDescription,
}: {
  analysis: AIAnalysisResult;
  jobDescription: string;
}) {
  const copyTimerRef = useRef<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<FeedbackState | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setDownloadError(null);

      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }

      copyTimerRef.current = window.setTimeout(() => {
        setCopiedKey(null);
      }, 2000);
    } catch {
      setDownloadError({
        title: "Copy unavailable.",
        description: "Clipboard access is blocked in this browser context.",
      });
    }
  }

  async function handleDownloadOptimizedResume() {
    const optimizedResume = analysis.optimized_resume.trim();
    if (!optimizedResume) {
      setDownloadError({
        title: "Download unavailable.",
        description: "There is no optimized resume available to download yet.",
      });
      return;
    }

    setDownloadingKey("optimized_resume");
    setDownloadError(null);

    try {
      const file = await downloadOptimizedResume(optimizedResume);
      saveDownloadedFile(file.blob, file.fileName);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Could not prepare the optimized resume download.";
      setDownloadError({
        title: "Download unavailable.",
        description: message.startsWith("Cannot connect to backend.") ? "Make sure FastAPI is running." : message,
      });
    } finally {
      setDownloadingKey(null);
    }
  }

  return (
    <div className="grid gap-5">
      {downloadError ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm">
          <p className="font-medium text-red-600">{downloadError.title}</p>
          <p className="mt-1 leading-6 text-red-600">{downloadError.description}</p>
        </div>
      ) : null}

      <ScoreBreakdown analysis={analysis} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-gray-300">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role summary</h2>
        <p className="mt-4 text-sm leading-7 text-gray-700">{jobDescription}</p>
      </section>

      <section className="grid gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recommendations</p>
          <p className="mt-2 text-sm text-gray-500">
            Clear next steps broken down by skills, experience, keywords, and general polish.
          </p>
        </div>
        <Recommendations analysis={analysis} />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-all duration-200 hover:border-gray-300">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Optimized resume</h2>
            <p className="mt-2 text-sm text-gray-500">
              A tighter version aligned to the role while staying faithful to the original resume.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void copyToClipboard(analysis.optimized_resume, "optimized_resume");
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
            >
              {copiedKey === "optimized_resume" ? "Copied!" : "Copy"}
            </button>
            <DownloadButton
              label="Download Optimized Resume"
              isBusy={downloadingKey === "optimized_resume"}
              onClick={handleDownloadOptimizedResume}
            />
          </div>
        </div>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">
          {analysis.optimized_resume || "No optimized resume returned."}
        </div>
      </section>

      <CoverLetterCard
        copied={copiedKey === "cover_letter"}
        onCopy={() => copyToClipboard(analysis.cover_letter, "cover_letter")}
        value={analysis.cover_letter}
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
