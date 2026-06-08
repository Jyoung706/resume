-- ========================================
-- LLM 모델 카탈로그 테이블 (llm_available_models)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE llm_available_models (
    model_id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_identifier VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    context_window INTEGER,
    max_output_tokens INTEGER,
    capabilities TEXT[],
    pricing_input VARCHAR(100),
    pricing_output VARCHAR(100),
    license VARCHAR(100),
    architecture VARCHAR(100),
    release_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 제약조건
    CONSTRAINT fk_llm_available_models_provider
        FOREIGN KEY (provider_id) REFERENCES llm_provider(provider_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    -- 유니크 제약조건
    CONSTRAINT unique_llm_available_models_identifier
        UNIQUE (provider_id, model_identifier),

    -- 체크 제약조건
    CONSTRAINT chk_llm_available_models_name
        CHECK (model_name != ''),
    CONSTRAINT chk_llm_available_models_context_window
        CHECK (context_window IS NULL OR context_window > 0),
    CONSTRAINT chk_llm_available_models_max_output_tokens
        CHECK (max_output_tokens IS NULL OR max_output_tokens > 0)
);

-- 인덱스 생성
CREATE INDEX idx_llm_available_models_provider ON llm_available_models(provider_id);
CREATE INDEX idx_llm_available_models_name ON llm_available_models(model_name);
CREATE INDEX idx_llm_available_models_identifier ON llm_available_models(model_identifier);
CREATE INDEX idx_llm_available_models_active ON llm_available_models(is_active);
CREATE INDEX idx_llm_available_models_capabilities ON llm_available_models USING GIN(capabilities);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_llm_available_models_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_llm_available_models_timestamp
    BEFORE UPDATE ON llm_available_models
    FOR EACH ROW
    EXECUTE FUNCTION update_llm_available_models_timestamp();

-- 코멘트 추가
COMMENT ON TABLE llm_available_models IS '시스템 공용 LLM 모델 카탈로그';
COMMENT ON COLUMN llm_available_models.model_id IS '모델 고유 ID (Primary Key)';
COMMENT ON COLUMN llm_available_models.provider_id IS 'LLM 제공자 ID (Foreign Key)';
COMMENT ON COLUMN llm_available_models.model_name IS '모델 이름';
COMMENT ON COLUMN llm_available_models.model_identifier IS '모델 식별자 (API에서 사용하는 ID)';
COMMENT ON COLUMN llm_available_models.version IS '모델 버전';
COMMENT ON COLUMN llm_available_models.context_window IS '컨텍스트 윈도우 크기 (토큰 수)';
COMMENT ON COLUMN llm_available_models.max_output_tokens IS '최대 출력 토큰 수';
COMMENT ON COLUMN llm_available_models.capabilities IS '모델 기능 목록 배열 (text, vision, audio 등)';
COMMENT ON COLUMN llm_available_models.pricing_input IS '입력 토큰 가격 정보';
COMMENT ON COLUMN llm_available_models.pricing_output IS '출력 토큰 가격 정보';
COMMENT ON COLUMN llm_available_models.license IS '라이선스 정보';
COMMENT ON COLUMN llm_available_models.architecture IS '모델 아키텍처 정보';
COMMENT ON COLUMN llm_available_models.release_date IS '모델 출시일';
COMMENT ON COLUMN llm_available_models.is_active IS '활성화 상태';
COMMENT ON COLUMN llm_available_models.created_at IS '생성 일시';
COMMENT ON COLUMN llm_available_models.updated_at IS '수정 일시';
