-- ========================================
-- 언어 모델 정보 테이블 (language_models)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE language_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    description TEXT,
    max_tokens INTEGER,
    temperature NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 코멘트 추가
COMMENT ON TABLE language_models IS '언어 모델 정보 테이블';
COMMENT ON COLUMN language_models.id IS '모델 ID (Primary Key)';
COMMENT ON COLUMN language_models.model_name IS '모델 이름 (고유값)';
COMMENT ON COLUMN language_models.provider IS '모델 제공업체';
COMMENT ON COLUMN language_models.description IS '모델 설명';
COMMENT ON COLUMN language_models.max_tokens IS '최대 토큰 수';
COMMENT ON COLUMN language_models.temperature IS '온도 파라미터';
COMMENT ON COLUMN language_models.is_active IS '활성화 여부';
COMMENT ON COLUMN language_models.created_at IS '생성 일시';
COMMENT ON COLUMN language_models.updated_at IS '수정 일시';
