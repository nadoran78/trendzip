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

### APPINTOSS-001 앱인토스 출시 준비

- 상태: IN_PROGRESS
- 브랜치: codex/appintoss-001-launch-preparation
- 시작일: 2026-08-29
- 마지막 갱신: 2026-08-30
- 다음 행동: 앱인토스 콘솔에서 비게임 미니앱을 생성하고 `appName`·지원 SDK·분석 API를 확정한 뒤, YouTube iframe 선행 검증을 시작한다.

#### 목적

- 공개된 Trendzip을 앱인토스에서 실행·심사·출시할 수 있는 형태로 준비한다.
- 운영자 콘솔에서 준비할 값과 코드로 구현할 범위를 분리해 출시 작업의 불확실성을 줄인다.

#### 범위

- 앱인토스의 앱 등록, 배포 경로, 필수 메타데이터, SDK·웹뷰 요구사항을 확인한다.
- 현재 Next.js PWA, Vercel 배포, Cloudflare Access로 보호한 운영 API가 앱인토스 환경에서 동작하는 조건을 점검한다.
- 필요한 앱인토스 설정과 코드 변경을 작업 단위로 나누고, 로컬·운영 검증과 심사 제출 기준을 정의한다.
- 앱인토스 콘솔·SDK·Cloudflare Worker의 분석 책임을 분리하고, 광고 도입 판단에 필요한 4주 관찰 기준을 정의한다.

#### 제외 범위

- 토스 로그인·결제·광고 SDK·광고 배치 등 출시 준비와 직접 관련 없는 토스 기능 구현
- 기존 백엔드·Vercel·Cloudflare 인프라의 전면 교체
- 앱인토스 심사 결과가 확인되기 전의 기능 확장

#### 진행 상황

- `develop`을 `main`에 병합한 뒤 앱인토스 출시 준비 작업을 등록하고 전용 브랜치를 만들었다.
- 최신 공식 요구사항과 현재 Next.js·Vercel·Cloudflare Access 구성을 대조해 출시 아키텍처와 콘솔·코드·검증 로드맵을 `docs/ops/appintoss-deployment.md`에 정리했다.
- 외부 앱·브라우저 이동은 심사 리스크가 있어 제외하고, 앱인토스에서 예외적으로 허용하는 YouTube 공식 iframe 재생 어댑터를 적용하기로 했다.
- 앱인토스 요청은 Vercel을 경유하지 않고 Cloudflare Worker BFF가 Cloudflare Access Secret으로 보호된 Spring Boot API를 호출하도록 연동 방식을 확정했다.
- YouTube iframe 선행 검증, Worker upstream 헤더 allowlist·토큰 분리, 캐시와 CORS 결합 규칙, Workers Free 한도 오류 처리 기준을 로드맵에 반영했다.
- 앱인토스 콘솔을 사용자 지표 기준으로, SDK 이벤트를 최소 행동 분석으로, Worker Metrics를 운영 관측으로 분리하고 4주 광고 판단 기준을 `docs/ops/appintoss-analytics.md`에 정리했다.
- 앱인토스 전용 WebView 프로젝트와 Cloudflare Worker BFF는 아직 구현하지 않았다.

#### 완료 조건

- 운영자 설정, 코드 구현, 테스트·심사 준비 항목이 구분된 실행 계획이 있다.
- 앱인토스 실행 환경에서 필요한 도메인·인증·API 접근 방식의 결정과 검증 방법이 문서화돼 있다.
- 광고 도입 여부를 판단할 사용자·행동·운영 지표와 관찰 기간이 문서화돼 있다.
- 후속 구현 작업이 독립적인 커밋 단위로 나뉘어 있다.

#### 관련 코드

- `frontend/src/app/layout.tsx`
- `frontend/src/lib/api-client.ts`
- `frontend/vercel.json`
- `docs/ops/frontend-deployment.md`
- `docs/ops/appintoss-deployment.md`
- `docs/ops/appintoss-analytics.md`

#### 검증

