-- Keyword domain: keywords table.
-- Snapshot of the schema defined by Flyway migrations.
-- Do not apply this file directly to production.

CREATE TABLE IF NOT EXISTS keywords (
    id             BIGSERIAL PRIMARY KEY,
    word           VARCHAR(100) NOT NULL,
    generation     VARCHAR(10) NOT NULL CHECK (generation IN ('TEEN', 'TWENTY')),
    category       VARCHAR(50),
    current_rank   INT,
    trend_score    BIGINT,
    rank_trend     VARCHAR(10) CHECK (rank_trend IN ('UP', 'DOWN', 'NEW', 'SAME')),
    rank_delta     INT,
    explain        TEXT,
    explained_at   TIMESTAMP,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_keywords_generation_word
    ON keywords (generation, word);

CREATE INDEX IF NOT EXISTS idx_keywords_generation_current_rank
    ON keywords (generation, current_rank);

CREATE INDEX IF NOT EXISTS idx_keywords_generation_trend_score
    ON keywords (generation, trend_score);

COMMENT ON COLUMN keywords.id IS '키워드 고유 ID';
COMMENT ON COLUMN keywords.word IS '화면에 표시할 키워드 문구';
COMMENT ON COLUMN keywords.generation IS '키워드가 속한 세대 구분값(TEEN, TWENTY)';
COMMENT ON COLUMN keywords.category IS '키워드 카테고리(음악, 패션, 재테크 등)';
COMMENT ON COLUMN keywords.current_rank IS '현재 세대별 트렌드 순위';
COMMENT ON COLUMN keywords.trend_score IS '트렌드 강도를 비교하기 위한 점수';
COMMENT ON COLUMN keywords.rank_trend IS '이전 집계 대비 순위 흐름(UP, DOWN, NEW, SAME)';
COMMENT ON COLUMN keywords.rank_delta IS '이전 집계 대비 순위 변화 폭';
COMMENT ON COLUMN keywords.explain IS '키워드가 뜨는 이유에 대한 설명';
COMMENT ON COLUMN keywords.explained_at IS '설명이 생성되거나 갱신된 시각';
COMMENT ON COLUMN keywords.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN keywords.updated_at IS '레코드 마지막 수정 시각';
