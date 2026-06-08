-- ========================================
-- LLM 연결 테스트 로그 테이블 (llm_connection_logs)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE llm_connection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    llm_model_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    test_result VARCHAR(20) NOT NULL,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 제약조건
    CONSTRAINT fk_llm_connection_logs_model
        FOREIGN KEY (llm_model_id) REFERENCES llm_user_models(id) ON DELETE CASCADE,
    CONSTRAINT fk_llm_connection_logs_user
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_llm_connection_logs_model ON llm_connection_logs(llm_model_id, created_at DESC);
CREATE INDEX idx_llm_connection_logs_user ON llm_connection_logs(user_id, created_at DESC);
CREATE INDEX idx_llm_connection_logs_result ON llm_connection_logs(test_result, created_at DESC);

-- 코멘트 추가
COMMENT ON TABLE llm_connection_logs IS 'LLM 모델 연결 테스트 로그';
COMMENT ON COLUMN llm_connection_logs.id IS '고유 ID (UUID)';
COMMENT ON COLUMN llm_connection_logs.llm_model_id IS 'LLM 사용자 모델 ID (llm_user_models 테이블 참조)';
COMMENT ON COLUMN llm_connection_logs.user_id IS '사용자 ID';
COMMENT ON COLUMN llm_connection_logs.test_type IS '테스트 타입 (manual, auto, system)';
COMMENT ON COLUMN llm_connection_logs.test_result IS '테스트 결과 (success, failure, timeout)';
COMMENT ON COLUMN llm_connection_logs.response_time_ms IS '응답 시간 (밀리초)';
COMMENT ON COLUMN llm_connection_logs.status_code IS 'HTTP 상태 코드';
COMMENT ON COLUMN llm_connection_logs.error_message IS '에러 메시지';
COMMENT ON COLUMN llm_connection_logs.ip_address IS '클라이언트 IP 주소';
COMMENT ON COLUMN llm_connection_logs.user_agent IS 'User Agent 정보';
COMMENT ON COLUMN llm_connection_logs.created_at IS '생성 일시';
