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

- 없음

## LATER

- PWA 설정 및 홈 화면 추가 검증
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
