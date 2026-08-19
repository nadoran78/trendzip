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

현재 활성 작업 없음.

## READY

현재 준비된 작업 없음.

## LATER

- Android Chrome 홈 화면 설치와 standalone 실행 호환성 확인
- 프론트엔드 이전 production deployment 수동 롤백 workflow
- 운영 API 노출 정책 강화: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit 적용, 프론트 배포 도메인 기반 CORS 제한
- OpenAPI와 프론트 TypeScript 타입의 계약 자동화
- 외부 API fixture 기반 크롤링 전체 시나리오 테스트
- 프론트 핵심 사용자 흐름 E2E 테스트
- 아키텍처 규칙 자동 검사

## 최근 완료

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
