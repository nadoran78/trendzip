CREATE TABLE shortform_contents (
    id                    BIGSERIAL PRIMARY KEY,
    platform              VARCHAR(20) NOT NULL CHECK (platform IN ('YOUTUBE')),
    external_content_id   VARCHAR(100),
    status                VARCHAR(30) NOT NULL CHECK (
        status IN (
            'DRAFT',
            'RENDERED',
            'REVIEW_REQUIRED',
            'APPROVED',
            'UPLOADED_PRIVATE',
            'SCHEDULED',
            'PUBLISHED',
            'HOLD',
            'REJECTED',
            'NEEDS_REVISION',
            'RETIRED'
        )
    ),
    primary_keyword_id    BIGINT NOT NULL,
    primary_keyword_word  VARCHAR(100) NOT NULL,
    source_generation     VARCHAR(10) NOT NULL CHECK (source_generation IN ('TEEN', 'TWENTY', 'BOTH')),
    editorial_format      VARCHAR(40) NOT NULL CHECK (
        editorial_format IN (
            'WHY_NOW',
            'KEYWORD_PRIMER',
            'PERSON_WORK_RELATION',
            'EVENT_KEYWORD_MAP',
            'CONTEXT_TIMELINE',
            'WEEKLY_BUNDLE'
        )
    ),
    topic_key             VARCHAR(200) NOT NULL,
    event_key             VARCHAR(200) NOT NULL,
    audience_angle        VARCHAR(500) NOT NULL,
    selection_reason      TEXT NOT NULL,
    title                 VARCHAR(100) NOT NULL,
    content_hash          VARCHAR(64) NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
    source_crawl_run_id   BIGINT NOT NULL,
    selected_at           TIMESTAMP NOT NULL,
    rendered_at           TIMESTAMP,
    uploaded_at           TIMESTAMP,
    published_at          TIMESTAMP,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_shortform_contents_content_hash
    ON shortform_contents (content_hash);

CREATE UNIQUE INDEX uk_shortform_contents_active_event
    ON shortform_contents (platform, event_key)
    WHERE status NOT IN ('REJECTED', 'RETIRED');

CREATE UNIQUE INDEX uk_shortform_contents_external_content
    ON shortform_contents (platform, external_content_id)
    WHERE external_content_id IS NOT NULL;

CREATE INDEX idx_shortform_contents_status_selected_at
    ON shortform_contents (status, selected_at DESC);

CREATE INDEX idx_shortform_contents_topic_published_at
    ON shortform_contents (topic_key, published_at DESC);

CREATE TABLE shortform_content_keyword_snapshots (
    id                    BIGSERIAL PRIMARY KEY,
    shortform_content_id  BIGINT NOT NULL,
    keyword_id            BIGINT NOT NULL,
    keyword_word          VARCHAR(100) NOT NULL,
    role                  VARCHAR(10) NOT NULL CHECK (role IN ('PRIMARY', 'RELATED')),
    display_order         INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_shortform_content_keyword_snapshots_content_keyword_role
    ON shortform_content_keyword_snapshots (shortform_content_id, keyword_id, role);

CREATE UNIQUE INDEX uk_shortform_content_keyword_snapshots_primary
    ON shortform_content_keyword_snapshots (shortform_content_id)
    WHERE role = 'PRIMARY';

CREATE INDEX idx_shortform_content_keyword_snapshots_content_order
    ON shortform_content_keyword_snapshots (shortform_content_id, display_order);

COMMENT ON TABLE shortform_contents IS '숏폼 후보 선정부터 발행까지의 제작 이력 원장';
COMMENT ON COLUMN shortform_contents.platform IS '게시 플랫폼';
COMMENT ON COLUMN shortform_contents.external_content_id IS '게시 플랫폼이 발급한 콘텐츠 ID';
COMMENT ON COLUMN shortform_contents.status IS '숏폼 제작 및 발행 상태';
COMMENT ON COLUMN shortform_contents.primary_keyword_id IS '제작 당시 기준 키워드 ID';
COMMENT ON COLUMN shortform_contents.primary_keyword_word IS '제작 당시 기준 키워드 문구 스냅샷';
COMMENT ON COLUMN shortform_contents.source_generation IS '후보가 수집된 세대 범위';
COMMENT ON COLUMN shortform_contents.editorial_format IS '숏폼 내용을 구성하는 편집 형식';
COMMENT ON COLUMN shortform_contents.topic_key IS '30일 재발행 판정에 사용하는 정규화 주제 식별자';
COMMENT ON COLUMN shortform_contents.event_key IS '같은 사건의 중복 제작 판정 식별자';
COMMENT ON COLUMN shortform_contents.audience_angle IS '숏폼이 채택한 설명 관점';
COMMENT ON COLUMN shortform_contents.selection_reason IS '후보를 제작 대상으로 선정한 이유';
COMMENT ON COLUMN shortform_contents.title IS '게시 예정 제목';
COMMENT ON COLUMN shortform_contents.content_hash IS '입력과 편집 정체성으로 만든 중복 방지 해시';
COMMENT ON COLUMN shortform_contents.source_crawl_run_id IS '제작 근거가 된 크롤링 회차 ID';
COMMENT ON COLUMN shortform_contents.selected_at IS '후보가 제작 대상으로 예약된 시각';
COMMENT ON COLUMN shortform_contents.rendered_at IS '영상 렌더링 완료 시각';
COMMENT ON COLUMN shortform_contents.uploaded_at IS '비공개 업로드 완료 시각';
COMMENT ON COLUMN shortform_contents.published_at IS '공개 발행 시각';
COMMENT ON COLUMN shortform_contents.created_at IS '레코드 생성 시각';
COMMENT ON COLUMN shortform_contents.updated_at IS '레코드 마지막 수정 시각';

COMMENT ON TABLE shortform_content_keyword_snapshots IS '숏폼 제작 당시 기본 및 관련 키워드 스냅샷';
COMMENT ON COLUMN shortform_content_keyword_snapshots.shortform_content_id IS '숏폼 제작 이력 ID';
COMMENT ON COLUMN shortform_content_keyword_snapshots.keyword_id IS '제작 당시 키워드 ID';
COMMENT ON COLUMN shortform_content_keyword_snapshots.keyword_word IS '제작 당시 키워드 문구 스냅샷';
COMMENT ON COLUMN shortform_content_keyword_snapshots.role IS '기본 또는 관련 키워드 역할';
COMMENT ON COLUMN shortform_content_keyword_snapshots.display_order IS '같은 숏폼 안에서의 키워드 표시 순서';
COMMENT ON COLUMN shortform_content_keyword_snapshots.created_at IS '레코드 생성 시각';
