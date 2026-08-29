CREATE TABLE IF NOT EXISTS trend_videos (
    id                         BIGSERIAL PRIMARY KEY,
    youtube_video_id           VARCHAR(50) NOT NULL,
    title                      VARCHAR(300) NOT NULL,
    description                TEXT,
    tags                       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
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
COMMENT ON COLUMN trend_videos.description IS 'YouTube 영상 설명';
COMMENT ON COLUMN trend_videos.tags IS 'YouTube 영상 태그 목록';
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
