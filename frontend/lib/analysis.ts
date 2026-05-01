import { AIAnalysisResult } from "@/lib/api";

export type ScoreTone = {
  ring: string;
  track: string;
  textClass: string;
  label: string;
};

export type ScoreBreakdownItem = {
  label: string;
  score: number;
  detail: string;
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getScoreTone(score: number): ScoreTone {
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

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function estimateScoreBreakdown(analysis: AIAnalysisResult): ScoreBreakdownItem[] {
  const baseScore = clampScore(analysis.match_score);
  const missingSkillsCount = analysis.missing_skills.length;
  const keywordGapCount = analysis.keyword_gaps.length;
  const improvementCount = analysis.resume_improvements.length;
  const rewrittenBulletCount = analysis.rewritten_bullets.length;
  const riskFlagCount = analysis.risk_flags.length;

  const skillsScore = clampScore(baseScore * 0.35 + (100 - missingSkillsCount * 16) * 0.65);
  const keywordsScore = clampScore(baseScore * 0.35 + (100 - keywordGapCount * 15) * 0.65);

  const experienceSignal =
    62 + Math.min(rewrittenBulletCount, 6) * 5 - Math.min(improvementCount, 5) * 3 - Math.min(riskFlagCount, 4) * 2;
  const experienceScore = clampScore(baseScore * 0.4 + experienceSignal * 0.6);

  const hasBulletFormatting = /\n\s*[-*]/.test(analysis.optimized_resume);
  const formattingSignal =
    76 + (hasBulletFormatting ? 8 : 0) + (analysis.optimized_resume.length > 400 ? 5 : -6) - Math.min(riskFlagCount, 3) * 6;
  const formattingScore = clampScore(baseScore * 0.3 + formattingSignal * 0.7);

  return [
    {
      label: "Skills",
      score: skillsScore,
      detail:
        missingSkillsCount > 0
          ? `${missingSkillsCount} visible ${pluralize(missingSkillsCount, "skill gap", "skill gaps")} to address.`
          : "Core skills coverage looks strong from the current resume.",
    },
    {
      label: "Experience",
      score: experienceScore,
      detail: `${rewrittenBulletCount} stronger bullet ${pluralize(
        rewrittenBulletCount,
        "draft",
        "drafts",
      )} grounded in existing experience.`,
    },
    {
      label: "Keywords",
      score: keywordsScore,
      detail:
        keywordGapCount > 0
          ? `${keywordGapCount} ATS ${pluralize(keywordGapCount, "keyword", "keywords")} still missing from the resume.`
          : "Keyword alignment looks tight for ATS screening.",
    },
    {
      label: "Formatting",
      score: formattingScore,
      detail:
        riskFlagCount > 0
          ? "A few clarity or presentation flags are still worth tightening."
          : "Structure and readability look ready for tailoring.",
    },
  ];
}
