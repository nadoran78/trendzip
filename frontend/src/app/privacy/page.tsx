import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsSettingsButton } from "@/components/analytics/AnalyticsSettingsButton";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "개인정보 및 분석 설정",
  description:
    "Trendzip의 Vercel Web Analytics와 Google Analytics 이용 범위 및 분석 동의 설정을 확인합니다.",
  path: "/privacy",
});

const ANALYTICS_EVENTS = [
  "첫 세대 선택",
  "피드·랭킹의 세대 변경",
  "YouTube 영상 이동",
  "키워드 상세 조회",
  "관련 키워드 이동",
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#070708] text-white">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] border-x border-white/[0.04] bg-[#0a0a0a]">
        <header className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-[#222] bg-[#0a0a0a]/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <Link
            href="/"
            aria-label="홈으로 이동"
            className="inline-flex size-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
          >
            <ChevronLeft aria-hidden="true" size={20} strokeWidth={2.2} />
          </Link>
          <span className="text-[15px] font-extrabold">
            개인정보 및 분석 설정
          </span>
        </header>

        <div className="space-y-8 px-5 pb-12 pt-7">
          <section>
            <p className="text-[11px] font-bold text-[#00e5ff]">
              ANALYTICS & PRIVACY
            </p>
            <h1 className="mt-2 text-[25px] font-extrabold leading-tight">
              서비스 개선을 위한
              <br />이용 분석 안내
            </h1>
            <p className="mt-4 text-[13px] font-medium leading-6 text-[#aaa]">
              Trendzip은 로그인이나 사용자 프로필을 제공하지 않으며 이름,
              이메일, 전화번호 같은 직접 식별 정보를 분석 이벤트로
              전송하지 않습니다.
            </p>
          </section>

          <PrivacySection title="사용하는 분석 도구">
            <PrivacyItem title="Vercel Web Analytics">
              운영 방문자 수, 페이지 조회와 방문 경로를 서비스 상태 파악에
              사용합니다. Google 분석 동의 버튼은 이 기본 운영 통계가 아니라
              아래의 Google Analytics 저장 설정을 제어합니다.
            </PrivacyItem>
            <PrivacyItem title="Google Analytics 4 · Google Tag Manager">
              사용자가 콘텐츠를 탐색하는 흐름을 이해하기 위해 사용합니다.
              GTM은 분석 규칙을 실행하고 GA4는 전달된 이벤트를 집계합니다.
            </PrivacyItem>
          </PrivacySection>

          <PrivacySection title="Google 분석 항목과 목적">
            <p>
              페이지 주소·제목·유입 경로, 브라우저·기기 정보와 아래의 서비스
              행동 이벤트를 수집할 수 있습니다. 이벤트에는 세대 구분, 영상
              ID, 키워드 ID, 피드 섹션 등 비식별 서비스 문맥만 포함합니다.
            </p>
            <ul className="mt-3 space-y-2">
              {ANALYTICS_EVENTS.map((event) => (
                <li key={event} className="flex gap-2">
                  <span aria-hidden="true" className="text-[#00e5ff]">
                    ·
                  </span>
                  {event}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              수집 목적은 인기 콘텐츠 파악, 탐색 흐름 개선과 서비스 오류·이탈
              구간 확인입니다. 광고 개인화에는 사용하지 않습니다.
            </p>
          </PrivacySection>

          <PrivacySection title="동의에 따른 동작">
            <PrivacyItem title="분석 허용">
              <code>analytics_storage</code>가 허용되며 Google Analytics의
              분석 쿠키가 사용될 수 있습니다. 광고 저장, 광고 사용자 데이터와
              광고 개인화는 계속 거부됩니다.
            </PrivacyItem>
            <PrivacyItem title="분석 거부">
              Google Analytics 분석 쿠키 저장을 거부합니다. Advanced Consent
              Mode 특성상 Google 태그는 쿠키 없이 동의 상태와 제한된 측정
              신호를 전송할 수 있습니다. 서비스 기능에는 영향이 없습니다.
            </PrivacyItem>
            <div className="mt-4">
              <AnalyticsSettingsButton />
            </div>
          </PrivacySection>

          <PrivacySection title="보관과 국외 처리">
            <p>
              GA4의 사용자·이벤트 수준 데이터 보관 설정은 14개월입니다.
              데이터는 Google LLC와 Google의 글로벌 인프라를 통해 국외에서
              전송·처리될 수 있으며, 웹사이트 이용 과정에서 네트워크로
              전달됩니다.
            </p>
            <p className="mt-3">
              분석 동의를 철회하면 이후 Google Analytics 저장은 거부되고,
              브라우저에서 접근 가능한 기존 Google Analytics 쿠키도 삭제를
              시도합니다. 브라우저의 사이트 데이터 삭제 기능도 사용할 수
              있습니다.
            </p>
          </PrivacySection>

          <PrivacySection title="외부 안내">
            <ExternalPolicyLink href="https://policies.google.com/technologies/partner-sites?hl=ko">
              Google 서비스 사용 시 정보 처리 방식
            </ExternalPolicyLink>
            <ExternalPolicyLink href="https://support.google.com/analytics/answer/6004245?hl=ko">
              Google Analytics 데이터 보호 안내
            </ExternalPolicyLink>
          </PrivacySection>

          <p className="border-t border-[#222] pt-5 text-[11px] font-medium text-[#666]">
            마지막 갱신: 2026년 8월 15일
          </p>
        </div>
      </div>
    </main>
  );
}

function PrivacySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[15px] font-extrabold text-[#00e5ff]">
        {title}
      </h2>
      <div className="mt-3 text-[13px] font-medium leading-6 text-[#aaa]">
        {children}
      </div>
    </section>
  );
}

function PrivacyItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="font-extrabold text-white">{title}</h3>
      <p className="mt-1">{children}</p>
    </div>
  );
}

function ExternalPolicyLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-2 flex items-center gap-1.5 font-bold text-white underline decoration-white/20 underline-offset-4 hover:text-[#9af5ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
    >
      {children}
      <ExternalLink aria-hidden="true" size={13} strokeWidth={2} />
    </a>
  );
}
