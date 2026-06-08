-- ========================================
-- LLM 제공자 정보 테이블 (llm_provider)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE llm_provider (
    provider_id SERIAL PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    website VARCHAR(255),
    api_docs VARCHAR(255),
    logo_filename VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_available BOOLEAN NOT NULL DEFAULT true,

    -- 제약조건
    CONSTRAINT chk_llm_provider_name
        CHECK (provider_name != '')
);

-- 인덱스 생성
CREATE INDEX idx_llm_provider_name ON llm_provider(provider_name);
CREATE INDEX idx_llm_provider_is_available ON llm_provider(is_available)
    WHERE is_available = true;

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_llm_provider_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_llm_provider_timestamp
    BEFORE UPDATE ON llm_provider
    FOR EACH ROW
    EXECUTE FUNCTION update_llm_provider_timestamp();

-- 코멘트 추가
COMMENT ON TABLE llm_provider IS 'LLM 서비스 제공자 정보 테이블';
COMMENT ON COLUMN llm_provider.provider_id IS '제공자 고유 ID (Primary Key)';
COMMENT ON COLUMN llm_provider.provider_name IS '제공자 이름';
COMMENT ON COLUMN llm_provider.website IS '제공자 웹사이트 URL';
COMMENT ON COLUMN llm_provider.api_docs IS 'API 문서 URL';
COMMENT ON COLUMN llm_provider.logo_filename IS '로고 이미지 파일명 (/assets/llm-icon/ 기준)';
COMMENT ON COLUMN llm_provider.is_available IS 'LLM 제공자 사용 가능 여부';
COMMENT ON COLUMN llm_provider.created_at IS '생성 일시';
COMMENT ON COLUMN llm_provider.updated_at IS '수정 일시';
