ALTER TABLE external_api_logs
    ADD COLUMN IF NOT EXISTS request_metadata JSONB,
    ADD COLUMN IF NOT EXISTS response_metadata JSONB;

COMMENT ON COLUMN external_api_logs.request_metadata IS '검색 및 집계가 가능한 구조화된 요청 메타데이터(JSON)';
COMMENT ON COLUMN external_api_logs.response_metadata IS '검색 및 집계가 가능한 구조화된 응답 메타데이터(JSON)';
