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

### MEDIA-005 운영 숏폼 렌더링 및 사람 승인 게이트

- 상태: READY
- 브랜치: 미정
- 시작일: 미정
- 마지막 갱신: 2026-08-27
- 다음 행동: `codex/media-005-render-review-gate` 브랜치를 만들고 렌더 아티팩트·검수 이력 계약과 첫 운영 manifest 입력 검증부터 구현한다.

#### 목적

- MEDIA-004가 예약한 운영 `DRAFT`를 실제 한국어 음성, 세로형 MP4와 검수용 대표 장면으로 변환한다.
- 렌더 결과를 원본 콘텐츠 hash와 결합해 기록하고, 사람이 확인한 동일 아티팩트만 승인·반려·재생성할 수 있게 한다.

#### 범위

- manifest v4의 예약 ID, 콘텐츠 hash, 대본, 근거와 경고를 검증하는 운영 렌더 입력 계약을 추가한다.
- 운영 manifest를 기존 `KeywordShortformProps`로 변환하고 샘플 전용 fixture와 운영 입력 경계를 분리한다.
- 기존 Gemini TTS, audio manifest, timeline과 Remotion 렌더 코드를 임의의 운영 초안에도 재사용할 수 있게 모듈화한다.
- 실행마다 격리된 출력 디렉터리에 WAV, audio manifest, MP4, 대표 장면과 render manifest를 생성한다.
- MP4 hash, 원본 콘텐츠 hash, TTS 모델·음성, 음성 manifest hash, 영상 규격과 생성 시각을 렌더 아티팩트로 기록한다.
- 렌더 아티팩트와 사람 검수 결정을 보존하는 Flyway 스키마, 도메인, 저장소와 보호된 운영 API를 추가한다.
- 검증된 렌더를 `REVIEW_REQUIRED`로 전환하고 `APPROVED`, `NEEDS_REVISION`, `REJECTED` 결정을 검수자·사유·아티팩트 hash와 함께 기록하는 CLI를 추가한다.
- 첫 운영 초안 `DRAFT(id=1)`를 사용해 실제 TTS·렌더·대표 장면 생성과 수동 전체 재생 검수를 진행한다.

#### 제외 범위

- YouTube 비공개 업로드, 예약 공개와 다른 SNS 배포
- 사람 승인을 대신하는 자동 품질 판정
- 운영자용 웹 관리 화면
- 권리를 확보하지 않은 YouTube 영상·썸네일·방송·영화 클립과 외부 음원 사용
- 대본 내용 수정과 새 콘텐츠 hash 생성. 문안 변경이 필요하면 기존 초안을 반려하고 MEDIA-004에서 새 `DRAFT`를 만든다.

#### 구현 단계

1. 렌더·검수 계약과 저장 모델을 정의한다.
   - `shortform_render_artifacts`에 콘텐츠 ID·hash, 렌더 hash, TTS·영상 메타데이터와 생성 시각을 보존한다.
   - `shortform_review_decisions`에 대상 아티팩트, 결정, 검수자, 사유와 결정 시각을 보존한다.
   - 같은 렌더 hash의 중복 등록과 현재 아티팩트가 아닌 결과의 승인을 차단한다.
2. 운영 manifest 입력 어댑터를 구현한다.
   - `DRAFT`, 예약 ID, manifest·reservation hash 일치와 필수 대본·근거를 검사한다.
   - 세대, 제목, 요약, 두 이유, 근거와 CTA를 기존 Remotion props에 매핑한다.
   - 샘플 fixture 렌더 경로의 회귀 동작을 유지한다.
3. 운영 TTS·렌더 파이프라인을 구현한다.
   - TTS는 비용이 발생하는 별도 명시 명령으로 유지하고 테스트에서는 가짜 transport를 사용한다.
   - 렌더는 기존 음성의 대본 hash를 재검사한 뒤 H.264·AAC MP4와 대표 장면을 생성한다.
   - ffprobe 규격 검사와 파일 hash 계산이 끝난 경우에만 아티팩트를 운영 API에 등록한다.
