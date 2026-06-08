-- ========================================
-- DB 타입 테이블 (db_types)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE db_types (
    db_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    default_port INTEGER,
    driver_class VARCHAR(255),
    connection_string_template VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(50),
    logo_url TEXT,
    color VARCHAR(7),
    features JSONB,
    use_cases JSONB,
    popularity INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0
);

-- 인덱스 생성
CREATE INDEX idx_db_types_type_name ON db_types(type_name);
CREATE INDEX idx_db_types_is_active ON db_types(is_active);
CREATE INDEX idx_db_types_category ON db_types(category);
CREATE INDEX idx_db_types_popularity ON db_types(popularity DESC);
CREATE INDEX idx_db_types_display_order ON db_types(display_order);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_db_types_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_db_types_update
    BEFORE UPDATE ON db_types
    FOR EACH ROW
    EXECUTE FUNCTION update_db_types_timestamp();

-- 코멘트 추가
COMMENT ON TABLE db_types IS '지원 데이터베이스 타입 테이블';
COMMENT ON COLUMN db_types.db_type_id IS 'DB 타입 ID (Primary Key)';
COMMENT ON COLUMN db_types.type_name IS 'DB 타입 이름 (고유값)';
COMMENT ON COLUMN db_types.display_name IS '화면 표시용 이름';
COMMENT ON COLUMN db_types.default_port IS '기본 포트 번호';
COMMENT ON COLUMN db_types.driver_class IS 'JDBC 드라이버 클래스명';
COMMENT ON COLUMN db_types.connection_string_template IS '연결 문자열 템플릿';
COMMENT ON COLUMN db_types.description IS '설명';
COMMENT ON COLUMN db_types.is_active IS '사용 가능 여부';
COMMENT ON COLUMN db_types.created_at IS '생성 일시';
COMMENT ON COLUMN db_types.updated_at IS '수정 일시';
COMMENT ON COLUMN db_types.category IS 'DB 카테고리';
COMMENT ON COLUMN db_types.logo_url IS '로고 이미지 URL';
COMMENT ON COLUMN db_types.color IS '테마 색상 (Hex)';
COMMENT ON COLUMN db_types.features IS '기능 목록 (JSON)';
COMMENT ON COLUMN db_types.use_cases IS '사용 사례 (JSON)';
COMMENT ON COLUMN db_types.popularity IS '인기도 (정렬용)';
COMMENT ON COLUMN db_types.display_order IS '화면 표시 순서';