- 상태: 로드맵 문서화 완료, 구현 대기
- `./dev/check-context`, `git diff --check`, staged Gitleaks 검사를 통과해야 한다.

#### 인계 메모

- 앱인토스의 공식 문서와 콘솔 요구사항은 시간에 따라 바뀔 수 있으므로, 구현 계획 수립 단계에서 최신 공식 자료를 다시 확인한다.
- 출시 준비의 운영자 설정과 코드 변경은 별도 작업계획에서 명확히 나눈다.

## READY

현재 준비된 작업 없음.

## LATER

- 후속 메모: 사람 승인 이후 YouTube와 SNS 쇼츠 업로드를 자동화할지 운영 데이터가 더 쌓인 뒤 검토한다.
- 후속 메모: 내레이션·자막·장면 구성 등 쇼츠 영상 품질 개선 방향을 실제 게시 결과를 바탕으로 정리한다.
- Android Chrome 홈 화면 설치와 standalone 실행 호환성 확인
- 프론트엔드 이전 production deployment 수동 롤백 workflow
- 운영 API 노출 정책 강화: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit 적용, 프론트 배포 도메인 기반 CORS 제한
- OpenAPI와 프론트 TypeScript 타입의 계약 자동화
- 외부 API fixture 기반 크롤링 전체 시나리오 테스트
- 프론트 핵심 사용자 흐름 E2E 테스트
- 아키텍처 규칙 자동 검사

## 최근 완료

### MEDIA-005 운영 숏폼 렌더링 및 사람 승인 게이트

- 상태: DONE
- 브랜치: `codex/media-005-render-review-gate`
- 완료일: 2026-08-29
- 결과: 운영 manifest를 실제 Gemini TTS와 워터마크 없는 `1.3x` `PUBLIC_CANDIDATE` MP4로 렌더링하고, 파일 hash·영상 규격을 검증한 뒤 최신 아티팩트만 검수할 수 있는 등록·결정 게이트를 구현했다.
- 운영 검증: 사용자가 최신 공개 후보를 전체 재생 검수하고 명시적으로 승인한 뒤 YouTube에 수동 게시했다.
- 운영 메모: 첫 공개 후보의 운영 등록·승인·게시 검증이 끝났으므로 `MEDIA-006`은 별도 작업으로 만들지 않는다. 향후 자동 업로드와 영상 품질 개선은 장기 운영 메모로만 관리한다.
- 검증: 백엔드 렌더·검수 테스트 16건, 미디어 테스트 137건, TypeScript 검사, `./dev/verify --quick`, `./dev/check-context --strict`, Gitleaks를 통과했다.

### MEDIA-004 운영 후보 자동 선정 및 제작 이력 기반 초안 생성

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-27
- 결과: 운영 키워드·제작 이력 수집, Gemini 근거 선택과 Brief 전용 문안 작성, 시스템 topicKey·eventKey, 30일 중복 정책과 원자적 `DRAFT` 예약을 연결했다.
- 운영 검증: 첫 `DRAFT(id=1)`와 manifest를 예약하고 PRIMARY 키워드 스냅샷·hash를 대조했으며, 결정적 재생에서 `EXACT_CONTENT`와 추가 예약 0회를 확인했다.
- 운영 메모: 일반 재실행에서 선택된 별도 후보 `id=2`는 `REJECTED`로 보존했고 첫 `DRAFT(id=1)`만 MEDIA-005 입력으로 유지한다.
- 검증: 미디어 테스트 111건, 타입 검사, 백엔드 ktlint, 프론트 lint·타입 검사, 저장소 빠른 검증과 Gitleaks를 통과했다.

### MEDIA-003 숏폼 선정·편집·발행 정책 설계

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-21
- 결과: YouTube 공식 정책과 Trendzip 내부 상한을 구분하고, 후보 선정·중복 방지·편집 순환·4주 파일럿·사람 검수·사후 중단 정책을 정의했다.
- 정책 리뷰: Trendzip 자체 순위와 데이터로 구분하기 어려운 세대 차이를 독립 편집 형식에서 제외하고, 키워드 맥락과 사건 흐름 설명으로 교체했다.
- 후속 메모: MEDIA-004는 정책의 `topicKey`, `eventKey`, 근거, 편집 형식과 판정을 운영 후보·제작 초안에 연결한다.
- 검증: YouTube 공식 정책 출처를 재확인했고, 미디어 테스트 28건과 `./dev/verify --quick`, `./dev/check-context`, Gitleaks를 통과했다.

