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

  const featuredVideos = videos.slice(0, 2);
  const featuredIds = new Set(
    featuredVideos.map((video) => video.videoId),
  );
  const risingVideos = videos.filter(
    (video) => !featuredIds.has(video.videoId),
  );

  return (
    <>
      <h1 className="sr-only">{generationLabel} YouTube 트렌드 피드</h1>
      <section
        aria-labelledby="today-pick-heading"
        className="px-4 pb-2 pt-5"
      >
        <SectionHeader
          id="today-pick-heading"
          emoji={generation === "teen" ? "🎀" : "🍑"}
          title={`오늘의 ${generationLabel} 픽`}
          subtitle={`${formatKoreanDate()} · 실시간 인기 ${videos.length}편`}
        />

        <div className="mt-2 flex flex-col gap-3.5">
          {featuredVideos.map((video, index) => (
            <FeedCard
              key={video.videoId}
              video={video}
              generation={generation}
              priority={index < 2}
            />
          ))}
        </div>
      </section>

      {risingVideos.length > 0 ? (
        <section
          aria-labelledby="rising-heading"
          className="px-4 pb-2 pt-4"
        >
          <SectionHeader
            id="rising-heading"
            emoji="🔥"
            title="급상승 트렌드"
            subtitle="지금 함께 많이 보는 영상"
            actionLabel="랭킹 보기"
            actionHref={`/trend/${generation}`}
          />

          <div className="mt-2 flex flex-col gap-3.5">
            {risingVideos.map((video) => (
              <FeedCard
                key={video.videoId}
                video={video}
                generation={generation}
              />
            ))}
          </div>
        </section>
      ) : null}

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
