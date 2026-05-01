"use client";

import Link from "next/link";

import UpgradeButton from "@/app/components/UpgradeButton";

type UpgradeBannerProps = {
  currentCount?: number;
  isSignedIn?: boolean;
  limit?: number;
};

export default function UpgradeBanner({
  currentCount = 3,
  isSignedIn = true,
  limit = 3,
}: UpgradeBannerProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-amber-900">
            You&apos;ve used {currentCount}/{limit} free analyses this month. Upgrade to Pro -&gt;
          </p>
          <p className="mt-1 leading-6 text-amber-800">Unlock unlimited analyses, downloads, and full saved history.</p>
        </div>
        {isSignedIn ? (
          <UpgradeButton label="Upgrade to Pro" className="px-4 py-2 text-xs" helperClassName="text-amber-700" />
        ) : (
          <Link
            href="/login"
            className="inline-flex rounded-xl bg-black px-4 py-2 text-xs font-medium text-white transition-all duration-200 ease-out hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
          >
            Upgrade to Pro
          </Link>
        )}
      </div>
    </div>
  );
}
