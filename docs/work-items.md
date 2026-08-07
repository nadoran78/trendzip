# 작업 목록

## 작업 상태

- `READY`: 목적과 우선순위가 정리되어 시작할 수 있다.
- `IN_PROGRESS`: `develop` 또는 작업 브랜치에서 구현 중이다.
- `BLOCKED`: 외부 결정이나 선행 작업이 필요하다.
- `REVIEW`: 구현과 검증이 끝나 병합을 기다린다.
- `DONE`: 기준 브랜치에 병합됐다.

## 작업 선택 규칙

1. 일반적인 단일 작업은 `develop`에서 직접 진행할 수 있다.
2. 병렬·장기·실험 작업은 작업 ID별 `codex/*` 브랜치로 격리한다.
3. 같은 작업을 다른 세션에서 이어갈 때는 기존 작업 위치를 사용한다.
4. `develop`에서 진행하는 `ACTIVE` 작업은 한 번에 하나만 둔다.
5. `ACTIVE`에는 `IN_PROGRESS`, `BLOCKED`, `REVIEW` 작업만 둔다.
6. `READY`는 위에서 아래 순서로 우선하며 최대 5개만 유지한다.
7. 작업을 시작하기 전에 목적, 범위, 제외 범위, 완료 조건과 검증 방법을 확인한다.
8. 세션을 마칠 때 마지막 갱신일, 진행 상황, 다음 행동과 검증 결과를 갱신한다.
9. `DONE`은 `develop` 직접 작업의 완료 또는 작업 브랜치의 `develop` 병합을 뜻한다.
10. 완료 이력은 최근 5개만 남기고 나머지는 Git 로그에서 확인한다.

## ACTIVE

- 없음

## READY

### ANALYTICS-001 GA4·GTM 사용자 행동 분석 실습

- 상태: READY
- 브랜치: 미정
- 다음 행동: GA4 속성과 GTM Web 컨테이너를 준비하고 `develop` 직접 작업 여부를 결정한다.
- 목적: GA4 Standard와 Google Tag Manager를 직접 구성해 MAU, 유입과 핵심 탐색 행동을 분석하고 향후 AdSense 도입 판단과 외부 사이트 분석 구축 학습에 활용한다.
- 운영자 설정 범위:
  - GA4 속성과 운영 Web Data Stream을 한국 시간대·원화 기준으로 생성한다.
  - Google Tag Manager Web 컨테이너를 생성하고 GA4 Google tag를 GTM 한 경로로만 구성한다.
  - 공개 가능한 GTM 컨테이너 ID를 Vercel Production 환경변수로 등록한다.
- 코드 구현 범위:
  - GTM을 Next.js 루트에 연결하고 App Router 이동에서 `page_view`가 누락되거나 중복되지 않게 한다.
  - `select_generation`, `youtube_video_click`, `view_keyword_detail`, `related_keyword_click`, `generation_change` 이벤트와 세대, 키워드 ID, 피드 섹션 등 비식별 매개변수의 측정 계획을 문서화하고 구현한다.
  - Consent Mode v2의 분석·광고 저장 기본값을 `denied`로 시작하고, 사용자의 수락·거부 선택을 저장하며 언제든 변경할 수 있게 한다.
  - 개인정보처리방침에 GA4 행태정보 수집 목적, 항목, 보유 기간, 국외 처리와 거부 방법을 실제 설정 기준으로 반영한다.
  - GA4·GTM 설정과 운영 확인 절차, Vercel Analytics와 집계 기준이 다른 이유를 문서화한다.
- 제외 범위:
  - Google Analytics 360, Google Ads와 AdSense 광고 코드
  - BigQuery Export와 별도 분석 데이터 웨어하우스
  - 유료 CMP, Looker Studio 대시보드와 자체 관리자 통계 화면
  - 로그인 사용자 식별 및 개인 식별 정보 전송
- 완료 조건:
  - GA4 Realtime·DebugView와 Tag Assistant에서 첫 진입 및 클라이언트 라우팅의 `page_view`가 각각 한 번만 확인된다.
  - 정의한 사용자 행동 이벤트와 매개변수가 중복 없이 수집되고 개인 식별 정보를 포함하지 않는다.
  - 동의 전에는 분석·광고 저장이 거부되고, 수락·거부·철회 후 GTM과 Google tag가 각 상태에 맞게 동작한다.
  - Vercel Analytics와 GA4 수치의 집계 기준 차이가 운영 문서에 정리된다.

#### 디자인 기준

