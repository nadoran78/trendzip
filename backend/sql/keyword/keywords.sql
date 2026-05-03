-- Keyword domain: keywords table.
-- Snapshot of the schema defined by Flyway migrations.
-- Do not apply this file directly to production.

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

