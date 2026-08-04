import { ImageResponse } from "next/og";

import { SOCIAL_IMAGE_SIZE } from "@/lib/seo";

export function createSocialImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        background: "#09090b",
        color: "#ffffff",
        padding: "58px 68px 60px",
        fontFamily: "sans-serif",
        letterSpacing: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 10,
          display: "flex",
        }}
      >
        <div style={{ width: "68%", background: "#00e5ff" }} />
        <div style={{ flex: 1, background: "#ff2d9b" }} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 23,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: "2px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 999,
            padding: "11px 20px",
          }}
        >
          <span style={{ color: "#ff3b3b", marginRight: 10 }}>●</span>
          LIVE TREND RADAR
        </div>
        <div style={{ display: "flex", color: "rgba(255, 255, 255, 0.58)" }}>
          10대 · 20대
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 128,
            lineHeight: 1,
            fontWeight: 800,
          }}
        >
          <span>trend</span>
          <span style={{ color: "#00e5ff" }}>zip</span>
          <span
            style={{
              marginLeft: 16,
              width: 18,
              height: 76,
              display: "flex",
              background: "#ff2d9b",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 38,
            lineHeight: 1.4,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.86)",
          }}
        >
          지금 뜨는 유튜브 트렌드를 세대별로 한눈에
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "2px solid rgba(255, 255, 255, 0.12)",
          paddingTop: 26,
          fontSize: 24,
          color: "rgba(255, 255, 255, 0.58)",
        }}
      >
        <span>유튜브 영상 · 인기 키워드 · 왜 뜨는지</span>
        <span style={{ color: "#00e5ff", fontWeight: 700 }}>
          trendzip.nadoran.com
        </span>
      </div>
    </div>,
    SOCIAL_IMAGE_SIZE,
  );
}
