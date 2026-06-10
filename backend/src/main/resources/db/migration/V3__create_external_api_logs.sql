CREATE TABLE IF NOT EXISTS external_api_logs (
    id            BIGSERIAL PRIMARY KEY,
    direction     VARCHAR(20) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    provider      VARCHAR(30) NOT NULL CHECK (provider IN ('YOUTUBE', 'NAVER_DATALAB', 'GEMINI', 'UNKNOWN')),
    purpose       VARCHAR(50) NOT NULL CHECK (
        purpose IN (
            'GEMINI_CANDIDATE_EXTRACTION',
            'GEMINI_KEYWORD_EXPLAIN',
            'YOUTUBE_POPULAR_VIDEOS',
            'YOUTUBE_VIDEO_SEARCH',
            'YOUTUBE_VIDEO_DETAILS',
            'YOUTUBE_CHANNEL_DETAILS',
            'NAVER_TREND_SCORE',
            'WEBHOOK_CALLBACK',
            'UNKNOWN'
        )
    ),
    method        VARCHAR(10) NOT NULL,
    endpoint      VARCHAR(500) NOT NULL,
    http_status   INT,
    success       BOOLEAN NOT NULL,
    duration_ms   BIGINT NOT NULL,
    request_body  TEXT,
    response_body TEXT,
    error_message TEXT,
    started_at    TIMESTAMP NOT NULL,
    ended_at      TIMESTAMP NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_external_api_logs_started_at
    ON external_api_logs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_api_logs_provider_purpose_started_at
    ON external_api_logs (provider, purpose, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_api_logs_direction_started_at
    ON external_api_logs (direction, started_at DESC);

COMMENT ON COLUMN external_api_logs.id IS '외부 API 로그 고유 ID';
COMMENT ON COLUMN external_api_logs.direction IS '외부 API 흐름 방향(INBOUND, OUTBOUND)';
COMMENT ON COLUMN external_api_logs.provider IS '외부 API 제공자(YOUTUBE, NAVER_DATALAB, GEMINI 등)';
COMMENT ON COLUMN external_api_logs.purpose IS '외부 API 사용 목적';
COMMENT ON COLUMN external_api_logs.method IS 'HTTP 메서드';
COMMENT ON COLUMN external_api_logs.endpoint IS '호출 또는 수신 엔드포인트';
COMMENT ON COLUMN external_api_logs.http_status IS 'HTTP 응답 상태 코드';
COMMENT ON COLUMN external_api_logs.success IS '외부 API 처리 성공 여부';
COMMENT ON COLUMN external_api_logs.duration_ms IS '처리 소요 시간(ms)';
COMMENT ON COLUMN external_api_logs.request_body IS '마스킹 및 길이 제한이 적용된 요청 본문';
COMMENT ON COLUMN external_api_logs.response_body IS '마스킹 및 길이 제한이 적용된 응답 본문';
COMMENT ON COLUMN external_api_logs.error_message IS '실패 시 예외 또는 오류 메시지';
COMMENT ON COLUMN external_api_logs.started_at IS '외부 API 처리 시작 시각';
COMMENT ON COLUMN external_api_logs.ended_at IS '외부 API 처리 종료 시각';
COMMENT ON COLUMN external_api_logs.created_at IS '레코드 생성 시각';
