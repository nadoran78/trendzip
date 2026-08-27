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

### MEDIA-004 운영 후보 자동 선정 및 제작 이력 기반 초안 생성

- 상태: REVIEW
- 브랜치: codex/media-004-operational-draft
- 시작일: 2026-08-21
- 마지막 갱신: 2026-08-27
- 다음 행동: MEDIA-004 커밋을 검토해 `develop`에 병합한 뒤 첫 운영 `DRAFT(id=1)`를 MEDIA-005 렌더링 입력으로 사용한다.

#### 목적

- 운영 키워드와 최근 숏폼 제작 이력을 API로 조회해 중복되지 않는 제작 초안을 자동으로 준비한다.
- Gemini 1차 호출은 후보와 직접 근거를 선택하고 2차 호출은 검증된 Editorial Brief만으로 문안을 작성하며, 운영자는 후속 단계에서 최종 렌더링 결과를 승인한다.

#### 범위

- 키워드 상세 API에 원본 크롤링 회차와 스냅샷 시각을 추가한다.
- 숏폼 콘텐츠와 연관 키워드의 제작 이력 스키마, 도메인, 저장소를 추가한다.
- 최근 이력 조회, `DRAFT` 예약과 상태 갱신을 위한 인증된 운영 API를 추가한다.
- 운영 후보·제작 이력 수집, Gemini 근거 선택, fact card·Editorial Brief·별도 작성기, 중복 정책 검사와 구조화 초안 생성을 `media` 모듈에 연결한다.
- Kotlin `DRAFT` 예약 서비스와 Node 30일 중복 판정을 실제 운영 코드 실습으로 진행한다.

#### 제외 범위

- 운영 TTS와 영상 렌더링
- 승인·반려 UI
- YouTube 업로드와 자동 공개
- 운영자의 필수 편집 입력

#### 진행 상황

