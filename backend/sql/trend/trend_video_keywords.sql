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
