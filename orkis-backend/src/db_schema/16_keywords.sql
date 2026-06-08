-- ========================================
-- 키워드 테이블 (keywords)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'custom',
    category VARCHAR(50),
    user_id VARCHAR(50),
    knowledge_base_id VARCHAR(100),
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 제약 조건
    -- CONSTRAINT chk_keywords_type
    --     CHECK (type IN ('frequent', 'recommended', 'custom')),
    -- CONSTRAINT chk_keywords_category
    --     CHECK (category IS NULL OR category IN ('finance', 'aml', 'compliance', 'risk', 'customer', 'transaction', 'reporting', 'general')),
    -- CONSTRAINT chk_keywords_text_length
    --     CHECK (char_length(text) >= 1 AND char_length(text) <= 100),
    -- CONSTRAINT chk_keywords_usage_count
    --     CHECK (usage_count >= 0),

    -- 외래키 제약조건
    CONSTRAINT fk_keywords_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_keywords_user_id ON keywords(user_id);
CREATE INDEX idx_keywords_type ON keywords(type);
CREATE INDEX idx_keywords_category ON keywords(category);
CREATE INDEX idx_keywords_knowledge_base_id ON keywords(knowledge_base_id);
CREATE INDEX idx_keywords_usage_count ON keywords(usage_count DESC);
CREATE INDEX idx_keywords_created_at ON keywords(created_at DESC);
CREATE INDEX idx_keywords_text_search ON keywords USING gin(to_tsvector('simple', text));
CREATE INDEX idx_keywords_type_usage ON keywords(type, usage_count DESC);

-- 유니크 제약 (같은 사용자가 같은 텍스트로 중복 키워드 생성 방지)
CREATE UNIQUE INDEX idx_keywords_unique_user_text ON keywords(user_id, LOWER(text))
    WHERE user_id IS NOT NULL;

-- 유니크 제약 (같은 텍스트의 시스템 키워드는 하나만 존재)
CREATE UNIQUE INDEX idx_keywords_unique_system_text ON keywords(LOWER(text))
    WHERE user_id IS NULL;

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_keywords_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_keywords_update
    BEFORE UPDATE ON keywords
    FOR EACH ROW
    EXECUTE FUNCTION update_keywords_timestamp();

-- 코멘트 추가
COMMENT ON TABLE keywords IS '키워드 힌트 관리 테이블 (AI 질의 시 사용)';
COMMENT ON COLUMN keywords.id IS '키워드 고유 ID (UUID, Primary Key)';
COMMENT ON COLUMN keywords.text IS '키워드 텍스트 (최대 100자)';
COMMENT ON COLUMN keywords.type IS '키워드 타입 (frequent: 자주 사용, recommended: 추천, custom: 사용자 정의)';
COMMENT ON COLUMN keywords.category IS '키워드 카테고리';
COMMENT ON COLUMN keywords.user_id IS '사용자 ID (NULL이면 시스템 키워드)';
COMMENT ON COLUMN keywords.knowledge_base_id IS '연관된 지식베이스 ID';
COMMENT ON COLUMN keywords.usage_count IS '전체 사용 횟수';
COMMENT ON COLUMN keywords.created_at IS '생성일시';
COMMENT ON COLUMN keywords.updated_at IS '수정일시';