- [x] MEDIA-003에서 후보 선정, 반복 방지와 발행 정책을 확정했다.
- [x] 키워드 상세 API에 `sourceCrawlRunId`, `snapshotAt`, `explainedAt`을 추가했다.
- [x] 숏폼 제작 이력 스키마, 도메인, 저장소, 최근 이력 조회와 운영 API 인증 기반을 준비했다.
- [x] Kotlin 실습을 위한 Controller·DTO·Repository와 정상·중복 실패 테스트를 준비했다.
- [x] Kotlin `reserveDraft` 실습을 완료하고 리뷰한다.
- [x] 운영 후보 수집과 Gemini 구조화 편집 계획, 콘텐츠 hash, `DRAFT` 예약과 검토 manifest 생성을 연결했다.
- [x] Node 중복 정책 실습을 완료하고 전체 미디어 테스트로 판정 우선순위를 검증했다.
- [x] 후보와 이력을 한 번만 조회하고 Gemini 계획을 반복 비교하는 무예약 dry-run 경로를 추가했다.
- [x] 근거 없는 주장과 과장 표현을 구분하고 hook 40자 목표·48자 한계를 적용하는 편집 계약 검증을 추가했다.
- [x] 사용자가 실제 운영 코드의 `shouldRepairEditorialPlan(error)` 재호출 판정을 구현하고 경계값을 보완했다.
- [x] 복구 가능한 편집 계약 오류만 지연 후 한 번 보정하고 생성 시도 횟수를 dry-run 보고서에 기록한다.
- [x] 후보 밖 관계 키워드·근거 영상 ID를 구조화된 오류로 기록하고 선택 후보의 허용 ID 안에서 한 번 보정한다.
- [x] 사용자가 성공 표본 2건 미만은 비교 불가로 판정하는 안정성 순수 함수를 구현하고 반환 경로를 단순화했다.
- [x] 30~40대를 설명 대상과 트렌드 관측 대상으로 구분하고 선택 키워드가 실제 등장한 세대만 관심 주체로 허용한다.
- [x] 근거 영상 게시 시점과 생성 시점 차이를 계산하고 `WHY_NOW`에 최근 30일 근거가 없으면 비차단 경고를 기록한다.
- [x] `eventKey`를 Gemini 응답에서 제거하고 주제·편집 형식·크롤링 실행 ID로 시스템이 결정적으로 생성한다.
- [x] 이전 자유 문안 접근에서 기존 키워드 설명을 참고 문맥으로 격리하고 두 핵심 이유를 선택 영상 원문에 연결하는 `evidenceClaims`를 추가했다.
- [x] `1020`·`10~20대` 결합 표현과 내부 순위·점수·연속 노출 주차를 검증하고 위반 시 한 번 보정한다.
- [x] 이전 manifest v2에 세대별 원본 관측치와 성공한 보정의 최초 오류 진단을 기록했다.
- [x] 이전 자유 문안 접근에서 순위·점수·순위 변화 값을 Gemini 입력에서 제거하고 근거 영상 ID를 `evidenceClaims`에서 결정적으로 파생했다.
- [x] 이전 dry-run v2에서 복구 가능한 문안 위반을 수집해 한 번 보정하고 최초·최종 계획과 오류를 기록했다.
- [x] 실제 dry-run에서 문안 길이 초과와 원문 발췌에 기대어 근거 없는 해석을 생성하는 회귀 사례를 테스트로 고정했다.
- [x] Gemini 응답을 후보·편집 형식·관계 키워드·영상 원문 발췌 선택으로 축소했다.
- [x] 정규화 키워드 기반 `topicKey`, 검증된 fact card와 제한 길이 문안을 시스템에서 결정적으로 생성한다.
- [x] 후보 밖 ID와 존재하지 않는 원문 발췌만 한 번 보정하고 동일 응답은 `REPAIR_NO_EFFECT`로 진단한다.
- [x] 클릭 유도형 제목·오래된 근거·주제 불일치를 비차단 `reviewWarnings`로 기록한다.
- [x] dry-run·manifest v3에 선택 결과, fact card, 시스템 문안과 `SELECTION`·`FACT_ASSEMBLY`·`COMPOSITION`·`DUPLICATE_POLICY` 실패 단계를 기록한다.
- [x] `trend_videos`에 YouTube 설명·태그를 보존하고 보호된 운영 상세 API에서 `channelId`와 함께 제공한다.
- [x] 1차 Gemini 선택 계약에 통제된 사건 유형, 근거 필드와 근거 역할을 추가했다.
- [x] 실제 판정에 사용되지 않는 수동 출처 등급 설정은 제거하고 향후 정책 확장을 위한 원본 `channelId`만 유지했다.
- [x] 검증된 fact card, 허용 엔티티, 금지 주장과 형식 fallback 진단을 담는 Editorial Brief 조립기를 준비했다.
- [x] 편집 형식별 최소 근거를 판정하고 부족한 형식을 `KEYWORD_PRIMER`로 낮추는 `validateEditorialFormatEligibility()`를 구현했다.
- [x] 검증된 Editorial Brief 전용 Gemini 작성기와 결과 검증·1회 보정·결정적 fallback을 연결했다.
- [x] 백엔드 V7과 운영 근거 API를 배포한 뒤 실제 운영 dry-run으로 2단계 생성 결과를 검증했다.
- [x] 근거 발췌에서 확인되지 않는 관련 키워드를 제거하고 감정 방향을 단정하는 작성 문구를 중립 표현으로 보정한다.
- [x] 정상 결과의 중간 산출물 중복을 제거하고 이상 진단만 조건부로 남기는 dry-run 보고서 v5를 적용했다.
- [x] `draft:prepare`로 첫 운영 초안 `DRAFT(id=1)`와 manifest를 예약하고 PRIMARY 키워드 스냅샷까지 운영 API로 대조했다.
- [x] 첫 manifest를 결정적으로 재생해 `EXACT_CONTENT` 차단, 추가 예약 0회와 추가 manifest 미생성을 확인했다.
- [x] 일반 재실행에서 별도 후보가 선택될 수 있음을 확인하고 테스트용 두 번째 초안 `id=2`를 이력을 보존한 채 `REJECTED`로 전환했다.

#### 완료 조건

