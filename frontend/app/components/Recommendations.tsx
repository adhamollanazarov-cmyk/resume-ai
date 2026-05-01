import { AIAnalysisResult } from "@/lib/api";

type RecommendationCard = {
  items: string[];
  title: string;
};

function buildSections(analysis: AIAnalysisResult): RecommendationCard[] {
  return [
    {
      title: "Skills improvements",
      items:
        analysis.missing_skills.length > 0
          ? analysis.missing_skills.map((skill) => `Show direct evidence of ${skill}.`)
          : ["Core skill coverage is already visible in the resume."],
    },
    {
      title: "Experience improvements",
      items:
        analysis.rewritten_bullets.length > 0
          ? analysis.rewritten_bullets
          : ["No rewritten bullets were returned for this role."],
    },
    {
      title: "Keyword optimization",
      items:
        analysis.keyword_gaps.length > 0
          ? analysis.keyword_gaps.map((keyword) => `Mirror the job language for "${keyword}" where truthful.`)
          : ["Keyword alignment looks healthy for the current target role."],
    },
    {
      title: "General resume improvements",
      items:
        analysis.resume_improvements.length > 0
          ? analysis.resume_improvements
          : ["No additional general resume improvements were returned."],
    },
  ];
}

export default function Recommendations({ analysis }: { analysis: AIAnalysisResult }) {
  const sections = buildSections(analysis);

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {sections.map((section) => (
        <article
          key={section.title}
          className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-gray-300"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{section.title}</h2>
          <ul className="mt-4 space-y-3">
            {section.items.map((item, index) => (
              <li key={`${section.title}-${index}`} className="flex gap-3 text-sm leading-6 text-gray-700">
                <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
