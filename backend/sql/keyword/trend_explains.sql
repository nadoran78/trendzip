-- Keyword domain: trend explanations for keywords.
-- Snapshot of the schema defined by Flyway migrations.
-- Do not apply this file directly to production.

CREATE TABLE IF NOT EXISTS trend_explains (
    id           BIGSERIAL PRIMARY KEY,
    keyword_id   BIGINT NOT NULL,
    explain      TEXT NOT NULL,
    source_urls  TEXT ARRAY,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trend_explains_keyword_id
    ON trend_explains (keyword_id);