- 운영 API를 통해 최근 제작 이력을 조회하고 중복 없는 `DRAFT`를 원자적으로 예약할 수 있다.
- Gemini 선택 결과가 실제 후보와 영상 메타데이터 검사를 통과한 경우에만 시스템 문안과 검토 manifest를 생성한다.
- 동일 사건, 동일 콘텐츠와 최근 30일 동일 주제의 중복을 정의된 정책대로 차단하거나 보류한다.
- 실제 외부 API를 호출하지 않는 자동 테스트와 저장소 검증을 통과한다.

#### 관련 코드

- `backend/src/main/kotlin/com/mztrend/controller/ops`
- `backend/src/main/kotlin/com/mztrend/domain/ShortformContent.kt`
- `backend/src/main/kotlin/com/mztrend/service/ShortformContentService.kt`
- `backend/src/main/resources/db/migration`
- `media/scripts`
- `docs/media-publishing-policy.md`

#### 검증

- 상태: PASS
- 통과: 키워드 Controller·QueryRepository, 운영 API 인증·최근 이력 조회 테스트
- 통과: `ShortformContentServiceTest` 5건과 운영 API `reserveDraft` 1건
- 통과: 미디어 테스트 111건에서 선택 계약, fact card, 형식 적격성, Brief 전용 작성·보정·fallback과 dry-run v5 보고서를 검증했다.
- 통과: 후보 밖 ID·원문 불일치의 1회 보정과 `REPAIR_NO_EFFECT`, 일반 HTTP·JSON 오류 비보정을 검증했다.
- 통과: `WHY_NOW` 최근 근거와 `KEYWORD_PRIMER` 대표 근거 허용을 검증하는 근거 시점 진단 테스트 3건
- 통과: 시스템 topicKey·eventKey 결정성, manifest v4 세대 관측치와 대본 변경 시 eventKey 유지 테스트
- 통과: 운영 키워드 상세, YouTube 근거 메타데이터 저장과 기존 공개 API 회귀를 포함한 백엔드 집중 테스트
- 통과: `editorial-format-eligibility.test.mjs` 6건을 포함한 전체 미디어 테스트
- 통과: 백엔드 compileKotlin·compileTestKotlin·ktlint
- 통과: 프론트엔드 typecheck
- 통과: `./dev/check-context`
- 통과: `./dev/verify --quick`
- 확인: 실제 3회 운영 dry-run에서 1회 성공, 후보 밖 `evidenceVideoIds`로 2회 실패했으며 성공 표본 1건만으로 안정성 값이 `true`가 되는 문제를 발견했다.
- 확인: 후속 실제 3회 운영 dry-run은 모든 응답을 한 번 보정했으나 내부 순위 오류 2건과 이중 근거 ID 불일치 1건으로 모두 실패했다. 입력에서 내부 지표를 제거하고 근거 ID를 claim에서만 파생하며 복구 가능한 위반을 합산하도록 보완했다.
- 확인: 2026-08-26 실제 3회 운영 dry-run은 summary 길이 초과 2건과 근거 없는 세대 주장 보정 실패 1건으로 모두 실패했다. 모델 문안 생성과 정규식 보정을 제거하고 근거 선택·시스템 문안 조립 구조로 개편했다.
- 통과: 개편 후 실제 3회 운영 dry-run은 3건 모두 첫 호출에 성공했고 후보·topicKey·eventKey·contentHash가 일치했으며 보정 호출은 없었다.
- 확인: 동일 dry-run에서 `인턴`과 `WHY_NOW`, 관계 키워드 `한소희`·`최민식`, 최근 예고편 근거를 일관되게 선택했다.
- 확인: 긴 클릭 유도형 제목 전체를 발췌해 첫 번째 이유가 100자 제한에서 문장 중간에 잘렸고, 시스템 문안이 영상 제목 확인을 반복해 정보 가치와 편집 다양성이 부족했다.
- 통과: 2026-08-27 실제 운영 dry-run은 `재혼 황후`와 동일 topicKey·eventKey를 3회 유지하고 첫 호출에서 모두 성공했으며 작성 fallback은 없었다.
- 확인: 같은 dry-run에서 근거 없는 관련 키워드 `스캔들`을 세 번 모두 제거하고, 감정 방향 단정 없이 관심·화제의 중립 문안만 생성했다.
- 확인: dry-run 보고서 v5는 동일 실행 기준 118,002바이트에서 18,209바이트로 줄고 정상 iteration에서 중간 Brief·writer·manifest 중복을 제거했다.
- 통과: 2026-08-27 `draft:prepare`로 `재혼 황후`, `WHY_NOW`, crawl run `101`의 첫 운영 초안 `id=1`을 예약했고 manifest hash와 운영 API 저장 hash가 일치했다.
- 통과: `id=1`의 키워드 스냅샷은 `재혼 황후` PRIMARY 한 건이며 근거 없는 관련 키워드 `스캔들`은 manifest와 DB 예약 데이터에서 제외됐다.
- 통과: 첫 manifest 결정적 재생은 `EXACT_CONTENT`, 충돌 ID `1`, `reserveDraft()` 0회로 종료됐고 추가 manifest를 만들지 않았다.
- 확인: 일반 `draft:prepare` 재실행은 생성형 선택 단계에서 별도 후보 `인턴`을 골라 중복이 아닌 새 초안을 만들었다. 테스트 이력 `id=2`는 `REJECTED`로 전환했고 첫 `DRAFT(id=1)`만 후속 제작 대상으로 유지한다.
- 통과: `./dev/check-secrets --staged`

