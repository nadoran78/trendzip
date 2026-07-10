ALTER TABLE keyword_relations
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE keyword_relations
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE keyword_relations
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;

DROP INDEX IF EXISTS uk_keyword_relations_keyword_related;

CREATE UNIQUE INDEX IF NOT EXISTS uk_keyword_relations_active_keyword_related
    ON keyword_relations (keyword_id, related_keyword_id)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_keyword_relations_keyword_active_display_order
    ON keyword_relations (keyword_id, is_active, display_order);

COMMENT ON COLUMN keyword_relations.is_active IS '현재 관련 키워드로 노출되는 활성 관계 여부';
COMMENT ON COLUMN keyword_relations.updated_at IS '레코드 마지막 수정 시각';
COMMENT ON COLUMN keyword_relations.deactivated_at IS '관련 키워드 관계가 비활성화된 시각';
