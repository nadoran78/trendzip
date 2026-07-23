# AGENTS.md — MZ 따라잡기 Backend

> 전체 프로젝트 개요는 루트 AGENTS.md 참조

## 기술 스택

| 항목 | 기술 |
|------|------|
| 언어 | Kotlin |
| Java 버전 | 17 |
| 프레임워크 | Spring Boot 3.x |
| 빌드 | Gradle (Kotlin DSL) |
| DB | PostgreSQL |
| 캐시 | Redis |
| DB 마이그레이션 | Flyway |
| 배포 | Oracle Cloud Free Tier (ARM VM) |

---

## 로컬 개발환경

- 로컬 개발 DB/Redis는 루트 `docker-compose.yml`로 실행한다.
- 실행 순서:

```bash
docker compose up -d
cd backend
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

- `local` profile은 PostgreSQL `localhost:5432`, Redis `localhost:6379`를 사용한다.
- `test` profile은 로컬 PostgreSQL의 `mztrend_test` DB와 simple cache를 사용한다.
- PostgreSQL 데이터를 초기화해야 할 때만 `docker compose down -v`를 사용한다. 이 명령은 DB volume도 삭제한다.
- 로컬 확인용 seed 데이터가 필요할 때만 `APP_LOCAL_DATA_ENABLED=true`를 함께 지정한다.
- 크롤링 스케줄러는 `local`, `test` profile에서 기본 비활성화한다. 로컬에서 수동 검증이 필요할 때만 `APP_CRAWLING_SCHEDULER_ENABLED=true`를 지정한다.
- 크롤링 수동 검증은 controller를 열지 않고 startup runner로 실행한다.

```bash
APP_LOCAL_DATA_ENABLED=true SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
curl "http://localhost:8080/api/health"
curl "http://localhost:8080/api/keywords?generation=TEEN"
curl "http://localhost:8080/api/keywords?generation=TWENTY"
```

### 크롤링 수동 검증

- `.env` 파일은 Spring Boot가 자동으로 읽지 않을 수 있으므로, 로컬 shell에서 명시적으로 export한 뒤 실행한다.
- 수동 검증 시에도 실제 YouTube, 네이버 DataLab, Gemini API 호출이 발생한다.
- cron 반복 실행과 startup runner를 동시에 켜지 않는다. 수동 1회 검증은 `APP_CRAWLING_SCHEDULER_RUN_ON_STARTUP=true`만 사용한다.

```bash
cd backend
set -a
source .env
set +a
APP_CRAWLING_SCHEDULER_ENABLED=true \
APP_CRAWLING_SCHEDULER_RUN_ON_STARTUP=true \
SPRING_PROFILES_ACTIVE=local \
./gradlew bootRun
```

---

## SQL 스키마 문서

- 실제 DB 변경은 반드시 Flyway migration(`src/main/resources/db/migration/V*.sql`)으로 관리한다.
- `backend/sql/{domain}/...sql` 파일은 사람이 현재 테이블 구조를 빠르게 보기 위한 스냅샷이다.
- Flyway migration을 추가하거나 수정하는 작업 단위에서는 관련 `backend/sql` 파일도 함께 갱신한다.
- `backend/sql`의 도메인 분류는 엄격한 기준이 아니라 느슨한 탐색용 묶음이다.
- `backend/sql` 파일은 운영 DB에 직접 적용하지 않는다.

---

## Persistence 설계 원칙

- Command/write 경로는 JPA Entity와 `JpaRepository`를 우선 사용한다.
- Query/read 경로는 jOOQ `DSLContext`를 우선 사용하고 DTO projection으로 응답한다.
- command 흐름의 정책 판단에 필요한 조회는 command-side repository에 둘 수 있다. 이 경우에도 복잡한 join/projection은 jOOQ를 사용할 수 있으며, jOOQ 사용 여부만으로 `repository/query`에 배치하지 않는다.
- `repository/query`는 사용자 API 응답, 화면 조회, read model projection 중심으로 사용한다.
- JPA Entity 간 `@ManyToOne`, `@OneToMany`, `@OneToOne`, `@ManyToMany` 연관관계는 사용하지 않는다.
- DB foreign key constraint는 생성하지 않는다. 참조 관계는 `keyword_id` 같은 ID 컬럼과 인덱스로 관리한다.
- 연관 데이터 조회는 조회 목적에 맞는 repository에서 ID 기반 명시적 join으로 처리한다.
- API 응답이나 조회 전용 모델에 JPA Entity를 직접 반환하지 않는다.
- jOOQ generated source는 `build/generated-src/jooq/main` 아래에 생성하며 커밋하지 않는다.
- clean checkout 또는 `./gradlew clean` 이후에는 `docker compose up -d` 후 `cd backend && ./gradlew prepareJooq build`로 검증한다.
- `prepareJooq`는 Flyway migration을 로컬 PostgreSQL에 적용한 뒤 jOOQ codegen을 실행한다.
- DB schema 변경 시 관련 Flyway migration과 `backend/sql` 스냅샷을 갱신하고 `./gradlew prepareJooq`를 다시 실행한다.

---

## 테스트 DB 원칙

- DB 통합 테스트는 PostgreSQL 기준으로 작성한다.
- H2 호환성을 위해 운영 스키마, Flyway migration, 인덱스 설계를 변경하지 않는다.
- PostgreSQL 전용 기능(partial index, COMMENT ON, enum CHECK 등)은 필요하면 그대로 사용한다.
- DB가 필요한 테스트는 로컬 Docker PostgreSQL 또는 Testcontainers 기반으로 검증한다.
- H2는 순수 단위 테스트처럼 DB 방언 차이가 없는 경우에만 제한적으로 사용한다.
- `test` profile은 기본적으로 `jdbc:postgresql://localhost:5432/mztrend_test`를 사용하며, 필요하면 `TEST_POSTGRES_URL`, `TEST_POSTGRES_USERNAME`, `TEST_POSTGRES_PASSWORD`로 오버라이드한다.

