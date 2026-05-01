import { AIAnalysisResult } from "@/lib/api";
import { estimateScoreBreakdown, getScoreTone } from "@/lib/analysis";

type ScoreBreakdownProps = {
  analysis: AIAnalysisResult;
};

function BreakdownBar({ detail, label, score }: { detail: string; label: string; score: number }) {
  const tone = getScoreTone(score);

  return (
    <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-gray-800">{label}</h3>
        <span className={`text-sm font-medium ${tone.textClass}`}>{score}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: tone.track }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${score}%`, backgroundColor: tone.ring }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-500">{detail}</p>
    </article>
  );
}

export default function ScoreBreakdown({ analysis }: ScoreBreakdownProps) {
  const tone = getScoreTone(analysis.match_score);
  const breakdown = estimateScoreBreakdown(analysis);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = (analysis.match_score / 100) * circumference;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:border-gray-300">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center xl:w-[44%]">
          <div className="relative h-40 w-40 shrink-0">
            <svg viewBox="0 0 128 128" className="h-40 w-40 -rotate-90">
              <circle cx="64" cy="64" r={radius} fill="none" stroke={tone.track} strokeWidth="10" />
              <circle
                cx="64"
                cy="64"
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
              <span className="text-4xl font-semibold tracking-tight text-gray-950">{analysis.match_score}%</span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Match score</span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Analysis summary</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.ring }} />
              <span className={`text-sm font-medium ${tone.textClass}`}>{tone.label}</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-gray-600">{analysis.score_reasoning}</p>
          </div>
        </div>

        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          {breakdown.map((item) => (
            <BreakdownBar key={item.label} detail={item.detail} label={item.label} score={item.score} />
          ))}
        </div>
      </div>
    </section>
  );
}
