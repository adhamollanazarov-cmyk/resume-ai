"use client";

import PricingCard from "@/app/components/PricingCard";
import UpgradeBanner from "@/app/components/UpgradeBanner";

type PricingSectionProps = {
  analysisCount: number;
  currentPlan: "free" | "pro";
  isDemoMode?: boolean;
  isSignedIn: boolean;
  limit?: number;
};

export default function PricingSection({
  analysisCount,
  currentPlan,
  isDemoMode = false,
  isSignedIn,
  limit = 3,
}: PricingSectionProps) {
  return (
    <div className="grid gap-4">
      <UpgradeBanner
        currentCount={analysisCount}
        currentPlan={currentPlan}
        isSignedIn={isSignedIn}
        limit={limit}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <PricingCard currentPlan={currentPlan} isDemoMode={isDemoMode} isSignedIn={isSignedIn} plan="free" />
        <PricingCard currentPlan={currentPlan} isDemoMode={isDemoMode} isSignedIn={isSignedIn} plan="pro" />
      </div>
    </div>
  );
}
