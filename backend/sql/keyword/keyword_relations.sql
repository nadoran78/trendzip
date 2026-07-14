-- Keyword domain: related keyword links shown on keyword detail pages.
-- Snapshot of the schema defined by Flyway migrations.
-- Do not apply this file directly to production.

CREATE TABLE IF NOT EXISTS keyword_relations (
    id                  BIGSERIAL PRIMARY KEY,
    keyword_id          BIGINT NOT NULL,
    related_keyword_id  BIGINT NOT NULL,
    display_order       INT NOT NULL DEFAULT 0,
    score               INT,
    source              VARCHAR(30),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_keyword_relations_not_self CHECK (keyword_id <> related_keyword_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_keyword_relations_keyword_related
    ON keyword_relations (keyword_id, related_keyword_id);

CREATE INDEX IF NOT EXISTS idx_keyword_relations_keyword_display_order
    ON keyword_relations (keyword_id, display_order);

CREATE INDEX IF NOT EXISTS idx_keyword_relations_related_keyword
    ON keyword_relations (related_keyword_id);

COMMENT ON COLUMN keyword_relations.id IS '키워드 관계 고유 ID';
COMMENT ON COLUMN keyword_relations.keyword_id IS '기준 키워드 ID';
COMMENT ON COLUMN keyword_relations.related_keyword_id IS '연결된 관련 키워드 ID';
COMMENT ON COLUMN keyword_relations.display_order IS '관련 키워드 표시 순서';
COMMENT ON COLUMN keyword_relations.score IS '관련도 또는 수집 기준 점수';
COMMENT ON COLUMN keyword_relations.source IS '관계 수집 출처 또는 생성 방식';
COMMENT ON COLUMN keyword_relations.created_at IS '레코드 생성 시각';
