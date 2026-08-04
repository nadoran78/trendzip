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

### CHORE-004 프론트엔드 수동 배포 Workflow

- 상태: IN_PROGRESS
- 브랜치: develop
- 시작일: 2026-08-02
- 마지막 갱신: 2026-08-03
- 다음 행동: Git 자동 배포 비활성화 설정을 원격에 반영하고 자동 배포 미생성과 수동 production 재배포를 확인한다.

#### 목적

Git push와 Vercel production 배포를 분리하고 GitHub Actions에서 `main`을 명시적으로 선택해 수동 배포한다.

#### 범위

- Vercel CLI 기반 production 설정 동기화, build와 deploy
- GitHub Environment Secret 사전 검증과 최소 workflow 권한
- production 중복 배포 방지와 배포 후 smoke test
- 최초 전환 순서와 문제 해결 절차 문서화
- Vercel Git 연동 자동 배포 비활성화

#### 제외 범위

- 백엔드 배포 workflow
- Cloudflare Access 적용
- 프론트엔드 롤백 workflow

#### 진행 상황

- 수동 production 배포 workflow와 운영 문서를 구현했다.
- `production-frontend` GitHub Environment Secret 등록을 완료했다.
- 첫 원격 실행에서 인증을 확인했고, Vercel 프로젝트의 `frontend` Root Directory와 workflow 작업 디렉터리가 중복 적용되는 문제를 수정했다.
- 수정된 workflow의 production 배포와 기본·커스텀 도메인 smoke test가 성공했다.
- `frontend/vercel.json`에 모든 브랜치의 Git 자동 배포 비활성화 설정을 추가했다.
- 자동 배포 미생성과 수동 workflow 재배포에 대한 원격 확인이 남아 있다.

#### 완료 조건

- `production-frontend` Environment에 필요한 Secret과 `main` 브랜치 제한이 설정된다.
- `main`에서 수동 workflow가 성공한다.
- Vercel 기본 배포 URL과 `trendzip.nadoran.com`의 핵심 경로가 정상 응답한다.
- 첫 수동 배포 검증 후 Git 자동 배포를 비활성화한다.

#### 관련 코드

- `.github/workflows/deploy-frontend.yml`
- `frontend/vercel.json`
- `docs/ops/frontend-deployment.md`
- `docs/ci-and-secret-management.md`
- `docs/project-status.md`
- `docs/work-items.md`
- `frontend/AGENTS.md`

#### 검증

- `./dev/verify --quick` 통과
- `API_BASE_URL=https://api-trendzip.nadoran.com npm run build` 통과
- workflow YAML 구문 검사 통과
- `./dev/check-secrets --all` 통과
- GitHub Actions 첫 실행에서 `vercel pull` 인증 성공
- GitHub Actions production build·deploy 및 smoke test 성공
- `frontend/vercel.json` JSON 구문 검사 통과
- Git 자동 배포 비활성화 변경 후 `./dev/verify --quick`과 프론트 production build 통과
- Git 자동 배포 비활성화는 원격 검증 필요

#### 인계 메모

- Vercel CLI `58.4.4`를 프론트 devDependency로 추가하면 CLI 전이 의존성 때문에 audit 결과가 크게 증가해, 애플리케이션 의존성과 분리하고 workflow의 일회성 runner에 정확한 버전으로 설치한다.
- 수동 workflow의 production 검증 성공 후 `frontend/vercel.json`을 추가했다. 원격 검증 전까지 작업을 완료 처리하지 않는다.

## READY

- 없음

## LATER

- Cloudflare Access 운영 활성화: 서비스 인증 헤더가 포함된 프론트를 재배포한 뒤 `api-trendzip.nadoran.com/*`에 특정 Service Token만 허용하는 `Service Auth` 정책을 적용하고 직접 API 차단·프론트 정상 동작을 검증
- PWA 설정 및 홈 화면 추가 검증
- 프론트엔드 이전 production deployment 수동 롤백 workflow
- 운영 API 노출 정책 강화: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit 적용, 프론트 배포 도메인 기반 CORS 제한
- OpenAPI와 프론트 TypeScript 타입의 계약 자동화
- 외부 API fixture 기반 크롤링 전체 시나리오 테스트
- 프론트 핵심 사용자 흐름 E2E 테스트
- 아키텍처 규칙 자동 검사

## 최근 완료

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
