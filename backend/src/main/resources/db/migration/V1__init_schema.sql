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

CREATE TABLE IF NOT EXISTS keyword_relations (
    id                  BIGSERIAL PRIMARY KEY,
    keyword_id          BIGINT NOT NULL,
    related_keyword_id  BIGINT NOT NULL,
    display_order       INT NOT NULL DEFAULT 0,
    score               INT,
    source              VARCHAR(30),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_keyword_relations_not_self CHECK (keyword_id <> related_keyword_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_keyword_relations_keyword_related
    ON keyword_relations (keyword_id, related_keyword_id);

CREATE INDEX IF NOT EXISTS idx_keyword_relations_keyword_display_order
    ON keyword_relations (keyword_id, display_order);

CREATE INDEX IF NOT EXISTS idx_keyword_relations_related_keyword
    ON keyword_relations (related_keyword_id);

COMMENT ON COLUMN keyword_relations.id IS '키워드 관계 고유 ID';
COMMENT ON COLUMN keyword_relations.keyword_id IS '기준 키워드 ID';
COMMENT ON COLUMN keyword_relations.related_keyword_id IS '연결된 관련 키워드 ID';
COMMENT ON COLUMN keyword_relations.display_order IS '관련 키워드 표시 순서';
COMMENT ON COLUMN keyword_relations.score IS '관련도 또는 수집 기준 점수';
COMMENT ON COLUMN keyword_relations.source IS '관계 수집 출처 또는 생성 방식';
COMMENT ON COLUMN keyword_relations.created_at IS '레코드 생성 시각';

CREATE TABLE IF NOT EXISTS trend_videos (
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
    collected_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_trend_videos_youtube_video
    ON trend_videos (youtube_video_id);

CREATE INDEX IF NOT EXISTS idx_trend_videos_published_at
    ON trend_videos (published_at);

CREATE INDEX IF NOT EXISTS idx_trend_videos_view_count
    ON trend_videos (view_count);

COMMENT ON COLUMN trend_videos.id IS '트렌드 영상 고유 ID';
COMMENT ON COLUMN trend_videos.youtube_video_id IS 'YouTube 영상 ID';
COMMENT ON COLUMN trend_videos.title IS '영상 제목';
COMMENT ON COLUMN trend_videos.channel_id IS 'YouTube 채널 ID';
COMMENT ON COLUMN trend_videos.channel_name IS '채널명';
COMMENT ON COLUMN trend_videos.channel_category IS '채널 또는 영상의 표시용 카테고리';
COMMENT ON COLUMN trend_videos.channel_subscriber_count IS '채널 구독자 수';
COMMENT ON COLUMN trend_videos.thumbnail_url IS '영상 썸네일 URL';
COMMENT ON COLUMN trend_videos.view_count IS '영상 조회수';
COMMENT ON COLUMN trend_videos.published_at IS '영상 게시 시각';
COMMENT ON COLUMN trend_videos.duration_seconds IS '영상 길이(초)';
COMMENT ON COLUMN trend_videos.collected_at IS '외부 API 또는 크롤러로 수집한 시각';
COMMENT ON COLUMN trend_videos.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN trend_videos.updated_at IS '레코드 마지막 수정 시각';

CREATE TABLE IF NOT EXISTS trend_feed_items (
    id                  BIGSERIAL PRIMARY KEY,
    generation          VARCHAR(10) NOT NULL CHECK (generation IN ('TEEN', 'TWENTY')),
    trend_video_id      BIGINT NOT NULL,
    primary_keyword_id  BIGINT NOT NULL,
    feed_section        VARCHAR(30) CHECK (feed_section IN ('TODAY_PICK', 'RISING', 'RELATED')),
    display_order       INT NOT NULL DEFAULT 0,
    score               INT,
    badge               VARCHAR(30),
    source              VARCHAR(30),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    collected_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_active_feed_item_generation_video
    ON trend_feed_items (generation, trend_video_id)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_trend_feed_items_generation_active_section_order
    ON trend_feed_items (generation, is_active, feed_section, display_order);

CREATE INDEX IF NOT EXISTS idx_trend_feed_items_video
    ON trend_feed_items (trend_video_id);

CREATE INDEX IF NOT EXISTS idx_trend_feed_items_primary_keyword
    ON trend_feed_items (primary_keyword_id);

COMMENT ON COLUMN trend_feed_items.id IS '피드 아이템 고유 ID';
COMMENT ON COLUMN trend_feed_items.generation IS '피드가 노출될 세대 구분값(TEEN, TWENTY)';
COMMENT ON COLUMN trend_feed_items.trend_video_id IS '피드에 노출할 트렌드 영상 ID';
COMMENT ON COLUMN trend_feed_items.primary_keyword_id IS '피드 카드 대표 키워드 ID';
COMMENT ON COLUMN trend_feed_items.feed_section IS '피드 노출 섹션(TODAY_PICK, RISING, RELATED)';
COMMENT ON COLUMN trend_feed_items.display_order IS '같은 세대와 섹션 안에서의 피드 표시 순서';
COMMENT ON COLUMN trend_feed_items.score IS '피드 편성 기준 점수';
COMMENT ON COLUMN trend_feed_items.badge IS 'HOT, NEW 등 화면 표시용 배지';
COMMENT ON COLUMN trend_feed_items.source IS '피드 편성 출처 또는 생성 방식';
COMMENT ON COLUMN trend_feed_items.is_active IS '현재 피드에 노출되는 활성 아이템 여부';
COMMENT ON COLUMN trend_feed_items.collected_at IS '피드 아이템을 수집 또는 편성한 시각';
COMMENT ON COLUMN trend_feed_items.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN trend_feed_items.updated_at IS '레코드 마지막 수정 시각';

CREATE TABLE IF NOT EXISTS trend_video_keywords (
    id              BIGSERIAL PRIMARY KEY,
    trend_video_id  BIGINT NOT NULL,
    keyword_id      BIGINT NOT NULL,
    relation_type   VARCHAR(20) NOT NULL CHECK (relation_type IN ('TAG', 'RELATED')),
    display_order   INT NOT NULL DEFAULT 0,
    score           INT,
    source          VARCHAR(30),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_trend_video_keywords_video_keyword
    ON trend_video_keywords (trend_video_id, keyword_id);

CREATE INDEX IF NOT EXISTS idx_trend_video_keywords_keyword_order
    ON trend_video_keywords (keyword_id, display_order);

CREATE INDEX IF NOT EXISTS idx_trend_video_keywords_video
    ON trend_video_keywords (trend_video_id);

COMMENT ON COLUMN trend_video_keywords.id IS '영상-키워드 매핑 고유 ID';
COMMENT ON COLUMN trend_video_keywords.trend_video_id IS '연결된 트렌드 영상 ID';
COMMENT ON COLUMN trend_video_keywords.keyword_id IS '연결된 키워드 ID';
COMMENT ON COLUMN trend_video_keywords.relation_type IS '영상과 키워드의 부가 연결 유형(TAG, RELATED)';
COMMENT ON COLUMN trend_video_keywords.display_order IS '같은 영상 안에서의 관련 키워드 표시 순서';
COMMENT ON COLUMN trend_video_keywords.score IS '영상과 키워드의 관련도 또는 수집 기준 점수';
COMMENT ON COLUMN trend_video_keywords.source IS '매핑 수집 출처 또는 생성 방식';
COMMENT ON COLUMN trend_video_keywords.created_at IS '레코드 생성 시각';

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
