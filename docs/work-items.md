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

### FE-008 Vercel 프론트엔드 배포

- 상태: IN_PROGRESS
- 브랜치: develop
- 시작일: 2026-08-02
- 마지막 갱신: 2026-08-02
- 다음 행동: `develop`을 push해 CI를 확인하고 `main`에 반영한 뒤 Vercel에 `API_BASE_URL`을 등록해 첫 배포를 실행한다.

#### 목적

Next.js 프론트엔드를 Vercel Hobby에 안전하게 배포하고 운영 API를 사용하는 핵심 사용자 흐름을 공개 도메인에서 제공한다.

#### 범위

- API base URL을 서버 전용 환경변수로 전환
- 서버 API 요청의 기본 timeout 적용
- Vercel과 CI의 Node.js 런타임 정합성 확보
- Vercel 로컬 메타데이터의 Git 추적 방지
- 운영 API 기반 production build 검증
- Vercel 기본 도메인과 커스텀 도메인 배포 검증
- 배포 완료 후 README와 프로젝트 상태 갱신

#### 제외 범위

- PWA와 서비스 워커 설정
- 백엔드 CORS 변경
- 운영 Swagger/OpenAPI 비활성화
- Cloudflare API rate limit 적용
- Vercel 유료 리전과 다중 리전 구성

#### 디자인 기준

- 상태: CONFIRMED
- `design/README.md`
- `design/app.jsx`
- `design/feed.jsx`
- `design/trend.jsx`
- `design/keyword.jsx`
- 배포 구성 작업이므로 UI를 변경하지 않고 기존 확정 화면과 동일하게 렌더링되는지만 검증한다.

#### 진행 상황

- API base URL을 `API_BASE_URL` 서버 전용 환경변수로 전환했다.
- API 요청에 기본 10초 timeout을 적용하고 호출자 `AbortSignal` 우선 규칙을 유지했다.
- Vercel과 CI가 Node.js 24를 사용하도록 런타임을 명시했다.
- `.vercel/`을 Git 추적 대상에서 제외하고 관련 환경변수 문서를 동기화했다.
- 운영 API 주소를 사용한 production build와 로컬 정적 검증을 완료했다.

#### 완료 조건

- 브라우저 공개 환경변수 없이 Vercel 서버에서 운영 API를 호출한다.
- 백엔드 응답 지연이 무기한 Vercel 렌더링 대기로 이어지지 않는다.
- Node.js 24와 Next.js 기본 빌드 설정으로 production build가 성공한다.
- Vercel 기본 도메인에서 랜딩, 피드, 랭킹과 키워드 상세가 정상 동작한다.
- `trendzip.nadoran.com`에서 HTTPS와 핵심 사용자 흐름이 정상 동작한다.
- README와 프로젝트 상태가 실제 배포 결과와 일치한다.

#### 관련 코드

- `frontend/src/lib/env.ts`
- `frontend/src/lib/api-client.ts`
- `frontend/package.json`
- `frontend/.env.example`
- `.gitignore`
- `README.md`
- `frontend/README.md`
- `frontend/AGENTS.md`

#### 검증

- 상태: PARTIAL
- 통과: `npm run lint`
- 통과: `npm run typecheck`
- 통과: 운영 API 환경변수를 사용한 `npm run build`
- 통과: `./dev/verify --quick`
- 통과: `./dev/check-secrets --staged`
- 예정: Vercel 기본·커스텀 도메인의 모바일·데스크톱 실제 화면

#### 인계 메모

- 모든 API 조회는 서버 컴포넌트에서 수행되므로 이번 작업에서 브라우저 CORS 허용 설정을 추가하지 않는다.
- Hobby에서는 서울 Function 리전을 사용하지 않고 기본 리전 응답시간을 먼저 측정한다.
- 실제 Vercel 배포와 도메인 연결 전까지 작업을 `IN_PROGRESS`로 유지한다.

## READY

- 없음

## LATER

- PWA 설정 및 홈 화면 추가 검증
- 운영 API 노출 정책 강화: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit 적용, 프론트 배포 도메인 기반 CORS 제한
- OpenAPI와 프론트 TypeScript 타입의 계약 자동화
- 외부 API fixture 기반 크롤링 전체 시나리오 테스트
- 프론트 핵심 사용자 흐름 E2E 테스트
- 아키텍처 규칙 자동 검사

## 최근 완료

