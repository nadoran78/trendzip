CREATE TABLE IF NOT EXISTS trend_crawl_runs (
    id           BIGSERIAL PRIMARY KEY,
    generation   VARCHAR(10) NOT NULL CHECK (generation IN ('TEEN', 'TWENTY')),
    status       VARCHAR(20) NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    started_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trend_crawl_runs_generation_status_started_at
    ON trend_crawl_runs (generation, status, started_at DESC);

ALTER TABLE trend_logs
    ADD COLUMN IF NOT EXISTS crawl_run_id BIGINT;

UPDATE trend_logs
SET crawl_run_id = 0
WHERE crawl_run_id IS NULL;

ALTER TABLE trend_logs
    ALTER COLUMN crawl_run_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trend_logs_crawl_run_keyword
    ON trend_logs (crawl_run_id, keyword_id);

COMMENT ON COLUMN trend_crawl_runs.id IS '크롤링 실행 회차 고유 ID';
COMMENT ON COLUMN trend_crawl_runs.generation IS '크롤링 대상 세대 구분값(TEEN, TWENTY)';
COMMENT ON COLUMN trend_crawl_runs.status IS '크롤링 실행 상태(RUNNING, COMPLETED, FAILED)';
COMMENT ON COLUMN trend_crawl_runs.started_at IS '크롤링 실행 시작 시각';
COMMENT ON COLUMN trend_crawl_runs.completed_at IS '크롤링 실행 완료 또는 실패 시각';
COMMENT ON COLUMN trend_crawl_runs.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN trend_crawl_runs.updated_at IS '레코드 마지막 수정 시각';
COMMENT ON COLUMN trend_logs.crawl_run_id IS '트렌드 기록이 생성된 크롤링 실행 회차 ID';
