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
→ 후보 정규화·중복·플랫폼명 제거
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
| 후보 정제 | 추출 후보 | 정규화된 후보 | `TrendCandidatePostProcessor` | 노이즈·중복·플랫폼 키워드 증가 |
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

## 주요 비즈니스 규칙

- 키워드는 `word`만이 아니라 `generation + word` 조합으로 구분한다.
- 플랫폼 자체를 나타내는 후보는 트렌드 키워드로 저장하지 않는다. 플랫폼 차단은 표기 별칭의 정확 일치만 사용해 별도 콘텐츠명까지 제거하지 않는다.
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
