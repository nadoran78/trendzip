CREATE TABLE shortform_contents (
    id                    BIGSERIAL PRIMARY KEY,
    platform              VARCHAR(20) NOT NULL CHECK (platform IN ('YOUTUBE')),
    external_content_id   VARCHAR(100),
    status                VARCHAR(30) NOT NULL,
    primary_keyword_id    BIGINT NOT NULL,
    primary_keyword_word  VARCHAR(100) NOT NULL,
    source_generation     VARCHAR(10) NOT NULL CHECK (source_generation IN ('TEEN', 'TWENTY', 'BOTH')),
    editorial_format      VARCHAR(40) NOT NULL,
    topic_key             VARCHAR(200) NOT NULL,
    event_key             VARCHAR(200) NOT NULL,
    audience_angle        VARCHAR(500) NOT NULL,
    selection_reason      TEXT NOT NULL,
    title                 VARCHAR(100) NOT NULL,
    content_hash          VARCHAR(64) NOT NULL,
    source_crawl_run_id   BIGINT NOT NULL,
    selected_at           TIMESTAMP NOT NULL,
    rendered_at           TIMESTAMP,
    uploaded_at           TIMESTAMP,
    published_at          TIMESTAMP,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shortform_content_keyword_snapshots (
    id                    BIGSERIAL PRIMARY KEY,
    shortform_content_id  BIGINT NOT NULL,
    keyword_id            BIGINT NOT NULL,
    keyword_word          VARCHAR(100) NOT NULL,
    role                  VARCHAR(10) NOT NULL CHECK (role IN ('PRIMARY', 'RELATED')),
    display_order         INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shortform_render_artifacts (
    id                    BIGSERIAL PRIMARY KEY,
    shortform_content_id  BIGINT NOT NULL,
    content_hash          VARCHAR(64) NOT NULL,
    artifact_hash         VARCHAR(64) NOT NULL,
    source_manifest_hash  VARCHAR(64) NOT NULL,
    audio_manifest_hash   VARCHAR(64) NOT NULL,
    render_props_hash     VARCHAR(64) NOT NULL,
    video_hash            VARCHAR(64) NOT NULL,
    tts_model             VARCHAR(100) NOT NULL,
    tts_voice             VARCHAR(100) NOT NULL,
    duration_millis       BIGINT NOT NULL,
    width                 INT NOT NULL,
    height                INT NOT NULL,
    fps                   INT NOT NULL,
    video_codec           VARCHAR(30) NOT NULL,
    audio_codec           VARCHAR(30) NOT NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shortform_review_decisions (
    id                    BIGSERIAL PRIMARY KEY,
    shortform_content_id  BIGINT NOT NULL,
    render_artifact_id    BIGINT NOT NULL,
    decision              VARCHAR(30) NOT NULL,
    reviewer              VARCHAR(100) NOT NULL,
    reason                TEXT NOT NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 실제 CHECK, UNIQUE, partial index와 COMMENT 정의는 Flyway V6·V8 migration을 기준으로 확인한다.
