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

### MEDIA-003 숏폼 선정·편집·발행 정책 설계

- 상태: REVIEW
- 브랜치: codex/media-003-publishing-policy
- 시작일: 2026-08-21
- 마지막 갱신: 2026-08-21
- 다음 행동: 사용자가 수정된 편집 형식과 일정 예시를 리뷰한 뒤 `develop`에 병합한다.

#### 목적

운영 키워드 숏폼을 반복·대량 생산 콘텐츠로 운영하지 않도록 선정, 편집 차별화, 검수와 발행 기준을 확정한다.

#### 범위

- YouTube 공식 정책과 Trendzip 내부 기준 구분
- `ADOPT/HOLD/REJECT` 판정과 콘텐츠 동일성·재발행 기준
- 편집 형식 순환, 4주 파일럿과 사람 검수
- 과거 키워드 샘플 판정표와 후속 자동화 입력·상태 정의

#### 제외 범위

- 운영 DB 연동과 대본·TTS·영상 생성 자동화
- 관리자 UI와 YouTube API 업로드·예약 게시

#### 진행 상황

- 2026-08-21 기준 YouTube 수익 창출, 스팸과 AI 콘텐츠 공개 정책을 재확인했다.
- 숏폼 선정·반복 방지·편집 순환·발행·검수·사후 대응 정책을 문서화했다.
- 과거 키워드 10건에 정책을 적용하고 MEDIA-004~007의 상태와 작업 경계를 정의했다.
- 저장소 빠른 통합 검증과 미디어 테스트 28건을 통과했다.
- 정책 리뷰에서 Trendzip 자체 순위와 실제 차이가 작은 세대 비교는 독립 편집 형식으로 적합하지 않다고 판단했다.
- `RANK_CHANGE`·`GENERATION_COMPARE`를 `KEYWORD_PRIMER`·`CONTEXT_TIMELINE`으로 교체하고 내부 순위·세대 데이터의 사용 경계를 정책에 추가했다.

#### 완료 조건

- [x] YouTube 공식 정책과 Trendzip 내부 수치를 구분했다.
- [x] 선정·반복 방지·편집·발행·검수 기준을 정의했다.
- [x] 과거 키워드 8건 이상에 적용한 판정표를 작성했다.
- [x] MEDIA-004 이후에 필요한 최소 상태와 데이터를 정의했다.

#### 관련 코드

- `docs/media-publishing-policy.md`
- `docs/media-shortform-spike.md`
- `docs/project-status.md`
- `README.md`

#### 검증

- 상태: PASS
- YouTube 공식 정책 출처와 검토일을 확인했다.
- `git diff --check`를 통과했다.
- 편집 형식 리뷰 반영 후 `./dev/check-context`와 `./dev/verify --quick`을 다시 통과했다.

#### 인계 메모

- 주 2회와 30일 재발행 제한은 YouTube 공식 안전 기준이 아니라 Trendzip 파일럿 내부 상한이다.
- 고정 템플릿 사용 자체를 금지하지 않고, 영상별 핵심 내용과 가치의 실질적인 차이를 요구한다.
- MEDIA-004는 이 정책을 운영 키워드 후보와 제작 초안에 연결하는 작업으로 시작한다.

## READY

현재 준비된 작업 없음.

## LATER

- MEDIA-004 운영 키워드 후보를 정책 입력과 제작 초안으로 변환
- MEDIA-005 숏폼 초안의 사람 승인·반려·재생성 게이트
- MEDIA-006 승인된 숏폼의 YouTube 비공개 업로드
- MEDIA-007 발행 일정·SNS 확장 자동화
- Android Chrome 홈 화면 설치와 standalone 실행 호환성 확인
- 프론트엔드 이전 production deployment 수동 롤백 workflow
- 운영 API 노출 정책 강화: 운영 Swagger/OpenAPI 비활성화, Cloudflare rate limit 적용, 프론트 배포 도메인 기반 CORS 제한
- OpenAPI와 프론트 TypeScript 타입의 계약 자동화
- 외부 API fixture 기반 크롤링 전체 시나리오 테스트
- 프론트 핵심 사용자 흐름 E2E 테스트
- 아키텍처 규칙 자동 검사

## 최근 완료

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