---

## 패키지 구조

```
com.mztrend
├── controller
│   ├── dto
│   │   └── KeywordListResponse
│   ├── FeedController
│   ├── KeywordController
├── service
│   ├── FeedService
│   ├── KeywordService
│   ├── TrendCrawlRunRecorder
│   ├── TrendCrawlingService
│   ├── TrendCrawlingPersistenceService
│   └── crawling
│       ├── CollectedTrendBatch
│       ├── CollectedKeywordVideoBatch
│       ├── CollectedKeyword
│       ├── CollectedVideo
│       ├── CollectedFeedItem
│       ├── CollectedVideoKeyword
│       ├── CollectedKeywordRelation
│       ├── KeywordVideoCollector
│       ├── YoutubeKeywordVideoCollector
│       ├── TrendCrawlingBatchAssembler
│       ├── KeywordExplainGenerator
│       ├── GeminiKeywordExplainGenerator
│       ├── KeywordExplainRefreshPolicy
│       ├── KeywordExplainRefreshAppender
│       ├── KeywordExplainRefreshDecision
│       ├── KeywordExplainRefreshReason
│       ├── KeywordExplainRequest
│       ├── KeywordExplainResult
│       └── candidate
│           ├── KeywordCandidateExtractor
│           ├── KeywordCandidateExtractionRequest
│           ├── KeywordCandidateExtractionResult
│           ├── ExtractedKeywordCandidate
│           ├── GeminiKeywordCandidateExtractor
│           ├── TrendCandidate
│           ├── TrendCandidateSource
│           ├── ScoredTrendKeyword
│           ├── YoutubePopularVideoCandidateSource
│           ├── YoutubeVideoCandidateExtractor
│           └── NaverDataLabTrendScorer
├── repository
│   ├── command
│   │   ├── ExternalApiLogRepository
│   │   ├── KeywordRepository
│   │   ├── KeywordRelationRepository
│   │   ├── TrendFeedItemRepository
│   │   ├── TrendVideoKeywordRepository
│   │   ├── TrendVideoRepository
│   │   ├── TrendLogRepository
│   │   ├── TrendLogLookupRepository
│   │   └── TrendCrawlRunRepository
│   └── query
│       ├── FeedQueryRepository
│       ├── KeywordQueryRepository
│       └── dto
│           ├── FeedVideoQueryResult
│           └── KeywordSummaryQueryResult
├── domain
│   ├── ExternalApiDirection (enum: INBOUND, OUTBOUND)
│   ├── ExternalApiLog
│   ├── ExternalApiProvider (enum: YOUTUBE, NAVER_DATALAB, GEMINI, UNKNOWN)
│   ├── ExternalApiPurpose
│   ├── Keyword
│   ├── KeywordRelation
│   ├── RankTrend
│   ├── TrendCrawlRun
│   ├── TrendCrawlRunStatus (enum: RUNNING, COMPLETED, FAILED)
│   ├── TrendVideo
│   ├── TrendFeedItem
│   ├── TrendVideoKeyword
│   ├── TrendVideoKeywordRelationType (enum: TAG, RELATED)
│   ├── FeedSection (enum: TODAY_PICK, RISING, RELATED)
│   ├── Generation (enum: TEEN, TWENTY)
│   └── TrendLog
├── client
│   ├── YoutubeApiClient
│   ├── NaverDataLabClient
│   ├── GeminiApiClient
│   ├── GeminiGenerateContentGateway
│   └── GeminiContentClient
├── logging
│   ├── ExternalApiLogRecorder
│   ├── ExternalApiLogRecord
│   ├── RecordExternalApiLog
│   └── RecordExternalApiLogAspect
├── scheduler
│   ├── TrendCrawlingScheduler
│   └── TrendCrawlingStartupRunner
└── config
    ├── CrawlingSchedulerProperties
    ├── CacheConfig
    └── SchedulerConfig
```

