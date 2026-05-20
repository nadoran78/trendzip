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
- `test` profile은 빠른 테스트를 위해 H2 인메모리 DB와 simple cache를 사용한다.
- PostgreSQL 데이터를 초기화해야 할 때만 `docker compose down -v`를 사용한다. 이 명령은 DB volume도 삭제한다.

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
- JPA Entity 간 `@ManyToOne`, `@OneToMany`, `@OneToOne`, `@ManyToMany` 연관관계는 사용하지 않는다.
- DB foreign key constraint는 생성하지 않는다. 참조 관계는 `keyword_id` 같은 ID 컬럼과 인덱스로 관리한다.
- 연관 데이터 조회는 query layer에서 ID 기반 명시적 join으로 처리한다.
- API 응답이나 조회 전용 모델에 JPA Entity를 직접 반환하지 않는다.
- jOOQ generated source는 `build/generated-src/jooq/main` 아래에 생성하며 커밋하지 않는다.
- clean checkout 또는 `./gradlew clean` 이후에는 `docker compose up -d` 후 `cd backend && ./gradlew prepareJooq build`로 검증한다.
- `prepareJooq`는 Flyway migration을 로컬 PostgreSQL에 적용한 뒤 jOOQ codegen을 실행한다.
- DB schema 변경 시 관련 Flyway migration과 `backend/sql` 스냅샷을 갱신하고 `./gradlew prepareJooq`를 다시 실행한다.

---

## 패키지 구조

```
com.mztrend
├── controller
│   ├── FeedController
│   ├── KeywordController
│   └── TrendController
├── service
│   ├── FeedService
│   ├── KeywordService
│   └── CrawlingService
├── repository
│   ├── command
│   │   ├── KeywordRepository
│   │   ├── KeywordRelatedTermRepository
│   │   ├── TrendFeedRepository
│   │   └── TrendLogRepository
│   └── query
│       ├── KeywordQueryRepository
│       └── dto
│           └── KeywordSummaryQueryResult
├── domain
│   ├── Keyword
│   ├── KeywordRelatedTerm
│   ├── RankTrend
│   ├── TrendFeed
│   ├── Generation (enum: TEEN, TWENTY)
│   └── TrendLog
├── client
│   ├── YoutubeApiClient
│   ├── GoogleTrendsClient
│   ├── NaverDataLabClient
│   └── GeminiApiClient
├── scheduler
│   └── TrendCrawlingScheduler
└── config
    ├── RedisConfig
    └── SchedulerConfig
```

---

## DB 스키마

```sql
CREATE TABLE keywords (
    id             BIGSERIAL PRIMARY KEY,
    word           VARCHAR(100) NOT NULL,
    generation     VARCHAR(10) NOT NULL,   -- 'TEEN' | 'TWENTY'
    category       VARCHAR(50),
    current_rank   INT,
    trend_score    BIGINT,
    rank_trend     VARCHAR(10),            -- 'UP' | 'DOWN' | 'NEW' | 'SAME'
    rank_delta     INT,
    explain        TEXT,
    explained_at   TIMESTAMP,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE keyword_related_terms (
    id             BIGSERIAL PRIMARY KEY,
    keyword_id     BIGINT NOT NULL,
    term           VARCHAR(100) NOT NULL,
    display_order  INT DEFAULT 0,
    score          INT,
    source         VARCHAR(30),
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trend_feeds (
    id                         BIGSERIAL PRIMARY KEY,
    keyword_id                 BIGINT NOT NULL,
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
    tags                       TEXT[],
    badge                      VARCHAR(30),
    feed_section               VARCHAR(30),
    display_order              INT DEFAULT 0,
    collected_at               TIMESTAMP DEFAULT NOW(),
    created_at                 TIMESTAMP DEFAULT NOW(),
    updated_at                 TIMESTAMP DEFAULT NOW()
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
// 매주 월요일 오전 3시 실행
@Scheduled(cron = "0 0 3 * * MON")
fun crawlAndUpdateKeywords() {
    // 1. Google Trends + 네이버 DataLab에서 연령대별 급상승 키워드 수집
    // 2. keywords 테이블 current_rank, trend_score, rank_trend 갱신
    // 3. 신규/변경 키워드에 대해서만 Gemini API 호출 → 설명 생성 후 keywords.explain 저장
    // 4. 관련어는 keyword_related_terms, 연결 영상은 trend_feeds 저장
    // 5. trend_logs에 순위/점수 스냅샷 저장
    // 6. Redis 캐시 무효화
}
```

---

## 제약사항

1. **YouTube API 할당량**: 일 10,000 유닛 엄수. 검색 1회 = 100 유닛. Redis 캐싱 없이 절대 호출 금지
2. **Gemini API**: 스케줄러에서만 호출. 유저 요청 경로에서 호출 절대 금지
3. **Google Trends**: 비공식 API이므로 요청 간격 최소 1초 이상 유지
4. **인증 없음**: MVP에서 사용자 인증 구현하지 않음. 모든 API 퍼블릭

---

## 코드 컨벤션

- Kotlin 공식 코딩 컨벤션 준수
- 모든 외부 API 호출은 `client` 패키지에서만 담당
- 트랜잭션은 서비스 레이어에서 관리
- 예외는 커스텀 Exception 클래스로 처리
- API 응답은 공통 ResponseWrapper 사용
- 테스트: 서비스 레이어 단위 테스트 필수, 컨트롤러 통합 테스트

---

## 개발 체크리스트

```
Week 1-2: 백엔드 기반
  [ ] Spring Boot + Kotlin 프로젝트 세팅
  [ ] Flyway 마이그레이션 스크립트 작성 (keywords, keyword_related_terms, trend_feeds, trend_logs)
  [ ] Redis 연동 및 캐싱 유틸 구현
  [ ] YoutubeApiClient 구현 (검색, 채널 정보)
  [ ] FeedService + FeedController 구현 (/api/feed)

Week 3: 크롤링 스케줄러
  [ ] GoogleTrendsClient 구현 (비공식 API, 요청 간격 준수)
  [ ] NaverDataLabClient 구현 (공식 API)
  [ ] GeminiApiClient 구현 (설명 생성)
  [ ] TrendCrawlingScheduler 구현
  [ ] 초기 시드 키워드 SQL 작성 (10대/20대 각 50개)

Week 4: 키워드 API
  [ ] KeywordService + KeywordController 구현 (/api/keywords)
  [ ] KeywordService 상세 조회 구현 (/api/keywords/{id}/explain)
  [ ] Oracle Cloud 배포 설정
```
