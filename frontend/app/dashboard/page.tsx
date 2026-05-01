import Link from "next/link";

import ManageBillingButton from "@/app/components/ManageBillingButton";
import UpgradeButton from "@/app/components/UpgradeButton";
import { getUserAnalyses } from "@/lib/backend";
import { isDemoAuthEnabled, requireCurrentUser } from "@/lib/auth-helpers";

const FREE_ANALYSIS_LIMIT = 3;

type DashboardPageProps = {
  searchParams?: Promise<{
    upgrade?: string;
    upgraded?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const demoAuthEnabled = isDemoAuthEnabled();
  const recentAnalyses = demoAuthEnabled ? [] : await getUserAnalyses(user.id, { limit: 5 }).catch(() => []);
  const remainingFreeAnalyses =
    user.plan === "pro" ? "Unlimited" : String(Math.max(FREE_ANALYSIS_LIMIT - user.analysisCount, 0));

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto grid max-w-4xl gap-8">
        <header>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Dashboard</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-950">Your account</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-500">A simple protected dashboard showing the authenticated user record synced from Google login.</p>
          </div>
          {params?.upgraded === "1" ? (
            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Your Pro upgrade is active.
            </div>
          ) : null}
          {params?.upgrade === "cancelled" ? (
            <div className="mt-5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              Upgrade checkout was cancelled. You can try again anytime.
            </div>
          ) : null}
          {demoAuthEnabled ? (
            <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              Demo mode is active. This dashboard uses a mock user, and account-specific billing or saved-history actions stay disabled.
            </div>
          ) : null}
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account</p>
            <p className="mt-3 text-sm leading-7 text-gray-600">{user.email ?? "Unknown email"}</p>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Plan</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-gray-950">{user.plan}</p>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Analysis count</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-gray-950">{user.analysisCount}</p>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Remaining free analyses</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-gray-950">{remainingFreeAnalyses}</p>
          </article>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Upgrade</p>
              <p className="mt-2 text-sm leading-7 text-gray-600">
                Free users keep 3 successful analyses total. Pro users keep unlimited access.
              </p>
            </div>
            {demoAuthEnabled ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">
                Demo mode
              </div>
            ) : user.plan === "pro" ? (
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  Pro active
                </div>
                <ManageBillingButton />
              </div>
            ) : (
              <UpgradeButton label="Upgrade to Pro" />
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent analyses</p>
            <p className="text-sm leading-7 text-gray-600">
              Open a saved analysis to revisit the score, recommendations, optimized resume, and cover letter.
            </p>
          </div>

          {recentAnalyses.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {recentAnalyses.map((analysis) => (
                <Link
                  key={analysis.id}
                  href={`/dashboard/analyses/${analysis.id}`}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 transition-all duration-200 hover:border-gray-300 hover:bg-white"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">Match score {analysis.match_score ?? "N/A"}</p>
                      <p className="mt-2 text-sm leading-6 text-gray-500">{analysis.job_description}</p>
                    </div>
                    <div className="shrink-0 text-sm text-gray-400">
                      {new Date(analysis.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-6 text-sm text-gray-500">
              {demoAuthEnabled ? "Demo mode does not load saved analyses." : "No saved analyses yet."}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
