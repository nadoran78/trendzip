"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type { GenerationSlug } from "@/types/api";

type GenerationCard = {
  slug: GenerationSlug;
  label: "10대" | "20대";
  shortLabel: "10" | "20";
  eyebrow: string;
  emoji: string;
  description: string;
};

const GENERATION_CARDS: readonly GenerationCard[] = [
  {
    slug: "teen",
    label: "10대",
    shortLabel: "10",
    eyebrow: "GEN α · Z",
    emoji: "🎀",
    description: "중·고등학생 트렌드",
  },
  {
    slug: "twenty",
    label: "20대",
    shortLabel: "20",
    eyebrow: "MZ · GEN Z",
    emoji: "🍑",
    description: "대학생 · 사회초년생",
  },
];

const NAVIGATION_DELAY_MS = 420;

export function GenerationSelector() {
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);
  const [selectedGeneration, setSelectedGeneration] =
    useState<GenerationSlug | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleSelect(
    event: MouseEvent<HTMLAnchorElement>,
    generation: GenerationSlug,
  ) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();

    if (selectedGeneration) {
      return;
    }

    setSelectedGeneration(generation);
    const navigationDelay = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? 0
      : NAVIGATION_DELAY_MS;

    timeoutRef.current = window.setTimeout(() => {
      router.push(`/feed/${generation}`);
    }, navigationDelay);
  }

  return (
    <>
      <div className="mt-10 grid w-full grid-cols-2 gap-3.5 px-1">
        {GENERATION_CARDS.map((card) => {
          const isSelected = selectedGeneration === card.slug;

          return (
            <Link
              key={card.slug}
              href={`/feed/${card.slug}`}
              onClick={(event) => handleSelect(event, card.slug)}
              aria-label={`${card.label} 유튜브 트렌드 피드 보기`}
              aria-disabled={selectedGeneration !== null}
              data-selected={isSelected}
              className={[
                "tz-generation-card group relative aspect-[1/1.15] overflow-visible rounded-[32px]",
                "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00e5ff]",
                card.slug === "teen"
                  ? "tz-generation-card--teen"
                  : "tz-generation-card--twenty",
              ].join(" ")}
            >
              <span className="tz-card-sheen absolute inset-0 rounded-[32px]" />
              <span className="tz-card-rim absolute inset-0 rounded-[32px]" />

              <span
                aria-hidden="true"
                className="tz-sparkle absolute -top-2 right-[18%] text-sm"
              >
                ✨
              </span>
              <span
                aria-hidden="true"
                className="tz-sparkle tz-sparkle-delayed absolute -bottom-1.5 left-[22%] text-[11px]"
              >
                ✨
              </span>

              <span className="tz-generation-eyebrow tz-round absolute left-5 top-[18px] flex items-center gap-1.5 text-[11px] font-bold text-black/65">
                <span aria-hidden="true" className="text-sm">
                  {card.emoji}
                </span>
                {card.eyebrow}
              </span>

              <span className="tz-generation-copy absolute inset-x-5 bottom-[18px] text-left text-[#0a0a0a]">
                <span className="tz-generation-number tz-round block whitespace-nowrap text-[64px] font-bold leading-[0.9]">
                  {card.shortLabel}
                  <span className="tz-generation-suffix ml-0.5 align-[24px] text-[30px] opacity-80">
                    대
                  </span>
                </span>
                <span className="tz-generation-description mt-2 block text-[12px] font-semibold text-black/65">
                  {card.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-6 flex items-center gap-2 text-center text-[12px] text-white/50">
        <span>나중에 바꿀 수 있어요</span>
        <span aria-hidden="true" className="size-[3px] rounded-full bg-white/30" />
        <span className="text-white/70">피드로 바로 이동 ✨</span>
      </p>

      <div
        aria-live="polite"
        aria-atomic="true"
        className={[
          "tz-selection-toast fixed bottom-[max(32px,env(safe-area-inset-bottom))] left-1/2 z-50",
          "flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-3",
          "tz-round text-[13px] font-bold text-[#0a0a0a] shadow-[0_12px_40px_rgba(0,229,255,0.2)]",
          selectedGeneration ? "block" : "hidden",
        ].join(" ")}
      >
        {selectedGeneration && (
          <>
            <span aria-hidden="true">
              {selectedGeneration === "teen" ? "🎀" : "🍊"}
            </span>
            {selectedGeneration === "teen" ? "10대" : "20대"} 트렌드
            불러오는 중…
          </>
        )}
      </div>
    </>
  );
}
