"use client";

import { useState } from "react";

import { createPortalSession } from "@/lib/api";

type ManageBillingButtonProps = {
  className?: string;
  helperClassName?: string;
  label?: string;
};

export default function ManageBillingButton({
  className = "",
  helperClassName = "",
  label = "Manage Billing",
}: ManageBillingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const session = await createPortalSession();
      window.location.assign(session.url);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not open the billing portal.";
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
          "rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400",
          className,
        ].join(" ")}
      >
        {isLoading ? "Opening..." : label}
      </button>
      {error ? <p className={`text-xs text-red-500 ${helperClassName}`.trim()}>{error}</p> : null}
    </div>
  );
}
