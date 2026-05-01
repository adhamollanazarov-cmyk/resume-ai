"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getScoreTone } from "@/lib/analysis";

const MATCH_SCORE = 87;
const SCORE_CARDS = [
  { label: "Skills", score: 91, note: "Core technical fit is already strong." },
  { label: "Experience", score: 78, note: "Good depth, but impact can read sharper." },
  { label: "Keywords", score: 85, note: "ATS alignment is close with a few gaps left." },
  { label: "Formatting", score: 72, note: "Clear structure, with room to tighten emphasis." },
] as const;

const RECOMMENDATIONS = [
  "Add measurable impact to your backend project descriptions.",
  "Move FastAPI, PostgreSQL, and AI integration keywords closer to the top.",
  "Rewrite experience bullets to focus on outcomes, not only tasks.",
] as const;

function ScoreCard({
  delay,
  isVisible,
  label,
  note,
  score,
}: {
  delay: number;
  isVisible: boolean;
  label: string;
  note: string;
  score: number;
}) {
  const tone = getScoreTone(score);

  return (
    <article
      className={`rounded-2xl border border-[#DDD7C8] bg-white p-4 shadow-[0_14px_32px_rgba(79,62,30,0.05)] transition-all duration-500 ease-out motion-reduce:transition-none ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">{label}</p>
        <span className={`text-lg font-semibold ${tone.textClass}`}>{score}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: tone.track }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out motion-reduce:transition-none"
          style={{ width: isVisible ? `${score}%` : "0%", backgroundColor: tone.ring }}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#5D5A52]">{note}</p>
    </article>
  );
}

export default function ExampleResult() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const tone = getScoreTone(MATCH_SCORE);
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  useEffect(() => {
    const node = sectionRef.current;

    if (!node || isVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.28 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    let frameId = 0;
    const start = performance.now();
    const duration = 1100;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - start;
      const nextValue = Math.round(Math.min(elapsed / duration, 1) * MATCH_SCORE);
      setAnimatedScore(nextValue);

      if (elapsed < duration) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [isVisible]);

  return (
    <section
      ref={sectionRef}
      className={`rounded-[32px] border border-[#DDD7C8] bg-[#F5F2E8] p-6 shadow-[0_30px_80px_rgba(79,62,30,0.08)] transition-all duration-700 ease-out motion-reduce:transition-none sm:p-8 lg:p-10 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      }`}
    >
      <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7D7668]">See it in action</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#22211D] sm:text-4xl">
            A polished analysis preview, before anyone uploads a file.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#5D5A52]">
            This sample result shows how the app turns a raw resume into a clearer match score, targeted recommendations,
            and a sharper cover letter draft.
          </p>

          <div className="mt-8 rounded-[28px] border border-[#DDD7C8] bg-white p-6 shadow-[0_18px_48px_rgba(79,62,30,0.06)]">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative h-44 w-44 shrink-0">
                <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
                  <circle cx="80" cy="80" r={radius} fill="none" stroke={tone.track} strokeWidth="12" />
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke={tone.ring}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    className="transition-all duration-200 ease-out motion-reduce:transition-none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-semibold tracking-tight text-[#22211D]">{animatedScore}%</span>
                  <span className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Match score</span>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Summary</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone.ring }} />
                  <span className={`text-sm font-medium ${tone.textClass}`}>Strong alignment for backend platform roles</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#4C4A43]">
                  This profile already shows the right technical base. The remaining lift is mostly about making outcomes
                  more visible, surfacing core stack keywords earlier, and tightening how experience is framed for ATS and
                  hiring-manager scans.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#analyze"
              className="rounded-xl bg-[#22211D] px-5 py-3 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#151411] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
            >
              Analyze your resume free -&gt;
            </Link>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {SCORE_CARDS.map((item, index) => (
              <ScoreCard
                key={item.label}
                delay={index * 90}
                isVisible={isVisible}
                label={item.label}
                note={item.note}
                score={item.score}
              />
            ))}
          </div>

          <div
            className={`rounded-2xl border border-[#DDD7C8] bg-white p-5 shadow-[0_14px_32px_rgba(79,62,30,0.05)] transition-all duration-500 ease-out motion-reduce:transition-none ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: "240ms" }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Recommendations</p>
            <ul className="mt-4 space-y-3">
              {RECOMMENDATIONS.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-7 text-[#4C4A43]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6A7A5E]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={`relative overflow-hidden rounded-2xl border border-[#DDD7C8] bg-white p-5 shadow-[0_18px_40px_rgba(79,62,30,0.06)] transition-all duration-500 ease-out motion-reduce:transition-none ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: "320ms" }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7D7668]">Cover letter preview</p>
              <span className="rounded-full border border-[#DDD7C8] bg-[#F7F3EA] px-3 py-1 text-xs text-[#6C6559]">Example output</span>
            </div>

            <div className="mt-4 space-y-4 text-sm leading-7 text-[#403E38]">
              <p>
                Dear Hiring Manager, I am excited to apply for your backend engineering role. My recent work building
                FastAPI services, PostgreSQL-backed features, and AI-powered product workflows maps closely to the
                systems-focused environment your team is hiring for.
              </p>

              <div className="relative rounded-xl border border-dashed border-[#E4DECF] bg-[#FBF8F1] p-4">
                <div className="space-y-3 blur-[2px]">
                  <p>
                    Across product-focused projects, I have worked on API design, data persistence, and deployment
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
                    href="/login"
                    className="rounded-full border border-[#D9D1BF] bg-white px-4 py-2 text-sm font-medium text-[#3D4036] shadow-[0_10px_24px_rgba(79,62,30,0.08)] transition-all duration-200 ease-out hover:border-[#C8BFAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
                  >
                    Sign in to see full result
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