#### 인계 메모

- Kotlin 실습에서 `DRAFT` 중복 검사, 키워드 불변식 검증, 콘텐츠·키워드 스냅샷 원자적 저장과 DB 경합 예외 변환을 구현했다.
- `cd backend && ./gradlew test --tests '*ShortformContentServiceTest' --tests '*ShortformContentOperationsControllerTest.reserveDraft returns created draft'` 검증을 통과했다.
- 사람 승인 상태는 운영 렌더링 이후로 이동하며, MEDIA-005에서 최종 영상 승인·반려·재생성을 구현한다.
- 운영 후보는 설명·근거 영상·출처 크롤링 회차가 있고 스냅샷이 72시간 이내인 키워드로 제한한다.
- 첫 번째 Gemini는 후보, 편집 형식, 사건 유형, 관계 키워드와 영상 원문 발췌만 고른다. 두 번째 Gemini는 검증된 Brief만 받아 문안을 작성하고 시스템은 `topicKey`, `eventKey`와 근거 claim을 결정한다.
- 두 번째 실습으로 동일 hash, 활성 동일 사건, 최근 동일 주제와 허용 순서를 구현했고, 여러 이력이 섞여도 hash 충돌을 우선하는 회귀 테스트를 추가했다.
- dry-run은 실제 예약과 동일한 후보·Gemini·중복 정책 코드를 사용하지만 `reserveDraft()`는 호출하지 않으며, 반복 결과의 key와 콘텐츠 hash 안정성을 보고서로 남긴다.
- 중복 정책은 Gemini가 선택한 초안 단위로 판정한다. 명령 자체를 재실행하면 다른 후보가 선택될 수 있으므로 특정 초안의 중복 회귀는 저장된 manifest를 결정적으로 재생해 검증한다.
- 작성 문안은 공통 길이·fact ID·금지 주장·근거 수치 계약을 검사하고 한 번 보정한다. 실패하면 애플리케이션 템플릿이 결정적 fallback을 생성한다.
- 사용자 실습 대상이었던 보정 판정은 현재 후보·관계 키워드·영상 ID·원문 발췌 참조 오류만 허용하고 일반 HTTP·JSON·문안 오류는 제외한다.
- 보정 호출은 허용 ID와 영상 제목·채널명 원문 안에서 잘못된 참조만 한 번 수정한다. 같은 잘못된 선택을 반환하면 추가 호출 없이 `REPAIR_NO_EFFECT`로 종료한다.
- 2026-08-23 운영 dry-run의 성공 초안은 포켓로그를 선택했지만 근거 없는 `2030 세대` 표현이 포함됐다. 후속 보완에서는 30~40대를 설명 대상과 트렌드 관측 대상으로 구분하고 실제 후보 세대만 관심 주체로 허용한다.
- 후보 밖 참조 ID 보정에서는 `primaryKeywordId`, `relatedKeywordIds`, `evidenceSelections[].evidenceVideoId`와 `sourceExcerpt`만 허용 목록·원문 안에서 다시 고른다.
- 시스템 문안은 30~40대를 설명을 읽는 대상으로만 고정해 언급하고 관측된 유행 세대로 단정하지 않으며 내부 순위를 사용하지 않는다.
- dry-run의 `evidenceDiagnostics`는 근거별 게시 후 경과 일수와 최근 여부를 기록한다. `WHY_NOW`의 30일 기준은 사람 검수를 돕는 경고이며 초안 예약을 자동 차단하지 않는다.
- 2026-08-24 운영 dry-run은 `FC온라인`을 3회 모두 선택했지만 Gemini가 같은 계기에 서로 다른 `eventKey`를 만들고 직접 영상 메타데이터에 없는 인물·금액·행동과 내부 순위를 대본에 사용했다. 후속 구현은 eventKey 시스템 생성, 원문 발췌 근거 계약, 내부 순위 금지와 성공 보정 진단으로 이 문제를 제한한다.
- 같은 날 후속 dry-run은 검증을 강화한 대신 첫 위반만 고치는 보정과 별도 근거 ID 필드의 불일치로 3회 모두 실패했다. 내부 순위 신호를 프롬프트에서 제거하고 claim 기반 단일 근거 원천, 복합 위반 보정과 실패 진단을 추가했다.
- 2026-08-26 dry-run은 검증 규칙을 늘려도 후보 전체를 받은 모델의 자유 문안을 안정화하지 못한다는 점을 확인했다. 현재 구조는 선택 Gemini와 Brief 전용 작성 Gemini를 분리하고 `editorial-fact-card.mjs`, `editorial-writer-validation.mjs`, `editorial-draft-composer.mjs`가 각각 근거 검증, 작성 계약, fallback을 담당한다.
- 개편 후 `dry-run-2026-08-26T14-32-58.json`은 가용성과 식별자 안정성 목표를 충족했다. 다만 결정적 composer가 긴 원문을 문자 단위로 자르고 모든 근거를 동일 문장으로 재진술하므로 현재 결과는 발행 가능한 대본이 아니라 다음 편집 다양성 개선의 기준선이다.
- 2단계 구조는 `/api/ops/media/keywords/{id}`, `editorial-contract.mjs`, `editorial-fact-card.mjs`, `editorial-brief.mjs`, `gemini-editorial-writer.mjs`, `editorial-writer-validation.mjs` 순서로 이어진다. 백엔드 V7 배포와 실제 운영 dry-run 검증을 완료했다.
- 첫 운영 제작 입력은 `media/out/operational-drafts/54d1df6bb910ff3001da66fe1b235133b2672f00a332af8b35d8acd17aa0bc9c.json`이며 생성물 디렉터리는 Git에서 제외한다.

## READY

현재 준비된 작업 없음.

## LATER

- MEDIA-005 숏폼 운영 렌더링과 최종 결과 승인·반려·재생성 게이트
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

### OBS-001 Vercel Web Analytics 운영 트래픽 측정

- 상태: DONE
- 브랜치: develop
- 완료일: 2026-08-07
- 결과: `@vercel/analytics`를 Next.js 루트 레이아웃에 연결하고 Vercel Web Analytics에서 운영 방문자와 페이지 조회를 수집한다.
- 운영 메모: SDK의 자동 환경 감지를 사용하며 별도 환경변수나 GitHub Secret은 필요하지 않다. 제품 행동 이벤트는 후속 GA4·GTM 작업에서 다룬다.
- 검증: 프론트 lint·타입 검사·production build·npm audit·저장소 빠른 검증과 Gitleaks를 통과했다. 운영 배포 후 Analytics 네트워크 요청과 Vercel 대시보드의 방문자·페이지 조회·경로 수집을 확인했다.
