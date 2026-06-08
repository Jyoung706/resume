-- ========================================
-- 사용자별 등록 LLM 모델 테이블 (llm_user_models)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE llm_user_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    api_endpoint VARCHAR(500) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    api_version VARCHAR(20),
    parameters JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    connection_status VARCHAR(20) DEFAULT 'unknown',
    last_tested_at TIMESTAMP,
    last_error TEXT,
    total_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 제약조건
    CONSTRAINT fk_llm_user_models_user
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE,

    -- 유니크 제약조건
    CONSTRAINT unique_user_model_name_user_models
        UNIQUE (user_id, model_name)
);

-- 인덱스 생성
CREATE INDEX idx_llm_user_models_user_id ON llm_user_models(user_id);
CREATE INDEX idx_llm_user_models_provider ON llm_user_models(provider);
CREATE INDEX idx_llm_user_models_active ON llm_user_models(is_active)
    WHERE is_active = true;
CREATE INDEX idx_llm_user_models_default ON llm_user_models(user_id, is_default)
    WHERE is_default = true;
CREATE INDEX idx_llm_user_models_parameters ON llm_user_models USING GIN (parameters);

-- 공통 updated_at 갱신 함수 (다른 테이블에서도 사용)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_llm_user_models_updated_at
    BEFORE UPDATE ON llm_user_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 코멘트 추가
COMMENT ON TABLE llm_user_models IS '사용자별 등록 LLM 모델 설정';
COMMENT ON COLUMN llm_user_models.id IS '고유 ID (UUID)';
COMMENT ON COLUMN llm_user_models.user_id IS '사용자 ID (user_info.id 참조)';
COMMENT ON COLUMN llm_user_models.model_name IS '모델명 (API 호출 시 사용)';
COMMENT ON COLUMN llm_user_models.display_name IS '사용자 정의 표시명';
COMMENT ON COLUMN llm_user_models.provider IS 'LLM 제공사 (openai, anthropic 등)';
COMMENT ON COLUMN llm_user_models.model_type IS '모델 타입';
COMMENT ON COLUMN llm_user_models.api_endpoint IS 'API 엔드포인트 URL';
COMMENT ON COLUMN llm_user_models.api_key_encrypted IS 'AES-256 암호화된 API 키';
COMMENT ON COLUMN llm_user_models.api_version IS 'API 버전';
COMMENT ON COLUMN llm_user_models.parameters IS 'JSON 형식의 모델 파라미터';
COMMENT ON COLUMN llm_user_models.is_active IS '활성화 여부';
COMMENT ON COLUMN llm_user_models.is_default IS '기본 모델 여부';
COMMENT ON COLUMN llm_user_models.connection_status IS '마지막 연결 테스트 결과';
COMMENT ON COLUMN llm_user_models.last_tested_at IS '마지막 테스트 일시';
COMMENT ON COLUMN llm_user_models.last_error IS '마지막 에러 메시지';
COMMENT ON COLUMN llm_user_models.total_requests IS '총 요청 수';
COMMENT ON COLUMN llm_user_models.total_tokens IS '총 사용 토큰 수';
COMMENT ON COLUMN llm_user_models.last_used_at IS '마지막 사용 일시';
COMMENT ON COLUMN llm_user_models.created_at IS '생성 일시';
COMMENT ON COLUMN llm_user_models.updated_at IS '수정 일시';
