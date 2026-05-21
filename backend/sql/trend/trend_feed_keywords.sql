-- Trend domain: mapping between YouTube feed items and trend keywords.
-- Snapshot of the schema defined by Flyway migrations.
-- Do not apply this file directly to production.

CREATE TABLE IF NOT EXISTS trend_feed_keywords (
    id              BIGSERIAL PRIMARY KEY,
    trend_feed_id   BIGINT NOT NULL,
    keyword_id      BIGINT NOT NULL,
    relation_type   VARCHAR(20) NOT NULL CHECK (relation_type IN ('PRIMARY', 'TAG', 'RELATED')),
    feed_section    VARCHAR(30) CHECK (feed_section IN ('TODAY_PICK', 'RISING', 'RELATED')),
    display_order   INT NOT NULL DEFAULT 0,
    score           INT,
    source          VARCHAR(30),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_trend_feed_keywords_feed_keyword
    ON trend_feed_keywords (trend_feed_id, keyword_id);

CREATE INDEX IF NOT EXISTS idx_trend_feed_keywords_keyword_section_order
    ON trend_feed_keywords (keyword_id, feed_section, display_order);

CREATE INDEX IF NOT EXISTS idx_trend_feed_keywords_feed
    ON trend_feed_keywords (trend_feed_id);

COMMENT ON COLUMN trend_feed_keywords.id IS '피드-키워드 매핑 고유 ID';
COMMENT ON COLUMN trend_feed_keywords.trend_feed_id IS '연결된 피드 영상 ID';
COMMENT ON COLUMN trend_feed_keywords.keyword_id IS '연결된 키워드 ID';
COMMENT ON COLUMN trend_feed_keywords.relation_type IS '영상과 키워드의 연결 유형(PRIMARY, TAG, RELATED)';
COMMENT ON COLUMN trend_feed_keywords.feed_section IS '피드 노출 섹션(TODAY_PICK, RISING, RELATED)';
COMMENT ON COLUMN trend_feed_keywords.display_order IS '같은 키워드와 섹션 안에서의 영상 표시 순서';
COMMENT ON COLUMN trend_feed_keywords.score IS '영상과 키워드의 관련도 또는 수집 기준 점수';
COMMENT ON COLUMN trend_feed_keywords.source IS '매핑 수집 출처 또는 생성 방식';
COMMENT ON COLUMN trend_feed_keywords.created_at IS '레코드 생성 시각';
