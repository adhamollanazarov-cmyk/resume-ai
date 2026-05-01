"use client";

import { useState } from "react";

import { createCheckoutSession } from "@/lib/api";

type UpgradeButtonProps = {
  className?: string;
  helperClassName?: string;
  label?: string;
};

export default function UpgradeButton({
  className = "",
  helperClassName = "",
  label = "Upgrade to Pro",
}: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const session = await createCheckoutSession();
      window.location.assign(session.url);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not start the upgrade checkout.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => {
          void handleClick();
        }}
        disabled={isLoading}
        className={[
          "rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500",
          className,
        ].join(" ")}
      >
        {isLoading ? "Redirecting..." : label}
      </button>
      {error ? <p className={`text-xs text-red-500 ${helperClassName}`.trim()}>{error}</p> : null}
    </div>
  );
}