### MEDIA-002 TTS 및 오디오 동기화 기술 스파이크

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-20
- 결과: Gemini TTS 장면별 WAV, 대본 hash 기반 audio manifest, 실제 음성 길이 기반 Remotion timeline과 48.384초 H.264·AAC narrated MP4 생성 경로를 구현했다.
- 실습 결과: 사용자가 음성 밀리초를 프레임으로 올림하고 장면 여백·최소 길이·연속 시작 시점과 전체 길이를 계산하는 timeline 로직을 구현해 정상·경계·실패 테스트를 통과했다.
- 품질 검수: 실제 Gemini 음성의 한국어 발음, 음량, 장면 전환과 자막 동기화를 최종 MP4와 대표 장면 다섯 장에서 확인하고 기술 검증용 결과물로 승인했다.
- 후속 메모: TTS API는 로컬 명시적 명령에서만 호출하고 생성 음성과 manifest는 Git에 포함하지 않는다. 사람 승인 게이트는 실제 게시 파이프라인 작업에서 구현한다.
- 검증: 미디어 테스트 28건, TypeScript 검사, 실제 Gemini TTS 생성, H.264·AAC 출력 규격, 대표 장면 렌더, 저장소 빠른 검증과 Gitleaks를 통과했다.

### MEDIA-001 키워드 기반 숏폼 콘텐츠 자동화

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-19
- 결과: 운영 데이터와 분리한 고정 fixture, Remotion 기반 1080x1920 무음 샘플, 입력 검증과 ffprobe 출력 규격 검사를 구현했다.
- 실습 결과: 사용자가 실제 Node 날짜 검증과 React 근거 카드 컴포넌트를 구현하고 타입 검사, 테스트와 대표 장면에서 동작을 확인했다.
- 품질 검수: 36초 최종 MP4와 다섯 대표 장면에서 자막 가독성, 공식 출처, 샘플 표기와 CTA를 확인하고 내부 기술 검증용 결과물로 승인했다.
- 후속 메모: 운영 자동화 전에 TTS 대안을 비교하고 사람 승인 상태를 설계한다. 반복 템플릿의 무검수 대량 게시와 권리가 불명확한 외부 자산 사용은 허용하지 않는다.
- 검증: 미디어 타입 검사, Node 테스트 3건, 최종 MP4 렌더링, 1080x1920·30fps·36초·H.264·yuv420p·무음 규격 검사, 대표 장면 검수와 저장소 빠른 검증을 통과했다.

### ANALYTICS-001 GA4·GTM 사용자 행동 분석 실습

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-18
- 결과: GA4 Web Stream, GTM, Consent Mode v2와 비식별 행동 이벤트 다섯 종을 운영에 반영하고, Vercel Analytics와 GA4의 집계 기준 차이와 동의 운영 절차를 문서화했다.
- 운영 검증: Tag Assistant가 GTM·GA4 태그를 정상 탐지했고 GA4 수집 요청 `204`, Realtime 활성 사용자와 DebugView의 `page_view`, `scroll`, `select_generation`을 확인했다. Preview에서 `select_generation`, `generation_change`, `view_keyword_detail`, `youtube_video_click`의 1회 실행을 확인했다.
- 후속 메모: 운영 샘플에 관련 키워드가 표시될 때 `related_keyword_click`을 재확인하고, 일반 보고서 누적과 GTM 보조 관리자 추가를 운영 점검으로 남긴다.
- 검증: 프론트 lint·타입 검사·production build·npm audit·저장소 빠른 검증·Gitleaks를 통과했고 운영 동의 변경과 GA4 Realtime·DebugView·Tag Assistant를 확인했다.