---

## DB 스키마

```sql
CREATE TABLE keywords (
    id             BIGSERIAL PRIMARY KEY,
    word           VARCHAR(100) NOT NULL,
    generation     VARCHAR(10) NOT NULL CHECK (generation IN ('TEEN', 'TWENTY')),
    category       VARCHAR(50),
    current_rank   INT,
    trend_score    BIGINT,
    rank_trend     VARCHAR(10) CHECK (rank_trend IN ('UP', 'DOWN', 'NEW', 'SAME')),
    rank_delta     INT,
    explain        TEXT,
    explained_at   TIMESTAMP,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE keyword_relations (
    id                  BIGSERIAL PRIMARY KEY,
    keyword_id          BIGINT NOT NULL,
    related_keyword_id  BIGINT NOT NULL,
    display_order       INT DEFAULT 0,
    score               INT,
    source              VARCHAR(30),
    created_at          TIMESTAMP DEFAULT NOW(),
    CONSTRAINT ck_keyword_relations_not_self CHECK (keyword_id <> related_keyword_id)
);

CREATE TABLE trend_videos (
    id                         BIGSERIAL PRIMARY KEY,
    youtube_video_id           VARCHAR(50) NOT NULL,
    title                      VARCHAR(300) NOT NULL,
    channel_id                 VARCHAR(100),
    channel_name               VARCHAR(150) NOT NULL,
    channel_category           VARCHAR(50),
    channel_subscriber_count   BIGINT,
    thumbnail_url              VARCHAR(500),
    view_count                 BIGINT,
    published_at               TIMESTAMP,
    duration_seconds           INT,
    collected_at               TIMESTAMP DEFAULT NOW(),
    created_at                 TIMESTAMP DEFAULT NOW(),
    updated_at                 TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trend_feed_items (
    id                  BIGSERIAL PRIMARY KEY,
    generation          VARCHAR(10) NOT NULL CHECK (generation IN ('TEEN', 'TWENTY')),
    trend_video_id      BIGINT NOT NULL,
    primary_keyword_id  BIGINT NOT NULL,
    feed_section        VARCHAR(30) CHECK (feed_section IN ('TODAY_PICK', 'RISING', 'RELATED')),
    display_order       INT DEFAULT 0,
    score               INT,
    badge               VARCHAR(30),
    source              VARCHAR(30),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    collected_at        TIMESTAMP DEFAULT NOW(),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trend_video_keywords (
    id              BIGSERIAL PRIMARY KEY,
    trend_video_id  BIGINT NOT NULL,
    keyword_id      BIGINT NOT NULL,
    relation_type   VARCHAR(20) NOT NULL CHECK (relation_type IN ('TAG', 'RELATED')),
    display_order   INT DEFAULT 0,
    score           INT,
    source          VARCHAR(30),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trend_logs (
    id          BIGSERIAL PRIMARY KEY,
    keyword_id  BIGINT NOT NULL,
    rank        INT,
    score       BIGINT,
    recorded_at TIMESTAMP DEFAULT NOW()
);
```

---

## 캐싱 전략

| 데이터 | 캐시 키 | TTL |
|--------|---------|-----|
| 세대별 피드 | `feed:{generation}` | 6시간 |
| 키워드 목록 | `keywords:{generation}` | 24시간 |
| 영상 검색 결과 | `videos:{keyword}:{generation}` | 6시간 |

