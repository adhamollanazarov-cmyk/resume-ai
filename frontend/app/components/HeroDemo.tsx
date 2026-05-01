"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getScoreTone } from "@/lib/analysis";

const MATCH_SCORE = 87;
const REWRITTEN_BULLET = "Reduced API response time by 40% through Redis caching";
const SCORE_CARDS = [
  { label: "Skills", note: "Strong stack alignment for modern backend roles.", score: 91 },
  { label: "Experience", note: "Delivery is credible, but impact can read sharper.", score: 78 },
  { label: "Keywords", note: "ATS coverage is solid with only a few gaps left.", score: 85 },
  { label: "Formatting", note: "Structure is clear, with room to tighten emphasis.", score: 72 },
] as const;

function ScoreCard({
  delayMs,
  isActive,
  label,
  note,
  score,
}: {
  delayMs: number;
  isActive: boolean;
  label: string;
  note: string;
  score: number;
}) {
  const tone = getScoreTone(score);

  return (
    <article
      className={[
        "rounded-2xl border border-[#DDD7C8] bg-white p-4 shadow-[0_14px_32px_rgba(79,62,30,0.05)]",
        "transition-all duration-500 ease-out",
        isActive ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      ].join(" ")}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">{label}</p>
        <span className={`text-lg font-semibold ${tone.textClass}`}>{score}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: tone.track }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            backgroundColor: tone.ring,
            transitionDelay: `${delayMs + 90}ms`,
            width: isActive ? `${score}%` : "0%",
          }}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#5D5A52]">{note}</p>
    </article>
  );
}

