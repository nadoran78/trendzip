CREATE TABLE IF NOT EXISTS trend_feed_items (
    id                  BIGSERIAL PRIMARY KEY,
    generation          VARCHAR(10) NOT NULL CHECK (generation IN ('TEEN', 'TWENTY')),
    trend_video_id      BIGINT NOT NULL,
    primary_keyword_id  BIGINT NOT NULL,
    feed_section        VARCHAR(30) CHECK (feed_section IN ('TODAY_PICK', 'RISING', 'RELATED')),
    display_order       INT NOT NULL DEFAULT 0,
    score               INT,
    badge               VARCHAR(30),
    source              VARCHAR(30),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    collected_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_active_feed_item_generation_video
    ON trend_feed_items (generation, trend_video_id)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_trend_feed_items_generation_active_section_order
    ON trend_feed_items (generation, is_active, feed_section, display_order);

CREATE INDEX IF NOT EXISTS idx_trend_feed_items_video
    ON trend_feed_items (trend_video_id);

CREATE INDEX IF NOT EXISTS idx_trend_feed_items_primary_keyword
    ON trend_feed_items (primary_keyword_id);

COMMENT ON COLUMN trend_feed_items.id IS '피드 아이템 고유 ID';
COMMENT ON COLUMN trend_feed_items.generation IS '피드가 노출될 세대 구분값(TEEN, TWENTY)';
COMMENT ON COLUMN trend_feed_items.trend_video_id IS '피드에 노출할 트렌드 영상 ID';
COMMENT ON COLUMN trend_feed_items.primary_keyword_id IS '피드 카드 대표 키워드 ID';
COMMENT ON COLUMN trend_feed_items.feed_section IS '피드 노출 섹션(TODAY_PICK, RISING, RELATED)';
COMMENT ON COLUMN trend_feed_items.display_order IS '같은 세대와 섹션 안에서의 피드 표시 순서';
COMMENT ON COLUMN trend_feed_items.score IS '피드 편성 기준 점수';
COMMENT ON COLUMN trend_feed_items.badge IS 'HOT, NEW 등 화면 표시용 배지';
COMMENT ON COLUMN trend_feed_items.source IS '피드 편성 출처 또는 생성 방식';
COMMENT ON COLUMN trend_feed_items.is_active IS '현재 피드에 노출되는 활성 아이템 여부';
COMMENT ON COLUMN trend_feed_items.collected_at IS '피드 아이템을 수집 또는 편성한 시각';
COMMENT ON COLUMN trend_feed_items.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN trend_feed_items.updated_at IS '레코드 마지막 수정 시각';
