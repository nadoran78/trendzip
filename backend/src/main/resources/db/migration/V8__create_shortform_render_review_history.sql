CREATE TABLE shortform_render_artifacts (
    id                    BIGSERIAL PRIMARY KEY,
    shortform_content_id  BIGINT NOT NULL,
    content_hash          VARCHAR(64) NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
    artifact_hash         VARCHAR(64) NOT NULL CHECK (artifact_hash ~ '^[0-9a-f]{64}$'),
    source_manifest_hash  VARCHAR(64) NOT NULL CHECK (source_manifest_hash ~ '^[0-9a-f]{64}$'),
    audio_manifest_hash   VARCHAR(64) NOT NULL CHECK (audio_manifest_hash ~ '^[0-9a-f]{64}$'),
    render_props_hash     VARCHAR(64) NOT NULL CHECK (render_props_hash ~ '^[0-9a-f]{64}$'),
    video_hash            VARCHAR(64) NOT NULL CHECK (video_hash ~ '^[0-9a-f]{64}$'),
    tts_model             VARCHAR(100) NOT NULL,
    tts_voice             VARCHAR(100) NOT NULL,
    duration_millis       BIGINT NOT NULL CHECK (duration_millis > 0),
    width                 INT NOT NULL CHECK (width > 0),
    height                INT NOT NULL CHECK (height > 0),
    fps                   INT NOT NULL CHECK (fps > 0),
    video_codec           VARCHAR(30) NOT NULL,
    audio_codec           VARCHAR(30) NOT NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_shortform_render_artifacts_artifact_hash
    ON shortform_render_artifacts (artifact_hash);

CREATE INDEX idx_shortform_render_artifacts_content_created_at
    ON shortform_render_artifacts (shortform_content_id, created_at DESC, id DESC);

CREATE TABLE shortform_review_decisions (
    id                    BIGSERIAL PRIMARY KEY,
    shortform_content_id  BIGINT NOT NULL,
    render_artifact_id    BIGINT NOT NULL,
    decision              VARCHAR(30) NOT NULL CHECK (
        decision IN ('APPROVED', 'NEEDS_REVISION', 'REJECTED')
    ),
    reviewer              VARCHAR(100) NOT NULL,
    reason                TEXT NOT NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_shortform_review_decisions_artifact
    ON shortform_review_decisions (render_artifact_id);

CREATE INDEX idx_shortform_review_decisions_content_created_at
    ON shortform_review_decisions (shortform_content_id, created_at DESC, id DESC);

COMMENT ON TABLE shortform_render_artifacts IS '운영 숏폼 렌더 결과와 입력 hash 및 출력 규격 이력';
COMMENT ON COLUMN shortform_render_artifacts.shortform_content_id IS '렌더 대상 숏폼 제작 이력 ID';
COMMENT ON COLUMN shortform_render_artifacts.content_hash IS '렌더 대상 초안의 콘텐츠 hash';
COMMENT ON COLUMN shortform_render_artifacts.artifact_hash IS '렌더 입력과 출력 메타데이터를 결합한 아티팩트 식별 hash';
COMMENT ON COLUMN shortform_render_artifacts.source_manifest_hash IS '운영 초안 manifest 파일 hash';
COMMENT ON COLUMN shortform_render_artifacts.audio_manifest_hash IS 'TTS audio manifest 파일 hash';
COMMENT ON COLUMN shortform_render_artifacts.render_props_hash IS 'Remotion 입력 props 파일 hash';
COMMENT ON COLUMN shortform_render_artifacts.video_hash IS '최종 MP4 파일 hash';
COMMENT ON COLUMN shortform_render_artifacts.tts_model IS 'TTS 생성 모델';
COMMENT ON COLUMN shortform_render_artifacts.tts_voice IS 'TTS 음성';
COMMENT ON COLUMN shortform_render_artifacts.duration_millis IS '최종 영상 길이 밀리초';
COMMENT ON COLUMN shortform_render_artifacts.created_at IS '렌더 아티팩트 등록 시각';

COMMENT ON TABLE shortform_review_decisions IS '렌더 아티팩트에 대한 사람 승인·수정 요청·반려 이력';
COMMENT ON COLUMN shortform_review_decisions.shortform_content_id IS '검수 대상 숏폼 제작 이력 ID';
COMMENT ON COLUMN shortform_review_decisions.render_artifact_id IS '검수한 렌더 아티팩트 ID';
COMMENT ON COLUMN shortform_review_decisions.decision IS '사람 검수 결정';
COMMENT ON COLUMN shortform_review_decisions.reviewer IS '검수자 식별명';
COMMENT ON COLUMN shortform_review_decisions.reason IS '검수 결정 사유';
COMMENT ON COLUMN shortform_review_decisions.created_at IS '검수 결정 시각';
