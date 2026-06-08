-- ========================================
-- 스키마 버전 테이블 (schema_versions)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE schema_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 코멘트 추가
COMMENT ON TABLE schema_versions IS '데이터베이스 스키마 버전 관리 테이블';
COMMENT ON COLUMN schema_versions.id IS '고유 ID (Primary Key)';
COMMENT ON COLUMN schema_versions.version IS '스키마 버전';
COMMENT ON COLUMN schema_versions.description IS '버전 설명';
COMMENT ON COLUMN schema_versions.applied_at IS '적용 일시';
