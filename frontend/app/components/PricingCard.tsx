"use client";

import Link from "next/link";

import ManageBillingButton from "@/app/components/ManageBillingButton";
import UpgradeButton from "@/app/components/UpgradeButton";

type PricingCardProps = {
  currentPlan: "free" | "pro";
  isDemoMode?: boolean;
  isSignedIn: boolean;
  plan: "free" | "pro";
};

const PLAN_DETAILS = {
  free: {
    eyebrow: "Free",
    price: "$0",
    interval: "/month",
    features: ["3 analyses/month", "Basic results"],
  },
  pro: {
    eyebrow: "Pro",
    price: "$9",
    interval: "/month",
    features: ["Unlimited analyses", "PDF downloads", "Full analysis history", "Priority AI"],
  },
} as const;

export default function PricingCard({ currentPlan, isDemoMode = false, isSignedIn, plan }: PricingCardProps) {
  const details = PLAN_DETAILS[plan];
  const isCurrentPlan = currentPlan === plan;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
      <div className="flex min-h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">{details.eyebrow}</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-3xl font-semibold tracking-tight text-gray-950">{details.price}</span>
              <span className="pb-1 text-sm text-gray-500">{details.interval}</span>
            </div>
          </div>
          {isCurrentPlan ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Current plan
            </span>
          ) : null}
        </div>

        <ul className="mt-5 space-y-3">
          {details.features.map((feature) => (
            <li key={feature} className="flex gap-3 text-sm leading-6 text-gray-600">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {isDemoMode ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">Demo mode</div>
          ) : plan === "pro" ? (
            isCurrentPlan ? (
              <ManageBillingButton label="Manage billing" />
            ) : isSignedIn ? (
              <UpgradeButton label="Upgrade to Pro" />
            ) : (
              <Link
                href="/login"
                className="inline-flex rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
              >
                Upgrade to Pro
              </Link>
            )
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">
              {isCurrentPlan ? "Included in your account" : "Free starter access"}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
