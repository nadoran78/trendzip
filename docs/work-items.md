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
- SEO 및 Open Graph 설정: 페이지별 metadata·canonical URL, `robots.txt`, `sitemap.xml`, 공유용 OG 이미지와 Twitter Card를 구성하고 검색·SNS 미리보기를 검증
- 프론트엔드 이전 production deployment 수동 롤백 workflow
- 운영 API 노출 정책 강화: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit 적용, 프론트 배포 도메인 기반 CORS 제한
- OpenAPI와 프론트 TypeScript 타입의 계약 자동화
- 외부 API fixture 기반 크롤링 전체 시나리오 테스트
- 프론트 핵심 사용자 흐름 E2E 테스트
- 아키텍처 규칙 자동 검사

## 최근 완료

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

### CHORE-003 GitHub Actions CI 및 비밀정보 유출 방지

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-07-31
- 결과: pull request와 `develop` push에서 전체 Git 이력의 비밀정보를 검사한 뒤 저장소 전체 build를 실행하는 GitHub Actions CI를 추가했다. 로컬 staged 검사와 pre-commit 차단, 민감 파일 ignore 규칙도 함께 적용했다.
- 보안 메모: Gitleaks `8.30.1` Docker 이미지는 digest까지 고정하고 외부 GitHub Action은 전체 커밋 SHA로 고정했다. CI는 읽기 권한만 사용하며 맥미니 배포와 분리한다.
- 검증: 전체 Git 이력 검사, staged 가짜 GitHub 토큰 차단, 실제 pre-commit 훅, CI 모드 빠른·전체 통합 검증과 workflow 문법 검사를 통과했다. 최초 push 후 GitHub의 `Secret scan`, `Full verification` 결과를 확인한다.