- 상태: CONFIRMED
- 전역 화면 기준: `design/app.jsx`, `design/feed.jsx`, `design/trend.jsx`, `design/keyword.jsx`
- 동의 UI는 기존 디자인 원본에 없으므로 390px 모바일 화면의 주요 탐색 요소를 가리지 않는 하단 고정 배너로 구현한다. 기존 다크 팔레트와 버튼 규칙을 따르고 수락과 거부를 동등하게 제공하며, 선택 이후에는 개인정보처리방침에서 설정을 다시 열 수 있게 한다.

#### 검증

- 코드: `npm run lint`, `npm run typecheck`, `npm run build`, `./dev/verify --quick`
- 로컬: 개발·production 모드에서 분석 태그 활성 조건과 동의 상태별 네트워크 요청 확인
- 도구: Google Tag Assistant, GA4 DebugView와 Realtime에서 페이지 조회와 행동 이벤트 확인
- 운영: `trendzip.nadoran.com`에서 페이지 조회, 핵심 이벤트와 동의 변경 smoke test
- 보안: `./dev/check-secrets --staged`, 측정 ID·컨테이너 ID 외 비밀정보 및 개인 식별 매개변수 미포함 확인

### MEDIA-001 키워드 기반 숏폼 콘텐츠 자동화

- 상태: READY
- 브랜치: 미정
- 다음 행동: `ANALYTICS-001` 완료 후 하루 한 개 키워드를 대상으로 숏폼 포맷, 렌더링 도구, 음원·이미지·폰트 라이선스와 YouTube 업로드 정책을 검증하는 기술 스파이크를 시작한다.
- 목적: 매일 수집한 키워드와 설명을 세로형 숏폼 콘텐츠로 재가공해 Trendzip 유입을 만들고, 품질과 정책 적합성이 확인되면 반복 제작과 게시를 자동화한다.
- 구현 범위:
  - 설명이 있고 근거 영상 품질이 충분하며 민감 주제 제외 규칙을 통과한 키워드만 후보로 선정한다.
  - 키워드, 설명, 근거 메타데이터에서 제목, 내레이션, 자막과 출처 메모를 생성하고 확인되지 않은 내용을 차단한다.
  - 9:16 세로 영상 템플릿과 렌더링 방식을 기술 스파이크로 비교하고, 원본 브랜드 자산과 상업적 이용이 허용된 소스만 사용한다.
  - 생성, 검수 대기, 승인, 업로드, 게시와 실패 상태를 저장하고 같은 키워드의 중복 생성·업로드를 방지한다.
  - 초기에는 사람의 승인을 필수로 하고 YouTube 비공개 또는 일부 공개 업로드부터 검증한다.
  - YouTube 업로드 자격 증명은 비밀정보로 관리하고 재시도, 할당량 초과와 API 심사 상태를 운영 로그에 남긴다.
  - 설명란의 Trendzip 링크에 캠페인 식별용 UTM을 추가해 GA4에서 유입 성과를 확인할 수 있게 한다.
- 제외 범위:
  - TikTok과 Instagram 직접 게시 자동화
  - 품질 검증과 플랫폼 API 심사 전에 수행하는 무검수 공개 게시
  - 허가받지 않은 YouTube 영상, 썸네일, 음원과 폰트의 재사용
  - 숏폼 수익 발생 자체를 완료 조건으로 삼는 것
  - 실제 인물의 음성·얼굴을 모방하는 합성 콘텐츠
- 완료 조건:
  - 고정된 테스트 키워드로 재현 가능한 세로형 MP4 샘플을 생성한다.
  - 후보 선정, 스크립트와 메타데이터 생성, 상태 전이, 중복 방지와 실패 재시도 정책이 테스트된다.
  - 사람이 결과물을 검수하고 승인해야만 업로드 단계로 진행된다.
  - 검증된 OAuth 자격 증명으로 YouTube 비공개 또는 일부 공개 업로드와 메타데이터 등록을 확인한다.
  - 사용 자산의 라이선스, 운영 중단 방법, 비용과 API 할당량을 문서화하고 비밀정보를 저장소에 남기지 않는다.

#### 검증

- 코드: 후보 선정·상태 전이·중복 방지 단위 테스트, 렌더러 smoke test와 출력 파일 규격 검사
- 품질: 자막 가독성, 음량, 영상 길이, 사실 근거와 출처를 사람 검수 체크리스트로 확인
- 운영: YouTube 비공개 또는 일부 공개 업로드, 재시도와 업로드 중단 절차 확인
- 분석: 설명란 UTM 링크가 GA4 캠페인 유입으로 구분되는지 확인
- 보안: `./dev/check-secrets --staged`, OAuth 토큰과 업로드 자격 증명 미포함 확인

