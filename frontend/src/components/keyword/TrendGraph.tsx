"use client";

import type { TrendGraphPoint } from "@/types/api";
import { useEffect, useRef, useState } from "react";

type TrendGraphProps = {
  keywordId: number;
  keyword: string;
  data: TrendGraphPoint[];
};

type GraphPoint = {
  period: string;
  value: number;
  rank: number | null;
  x: number;
  y: number;
};

const WIDTH = 320;
const HEIGHT = 140;
const PADDING = { left: 14, right: 14, top: 14, bottom: 28 };
const TOOLTIP_WIDTH = 126;

export function TrendGraph({
  keywordId,
  keyword,
  data,
}: TrendGraphProps) {
  const figureRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  useEffect(() => {
    const closeTooltipOutsideGraph = (event: PointerEvent) => {
      if (figureRef.current?.contains(event.target as Node)) return;

      setIsKeyboardActive(false);
      setActiveIndex(null);
    };

    document.addEventListener("pointerdown", closeTooltipOutsideGraph);

    return () => {
      document.removeEventListener("pointerdown", closeTooltipOutsideGraph);
    };
  }, []);

  const validData = data.filter(
    (point): point is TrendGraphPoint & { ratio: number } =>
      point.ratio !== null && Number.isFinite(point.ratio),
  );

  if (validData.length === 0) {
    return (
      <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-[#2a2a2a] bg-[#1a1a1a] px-6 text-center text-[13px] font-medium text-[#888]">
        아직 집계된 검색 관심도 데이터가 없습니다.
      </div>
    );
  }

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const values = validData.map((point) => point.ratio);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;

  const points: GraphPoint[] = validData.map((point, index) => {
    const x =
      validData.length === 1
        ? PADDING.left + innerWidth / 2
        : PADDING.left + (index / (validData.length - 1)) * innerWidth;
    const y =
      range === 0
        ? PADDING.top + innerHeight / 2
        : PADDING.top +
          innerHeight -
          ((point.ratio - min) / range) * innerHeight;

    return {
      period: point.period,
      value: point.ratio,
      rank: point.rank ?? null,
      x,
      y,
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points.at(-1)!.x} ${PADDING.top + innerHeight} L ${points[0].x} ${PADDING.top + innerHeight} Z`
      : null;
  const labelIndexes = getLabelIndexes(points.length);
  const gradientId = `trend-area-${keywordId}`;
  const activeDescriptionId = `trend-active-${keywordId}`;
  const firstPoint = points[0];
  const latestPoint = points.at(-1)!;
  const activePoint =
    activeIndex === null ? null : (points[activeIndex] ?? null);
  const activeDescription = activePoint
    ? `${formatLongDate(activePoint.period)}, 트렌드 점수 ${formatFullScore(activePoint.value)}${
        activePoint.rank === null ? "" : `, 당시 순위 ${activePoint.rank}위`
      }`
    : "그래프에 포커스한 뒤 좌우 방향키로 날짜별 데이터를 확인할 수 있습니다.";

  const moveActivePoint = (nextIndex: number) => {
    setIsKeyboardActive(true);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), points.length - 1));
  };

  return (
    <figure
      ref={figureRef}
      className="rounded-2xl border border-[#222] bg-[#1a1a1a] px-3 pb-2 pt-3.5"
      onMouseLeave={() => {
        if (!isKeyboardActive) setActiveIndex(null);
      }}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${keyword} 검색 관심도: ${formatDate(firstPoint.period)} ${formatScore(firstPoint.value)}에서 ${formatDate(latestPoint.period)} ${formatScore(latestPoint.value)}까지. 좌우 방향키로 날짜별 데이터를 확인할 수 있습니다.`}
        aria-describedby={activeDescriptionId}
        tabIndex={0}
        className="block h-auto w-full cursor-crosshair rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
        onBlur={() => {
          setIsKeyboardActive(false);
          setActiveIndex(null);
        }}
        onFocus={() => {
          setIsKeyboardActive(true);
          setActiveIndex((current) => current ?? points.length - 1);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveActivePoint(
              activeIndex === null ? points.length - 1 : activeIndex - 1,
            );
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            moveActivePoint(activeIndex === null ? 0 : activeIndex + 1);
          } else if (event.key === "Home") {
            event.preventDefault();
            moveActivePoint(0);
          } else if (event.key === "End") {
            event.preventDefault();
            moveActivePoint(points.length - 1);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setIsKeyboardActive(false);
            setActiveIndex(null);
          }
        }}
        onClick={() => {
          if (!isKeyboardActive) setActiveIndex(null);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((position) => {
          const y = PADDING.top + innerHeight * position;

          return (
            <line
              key={position}
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y}
              y2={y}
              stroke="#2a2a2a"
              strokeWidth="1"
              strokeDasharray={position === 1 ? undefined : "3 4"}
            />
          );
        })}

        {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
        {points.length > 1 ? (
          <path
            d={linePath}
            fill="none"
            stroke="#00e5ff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="[filter:drop-shadow(0_0_6px_rgba(0,229,255,0.55))]"
          />
        ) : null}

        {points.map((point, index) => {
          const isLatest = index === points.length - 1;
          const isActive = index === activeIndex;

          return (
            <g key={`${point.period}-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? 6 : isLatest ? 5 : 3.5}
                fill="#0a0a0a"
                stroke="#00e5ff"
                strokeWidth={isActive ? 2.5 : 2}
                className={
                  isActive
                    ? "[filter:drop-shadow(0_0_7px_rgba(0,229,255,0.9))]"
                    : undefined
                }
              />
              <circle
                data-trend-point={index}
                cx={point.x}
                cy={point.y}
                r="12"
                fill="transparent"
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return;
                  setIsKeyboardActive(false);
                  setActiveIndex(index);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsKeyboardActive(false);
                  setActiveIndex((current) =>
                    current === index ? null : index,
                  );
                }}
              />
              {labelIndexes.has(index) ? (
                <text
                  x={point.x}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  fontFamily="Pretendard, system-ui"
                  fontSize="10"
                  fontWeight="600"
                  fill={isLatest ? "#00e5ff" : "#888888"}
                >
                  {formatDate(point.period)}
                </text>
              ) : null}
            </g>
          );
        })}

        {activePoint ? <TrendTooltip point={activePoint} /> : null}
      </svg>

      <figcaption className="sr-only">
        총 {validData.length}개의 일별 검색 관심도 데이터
      </figcaption>
      <p id={activeDescriptionId} className="sr-only" aria-live="polite">
        {activeDescription}
      </p>
    </figure>
  );
}

function TrendTooltip({ point }: { point: GraphPoint }) {
  const hasRank = point.rank !== null;
  const height = hasRank ? 50 : 36;
  const x = Math.min(
    Math.max(point.x - TOOLTIP_WIDTH / 2, PADDING.left),
    WIDTH - PADDING.right - TOOLTIP_WIDTH,
  );
  const topY = point.y - height - 8;
  const y =
    topY >= 0
      ? topY
      : Math.min(
          point.y + 8,
          HEIGHT - PADDING.bottom - height - 2,
        );

  return (
    <g data-trend-tooltip pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={TOOLTIP_WIDTH}
        height={height}
        rx="6"
        fill="#0f0f0f"
        stroke="#00e5ff"
        strokeOpacity="0.65"
      />
      <text
        x={x + 9}
        y={y + 13}
        fontFamily="Pretendard, system-ui"
        fontSize="9.5"
        fontWeight="700"
        fill="#ffffff"
      >
        {formatLongDate(point.period)}
      </text>
      <text
        x={x + 9}
        y={y + 26}
        fontFamily="Pretendard, system-ui"
        fontSize="9"
        fontWeight="600"
        fill="#b8b8b8"
      >
        트렌드 점수 {formatFullScore(point.value)}
      </text>
      {hasRank ? (
        <text
          x={x + 9}
          y={y + 39}
          fontFamily="Pretendard, system-ui"
          fontSize="9"
          fontWeight="700"
          fill="#00e5ff"
        >
          당시 순위 {point.rank}위
        </text>
      ) : null}
    </g>
  );
}

function getLabelIndexes(length: number): Set<number> {
  if (length <= 4) {
    return new Set(Array.from({ length }, (_, index) => index));
  }

  return new Set([
    0,
    Math.round((length - 1) / 3),
    Math.round(((length - 1) * 2) / 3),
    length - 1,
  ]);
}

function formatDate(period: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);

  if (!match) return period;

  return `${Number(match[2])}.${Number(match[3])}`;
}

function formatLongDate(period: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);

  if (!match) return period;

  return `${Number(match[2])}월 ${Number(match[3])}일`;
}

function formatScore(score: number): string {
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(score);
}

function formatFullScore(score: number): string {
  return new Intl.NumberFormat("ko-KR").format(score);
}
