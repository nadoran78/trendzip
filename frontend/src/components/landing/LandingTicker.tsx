import { GENERATION_OPTIONS } from "@/lib/generation";
import { getFeed } from "@/services/trend-api";

const TICKER_KEYWORD_LIMIT = 9;
const TICKER_REVALIDATE_SECONDS = 300;
const TICKER_REQUEST_TIMEOUT_MS = 5_000;

export async function LandingTicker() {
  const results = await Promise.allSettled(
    GENERATION_OPTIONS.map((option) =>
      getFeed(option.apiValue, {
        next: {
          revalidate: TICKER_REVALIDATE_SECONDS,
        },
        signal: AbortSignal.timeout(TICKER_REQUEST_TIMEOUT_MS),
      }),
    ),
  );

  const keywords = Array.from(
    new Map(
      results
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value.videos)
        .map((video) => video.keyword.trim())
        .filter(Boolean)
        .map((keyword) => [keyword.toLocaleLowerCase("ko-KR"), keyword]),
    ).values(),
  ).slice(0, TICKER_KEYWORD_LIMIT);

  return (
    <LandingTickerTrack
      keywords={keywords.length > 0 ? keywords : ["트렌드 업데이트 중"]}
      isLive={keywords.length > 0}
    />
  );
}

export function LandingTickerFallback() {
  return (
    <LandingTickerTrack
      keywords={["트렌드 불러오는 중"]}
      isLive={false}
    />
  );
}

type LandingTickerTrackProps = {
  keywords: string[];
  isLive: boolean;
};

function LandingTickerTrack({
  keywords,
  isLive,
}: LandingTickerTrackProps) {
  const tickerItems = [...keywords, ...keywords, ...keywords];

  return (
    <div
      aria-label={isLive ? "현재 트렌드 키워드" : "트렌드 데이터 상태"}
      className="tz-ticker-mask flex h-[34px] items-center overflow-hidden border-t border-[#1a1a1a]"
    >
      <div className="tz-ticker-track flex w-max items-center gap-7 whitespace-nowrap pl-4 text-xs font-medium text-white/50">
        {tickerItems.map((keyword, index) => (
          <span
            key={`${keyword}-${index}`}
            aria-hidden={index >= keywords.length}
            className="inline-flex items-center gap-2"
          >
            <span
              className={[
                "size-[5px] rounded-full",
                isLive
                  ? index % 2 === 0
                    ? "bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]"
                    : "bg-[#ff2d9b] shadow-[0_0_8px_#ff2d9b]"
                  : "bg-white/30",
              ].join(" ")}
              aria-hidden="true"
            />
            #{keyword}
          </span>
        ))}
      </div>
    </div>
  );
}