**규칙**
- YouTube API 할당량 보호를 위해 캐시 미스 시에만 API 호출
- 스케줄러 실행 완료 후 관련 캐시 전체 무효화
- Gemini API는 스케줄러에서만 호출, 유저 요청 시 절대 호출 금지

---

## 스케줄러 명세

```kotlin
// 기본값: 매주 월요일 오전 3시, Asia/Seoul 기준
@Scheduled(
    cron = "\${app.crawling-scheduler.cron:0 0 3 * * MON}",
    zone = "\${app.crawling-scheduler.zone:Asia/Seoul}",
)
fun crawlTrends() {
    // 1. YouTube 현재 인기 영상에서 후보 키워드 수집
    // 2. 네이버 DataLab에서 후보 키워드의 연령대별 관심도 검증
    // 3. keywords 테이블 current_rank, trend_score, rank_trend 갱신
    // 4. 신규/변경 키워드에 대해서만 Gemini API 호출 → 설명 생성 후 keywords.explain 저장
    // 5. 영상은 trend_videos, 피드 편성은 trend_feed_items, 영상 보조 키워드는 trend_video_keywords 저장
    // 6. 관련 키워드는 keyword_relations 저장
    // 7. trend_logs에 순위/점수 스냅샷 저장
    // 8. Redis 캐시 무효화
}
```

### 스케줄러 설정

- 운영 기본 실행 시간은 `APP_CRAWLING_SCHEDULER_CRON`으로 조정하고, 기본값은 `0 0 3 * * MON`이다.
- 실행 시간대는 `APP_CRAWLING_SCHEDULER_ZONE`으로 조정하고, 기본값은 `Asia/Seoul`이다.
- `APP_CRAWLING_SCHEDULER_ENABLED=false`이면 스케줄러 메서드는 실행되더라도 실제 후보 수집/저장 작업을 수행하지 않는다.
- `APP_CRAWLING_SCHEDULER_RUN_ON_STARTUP=true`이면 애플리케이션 시작 시 `TrendCrawlingStartupRunner`가 `crawlTrends()`를 1회 호출한다.
- `application.yml`은 운영 기본값 기준으로 스케줄러를 활성화하고, `application-local.yml`, `application-test.yml`은 API 할당량과 테스트 안정성을 위해 비활성화한다.
- 후보 수집은 스케줄러 실행 단위에서 1회만 수행하고, 동일 후보군을 `TEEN`, `TWENTY` 세대별 네이버 DataLab 점수화에 재사용한다.
- 스케줄러는 `TEEN`, `TWENTY` 세대를 독립적으로 처리한다. 한 세대 처리 실패가 다른 세대 저장을 막지 않도록 세대별로 예외를 분리한다.
- 후보 수집 실패나 후보 없음은 모든 세대의 `trend_crawl_runs`를 `FAILED`로 남긴다.
- 네이버 DataLab 점수화 실패나 점수화 결과 없음은 해당 세대의 `trend_crawl_runs`를 `FAILED`로 남기고, 다른 세대 처리는 계속 진행한다.

### 크롤링 저장 파이프라인

