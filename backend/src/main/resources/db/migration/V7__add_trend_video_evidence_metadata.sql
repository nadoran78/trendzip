ALTER TABLE trend_videos
    ADD COLUMN description TEXT,
    ADD COLUMN tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN trend_videos.description IS 'YouTube 영상 설명';
COMMENT ON COLUMN trend_videos.tags IS 'YouTube 영상 태그 목록';