### DOCS-001 프로젝트 README 작성

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-07-31
- 결과: 서비스 소개, 핵심 기능, 실제 모바일 화면 4종, 데이터 흐름, 아키텍처, 기술 스택, 로컬 실행과 검증 절차를 제공하는 루트 README를 추가했다.
- 공개 범위: 프론트엔드는 배포 준비 상태로 표시하고 운영 API와 Swagger의 공개 주소, 내부 IP, 운영 계정과 실제 환경변수 값은 제외했다.
- 후속 작업: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit과 프론트 배포 도메인 기반 CORS 제한은 LATER 항목에서 관리한다.
- 검증: 실제 Chromium 화면과 이미지 크기, README 로컬 링크, Gitleaks staged 검사, context strict 검사와 diff 검사를 통과했다.

### CHORE-003 GitHub Actions CI 및 비밀정보 유출 방지

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-07-31
- 결과: pull request와 `develop` push에서 전체 Git 이력의 비밀정보를 검사한 뒤 저장소 전체 build를 실행하는 GitHub Actions CI를 추가했다. 로컬 staged 검사와 pre-commit 차단, 민감 파일 ignore 규칙도 함께 적용했다.
- 보안 메모: Gitleaks `8.30.1` Docker 이미지는 digest까지 고정하고 외부 GitHub Action은 전체 커밋 SHA로 고정했다. CI는 읽기 권한만 사용하며 맥미니 배포와 분리한다.
- 검증: 전체 Git 이력 검사, staged 가짜 GitHub 토큰 차단, 실제 pre-commit 훅, CI 모드 빠른·전체 통합 검증과 workflow 문법 검사를 통과했다. 최초 push 후 GitHub의 `Secret scan`, `Full verification` 결과를 확인한다.

### CHORE-002 통합 검증 명령 추가

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-07-30
- 결과: 저장소 루트에 DB 없는 빠른 검증과 PostgreSQL·Flyway·jOOQ·백엔드 및 프론트 전체 build를 실행하는 `./dev/verify` 명령을 추가하고 프론트 TypeScript 타입 검사를 분리했다.
- 운영 메모: 전체 검증은 로컬 PostgreSQL과 누락된 `mztrend_test`를 준비하지만 기존 개발환경을 유지하기 위해 컨테이너를 자동 종료하지 않는다. 실제 외부 API는 호출하지 않는다.
- 검증: help와 잘못된 인자 종료 코드, 루트·하위 디렉터리 빠른 검사 및 DB 포함 전체 검사를 확인했다. 백엔드 전체 build와 프론트 production build를 포함한 모든 단계가 통과했다.

### BE-001 플랫폼 키워드 후보 제외

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-07-30
- 결과: Gemini와 fallback 후보의 공통 후처리 단계에서 `치지직`, `CHZZK` 플랫폼명을 대소문자 무시·정확 일치 기준으로 제외하고 Gemini 프롬프트에도 구체적인 제외 예시를 추가했다.
- 데이터 메모: 기존 키워드와 트렌드 로그는 이력 보존을 위해 물리 삭제하지 않는다. 백엔드 배포 후 정상 크롤링을 한 번 완료하면 최신 키워드 목록과 활성 피드에서 제외된다.
- 검증: 후보 후처리, Gemini 프롬프트와 YouTube 후보 수집 회귀 테스트를 추가했다. `치지직컵` 부분 일치 표현 유지와 필터링 후 순위 재계산을 확인하고 백엔드 전체 테스트, `ktlintCheck`와 build를 통과했다.

### FE-007 피드 섹션 정합성 개선

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-07-30
- 결과: 피드 배열 위치가 아닌 API `feedSection`을 기준으로 섹션을 구성한다. 첫 `TODAY_PICK` 한 편은 오늘의 픽, `RISING`은 지금 뜨는 트렌드, `RELATED`와 분류되지 않은 항목은 함께 보면 좋은 영상에 표시한다.
- 디자인 기준: `design/feed.jsx`, `design/trendzip-feed.html`
- 디자인 차이: 실제 상승 폭을 판정하지 않는 기존 `RISING`은 급상승 대신 `지금 뜨는 트렌드`로 표현한다. 시안에 없는 관련 영상 섹션은 `RELATED` 항목을 현재 트렌드로 오인하지 않도록 추가했다.
- 검증: `npm run lint`, `npm run build`를 통과했다. 섞인 API 순서, 복수 `TODAY_PICK`, 분류되지 않은 항목과 `TODAY_PICK` 부재를 검증했으며 1280x800·390x844 실제 Chromium 화면에서 섹션 순서와 가로 넘침 없음을 확인했다.
- 디자인 검증: PASS