- 외부 API 응답을 Entity에 직접 저장하지 않는다.
- 외부 API 호출/콜백 이력은 `external_api_logs`에 저장한다. `direction`은 우리 서버가 외부로 호출하면 `OUTBOUND`, 외부 서비스가 우리 서버로 호출하면 `INBOUND`로 기록한다.
- 외부 API 로그는 `@RecordExternalApiLog` 어노테이션과 AOP로 기록한다. 새 외부 API 로그 대상은 수동 저장 코드를 흩뿌리지 말고 어노테이션을 우선 사용한다.
- 외부 API 로그 저장 실패는 실제 크롤링/외부 API 호출 흐름을 실패시키지 않는다.
- `request_body`, `response_body`, `error_message`는 저장 전에 API key, token, Authorization, client secret 값을 마스킹하고 내부 안전장치로 길이를 제한한다.
- 외부 API 로그는 기능 요구사항으로 보고 항상 저장한다. 설정값으로 임의 비활성화하지 않는다.
- YouTube, 네이버 DataLab, Gemini 결과는 먼저 후보 DTO와 `CollectedTrendBatch` 하위 수집 DTO로 정규화한다.
- `CollectedTrendBatch` 검증은 크롤링 회차 생성 및 Gemini 호출 전에 먼저 수행한다. 검증에는 feed 중복뿐 아니라 `feedItems`, `videoKeywords`, `keywordRelations`가 batch 내부의 `keywords`, `videos`를 올바르게 참조하는지도 포함한다. 저장 서비스 내부에서도 방어적으로 동일 검증을 유지할 수 있다.
- Google Trends는 MVP 크롤링 파이프라인에서 제외한다. 공식 API는 Alpha 단계이고 비공식 크롤링은 운영 안정성이 낮으므로 도입하지 않는다.
- 후보 키워드 발견은 `TrendCandidateSource` 인터페이스 뒤에 두고, 기본 구현은 `YoutubePopularVideoCandidateSource`를 사용한다.
- `YoutubePopularVideoCandidateSource`는 YouTube 인기 영상 메타데이터를 `GeminiKeywordCandidateExtractor`에 전달해 구조화된 후보 키워드 JSON을 얻는다.
- 후보 추출용 Gemini 호출은 키워드 발견 용도만 담당한다. 세대별 트렌드 여부와 순위는 네이버 DataLab 검증 이후 확정한다.
- 후보 추출용 Gemini output token 설정은 설명 생성용 output token 설정과 분리한다.
- 크롤링은 주 1회 새벽 스케줄 실행이므로 Gemini 기본 read timeout은 60초로 넉넉하게 둔다.
- 단순 단어 토큰 추출과 불용어 목록은 기본 후보 품질을 보장하기 어렵기 때문에 주 후보 추출 경로로 사용하지 않는다. `YoutubeVideoCandidateExtractor`는 Gemini 후보 추출 결과가 최소 후보 수보다 적을 때만 fallback으로 사용해 후보군을 보강한다.
- fallback 후보는 Gemini 후보 뒤에 붙이고, Gemini 후보와 같은 단어는 대소문자 무시 기준으로 제외한다. 병합 후 rank는 1부터 다시 부여한다.
- Gemini 후보 추출 결과는 `confidence`, 근거 영상 수, 조회수를 바탕으로 `TrendCandidate` 점수를 계산한다. 낮은 confidence와 빈 키워드는 제외한다. `evidenceVideoIds`는 점수 보조 신호이므로 누락되거나 입력 영상과 매칭되지 않아도 후보 자체를 버리지 않는다.
- 세대별 후보 검증은 네이버 DataLab Search Trend API로 수행하고, `TEEN`은 `ages=["2"]`, `TWENTY`는 `ages=["3","4"]`로 조회한다.
- `TrendCrawlRunRecorder`는 크롤링 실행 회차의 `RUNNING`, `COMPLETED`, `FAILED` 상태 전환만 담당한다.
- `TrendCrawlingService`는 정규화된 수집 DTO를 입력받아 크롤링 회차 생성, 최근 완료 회차/로그 조회, 설명 갱신 대상 판정, Gemini 호출, 저장 서비스 호출을 오케스트레이션한다.
- `TrendCrawlingPersistenceService`는 DB 저장만 담당하며 `@Transactional` 범위 안에서 `keywords` upsert → `trend_logs` insert → `trend_videos` upsert → 기존 활성 `trend_feed_items` 비활성화 → 새 `trend_feed_items` insert → `trend_video_keywords` upsert → `keyword_relations` upsert 순서로 처리한다.
- `trend_crawl_runs`는 세대별 크롤링 실행 회차와 상태를 기록하고, `trend_logs.crawl_run_id`는 해당 로그가 생성된 회차를 가리킨다. 외래키 제약은 두지 않고 id 기반으로 관리한다.
- `trend_feed_items`는 현재 피드에 노출할 대표 키워드와 섹션/정렬/배지 정보를 가진다.
- `trend_video_keywords`는 대표 피드 편성과 별개로, 영상 상세나 관련 키워드 탐색에 사용할 보조 키워드 연결만 가진다.
- 현재 `TrendCrawlingBatchAssembler`는 keyword relation 생성 정책이 없으므로 `keywordRelations`를 `emptyList()`로 둔다. 임의 관계를 만들지 않는다.
- 향후 같은 영상에 함께 연결된 키워드, 제목/설명 동시 등장, 검색 트렌드 동행성 등을 기준으로 `KeywordRelationCollector`를 추가한 뒤 `keywordRelations`를 채운다.
- Gemini 설명 생성은 유저 요청 경로에서 호출하지 않고, `TrendCrawlingService`의 persistence 트랜잭션 밖에서만 수행한다.
- Gemini 호출 대상은 신규 키워드, 기존 설명 없음, 최근 완료 회차 기준 2주 연속 최초 달성, 장기 지속 기준 달성, 재진입, 급상승 이벤트가 발생한 키워드로 제한한다.
- 재진입은 직전 완료 회차에는 없고 과거 완료된 crawl run의 ranked `trend_logs`에는 등장한 키워드로 판정한다. 과거 등장 여부는 최근 회차 조회 범위에만 의존하지 않으며, 실패 회차나 `crawl_run_id=0` 보정 로그는 재진입 근거로 사용하지 않는다.
- Gemini 생성 실패 또는 빈 응답은 해당 키워드 설명만 스킵하고, 기존 설명은 덮어쓰지 않는다.
- 수집 저장이 끝나면 `keywords`, `feed` 캐시를 무효화한다.
- local seed 초기화는 확인용 실행 이력을 깔끔하게 보기 위해 `trend_logs`와 `trend_crawl_runs`를 함께 정리한 뒤 다시 저장한다.
- `TrendCrawlingScheduler`는 후보 수집 → 네이버 DataLab 점수화 → 배치 조립 → `TrendCrawlingService.saveCollectedTrends` 저장 흐름만 연결한다.

