import { Inbox } from "lucide-react";

import { TrendRow } from "@/components/trend/TrendRow";
import type {
  GenerationSlug,
  KeywordSummary,
} from "@/types/api";

type TrendRankingProps = {
  generation: GenerationSlug;
  keywords: KeywordSummary[];
};

export function TrendRanking({
  generation,
  keywords,
}: TrendRankingProps) {
  const generationLabel = generation === "teen" ? "10대" : "20대";

  if (keywords.length === 0) {
    return (
      <>
        <h1 className="sr-only">{generationLabel} 트렌드 키워드 랭킹</h1>
        <section className="flex min-h-[520px] flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-white/5 bg-[#1a1a1a] text-white/30">
            <Inbox aria-hidden="true" size={26} strokeWidth={1.6} />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              아직 집계된 키워드가 없습니다
            </h2>
            <p className="text-sm leading-6 text-[#888]">
              새로운 검색 트렌드가 수집되면 이곳에 표시됩니다.
            </p>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section
        aria-labelledby="trend-ranking-heading"
        className="px-[18px] pb-1 pt-[22px]"
      >
        <div className="px-1 pb-3.5 pt-1">
          <h1
            id="trend-ranking-heading"
            className="flex items-center gap-1.5 text-xl font-extrabold text-white"
          >
            이번 주 급상승 키워드
            <span aria-hidden="true" className="text-lg">
              ✨
            </span>
          </h1>
          <p className="mt-1 text-[11px] font-medium text-[#888]">
            최근 수집된 {generationLabel} 검색 관심도
          </p>
        </div>

        <ol aria-label={`${generationLabel} 트렌드 키워드 순위`}>
          {keywords.map((keyword, index) => (
            <TrendRow
              key={keyword.id}
              keyword={keyword}
              isLast={index === keywords.length - 1}
            />
          ))}
        </ol>
      </section>

      <footer className="tz-round px-4 pb-9 pt-8 text-center text-[13px] font-bold text-white/20">
        trend<span className="text-[#00e5ff]/40">zip</span>
        <span className="text-[#ff2d9b]/40">♡</span>
        <p className="mt-1 font-sans text-[10px] font-medium text-white/15">
          매일 업데이트 · 한국 유튜브 트렌드
        </p>
      </footer>
    </>
  );
}
