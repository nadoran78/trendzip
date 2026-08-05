"use client";

import { RefreshCw } from "lucide-react";

export function OfflineRetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="tz-round mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#00e5ff] px-6 text-sm font-bold text-[#0a0a0a] transition-colors hover:bg-[#4dedff] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00e5ff]"
    >
      <RefreshCw aria-hidden="true" className="size-4" strokeWidth={2.5} />
      다시 시도
    </button>
  );
}
