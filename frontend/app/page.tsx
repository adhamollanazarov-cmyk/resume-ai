import Link from "next/link";

import AnalyzerWorkspace from "@/app/components/AnalyzerWorkspace";
import ExampleResult from "@/app/components/ExampleResult";
import { getCurrentSession } from "@/lib/auth-helpers";

export default async function LandingPage() {
  const session = await getCurrentSession();

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto grid max-w-6xl gap-12">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">AI RESUME ANALYZER</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">Sign in and keep your resume work in one place.</h1>
            <p className="mt-5 text-base leading-8 text-gray-600">
              GitHub login gives each user a simple dashboard with their email, plan, and analysis count. This keeps the first auth step small and production-shaped.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={session?.user?.id ? "/dashboard" : "/login"}
                className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
              >
                {session?.user?.id ? "Open dashboard" : "Start with GitHub"}
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["GitHub sign-in", "A low-friction auth flow using Auth.js and GitHub OAuth."],
                ["Protected dashboard", "Server-side route protection keeps the dashboard behind login."],
                ["Stored users", "User records are synced into PostgreSQL with plan and analysis count."],
              ].map(([title, copy]) => (
                <article
                  key={title}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.03)]"
                >
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{copy}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.06)]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Dashboard preview</p>
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500">Protected</span>
              </div>
              <div className="mt-6 grid gap-3">
                {[
                  ["Email", "user@example.com"],
                  ["Plan", "free"],
                  ["Analysis count", "0"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-gray-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                    <p className="mt-3 text-sm text-gray-800">{value}</p>
                  </div>
                ))}
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-4">
                  <p className="text-sm leading-7 text-gray-500">
                    A minimal first dashboard: authenticated, protected, and backed by a real user record.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ExampleResult />

        <section id="analyze" className="grid gap-6 scroll-mt-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Analyze</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">Run a real resume analysis.</h2>
            <p className="mt-4 text-sm leading-7 text-gray-500">
              Anonymous visitors can still analyze a resume. Signed-in free users can run up to 3 successful analyses total.
            </p>
          </div>
          <AnalyzerWorkspace />
        </section>
      </div>
    </main>
  );
}
