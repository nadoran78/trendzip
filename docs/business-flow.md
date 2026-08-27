# 비즈니스 흐름

## 서비스 목적

MZ 따라잡기는 30~40대 사용자가 10대와 20대의 YouTube 관심사를 빠르게 탐색하고, 특정 키워드가 왜 뜨는지 이해하도록 돕는 익명 웹앱이다.

## 핵심 용어

- `Generation`: 트렌드를 구분하는 세대. `TEEN`은 10대, `TWENTY`는 20대다.
- `TrendCandidate`: YouTube 인기 영상에서 발견한 트렌드 키워드 후보와 근거 영상이다.
- `Keyword`: 세대에 귀속된 최종 트렌드 키워드와 현재 순위·점수·설명이다.
- `TrendVideo`: 수집한 YouTube 영상의 메타데이터다.
- `TrendFeedItem`: 세대별 활성 피드에서 영상과 대표 키워드를 연결한다.
- `FeedSection`: 피드 노출 목적. `TODAY_PICK`, `RISING`, `RELATED` 중 하나다.
- `TrendCrawlRun`: 세대별 크롤링 한 번의 시작·완료·실패 상태다.
- `trendScore`: 네이버 DataLab 결과를 바탕으로 산정한 세대별 트렌드 점수다.
- `rankTrend`: 이전 결과와 비교한 순위 방향. `UP`, `DOWN`, `NEW`, `SAME` 중 하나다.
- `ShortformContent`: 운영 키워드로 만든 숏폼 초안과 중복·발행 상태를 추적하는 제작 이력이다.
- `ShortformRenderArtifact`: 원본 콘텐츠, TTS, 렌더 props, MP4와 대표 장면 hash를 묶은 불변 검수 대상이다.
- `ShortformReviewDecision`: 사람이 특정 렌더 아티팩트에 내린 승인·수정 요청·반려 결정과 사유다.

## 사용자 흐름

```text
랜딩 진입
→ 10대 또는 20대 선택
→ 세대별 피드 조회
→ 영상 또는 대표 키워드 탐색
→ 키워드 상세 조회
→ 뜨는 이유, 추이, 관련 영상과 키워드 확인
```

주요 API 연결은 다음과 같다.

| 사용자 행동 | API | 결과 |
|---|---|---|
| 세대별 피드 조회 | `GET /api/feed?generation=...` | 활성 피드 영상과 대표 키워드 |
| 트렌드 순위 조회 | `GET /api/keywords?generation=...` | 세대별 키워드 순위 |
| 키워드 상세 조회 | `GET /api/keywords/{id}/explain` | 설명, 관련 영상, 추이, 관련 키워드 |

## 트렌드 수집 흐름

스케줄러는 공통 후보를 모은 뒤 TEEN과 TWENTY를 각각 평가하고 저장한다.

```text
YouTube 한국 인기 영상 조회
→ Gemini 기반 키워드 후보 추출
→ 부족하면 영상 텍스트 기반 후보로 보완
→ 후보 근거 검증·정규화·범용어·부분 명칭·플랫폼명 제거
→ 네이버 DataLab에서 세대별 트렌드 점수 산정
→ 키워드별 YouTube 영상 추가 수집
→ 피드 항목과 관련 키워드 조립
→ 설명 갱신 대상에 한해 Gemini 설명 생성
→ PostgreSQL 저장
→ 조회 캐시 무효화
```

| 단계 | 입력 | 출력 | 주요 코드 | 실패 영향 |
|---|---|---|---|---|
| 후보 수집 | YouTube 인기 영상 | 공통 키워드 후보 | `YoutubePopularVideoCandidateSource` | 모든 세대의 실행 실패 |
| 후보 정제 | 추출 후보, 근거 영상 | 검증·정규화된 후보 | `TrendCandidatePostProcessor` | 범용어·부분 명칭·근거 없는 후보 증가 |
| 세대별 평가 | 공통 후보, 세대 | 순위가 있는 키워드 | `NaverDataLabTrendScorer` | 해당 세대 실행 실패 |
| 배치 조립 | 평가된 키워드 | 영상·피드·관계 배치 | `TrendCrawlingBatchAssembler` | 해당 세대 저장 불가 |
| 설명 보강 | 수집 배치, 과거 기록 | 설명이 추가된 배치 | `KeywordExplainRefreshAppender` | 해당 세대 저장 실패 |
| 영속화 | 완성된 수집 배치 | 키워드·영상·피드 데이터 | `TrendCrawlingPersistenceService` | 새 API 데이터 반영 실패 |

