type TrendTickerProps = {
  keywords: string[];
};

export function TrendTicker({ keywords }: TrendTickerProps) {
  const normalizedKeywords =
    keywords.length > 0 ? keywords : ["오늘의 트렌드"];
  const tickerItems = [
    ...normalizedKeywords,
    ...normalizedKeywords,
    ...normalizedKeywords,
  ];

  return (
    <div className="tz-ticker-mask flex h-[34px] items-center overflow-hidden border-t border-[#1a1a1a]">
      <div className="tz-ticker-track flex w-max items-center gap-[22px] whitespace-nowrap pl-4 text-[11px] font-medium text-white/55">
        {tickerItems.map((keyword, index) => (
          <span
            key={`${keyword}-${index}`}
            aria-hidden={index >= normalizedKeywords.length}
            className="inline-flex items-center gap-2"
          >
            <span
              className={[
                "size-[5px] rounded-full",
                index % 2 === 0
                  ? "bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]"
                  : "bg-[#ff2d9b] shadow-[0_0_8px_#ff2d9b]",
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
