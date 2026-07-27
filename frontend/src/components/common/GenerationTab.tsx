import Link from "next/link";

import { GENERATION_OPTIONS } from "@/lib/generation";
import type { GenerationSlug } from "@/types/api";

export type TrendView = "feed" | "trend";

type GenerationTabProps = {
  activeGeneration: GenerationSlug;
  activeView: TrendView;
};

export function GenerationTab({
  activeGeneration,
  activeView,
}: GenerationTabProps) {
  return (
    <nav
      aria-label="세대 선택"
      className="inline-flex h-10 shrink-0 rounded-full border border-white/5 bg-[#1a1a1a] p-1 shadow-inner"
    >
      {GENERATION_OPTIONS.map((option) => {
        const isActive = option.slug === activeGeneration;
        const isTeen = option.slug === "teen";

        return (
          <Link
            key={option.slug}
            href={`/${activeView}/${option.slug}`}
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-extrabold transition-all duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]",
              isActive
                ? isTeen
                  ? "bg-gradient-to-br from-[#ff8ad4] to-[#b6ffce] text-[#0a0a0a] shadow-[0_5px_16px_-6px_rgba(255,138,212,0.65)]"
                  : "bg-gradient-to-br from-[#ffb86b] to-[#ffe16b] text-[#0a0a0a] shadow-[0_5px_16px_-6px_rgba(255,184,107,0.65)]"
                : "text-[#888] hover:text-white",
            ].join(" ")}
          >
            <span aria-hidden="true" className="text-xs">
              {isTeen ? "🎀" : "🍑"}
            </span>
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
