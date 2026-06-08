-- ========================================
-- RAG 전처리 이력 테이블 (rag_preprocessing_history)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE rag_preprocessing_history (
    history_id SERIAL PRIMARY KEY,
    connection_id INTEGER NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    request_type VARCHAR(20) NOT NULL,
    rag_type INTEGER NOT NULL DEFAULT 0,
    db_type INTEGER NOT NULL DEFAULT 3,
    db_id VARCHAR(100) NOT NULL,
    api_key VARCHAR(255),
    request_url TEXT,
    request_payload JSONB,
    response_status INTEGER,
    response_body JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    request_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    request_completed_at TIMESTAMP WITH TIME ZONE,
    processing_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 제약조건
    CONSTRAINT fk_rag_preprocessing_connection_id
        FOREIGN KEY (connection_id) REFERENCES db_connections(connection_id) ON DELETE CASCADE,
    CONSTRAINT fk_rag_preprocessing_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE

    -- 체크 제약조건
    -- CONSTRAINT chk_request_type
    --     CHECK (request_type IN ('preprocess', 'status_check')),
    -- CONSTRAINT chk_status
    --     CHECK (status IN ('pending', 'processing', 'success', 'failed', 'timeout'))
);

-- 인덱스 생성
CREATE INDEX idx_rag_preprocessing_connection_id ON rag_preprocessing_history(connection_id);
CREATE INDEX idx_rag_preprocessing_user_id ON rag_preprocessing_history(user_id);
CREATE INDEX idx_rag_preprocessing_status ON rag_preprocessing_history(status);
CREATE INDEX idx_rag_preprocessing_request_type ON rag_preprocessing_history(request_type);
CREATE INDEX idx_rag_preprocessing_created_at ON rag_preprocessing_history(created_at DESC);
CREATE INDEX idx_rag_preprocessing_db_id ON rag_preprocessing_history(db_id);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_rag_preprocessing_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;

    -- 완료 시간 자동 설정
    IF NEW.status IN ('success', 'failed', 'timeout') AND OLD.status NOT IN ('success', 'failed', 'timeout') THEN
        NEW.request_completed_at = CURRENT_TIMESTAMP;

        -- 처리 소요 시간 계산 (밀리초)
        IF NEW.request_started_at IS NOT NULL THEN
            NEW.processing_duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.request_started_at)) * 1000;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rag_preprocessing_history_update
    BEFORE UPDATE ON rag_preprocessing_history
    FOR EACH ROW
    EXECUTE FUNCTION update_rag_preprocessing_history_timestamp();

-- 코멘트 추가
COMMENT ON TABLE rag_preprocessing_history IS 'RAG 전처리 요청 및 상태 이력 관리 테이블';
COMMENT ON COLUMN rag_preprocessing_history.history_id IS 'RAG 전처리 이력 ID (Primary Key)';
COMMENT ON COLUMN rag_preprocessing_history.connection_id IS 'DB 연결 ID (Foreign Key)';
COMMENT ON COLUMN rag_preprocessing_history.user_id IS '사용자 ID (Foreign Key)';
COMMENT ON COLUMN rag_preprocessing_history.request_type IS '요청 타입 (preprocess: 전처리 요청, status_check: 상태 확인)';
COMMENT ON COLUMN rag_preprocessing_history.rag_type IS 'RAG 타입 (RagType enum: 0=ALL, 1=SCHEMA, 2=DATA)';
COMMENT ON COLUMN rag_preprocessing_history.db_type IS '원본 DB 타입 (3: SQLite)';
COMMENT ON COLUMN rag_preprocessing_history.db_id IS '전처리할 원본 DB 식별자';
COMMENT ON COLUMN rag_preprocessing_history.api_key IS 'LLM API 인증키';
COMMENT ON COLUMN rag_preprocessing_history.request_url IS '실제 호출한 API URL';
COMMENT ON COLUMN rag_preprocessing_history.request_payload IS '전송한 요청 데이터 (JSON)';
COMMENT ON COLUMN rag_preprocessing_history.response_status IS 'HTTP 응답 코드';
COMMENT ON COLUMN rag_preprocessing_history.response_body IS '응답 본문 (JSON)';
COMMENT ON COLUMN rag_preprocessing_history.status IS '처리 상태';
COMMENT ON COLUMN rag_preprocessing_history.error_message IS '실패 시 에러 메시지';
COMMENT ON COLUMN rag_preprocessing_history.request_started_at IS '요청 시작 일시';
COMMENT ON COLUMN rag_preprocessing_history.request_completed_at IS '요청 완료 일시';
COMMENT ON COLUMN rag_preprocessing_history.processing_duration_ms IS '처리 소요 시간 (밀리초)';