`TrendCrawlingScheduler`가 전체 흐름을 조정하며, 세대별 `TrendCrawlRun` 상태를 기록한다. 로컬과 테스트 프로필에서는 기본적으로 스케줄러가 비활성화된다.

## 피드 생성 흐름

1. 세대별로 점수가 산정된 키워드를 순위순으로 정렬한다.
2. `YoutubeKeywordVideoCollector`가 각 키워드와 연결할 영상을 수집한다.
3. `DefaultFeedCurationPolicy`가 피드 섹션, 노출 순서와 badge를 결정한다.
4. 새 배치에 피드 항목이 있을 때만 기존 활성 피드를 비활성화한다.
5. 새 항목을 활성 피드로 저장한다.
6. `FeedQueryRepository`가 활성 피드를 조회용 DTO로 projection한다.

빈 수집 결과가 기존 정상 피드를 지우지 않도록, 새 피드 항목이 없으면 활성 피드 교체를 건너뛴다.

## 키워드 설명 흐름

1. 현재 수집 키워드와 기존 키워드를 비교한다.
2. 최근 완료된 크롤링과 과거 순위 기록을 조회한다.
3. `KeywordExplainRefreshPolicy`가 신규·급상승·장기 노출 등의 이유로 갱신 대상을 결정한다.
4. `GeminiKeywordExplainGenerator`가 뜨는 이유를 생성한다.
5. 설명과 생성 시각을 키워드에 저장한다.
6. 상세 API는 설명, 관련 영상, 추이 그래프와 관련 키워드를 함께 반환한다.

## 데이터와 API 연결

```text
keywords ─────────────── 키워드 목록·설명
    │
    ├─ trend_logs ────── 순위와 점수 이력·추이 그래프
    ├─ keyword_relations 관련 키워드
    └─ trend_feed_items ─ trend_videos ─ 피드·관련 영상
                         │
                         └─ trend_video_keywords
```

쓰기 흐름은 JPA repository를 사용하고, 사용자 API 조회는 jOOQ 기반 query repository와 DTO projection을 우선한다.

## 숏폼 운영 초안 흐름

```text
운영 API에서 최신 TEEN·TWENTY 후보와 최근 제작 이력 조회
→ Gemini가 후보·편집 형식·관계 키워드·영상 원문 발췌만 선택
→ 시스템이 fact card를 검증하고 형식 최소 근거·허용 엔티티·금지 주장을 담은 Editorial Brief 생성
→ 선택 근거 발췌에서 직접 확인되지 않는 관련 키워드 제거
→ 두 번째 Gemini가 Brief만 사용해 근거 ID가 연결된 문안을 작성
→ 시스템이 문안 계약과 근거 없는 감정 반응 단정을 검증하고 1회 보정 실패 시 결정적 composer 문안으로 fallback
→ 시스템이 키워드 기반 topicKey와 편집 형식·크롤링 실행 ID 기반 eventKey 생성
→ 동일 콘텐츠·사건·최근 주제 순서로 중복 판정
→ 출처·형식·작성 fallback 진단을 포함한 축약 dry-run 보고서 v5 또는 DRAFT 예약과 manifest v4 생성
→ 명시적 로컬 명령으로 장면별 TTS와 H.264·AAC MP4·대표 장면 생성
→ 원본·음성·props·영상 hash와 규격 검증 후 렌더 아티팩트 등록
→ 사람 전체 재생 검수 후 최신 아티팩트에 APPROVED·NEEDS_REVISION·REJECTED 결정 기록
→ 승인 전에는 업로드하지 않음
```

