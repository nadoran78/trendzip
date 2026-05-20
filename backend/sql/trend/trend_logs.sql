-- Trend domain: keyword trend log table.
-- Snapshot of the schema defined by Flyway migrations.
-- Do not apply this file directly to production.

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