4. 사람 승인 게이트를 구현한다.
   - 렌더 등록 후 콘텐츠를 `REVIEW_REQUIRED`로 전환하고 검수 체크리스트와 파일 경로를 출력한다.
   - 승인·수정 요청·반려는 명시적 CLI 명령, 검수자와 사유를 필수로 받는다.
   - 승인 요청의 아티팩트 hash가 최신 렌더와 다르면 상태를 변경하지 않는다.
   - `NEEDS_REVISION` 재렌더는 이전 아티팩트와 결정을 보존하고 새 렌더 이력을 생성한다.
5. 첫 운영 초안을 실제 검수한다.
   - `DRAFT(id=1)`의 TTS 발음, 음량, 장면 전환, 자막, 근거 표시와 CTA를 전체 재생으로 확인한다.
   - 자동으로 `APPROVED` 처리하지 않고 사용자가 결과를 확인한 뒤 최종 결정을 입력한다.
   - 실행 절차, 비용 경계, 장애 복구와 MEDIA-006 인계 정보를 문서화한다.

#### 사용자 실습

- Codex는 운영 manifest 입력 타입, 실패 테스트와 호출부를 준비한다.
- 사용자는 실제 코드의 `createOperationalRenderProps()`를 구현해 manifest의 대본·근거·세대 정보를 `KeywordShortformProps`로 변환한다.
- 타입 검사와 단위 테스트를 통과한 뒤 Codex가 불변식, 누락 필드와 샘플 렌더 회귀를 리뷰한다.

#### 완료 조건

- 첫 운영 manifest로 장면별 WAV, audio manifest, 1080x1920·30fps H.264·AAC MP4와 대표 장면을 생성한다.
- 원본 콘텐츠 hash, 대본 hash, 음성 설정과 최종 MP4 hash가 하나의 render manifest 및 운영 아티팩트 이력으로 연결된다.
- 렌더·파일 규격 검증 실패 시 콘텐츠 상태와 운영 아티팩트 이력을 변경하지 않는다.
- 사람 결정 전에는 `APPROVED`가 될 수 없고 최신 아티팩트가 아닌 결과는 승인할 수 없다.
- 승인·수정 요청·반려의 검수자, 사유, 대상 아티팩트와 시각이 보존된다.
- 샘플 렌더 회귀, 외부 API 없는 자동 테스트, 저장소 빠른 검증과 비밀정보 검사를 통과한다.

#### 검증 계획

- 백엔드 도메인 상태 전이, 아티팩트 중복, 최신 hash 승인과 검수 이력 통합 테스트
- 운영 API 인증, 렌더 등록과 승인·수정 요청·반려 Controller 테스트
- 운영 manifest 어댑터, TTS 재사용, render manifest hash와 실패 원자성 Node 테스트
- 미디어 타입 검사와 기존 샘플·narrated 렌더 회귀 테스트
- 실제 Gemini TTS 호출은 첫 운영 초안 수동 검증에서만 실행
- 실제 MP4 ffprobe, 대표 장면, 전체 재생과 사람 결정 확인
- `./dev/verify --quick`, `./dev/check-context`, `./dev/check-secrets --staged`

#### 예상 커밋 단위

1. `feat: 숏폼 렌더 아티팩트와 검수 이력 추가`
2. `feat: 운영 초안 렌더 입력 변환 추가`
3. `feat: 운영 TTS와 영상 렌더 파이프라인 추가`
4. `feat: 숏폼 사람 승인 게이트 추가`
5. `docs: MEDIA-005 운영 검증 결과 기록`

#### 관련 코드

- `backend/src/main/kotlin/com/mztrend/controller/ops`
- `backend/src/main/kotlin/com/mztrend/domain/ShortformContent.kt`
- `backend/src/main/kotlin/com/mztrend/service/ShortformContentService.kt`
- `backend/src/main/resources/db/migration`
- `media/scripts`
- `media/src/Root.tsx`
- `media/src/TrendKeywordShort.tsx`
- `media/src/types.ts`
- `docs/media-publishing-policy.md`
- `docs/media-tts-spike.md`

## LATER

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
