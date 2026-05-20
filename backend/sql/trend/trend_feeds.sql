-- Trend domain: YouTube feed items connected to trend keywords.
-- Snapshot of the schema defined by Flyway migrations.
-- Do not apply this file directly to production.

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
