-- Keyword domain: related terms shown on keyword detail pages.
-- Snapshot of the schema defined by Flyway migrations.
-- Do not apply this file directly to production.

CREATE TABLE IF NOT EXISTS keyword_related_terms (
    id             BIGSERIAL PRIMARY KEY,
    keyword_id     BIGINT NOT NULL,
    term           VARCHAR(100) NOT NULL,
    display_order  INT NOT NULL DEFAULT 0,
    score          INT,
    source         VARCHAR(30),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_keyword_related_terms_keyword_term
    ON keyword_related_terms (keyword_id, term);

CREATE INDEX IF NOT EXISTS idx_keyword_related_terms_keyword_display_order
    ON keyword_related_terms (keyword_id, display_order);

COMMENT ON COLUMN keyword_related_terms.id IS '관련어 고유 ID';
COMMENT ON COLUMN keyword_related_terms.keyword_id IS '관련어가 연결된 키워드 ID';
COMMENT ON COLUMN keyword_related_terms.term IS '화면에 표시할 관련 키워드 문구';
COMMENT ON COLUMN keyword_related_terms.display_order IS '관련어 표시 순서';
COMMENT ON COLUMN keyword_related_terms.score IS '관련도 또는 수집 기준 점수';
COMMENT ON COLUMN keyword_related_terms.source IS '관련어 수집 출처 또는 생성 방식';
COMMENT ON COLUMN keyword_related_terms.created_at IS '레코드 생성 시각';
