"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type KeywordBackButtonProps = {
  fallbackHref: string;
};

export function KeywordBackButton({
  fallbackHref,
}: KeywordBackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#222] bg-[#1a1a1a] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[#222] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
    >
      <ArrowLeft aria-hidden="true" size={14} strokeWidth={2} />
      뒤로
    </button>
  );
}