기존 Gemini 키워드 설명은 후보를 이해하기 위한 참고 문맥이며 숏폼의 독립적인 사실 근거가 아니다. 첫 번째 Gemini 응답은 실제 후보 ID와 영상 메타데이터에 존재하는 원문 발췌만 선택한다. 두 번째 Gemini는 검증된 Brief만 받아 문안을 작성하며 모든 이유와 내레이션 구간을 fact ID에 연결한다. 시스템은 길이, 허용 fact ID, 내부 지표·세대 반응 주장과 근거 없는 수치를 검사하고 한 번 보정한다. 작성기 장애나 최종 검증 실패는 전체 초안을 중단하지 않고 결정적 composer fallback과 사람 검수 경고로 전환한다. 세대별 순위와 점수는 후보 정렬과 감사용 내부 신호로만 유지한다.

TTS와 영상 렌더링은 API 비용과 로컬 자원을 쓰는 별도 명령이며 초안 준비에서 자동 실행하지 않는다. 렌더 아티팩트는 파일 hash와 영상 규격이 달라지면 다른 결과로 취급한다. 사람 결정은 등록된 최신 아티팩트에만 허용하고, `NEEDS_REVISION` 뒤 재렌더하면 이전 아티팩트와 검수 이력은 보존한다. 대본이나 근거를 바꿀 때는 기존 콘텐츠 hash를 재사용하지 않고 새 `DRAFT`를 만든다.

## 주요 비즈니스 규칙

- 키워드는 `word`만이 아니라 `generation + word` 조합으로 구분한다.
- 플랫폼 자체를 나타내는 후보는 트렌드 키워드로 저장하지 않는다. 플랫폼 차단은 표기 별칭의 정확 일치만 사용해 별도 콘텐츠명까지 제거하지 않는다.
- 후보는 지정한 근거 영상의 메타데이터에서 실제로 확인되어야 하며, `게임`·`리뷰`처럼 독립 트렌드 의미가 약한 형식어는 저장하지 않는다.
- 작품명은 일부 단어보다 전체 명칭을 우선한다. 국가·계절 표현은 제목에서 독립 명칭으로 확인되거나 별도 근거가 있을 때만 허용한다.
- 관련 키워드는 하나의 근거 영상 메타데이터에서 두 키워드가 모두 확인될 때만 생성하며, 카테고리는 관계 자격이 아니라 보조 점수로만 사용한다.
- TEEN과 TWENTY의 점수, 순위와 피드는 서로 섞이지 않아야 한다.
- JPA Entity를 API 응답으로 직접 반환하지 않는다.
- DB foreign key와 JPA 연관관계 대신 ID 컬럼과 명시적 조회를 사용한다.
- 크롤링 실패는 `TrendCrawlRun`에 기록하고, 완료되지 않은 실행을 정상 결과로 취급하지 않는다.
- 실제 외부 API를 호출하는 로컬 크롤링은 명시적으로 활성화할 때만 실행한다.
- Flyway migration이 DB 구조의 기준이며 `backend/sql`은 사람이 보는 스냅샷이다.

## 코드 탐색 지도

- 크롤링 진입점: `backend/src/main/kotlin/com/mztrend/scheduler/TrendCrawlingScheduler.kt`
- 후보 수집과 평가: `backend/src/main/kotlin/com/mztrend/service/crawling/candidate`
- 배치 조립과 피드 정책: `backend/src/main/kotlin/com/mztrend/service/crawling`
- 설명 갱신과 저장: `backend/src/main/kotlin/com/mztrend/service/TrendCrawlingService.kt`
- 영속화: `backend/src/main/kotlin/com/mztrend/service/TrendCrawlingPersistenceService.kt`
- API controller: `backend/src/main/kotlin/com/mztrend/controller`
- API 조회 repository: `backend/src/main/kotlin/com/mztrend/repository/query`
- 프론트 API 경계: `frontend/src/services/trend-api.ts`
- 프론트 API 타입: `frontend/src/types/api.ts`
- 현재 상태: [프로젝트 현재 상태](project-status.md)
- 현재 작업: [작업 목록](work-items.md)
