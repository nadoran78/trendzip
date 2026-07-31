"use client";

import { ChevronLeft, ChevronRight, ImageOff, Play } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import type { FeedVideo } from "@/types/api";

type RelatedVideoCarouselProps = {
  videos: FeedVideo[];
};

type ScrollState = {
  hasOverflow: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

const INITIAL_SCROLL_STATE: ScrollState = {
  hasOverflow: false,
  canScrollLeft: false,
  canScrollRight: false,
};

const SCROLL_EDGE_TOLERANCE = 2;

export function RelatedVideoCarousel({
  videos,
}: RelatedVideoCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState(INITIAL_SCROLL_STATE);

  const updateScrollState = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) return;

    const maxScrollLeft =
      scrollContainer.scrollWidth - scrollContainer.clientWidth;
    const nextScrollState = {
      hasOverflow: maxScrollLeft > SCROLL_EDGE_TOLERANCE,
      canScrollLeft: scrollContainer.scrollLeft > SCROLL_EDGE_TOLERANCE,
      canScrollRight:
        scrollContainer.scrollLeft <
        maxScrollLeft - SCROLL_EDGE_TOLERANCE,
    };

    setScrollState((currentScrollState) =>
      currentScrollState.hasOverflow === nextScrollState.hasOverflow &&
      currentScrollState.canScrollLeft === nextScrollState.canScrollLeft &&
      currentScrollState.canScrollRight === nextScrollState.canScrollRight
        ? currentScrollState
        : nextScrollState,
    );
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) return;

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scrollContainer);

    return () => resizeObserver.disconnect();
  }, [updateScrollState, videos.length]);

  const scrollByCard = (direction: -1 | 1) => {
    const scrollContainer = scrollContainerRef.current;
    const firstCard = scrollContainer?.firstElementChild;

    if (!scrollContainer || !(firstCard instanceof HTMLElement)) return;

    const columnGap =
      Number.parseFloat(getComputedStyle(scrollContainer).columnGap) || 0;
    const scrollDistance = firstCard.getBoundingClientRect().width + columnGap;

    scrollContainer.scrollBy({
      left: direction * scrollDistance,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        aria-label="관련 영상 목록"
        onScroll={updateScrollState}
        className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {videos.map((video) => (
          <RelatedVideoCard key={video.videoId} video={video} />
        ))}
      </div>

      {scrollState.hasOverflow ? (
        <div className="tz-carousel-controls absolute -top-[42px] right-4 items-center gap-1.5">
          <CarouselButton
            direction="left"
            disabled={!scrollState.canScrollLeft}
            onClick={() => scrollByCard(-1)}
          />
          <CarouselButton
            direction="right"
            disabled={!scrollState.canScrollRight}
            onClick={() => scrollByCard(1)}
          />
        </div>
      ) : null}
    </div>
  );
}

type CarouselButtonProps = {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
};

function CarouselButton({
  direction,
  disabled,
  onClick,
}: CarouselButtonProps) {
  const isLeft = direction === "left";
  const label = isLeft ? "이전 관련 영상" : "다음 관련 영상";
  const Icon = isLeft ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-full border border-[#303030] bg-[#181818] text-[#00e5ff] shadow-sm transition-colors hover:border-[#00e5ff]/60 hover:bg-[#222] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff] disabled:cursor-not-allowed disabled:border-[#252525] disabled:text-[#555] disabled:opacity-60"
    >
      <Icon aria-hidden="true" size={16} strokeWidth={2.2} />
    </button>
  );
}

function RelatedVideoCard({ video }: { video: FeedVideo }) {
  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`;

  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${video.title} 유튜브에서 보기`}
      className="group w-[188px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#222] bg-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
    >
      <div className="relative aspect-video overflow-hidden bg-[#111]">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            sizes="188px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/25">
            <ImageOff aria-hidden="true" size={28} strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-md">
          <Play
            aria-hidden="true"
            size={16}
            fill="currentColor"
            className="ml-0.5"
          />
        </span>
      </div>

      <div className="px-3 pb-3 pt-2.5">
        <p className="truncate text-[12px] font-bold text-white">
          {video.title}
        </p>
        <p className="mt-1 truncate text-[10px] font-medium text-[#888]">
          {video.channelName}
        </p>
      </div>
    </a>
  );
}
