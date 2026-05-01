import { AIAnalysisResult, RewrittenBulletItem, ResumeImprovementSections } from "@/lib/api";

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

export type ResumeImprovementKey = "experience" | "general" | "keywords" | "skills";

export type NormalizedResumeImprovements = Record<ResumeImprovementKey, string[]>;

export type NormalizedRewrittenBullet = {
  after: string;
  before: string | null;
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item))
    .filter((item): item is string => item.length > 0);
}

function isResumeImprovementSections(value: AIAnalysisResult["resume_improvements"]): value is ResumeImprovementSections {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getLegacyMissingSkills(analysis: AIAnalysisResult): string[] {
  return normalizeStringArray(analysis.missing_skills);
}

function getLegacyKeywordGaps(analysis: AIAnalysisResult): string[] {
  return normalizeStringArray(analysis.keyword_gaps);
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

export function getAnalysisMatchScore(analysis: AIAnalysisResult): number {
  return clampScore(typeof analysis.match_score === "number" ? analysis.match_score : 0);
}

export function getAnalysisScoreReasoning(analysis: AIAnalysisResult): string {
  return normalizeText(analysis.score_reasoning) || "The analysis is ready, but no extra score reasoning was returned.";
}

export function getAnalysisRoleSummary(analysis: AIAnalysisResult): string {
  return normalizeText(analysis.role_summary) || "Analysis result";
}

export function getOptimizedResumeText(analysis: AIAnalysisResult): string {
  return normalizeText(analysis.optimized_resume);
}

export function getCoverLetterText(analysis: AIAnalysisResult): string {
  return normalizeText(analysis.cover_letter);
}

export function getRiskFlags(analysis: AIAnalysisResult): string[] {
  return normalizeStringArray(analysis.risk_flags);
}

export function isEstimatedAnalysis(analysis: AIAnalysisResult): boolean {
  return analysis.is_estimated === true;
}

export function getResumeImprovementSections(analysis: AIAnalysisResult): NormalizedResumeImprovements {
  const raw = analysis.resume_improvements;
  const legacyGeneral = Array.isArray(raw) ? normalizeStringArray(raw) : [];

  if (isResumeImprovementSections(raw)) {
    return {
      skills: normalizeStringArray(raw.skills ?? getLegacyMissingSkills(analysis)),
      experience: normalizeStringArray(raw.experience),
      keywords: normalizeStringArray(raw.keywords ?? getLegacyKeywordGaps(analysis)),
      general: normalizeStringArray(raw.general ?? legacyGeneral),
    };
  }

  return {
    skills: getLegacyMissingSkills(analysis),
    experience: [],
    keywords: getLegacyKeywordGaps(analysis),
    general: legacyGeneral,
  };
}

function normalizeRewrittenBulletObject(item: RewrittenBulletItem): NormalizedRewrittenBullet | null {
  const before = normalizeText(item.before) || normalizeText(item.original) || null;
  const after = normalizeText(item.after) || normalizeText(item.rewritten);

  if (!after && !before) {
    return null;
  }

  return {
    before,
    after: after || before || "",
  };
}

export function getRewrittenBullets(analysis: AIAnalysisResult): NormalizedRewrittenBullet[] {
  if (!Array.isArray(analysis.rewritten_bullets)) {
    return [];
  }

  return analysis.rewritten_bullets.reduce<NormalizedRewrittenBullet[]>((items, bullet) => {
    if (typeof bullet === "string") {
      const after = normalizeText(bullet);
      if (after) {
        items.push({ before: null, after });
      }
      return items;
    }

    if (bullet && typeof bullet === "object") {
      const normalized = normalizeRewrittenBulletObject(bullet);
      if (normalized) {
        items.push(normalized);
      }
    }

    return items;
  }, []);
}

export function estimateScoreBreakdown(analysis: AIAnalysisResult): ScoreBreakdownItem[] {
  const baseScore = getAnalysisMatchScore(analysis);
  const improvements = getResumeImprovementSections(analysis);
  const rewrittenBullets = getRewrittenBullets(analysis);
  const riskFlags = getRiskFlags(analysis);
  const optimizedResume = getOptimizedResumeText(analysis);

  const skillsGapCount = improvements.skills.length;
  const keywordGapCount = improvements.keywords.length;
  const generalCount = improvements.general.length;
  const experienceGapCount = improvements.experience.length;
  const rewrittenBulletCount = rewrittenBullets.length;
  const riskFlagCount = riskFlags.length;

  const skillsScore = clampScore(baseScore * 0.35 + (100 - skillsGapCount * 16) * 0.65);
  const keywordsScore = clampScore(baseScore * 0.35 + (100 - keywordGapCount * 15) * 0.65);

  const experienceSignal =
    64 +
    Math.min(rewrittenBulletCount, 6) * 5 -
    Math.min(experienceGapCount, 5) * 4 -
    Math.min(generalCount, 5) * 2 -
    Math.min(riskFlagCount, 4) * 2;
  const experienceScore = clampScore(baseScore * 0.4 + experienceSignal * 0.6);

  const hasBulletFormatting = /\n\s*[-*]/.test(optimizedResume);
  const formattingSignal =
    76 + (hasBulletFormatting ? 8 : 0) + (optimizedResume.length > 400 ? 5 : -6) - Math.min(riskFlagCount, 3) * 6;
  const formattingScore = clampScore(baseScore * 0.3 + formattingSignal * 0.7);

  return [
    {
      label: "Skills",
      score: skillsScore,
      detail:
        skillsGapCount > 0
          ? `${skillsGapCount} visible ${pluralize(skillsGapCount, "skill gap", "skill gaps")} still worth addressing.`
          : "Core skill coverage looks strong from the current resume.",
    },
    {
      label: "Experience",
      score: experienceScore,
      detail:
        rewrittenBulletCount > 0
          ? `${rewrittenBulletCount} stronger bullet ${pluralize(rewrittenBulletCount, "draft", "drafts")} are ready to reuse.`
          : "Experience reads clearly, with only light tightening still recommended.",
    },
    {
      label: "Keywords",
      score: keywordsScore,
      detail:
        keywordGapCount > 0
          ? `${keywordGapCount} ATS ${pluralize(keywordGapCount, "keyword", "keywords")} are still missing or underused.`
          : "Keyword alignment looks healthy for ATS screening.",
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

export function getScoreValues(
  analysis: AIAnalysisResult,
): Record<"experience" | "formatting" | "keywords" | "skills", number> {
  const estimated = estimateScoreBreakdown(analysis).reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.label.toLowerCase()] = item.score;
    return accumulator;
  }, {});

  const scores = analysis.scores;

  return {
    skills: clampScore(typeof scores?.skills === "number" ? scores.skills : estimated.skills ?? 0),
    experience: clampScore(typeof scores?.experience === "number" ? scores.experience : estimated.experience ?? 0),
    keywords: clampScore(typeof scores?.keywords === "number" ? scores.keywords : estimated.keywords ?? 0),
    formatting: clampScore(typeof scores?.formatting === "number" ? scores.formatting : estimated.formatting ?? 0),
  };
}
