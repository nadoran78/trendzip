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

- Android Chrome 홈 화면 설치와 standalone 실행 호환성 확인
- 프론트엔드 이전 production deployment 수동 롤백 workflow
- 운영 API 노출 정책 강화: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit 적용, 프론트 배포 도메인 기반 CORS 제한
- OpenAPI와 프론트 TypeScript 타입의 계약 자동화
- 외부 API fixture 기반 크롤링 전체 시나리오 테스트
- 프론트 핵심 사용자 흐름 E2E 테스트
- 아키텍처 규칙 자동 검사

## 최근 완료

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

### CHORE-004 프론트엔드 수동 배포 Workflow

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-04
- 결과: Git push와 Vercel production 배포를 분리하고 `main`에서 수동 실행하는 GitHub Actions workflow로 프론트 운영 배포를 수행한다. Vercel Git 연동의 자동 배포는 비활성화했다.
- 운영 메모: 배포 Secret은 `production-frontend` GitHub Environment에 격리하고 Vercel CLI 버전과 workflow 외부 Action 커밋을 고정했다.
- 검증: 수동 production build·deploy와 Vercel 기본·커스텀 도메인 smoke test가 성공했고, Access 적용 코드를 포함한 재배포 후 랜딩·피드·랭킹을 확인했다.
