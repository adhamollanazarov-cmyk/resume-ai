import Link from "next/link";
import { notFound } from "next/navigation";

import AnalysisResult from "@/app/components/AnalysisResult";
import { requireCurrentUser } from "@/lib/auth-helpers";
import { getUserAnalysis } from "@/lib/backend";

type AnalysisDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AnalysisDetailPage({ params }: AnalysisDetailPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const analysisId = Number(id);

  if (!Number.isInteger(analysisId) || analysisId <= 0) {
    notFound();
  }

  const analysisDetail = await getUserAnalysis(user.id, analysisId).catch(() => null);
  if (!analysisDetail) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto grid max-w-5xl gap-8">
        <header className="grid gap-4">
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
          >
            Back to dashboard
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Saved analysis</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-950">Analysis #{analysisDetail.id}</h1>
            <p className="mt-4 text-sm leading-7 text-gray-500">
              Saved{" "}
              {new Date(analysisDetail.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </header>

        <AnalysisResult analysis={analysisDetail.analysis_json} jobDescription={analysisDetail.job_description} />
      </div>
    </main>
  );
}