export default function HeroDemo() {
  const [runId, setRunId] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const tone = getScoreTone(MATCH_SCORE);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (MATCH_SCORE / 100) * circumference;

  useEffect(() => {
    if (runId === 0) {
      setIsActive(false);
      return;
    }

    setIsActive(false);
    const frameId = window.requestAnimationFrame(() => {
      setIsActive(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [runId]);

  return (
    <section className="rounded-[32px] border border-[#DDD7C8] bg-[#F5F2E8] p-6 shadow-[0_30px_80px_rgba(79,62,30,0.08)] sm:p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7D7668]">Hero demo</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#22211D] sm:text-4xl">
            Watch one polished analysis assemble itself.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#5D5A52]">
            A quick preview helps visitors understand the product before they upload anything: score, category fit,
            sharper bullet language, and a tailored cover letter draft.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setRunId((current) => current + 1)}
              className="rounded-xl bg-[#22211D] px-5 py-3 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#171612] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
            >
              {runId > 0 ? "Replay sample analysis" : "Preview sample analysis"}
            </button>
            <span className="rounded-full border border-[#DDD7C8] bg-white px-3 py-1.5 text-xs font-medium text-[#6D665A]">
              Fake result for presentation only
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-[#DDD7C8] bg-white p-5 shadow-[0_16px_36px_rgba(79,62,30,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Highlighted improvement</p>
                <p className="mt-2 text-sm leading-6 text-[#5D5A52]">A better bullet, revealed with the demo sequence.</p>
              </div>
              <span className="rounded-full border border-[#DDD7C8] bg-[#F7F2E6] px-3 py-1 text-xs text-[#6D665A]">
                Rewritten bullet
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-[#DDD7C8] bg-[#FCFBF7] p-4">
              <div className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#6A7A5E]" />
                <div className="min-w-0 text-sm leading-7 text-[#403A2E]">
                  {runId > 0 ? (
                    <div key={runId} className={isActive ? "typewriter typewriter-active" : "typewriter"}>
                      <span className="typewriter-text">{REWRITTEN_BULLET}</span>
                      <span aria-hidden="true" className="typewriter-caret">
                        |
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#8A8376]">Run the preview to reveal one sample rewrite.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-[28px] border border-[#DDD7C8] bg-white p-6 shadow-[0_18px_48px_rgba(79,62,30,0.06)]">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative h-40 w-40 shrink-0">
                <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90">
                  <circle cx="70" cy="70" r={radius} fill="none" stroke={tone.track} strokeWidth="11" />
                  <circle
                    key={runId}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={tone.ring}
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={isActive ? targetOffset : circumference}
                    style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-semibold tracking-tight text-[#22211D]">{MATCH_SCORE}%</span>
                  <span className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Match score</span>
                </div>
              </div>

              <div className="min-w-0">
                <span className="inline-flex rounded-full border border-[#D8D0BD] bg-[#F7F2E6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6D665A]">
                  Backend platform engineer
                </span>
                <div className="mt-4 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone.ring }} />
                  <span className={`text-sm font-medium ${tone.textClass}`}>Strong match with room to sharpen outcomes</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#4C4A43]">
                  This sample profile already fits the technical requirements. The highest-impact next move is making
                  measurable wins easier to spot in the first scan.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {SCORE_CARDS.map((card, index) => (
              <ScoreCard
                key={card.label}
                delayMs={index * 120}
                isActive={isActive}
                label={card.label}
                note={card.note}
                score={card.score}
              />
            ))}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#DDD7C8] bg-white p-5 shadow-[0_18px_40px_rgba(79,62,30,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Cover letter preview</p>
              <span className="rounded-full border border-[#DDD7C8] bg-[#F7F3EA] px-3 py-1 text-xs text-[#6C6559]">Sample output</span>
            </div>

            <div className="mt-4 space-y-4 text-sm leading-7 text-[#403E38]">
              <p>
                Dear Hiring Manager, I am excited to apply for your backend engineering role. My recent work building
                FastAPI services, PostgreSQL-backed features, and AI-assisted product workflows maps closely to the
                systems-focused environment your team is hiring for.
              </p>

              <div className="relative rounded-xl border border-dashed border-[#E4DECF] bg-[#FBF8F1] p-4">
                <div className="space-y-3 blur-[2px]">
                  <p>
                    Across product-focused projects, I have worked on API design, persistence strategy, and deployment
                    workflows with a strong emphasis on clarity, reliability, and measurable delivery.
                  </p>
                  <p>
                    I would welcome the opportunity to bring the same practical engineering approach to your team and
                    contribute to backend systems that are both technically sound and useful in production.
                  </p>
                </div>
                <div className="absolute inset-x-4 bottom-4 top-4 rounded-xl bg-gradient-to-t from-[#FBF8F1] via-[#FBF8F1]/88 to-transparent" />
                <div className="absolute inset-x-0 bottom-5 flex justify-center">
                  <Link
                    href="#analyze"
                    className="rounded-full border border-[#D9D1BF] bg-white px-4 py-2 text-sm font-medium text-[#3D4036] shadow-[0_10px_24px_rgba(79,62,30,0.08)] transition-all duration-200 ease-out hover:border-[#C8BFAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
                  >
                    Get full analysis free -&gt;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .typewriter {
          display: inline-flex;
          align-items: baseline;
          max-width: 100%;
        }

        .typewriter-text {
          clip-path: inset(0 100% 0 0);
        }

        .typewriter-caret {
          margin-left: 2px;
          opacity: 0;
        }

        .typewriter-active .typewriter-text {
          animation: hero-typewriter 1.25s steps(26, end) forwards;
        }

        .typewriter-active .typewriter-caret {
          opacity: 1;
          animation:
            hero-caret-blink 0.75s step-end infinite,
            hero-caret-fade 0.01s linear 1.25s forwards;
        }

        @keyframes hero-typewriter {
          from {
            clip-path: inset(0 100% 0 0);
          }

          to {
            clip-path: inset(0 0 0 0);
          }
        }

        @keyframes hero-caret-blink {
          50% {
            opacity: 0;
          }
        }

        @keyframes hero-caret-fade {
          to {
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}
