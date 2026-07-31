import { Inbox } from "lucide-react";
import Link from "next/link";

import { FeedCard } from "@/components/feed/FeedCard";
import type { FeedVideo, GenerationSlug } from "@/types/api";

type FeedListProps = {
  videos: FeedVideo[];
  generation: GenerationSlug;
};

export function FeedList({ videos, generation }: FeedListProps) {
  const generationLabel = generation === "teen" ? "10대" : "20대";

  if (videos.length === 0) {
    return (
      <>
        <h1 className="sr-only">{generationLabel} YouTube 트렌드 피드</h1>
        <section className="flex min-h-[520px] flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-white/5 bg-[#1a1a1a] text-white/30">
            <Inbox aria-hidden="true" size={26} strokeWidth={1.6} />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              아직 준비된 피드가 없습니다
            </h2>
            <p className="text-sm leading-6 text-[#888]">
              새로운 트렌드 영상이 수집되면 이곳에 표시됩니다.
            </p>
          </div>
        </section>
      </>
    );
  }

  const todayPickVideos = videos
    .filter((video) => video.feedSection === "TODAY_PICK")
    .slice(0, 1);
  const trendingVideos = videos.filter(
    (video) => video.feedSection === "RISING",
  );
  const relatedVideos = videos.filter(
    (video) =>
      video.feedSection === "RELATED" || video.feedSection === null,
  );

  return (
    <>
      <h1 className="sr-only">{generationLabel} YouTube 트렌드 피드</h1>
      <FeedVideoSection
        headingId="today-pick-heading"
        emoji={generation === "teen" ? "🎀" : "🍑"}
        title={`오늘의 ${generationLabel} 픽`}
        subtitle={`${formatKoreanDate()} · 오늘의 대표 영상`}
        videos={todayPickVideos}
        generation={generation}
        className="pt-5"
        priorityFirst
      />
      <FeedVideoSection
        headingId="trending-heading"
        emoji="🔥"
        title="지금 뜨는 트렌드"
        subtitle="현재 상위 트렌드 키워드 관련 영상"
        videos={trendingVideos}
        generation={generation}
        className="pt-4"
        actionLabel="랭킹 보기"
        actionHref={`/trend/${generation}`}
      />
      <FeedVideoSection
        headingId="related-heading"
        emoji="🔗"
        title="함께 보면 좋은 영상"
        subtitle="이어 보기 좋은 관련 영상"
        videos={relatedVideos}
        generation={generation}
        className="pt-4"
      />

      <footer className="tz-round px-4 pb-9 pt-7 text-center text-[13px] font-bold text-white/20">
        trend<span className="text-[#00e5ff]/40">zip</span>
        <span className="text-[#ff2d9b]/40">♡</span>
        <p className="mt-1 font-sans text-[10px] font-medium text-white/15">
          매일 오전 3시 업데이트 · 한국 유튜브 트렌드
        </p>
      </footer>
    </>
  );
}

type FeedVideoSectionProps = {
  headingId: string;
  emoji: string;
  title: string;
  subtitle: string;
  videos: FeedVideo[];
  generation: GenerationSlug;
  className: string;
  priorityFirst?: boolean;
  actionLabel?: string;
  actionHref?: string;
};

function FeedVideoSection({
  headingId,
  emoji,
  title,
  subtitle,
  videos,
  generation,
  className,
  priorityFirst = false,
  actionLabel,
  actionHref,
}: FeedVideoSectionProps) {
  if (videos.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      className={`px-4 pb-2 ${className}`}
    >
      <SectionHeader
        id={headingId}
        emoji={emoji}
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />

      <div className="mt-2 flex flex-col gap-3.5">
        {videos.map((video, index) => (
          <FeedCard
            key={video.videoId}
            video={video}
            generation={generation}
            priority={priorityFirst && index === 0}
          />
        ))}
      </div>
    </section>
  );
}

type SectionHeaderProps = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionHref?: string;
};

function SectionHeader({
  id,
  emoji,
  title,
  subtitle,
  actionLabel,
  actionHref,
}: SectionHeaderProps) {
  return (
    <div className="px-1 pb-0.5 pt-1">
      <div className="flex min-h-7 items-center gap-2">
        <span aria-hidden="true" className="text-lg">
          {emoji}
        </span>
        <h2 id={id} className="text-[17px] font-extrabold text-white">
          {title}
        </h2>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="ml-auto rounded-full border border-[#00e5ff]/50 bg-[#00e5ff]/[0.06] px-2.5 py-1.5 text-[11px] font-extrabold text-white/75 transition-colors hover:bg-[#00e5ff]/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <p className="mt-0.5 text-[11px] font-medium text-[#888]">{subtitle}</p>
    </div>
  );
}

function formatKoreanDate(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date());
}
