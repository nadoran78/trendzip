import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import type { Evidence, KeywordShortformProps } from "./types";

const COLORS = {
  background: "#0a0a0a",
  surface: "#1a1a1a",
  border: "#2b2b2d",
  text: "#ffffff",
  dim: "#a2a2a8",
  cyan: "#00e5ff",
  pink: "#ff2d9b",
  red: "#ff3b3b",
} as const;

const FONT_FAMILY = '"Noto Sans KR Variable", sans-serif';
const SAFE_X = 84;
const FADE_FRAMES = 12;

const sceneFrames = {
  hook: 150,
  overview: 210,
  reasons: 360,
  evidence: 240,
  cta: 120,
} as const;

function animatedEntrance(frame: number, fps: number): CSSProperties {
  const progress = spring({
    frame,
    fps,
    config: { damping: 180, stiffness: 120 },
  });

  return {
    opacity: interpolate(progress, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(progress, [0, 1], [48, 0])}px)`,
  };
}

function Scene({ children, duration }: { children: ReactNode; duration: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, duration - FADE_FRAMES, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        padding: `150px ${SAFE_X}px 190px`,
        fontFamily: FONT_FAMILY,
        color: COLORS.text,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

function Background({ progress }: { progress: number }) {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.2,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${progress * 100}%`,
          height: 14,
          backgroundColor: COLORS.cyan,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: `${Math.max(0, progress - 0.68) * 100}%`,
          height: 14,
          backgroundColor: COLORS.pink,
        }}
      />
    </AbsoluteFill>
  );
}

function PersistentChrome({ props }: { props: KeywordShortformProps }) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 62,
          left: SAFE_X,
          right: SAFE_X,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: FONT_FAMILY,
          fontSize: 27,
          fontWeight: 700,
          color: COLORS.dim,
          zIndex: 10,
        }}
      >
        <div>
          trend<span style={{ color: COLORS.cyan }}>zip</span>
        </div>
        <div
          style={{
            border: `2px solid ${COLORS.border}`,
            padding: "10px 16px",
            color: COLORS.text,
            backgroundColor: COLORS.surface,
          }}
        >
          {props.sampleLabel}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          bottom: 76,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT_FAMILY,
          fontSize: 24,
          color: COLORS.dim,
          zIndex: 10,
        }}
      >
        <span>{props.recordedAt}</span>
        <span>trendzip.nadoran.com</span>
      </div>
    </>
  );
}

function Eyebrow({ children, color = COLORS.cyan }: { children: ReactNode; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 27,
        fontWeight: 800,
        color,
      }}
    >
      <span style={{ width: 32, height: 8, backgroundColor: color }} />
      {children}
    </div>
  );
}

function HookScene({ props }: { props: KeywordShortformProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene duration={sceneFrames.hook}>
      <div style={{ ...animatedEntrance(frame, fps), marginTop: 160 }}>
        <Eyebrow>오늘의 키워드 해석</Eyebrow>
        <div
          style={{
            marginTop: 54,
            fontSize: 78,
            lineHeight: 1.28,
            fontWeight: 800,
            whiteSpace: "pre-line",
          }}
        >
          {props.hook}
        </div>
        <div
          style={{
            marginTop: 62,
            borderLeft: `12px solid ${COLORS.pink}`,
            paddingLeft: 32,
            fontSize: 104,
            lineHeight: 1.14,
            fontWeight: 900,
            wordBreak: "keep-all",
          }}
        >
          {props.keyword}
        </div>
      </div>
    </Scene>
  );
}

function OverviewScene({ props }: { props: KeywordShortformProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene duration={sceneFrames.overview}>
      <div style={animatedEntrance(frame, fps)}>
        <Eyebrow color={COLORS.pink}>키워드 한눈에 보기</Eyebrow>
        <div
          style={{
            display: "flex",
            gap: 22,
            marginTop: 64,
          }}
        >
          <div
            style={{
              width: 290,
              minHeight: 310,
              padding: 34,
              backgroundColor: COLORS.cyan,
              color: COLORS.background,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800 }}>{props.generationLabel} SAMPLE</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12}}>
              <div style={{ fontSize: 136, lineHeight: 1, fontWeight: 900 }}>{props.rank}</div>
              <div style={{ fontSize: 30, fontWeight: 800 }}>위</div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{props.rankTrend}</div>
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 310,
              padding: 36,
              border: `3px solid ${COLORS.border}`,
              backgroundColor: COLORS.surface,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ color: COLORS.dim, fontSize: 27, fontWeight: 700 }}>
              {props.category}
            </div>
            <div style={{ fontSize: 61, lineHeight: 1.28, fontWeight: 900 }}>
              {props.keyword}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 54,
            fontSize: 47,
            lineHeight: 1.55,
            fontWeight: 650,
          }}
        >
          {props.summary}
        </div>
      </div>
    </Scene>
  );
}

