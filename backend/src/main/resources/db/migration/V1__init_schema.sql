CREATE TABLE IF NOT EXISTS keywords (
    id          BIGSERIAL PRIMARY KEY,
    word        VARCHAR(100) NOT NULL,
    generation  VARCHAR(10) NOT NULL,
    category    VARCHAR(50),
    rank        INT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_keywords_generation_word
    ON keywords (generation, word);

CREATE INDEX IF NOT EXISTS idx_keywords_generation_rank
    ON keywords (generation, rank);

CREATE TABLE IF NOT EXISTS trend_explains (
    id           BIGSERIAL PRIMARY KEY,
    keyword_id   BIGINT NOT NULL,
    explain      TEXT NOT NULL,
    source_urls  TEXT ARRAY,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trend_explains_keyword_id
    ON trend_explains (keyword_id);

CREATE TABLE IF NOT EXISTS trend_logs (
    id          BIGSERIAL PRIMARY KEY,
    keyword_id  BIGINT NOT NULL,
    score       INT,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trend_logs_keyword_recorded_at
    ON trend_logs (keyword_id, recorded_at);