---

## 제약사항

1. **YouTube API 할당량**: 일 10,000 유닛 엄수. 검색 1회 = 100 유닛. 인기 영상 조회와 검색 호출 수를 스케줄러 단위로 제한
2. **Gemini API**: 스케줄러에서만 호출. 유저 요청 경로에서 호출 절대 금지
3. **네이버 DataLab**: YouTube 후보 키워드의 세대별 검증/점수화에 사용. 키워드 발견 소스로 단독 사용하지 않음
4. **Google Trends 제외**: MVP에서는 공식 Alpha API와 비공식 크롤링을 모두 사용하지 않음
5. **인증 없음**: MVP에서 사용자 인증 구현하지 않음. 모든 API 퍼블릭

---

## 코드 컨벤션

- Kotlin 공식 코딩 컨벤션 준수
- 모든 외부 API 호출은 `client` 패키지에서만 담당
- 트랜잭션은 서비스 레이어에서 관리
- 예외는 커스텀 Exception 클래스로 처리
- API 응답은 공통 ResponseWrapper 사용
- API 문서는 springdoc-openapi 기반 Swagger UI(`/swagger-ui/index.html`)와 OpenAPI JSON(`/v3/api-docs`)으로 제공
- 테스트: 서비스 레이어 단위 테스트 필수, 컨트롤러 통합 테스트

---

## 개발 체크리스트

```
Week 1-2: 백엔드 기반
  [ ] Spring Boot + Kotlin 프로젝트 세팅
  [x] Flyway 마이그레이션 스크립트 작성 (keywords, keyword_relations, trend_videos, trend_feed_items, trend_video_keywords, trend_logs)
  [x] Redis 연동 및 캐싱 유틸 구현
  [x] YoutubeApiClient 구현 (검색, 영상 상세, 채널 정보)
  [x] FeedService + FeedController 구현 (/api/feed)

Week 3: 크롤링 스케줄러
  [x] 수집 DTO + TrendCrawlingService 저장 파이프라인 구현
  [x] YouTube 인기 영상 기반 후보 키워드 수집 구조 구현
  [x] Gemini 기반 후보 키워드 추출 구현
  [x] NaverDataLabClient 구현 (공식 API)
  [x] NaverDataLabTrendScorer 구현 (세대별 후보 점수화)
  [x] 점수화 키워드 기반 YouTube 영상 보강 + 수집 배치 조립
  [x] GeminiApiClient 구현 (설명 생성)
  [ ] KeywordRelationCollector 구현 및 TrendCrawlingBatchAssembler 연결
  [x] TrendCrawlingScheduler 구현
  [ ] 초기 시드 키워드 SQL 작성 (10대/20대 각 50개)

Week 4: 키워드 API
  [x] KeywordService + KeywordController 구현 (/api/keywords)
  [ ] KeywordService 상세 조회 구현 (/api/keywords/{id}/explain)
  [ ] Oracle Cloud 배포 설정
```