function ReasonsScene({ props }: { props: KeywordShortformProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene duration={sceneFrames.reasons}>
      <div style={animatedEntrance(frame, fps)}>
        <Eyebrow>왜 지금 뜨고 있을까?</Eyebrow>
        <div style={{ marginTop: 70, display: "flex", flexDirection: "column", gap: 34 }}>
          {props.reasons.map((reason, index) => (
            <div
              key={reason}
              style={{
                display: "flex",
                gap: 30,
                padding: "40px 36px",
                backgroundColor: COLORS.surface,
                border: `3px solid ${index === 0 ? COLORS.cyan : COLORS.pink}`,
              }}
            >
              <div
                style={{
                  flex: "0 0 70px",
                  fontSize: 54,
                  lineHeight: 1,
                  fontWeight: 900,
                  color: index === 0 ? COLORS.cyan : COLORS.pink,
                }}
              >
                0{index + 1}
              </div>
              <div
                style={{
                  fontSize: 41,
                  lineHeight: 1.52,
                  fontWeight: 650,
                  wordBreak: "keep-all",
                }}
              >
                {reason}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 54,
            paddingTop: 34,
            borderTop: `3px solid ${COLORS.border}`,
            color: COLORS.dim,
            fontSize: 29,
            lineHeight: 1.5,
          }}
        >
          공개된 콘텐츠를 바탕으로 자동 분석했으며, 실제 맥락과 다를 수 있습니다.
        </div>
      </div>
    </Scene>
  );
}

type EvidenceCardProps = {
  item: Evidence;
  index: number;
};

function EvidenceCard({ item, index }: EvidenceCardProps) {
  return (
    <div
      style={{
        padding: "38px 40px",
        borderLeft: `10px solid ${index === 0 ? COLORS.cyan : COLORS.pink}`,
        backgroundColor: COLORS.surface,
      }}
    >
      <div style={{ color: COLORS.dim, fontSize: 26, fontWeight: 750 }}>
        SOURCE {index + 1} · {item.publisher}
      </div>
      <div style={{ marginTop: 12, fontSize: 38, lineHeight: 1.5, fontWeight: 650 }}>
        {item.title}
      </div>
    </div>
  );
}

function EvidenceScene({ props }: { props: KeywordShortformProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene duration={sceneFrames.evidence}>
      <div style={animatedEntrance(frame, fps)}>
        <Eyebrow color={COLORS.pink}>근거를 같이 확인했어요</Eyebrow>
        <div style={{ marginTop: 66, display: "flex", flexDirection: "column", gap: 26 }}>
          {props.evidence.map((item, index) => (
            <EvidenceCard key={item.url} item={item} index={index} />
          ))}
        </div>
        <div
          style={{
            marginTop: 58,
            color: COLORS.text,
            fontSize: 38,
            lineHeight: 1.5,
            fontWeight: 650,
          }}
        >
          외부 영상과 썸네일을 복제하지 않고,
          <br />공식 출처에서 확인한 메타데이터만 사용했습니다.
        </div>
      </div>
    </Scene>
  );
}

function CtaScene({ props }: { props: KeywordShortformProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene duration={sceneFrames.cta}>
      <div
        style={{
          ...animatedEntrance(frame, fps),
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <div style={{ fontSize: 72, lineHeight: 1.25, fontWeight: 900 }}>
          다음 키워드도
          <br />왜 뜨는지 궁금하다면?
        </div>
        <div
          style={{
            marginTop: 70,
            padding: "34px 42px",
            backgroundColor: COLORS.cyan,
            color: COLORS.background,
            fontSize: 47,
            fontWeight: 900,
          }}
        >
          trendzip.nadoran.com
        </div>
        <div style={{ marginTop: 32, color: COLORS.dim, fontSize: 28 }}>
          프로필 링크에서 확인
        </div>
      </div>
    </Scene>
  );
}

export function TrendKeywordShort(props: KeywordShortformProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const overviewStart = sceneFrames.hook;
  const reasonsStart = overviewStart + sceneFrames.overview;
  const evidenceStart = reasonsStart + sceneFrames.reasons;
  const ctaStart = evidenceStart + sceneFrames.evidence;

  return (
    <AbsoluteFill>
      <Background progress={progress} />
      <Sequence from={0} durationInFrames={sceneFrames.hook} premountFor={30}>
        <HookScene props={props} />
      </Sequence>
      <Sequence from={overviewStart} durationInFrames={sceneFrames.overview} premountFor={30}>
        <OverviewScene props={props} />
      </Sequence>
      <Sequence from={reasonsStart} durationInFrames={sceneFrames.reasons} premountFor={30}>
        <ReasonsScene props={props} />
      </Sequence>
      <Sequence from={evidenceStart} durationInFrames={sceneFrames.evidence} premountFor={30}>
        <EvidenceScene props={props} />
      </Sequence>
      <Sequence from={ctaStart} durationInFrames={sceneFrames.cta} premountFor={30}>
        <CtaScene props={props} />
      </Sequence>
      <PersistentChrome props={props} />
    </AbsoluteFill>
  );
}
