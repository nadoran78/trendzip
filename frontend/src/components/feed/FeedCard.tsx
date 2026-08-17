"use client";

import { Eye, ImageOff, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { trackAnalyticsEvent } from "@/lib/analytics/events";
import { getGenerationBySlug } from "@/lib/generation";
import type { FeedVideo, GenerationSlug } from "@/types/api";

type FeedCardProps = {
  video: FeedVideo;
  generation: GenerationSlug;
  priority?: boolean;
};

const BADGE_STYLES: Record<string, string> = {
  HOT: "border-transparent bg-[#ff2d9b] text-white",
  NEW: "border-[#00e5ff]/40 bg-[#00e5ff]/15 text-[#9af5ff]",
};

export function FeedCard({
  video,
  generation,
  priority = false,
}: FeedCardProps) {
  const badgeStyle =
    (video.badge && BADGE_STYLES[video.badge]) ??
    "border-white/15 bg-black/70 text-white";
  const generationEmoji = generation === "teen" ? "🎀" : "🍑";
  const analyticsGeneration = getGenerationBySlug(generation)!.apiValue;
  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`;

  function trackYouTubeClick(
    source: "feed_thumbnail" | "feed_title",
  ) {
    trackAnalyticsEvent("youtube_video_click", {
      generation: analyticsGeneration,
      video_id: video.videoId,
      keyword_id: video.keywordId,
      keyword: video.keyword,
      feed_section: video.feedSection ?? "UNKNOWN",
      click_area: source,
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.04] bg-[#1a1a1a]">
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${video.title} 유튜브에서 보기`}
        onClick={() => trackYouTubeClick("feed_thumbnail")}
        className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00e5ff]"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-[#111]">
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 430px) 100vw, 430px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              priority={priority}
              loading={priority ? "eager" : "lazy"}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/25">
              <ImageOff aria-hidden="true" size={36} strokeWidth={1.5} />
              <span className="sr-only">썸네일 없음</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />

          <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-md transition-transform duration-200 group-hover:scale-105">
            <Play
              aria-hidden="true"
              size={20}
              fill="currentColor"
              className="ml-0.5"
            />
          </span>

          {video.badge ? (
            <span
              className={`tz-round absolute left-2.5 top-2.5 rounded-md border px-2.5 py-1 text-[10px] font-bold ${badgeStyle}`}
            >
              {video.badge}
            </span>
          ) : null}

          <span
            aria-hidden="true"
            className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full border border-white/15 bg-black/55 text-sm backdrop-blur-md"
          >
            {generationEmoji}
          </span>

          {video.durationSeconds !== null ? (
            <span className="tz-round absolute bottom-2.5 right-2.5 rounded bg-black/75 px-2 py-1 text-[10px] font-semibold text-white">
              {formatDuration(video.durationSeconds)}
            </span>
          ) : null}
        </div>
      </a>

      <div className="px-3.5 pb-4 pt-3.5">
        <h2 className="line-clamp-2 text-[15px] font-bold leading-[1.4] text-white">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackYouTubeClick("feed_title")}
            className="transition-colors hover:text-[#9af5ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
          >
            {video.title}
          </a>
        </h2>

        <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs font-medium text-[#888]">
          <span className="truncate font-semibold text-white/70">
            {video.channelName}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Link
            href={`/keyword/${video.keywordId}`}
            aria-label={`${video.keyword} 키워드 상세 보기`}
            className="max-w-full truncate rounded-full border border-[#00e5ff] bg-[#00e5ff]/[0.06] px-2.5 py-1 text-[11px] font-semibold text-[#00e5ff] transition-colors hover:bg-[#00e5ff]/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
          >
            #{video.keyword}
          </Link>
        </div>

        <div className="mt-3 flex min-h-4 items-center text-[11px] font-medium text-[#888]">
          {video.viewCount !== null ? (
            <span className="inline-flex items-center gap-1">
              <Eye aria-hidden="true" size={13} strokeWidth={1.8} />
              조회수 {formatViewCount(video.viewCount)}
            </span>
          ) : (
            <span>조회수 집계 중</span>
          )}
          {video.publishedAt ? (
            <>
              <span aria-hidden="true" className="mx-1.5 text-white/20">
                ·
              </span>
              <time dateTime={video.publishedAt}>
                {formatPublishedAt(video.publishedAt)}
              </time>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function formatViewCount(viewCount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(viewCount);
}

function formatDuration(durationSeconds: number): string {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  return [hours, minutes, seconds]
    .filter((_, index) => hours > 0 || index > 0)
    .map((value, index) => {
      if (index === 0) {
        return String(value);
      }

      return String(value).padStart(2, "0");
    })
    .join(":");
}

function formatPublishedAt(publishedAt: string): string {
  const date = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(publishedAt)
      ? publishedAt
      : `${publishedAt}+09:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return publishedAt;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(date);
}