## LATER

- Android Chrome 홈 화면 설치와 standalone 실행 호환성 확인
- 프론트엔드 이전 production deployment 수동 롤백 workflow
- 운영 API 노출 정책 강화: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit 적용, 프론트 배포 도메인 기반 CORS 제한
- OpenAPI와 프론트 TypeScript 타입의 계약 자동화
- 외부 API fixture 기반 크롤링 전체 시나리오 테스트
- 프론트 핵심 사용자 흐름 E2E 테스트
- 아키텍처 규칙 자동 검사

## 최근 완료

### OBS-001 Vercel Web Analytics 운영 트래픽 측정

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-07
- 결과: `@vercel/analytics`를 Next.js 루트 레이아웃에 연결하고 Vercel Web Analytics에서 운영 방문자와 페이지 조회를 수집한다.
- 운영 메모: SDK의 자동 환경 감지를 사용하며 별도 환경변수나 GitHub Secret은 필요하지 않다. 제품 행동 이벤트는 후속 GA4·GTM 작업에서 다룬다.
- 검증: 프론트 lint·타입 검사·production build·npm audit·저장소 빠른 검증과 Gitleaks를 통과했다. 운영 배포 후 Analytics 네트워크 요청과 Vercel 대시보드의 방문자·페이지 조회·경로 수집을 확인했다.

### BE-001 키워드 후보 및 관계 품질 강화

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-05
- 결과: Gemini와 fallback 후보에서 범용 형식어와 근거 없는 후보를 제거하고, 전체 작품명과 제목에서 독립적으로 확인되는 문맥 의존 단어를 우선한다. 관련 키워드는 한 근거 영상 안에서 두 키워드가 함께 확인될 때만 생성한다.
- 운영 메모: 기존 이력은 삭제하지 않는다. 배포 후 새 크롤링을 실행해 활성 키워드와 관계를 교체하고 실제 결과를 확인한다.
- 검증: 백엔드 전체 테스트, ktlint와 `./dev/verify --quick`을 통과했다. `메이드 인 코리아`·`코리아`, `게임`·`리뷰`, 잘못 할당된 관계 근거에 대한 회귀 테스트를 추가했다.

### FE-010 PWA 설정 및 홈 화면 추가 검증

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-05
- 결과: Web App Manifest, 목적별 아이콘과 Serwist 서비스 워커를 운영에 배포하고 정적 자산 캐시 및 문서 탐색 오프라인 fallback을 제공한다.
- 운영 메모: 동적 문서·RSC·API 응답은 캐시하지 않는다. 브라우저 기본 설치 기능을 사용하며 별도 설치 유도 UI는 제공하지 않는다.
- 검증: lint·타입 검사·production build·npm audit·저장소 빠른 검증과 Gitleaks를 통과했다. Chrome 로컬 production 환경에서 installability와 실제 서버 중단 fallback을 확인했고, 운영 iOS Safari에서 홈 화면 추가에 성공했다. Android 실기기 확인은 기기 부재로 LATER에 남겼다.

### FE-009 SEO 및 Open Graph 설정

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-05
- 결과: 공개 경로의 페이지별 title, description, canonical과 OG/Twitter 메타데이터를 운영 도메인 기준으로 제공하고 robots, sitemap과 공통 공유 이미지를 구현했다.
- 운영 메모: sitemap의 키워드 조회는 API 장애를 허용하며, 실패 시에도 정적 공개 경로를 반환한다. Google Search Console에 도메인 속성과 sitemap 제출을 완료했다.
- 검증: 프론트 lint·타입 검사·production build와 저장소 빠른 검증을 통과했고, 운영 배포 후 Search Console 등록과 공개 SEO 리소스 응답을 확인했다.

### SEC-001 Cloudflare Access API 보호

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-04
- 결과: Vercel Next.js 서버가 전용 Service Token으로 운영 API를 호출하고 Cloudflare Access가 `api-trendzip.nadoran.com` 전체 경로의 직접 접근을 차단한다.
- 보안 메모: Client ID와 Client Secret은 Vercel Production 서버 환경에서만 관리하며 브라우저 공개 변수와 저장소에는 포함하지 않는다. Access 정책은 특정 Service Token만 허용하는 `Service Auth`로 구성했다.
- 검증: 인증 없는 헬스체크, Swagger UI와 OpenAPI 요청은 `401`, 동적 피드와 랭킹 페이지는 실제 데이터를 포함해 `200`으로 응답했다. 프론트 응답에서 Access 자격 증명 표식이 노출되지 않는 것도 확인했다.
