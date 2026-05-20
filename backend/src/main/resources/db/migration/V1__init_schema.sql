CREATE TABLE IF NOT EXISTS keywords (
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
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_keywords_generation_word
    ON keywords (generation, word);

CREATE INDEX IF NOT EXISTS idx_keywords_generation_current_rank
    ON keywords (generation, current_rank);

CREATE INDEX IF NOT EXISTS idx_keywords_generation_trend_score
    ON keywords (generation, trend_score);

COMMENT ON COLUMN keywords.id IS '키워드 고유 ID';
COMMENT ON COLUMN keywords.word IS '화면에 표시할 키워드 문구';
COMMENT ON COLUMN keywords.generation IS '키워드가 속한 세대 구분값(TEEN, TWENTY)';
COMMENT ON COLUMN keywords.category IS '키워드 카테고리(음악, 패션, 재테크 등)';
COMMENT ON COLUMN keywords.current_rank IS '현재 세대별 트렌드 순위';
COMMENT ON COLUMN keywords.trend_score IS '트렌드 강도를 비교하기 위한 점수';
COMMENT ON COLUMN keywords.rank_trend IS '이전 집계 대비 순위 흐름(UP, DOWN, NEW, SAME)';
COMMENT ON COLUMN keywords.rank_delta IS '이전 집계 대비 순위 변화 폭';
COMMENT ON COLUMN keywords.explain IS '키워드가 뜨는 이유에 대한 설명';
COMMENT ON COLUMN keywords.explained_at IS '설명이 생성되거나 갱신된 시각';
COMMENT ON COLUMN keywords.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN keywords.updated_at IS '레코드 마지막 수정 시각';

CREATE TABLE IF NOT EXISTS keyword_related_terms (
    id             BIGSERIAL PRIMARY KEY,
    keyword_id     BIGINT NOT NULL,
    term           VARCHAR(100) NOT NULL,
    display_order  INT NOT NULL DEFAULT 0,
    score          INT,
    source         VARCHAR(30),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_keyword_related_terms_keyword_term
    ON keyword_related_terms (keyword_id, term);

CREATE INDEX IF NOT EXISTS idx_keyword_related_terms_keyword_display_order
    ON keyword_related_terms (keyword_id, display_order);

COMMENT ON COLUMN keyword_related_terms.id IS '관련어 고유 ID';
COMMENT ON COLUMN keyword_related_terms.keyword_id IS '관련어가 연결된 키워드 ID';
COMMENT ON COLUMN keyword_related_terms.term IS '화면에 표시할 관련 키워드 문구';
COMMENT ON COLUMN keyword_related_terms.display_order IS '관련어 표시 순서';
COMMENT ON COLUMN keyword_related_terms.score IS '관련도 또는 수집 기준 점수';
COMMENT ON COLUMN keyword_related_terms.source IS '관련어 수집 출처 또는 생성 방식';
COMMENT ON COLUMN keyword_related_terms.created_at IS '레코드 생성 시각';

CREATE TABLE IF NOT EXISTS trend_feeds (
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
    tags                       TEXT ARRAY,
    badge                      VARCHAR(30),
    feed_section               VARCHAR(30),
    display_order              INT NOT NULL DEFAULT 0,
    collected_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_trend_feeds_keyword_video
    ON trend_feeds (keyword_id, youtube_video_id);

CREATE INDEX IF NOT EXISTS idx_trend_feeds_keyword_display_order
    ON trend_feeds (keyword_id, display_order);

COMMENT ON COLUMN trend_feeds.id IS '피드 영상 고유 ID';
COMMENT ON COLUMN trend_feeds.keyword_id IS '영상이 연결된 키워드 ID';
COMMENT ON COLUMN trend_feeds.youtube_video_id IS 'YouTube 영상 ID';
COMMENT ON COLUMN trend_feeds.title IS '영상 제목';
COMMENT ON COLUMN trend_feeds.channel_id IS 'YouTube 채널 ID';
COMMENT ON COLUMN trend_feeds.channel_name IS '채널명';
COMMENT ON COLUMN trend_feeds.channel_category IS '채널 또는 영상의 표시용 카테고리';
COMMENT ON COLUMN trend_feeds.channel_subscriber_count IS '채널 구독자 수';
COMMENT ON COLUMN trend_feeds.thumbnail_url IS '영상 썸네일 URL';
COMMENT ON COLUMN trend_feeds.view_count IS '영상 조회수';
COMMENT ON COLUMN trend_feeds.published_at IS '영상 게시 시각';
COMMENT ON COLUMN trend_feeds.duration_seconds IS '영상 길이(초)';
COMMENT ON COLUMN trend_feeds.tags IS '피드 카드에 표시할 태그 목록';
COMMENT ON COLUMN trend_feeds.badge IS 'HOT, RISING 등 화면 표시용 배지';
COMMENT ON COLUMN trend_feeds.feed_section IS 'TODAY_PICK, RISING 등 피드 섹션 구분';
COMMENT ON COLUMN trend_feeds.display_order IS '같은 키워드 안에서의 영상 표시 순서';
COMMENT ON COLUMN trend_feeds.collected_at IS '외부 API 또는 크롤러로 수집한 시각';
COMMENT ON COLUMN trend_feeds.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN trend_feeds.updated_at IS '레코드 마지막 수정 시각';

CREATE TABLE IF NOT EXISTS trend_logs (
    id          BIGSERIAL PRIMARY KEY,
    keyword_id  BIGINT NOT NULL,
    rank        INT,
    score       BIGINT,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trend_logs_keyword_recorded_at
    ON trend_logs (keyword_id, recorded_at);

COMMENT ON COLUMN trend_logs.id IS '트렌드 기록 고유 ID';
COMMENT ON COLUMN trend_logs.keyword_id IS '기록 대상 키워드 ID';
COMMENT ON COLUMN trend_logs.rank IS '기록 시점의 트렌드 순위';
COMMENT ON COLUMN trend_logs.score IS '기록 시점의 트렌드 점수';
COMMENT ON COLUMN trend_logs.recorded_at IS '트렌드 점수와 순위를 기록한 시각';
