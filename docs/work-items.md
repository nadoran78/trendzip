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

### FE-010 PWA 설정 및 홈 화면 추가 검증

- 상태: REVIEW
- 브랜치: develop
- 시작일: 2026-08-05
- 마지막 갱신: 2026-08-05
- 다음 행동: 변경 내용을 검토·커밋해 production에 배포한 뒤 Android Chrome 설치와 iOS Safari 홈 화면 추가를 실기기에서 확인한다.

#### 목적

모바일 사용자가 trendzip을 홈 화면에 설치해 독립 실행형 웹앱으로 사용할 수 있게 하고, 일시적인 네트워크 장애에도 명확한 오프라인 상태를 제공한다.

#### 범위

- Web App Manifest와 일반·maskable·Apple Touch 아이콘
- Next.js 16 Turbopack과 호환되는 Serwist 서비스 워커
- 정적 자산 중심의 보수적인 런타임 캐시와 문서 탐색 오프라인 fallback
- iOS 홈 화면 추가를 위한 metadata
- production build 기반 manifest·서비스 워커·오프라인 동작 검증

#### 제외 범위

- 앱 내부의 별도 설치 유도 배너
- 푸시 알림, Background Sync와 앱 스토어 배포
- API 응답 및 동적 피드 페이지의 오프라인 데이터 제공
- 기존 랜딩·피드·랭킹·키워드 상세 화면의 레이아웃 변경

#### 진행 상황

- 일반·maskable·Apple Touch 아이콘과 Web App Manifest를 추가했다.
- Serwist Turbopack route와 루트 scope 서비스 워커 등록을 구현했다.
- 동적 문서·RSC·API 요청은 NetworkOnly로 유지하고 정적 자산과 이미지만 제한적으로 캐시한다.
- 문서 탐색 실패 시 표시할 브랜드 기준 오프라인 화면과 재시도 동작을 구현했다.
- Next.js와 ESLint 설정을 `16.3.0`으로 맞추고 npm audit 취약점을 해소했다.

#### 완료 조건

- manifest에 앱 이름, 시작 URL, 표시 모드, 테마 색상과 목적별 아이콘이 제공된다.
- production 환경에서 서비스 워커가 루트 scope로 등록되고 오프라인 문서 탐색에 fallback 화면을 반환한다.
- 동적 페이지와 API 응답은 서비스 워커 캐시에 남기지 않고 정적 자산만 안전하게 재사용한다.
- 프론트 lint·타입 검사·production build와 저장소 빠른 검증을 통과한다.

#### 관련 코드

- `frontend/src/app/layout.tsx`
- `frontend/src/app/manifest.ts`
- `frontend/src/app/sw.ts`
- `frontend/src/app/serwist/[path]/route.ts`
- `frontend/src/app/~offline/page.tsx`
- `frontend/next.config.ts`
- `frontend/public/icons/`
- `design/app.jsx`
- `design/trendzip.html`

#### 디자인 기준

- 상태: CONFIRMED
- `design/README.md`
- `design/app.jsx`
- `design/trendzip.html`
- 적용 범위: 기존 화면 UI는 변경하지 않고 PWA 아이콘과 오프라인 상태에 랜딩 페이지의 워드마크, 다크 배경과 청록·분홍 포인트를 반영한다.

#### 검증

- 상태: PASS
- 디자인 검증: PASS
- 일반·maskable·Apple Touch 아이콘 크기와 실제 렌더링 확인
- 390x844 오프라인 화면에서 텍스트·아이콘·버튼 배치와 가로 넘침 없음 확인
- `npm run lint` 통과
- `npm run typecheck` 통과
- mock API 주소 기반 `npm run build` 통과
- Chrome manifest 파싱 오류 및 installability 오류 없음 확인
- 서비스 워커 활성화, 루트 scope 제어와 정적 자산 전용 cache 확인
- 서버 중단 후 `/feed/teen` 탐색 시 오프라인 fallback 표시 확인
- `npm audit` 취약점 0건 확인
- `./dev/verify --quick` 통과
- `./dev/check-secrets --all` 통과
- 배포 후 검증: Android Chrome 설치와 iOS Safari 홈 화면 추가 확인 필요

#### 인계 메모

- 동적 피드의 최신성을 우선해 페이지 문서와 API 응답은 런타임 캐시 대상에서 제외한다.
- 브라우저별 설치 UI 차이가 크므로 첫 버전에서는 브라우저의 기본 설치 기능과 iOS 공유 메뉴를 사용한다.
- Chrome 로컬 production 환경에서 manifest와 서비스 워커 검증은 완료했으며, OS별 홈 화면 아이콘과 standalone 실행은 production 배포 후 실기기에서 확인한다.

## READY

- 없음

## LATER

- 프론트엔드 이전 production deployment 수동 롤백 workflow
- 운영 API 노출 정책 강화: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit 적용, 프론트 배포 도메인 기반 CORS 제한
- OpenAPI와 프론트 TypeScript 타입의 계약 자동화
- 외부 API fixture 기반 크롤링 전체 시나리오 테스트
- 프론트 핵심 사용자 흐름 E2E 테스트
- 아키텍처 규칙 자동 검사

## 최근 완료

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

### CHORE-004 프론트엔드 수동 배포 Workflow

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-04
- 결과: Git push와 Vercel production 배포를 분리하고 `main`에서 수동 실행하는 GitHub Actions workflow로 프론트 운영 배포를 수행한다. Vercel Git 연동의 자동 배포는 비활성화했다.
- 운영 메모: 배포 Secret은 `production-frontend` GitHub Environment에 격리하고 Vercel CLI 버전과 workflow 외부 Action 커밋을 고정했다.
- 검증: 수동 production build·deploy와 Vercel 기본·커스텀 도메인 smoke test가 성공했고, Access 적용 코드를 포함한 재배포 후 랜딩·피드·랭킹을 확인했다.

### FE-008 Vercel 프론트엔드 배포

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-02
- 결과: Next.js 프론트엔드를 Vercel Hobby에 배포하고 `trendzip.nadoran.com` 커스텀 도메인에서 운영 API 기반 핵심 사용자 흐름을 제공한다.
- 운영 메모: API 주소는 서버 전용 `API_BASE_URL`로 관리하며 기본 10초 timeout과 Node.js 24 런타임을 적용했다. Cloudflare는 프론트 도메인의 DNS만 관리하고 트래픽은 Vercel로 직접 전달한다.
- 검증: Vercel 기본·커스텀 도메인의 랜딩, TEEN/TWENTY 피드와 랭킹, 키워드 상세가 정상 응답했다. 데스크톱 실제 화면과 390x844 모바일 화면, 가로 넘침 및 브라우저 오류 부재를 확인했다.

### DOCS-001 프로젝트 README 작성

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-07-31
- 결과: 서비스 소개, 핵심 기능, 실제 모바일 화면 4종, 데이터 흐름, 아키텍처, 기술 스택, 로컬 실행과 검증 절차를 제공하는 루트 README를 추가했다.
- 공개 범위: 프론트엔드는 배포 준비 상태로 표시하고 운영 API와 Swagger의 공개 주소, 내부 IP, 운영 계정과 실제 환경변수 값은 제외했다.
- 후속 작업: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit과 프론트 배포 도메인 기반 CORS 제한은 LATER 항목에서 관리한다.
- 검증: 실제 Chromium 화면과 이미지 크기, README 로컬 링크, Gitleaks staged 검사, context strict 검사와 diff 검사를 통과했다.
