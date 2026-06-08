-- ========================================
-- 공통코드 그룹 테이블 (code_group)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE code_group (
    group_id VARCHAR(50) PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    description TEXT,
    use_yn CHAR(1) DEFAULT 'Y',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),

    -- 체크 제약조건
    CONSTRAINT code_group_use_yn_check
        CHECK (use_yn IN ('Y', 'N'))
);

-- 인덱스 생성
CREATE INDEX idx_code_group_use_yn ON code_group(use_yn);
CREATE INDEX idx_code_group_display_order ON code_group(display_order);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_code_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_code_group_update
    BEFORE UPDATE ON code_group
    FOR EACH ROW
    EXECUTE FUNCTION update_code_group_timestamp();

-- 코멘트 추가
COMMENT ON TABLE code_group IS '공통코드 그룹 테이블';
COMMENT ON COLUMN code_group.group_id IS '코드 그룹 ID (Primary Key)';
COMMENT ON COLUMN code_group.group_name IS '코드 그룹 명';
COMMENT ON COLUMN code_group.description IS '코드 그룹 설명';
COMMENT ON COLUMN code_group.use_yn IS '사용 여부 (Y/N)';
COMMENT ON COLUMN code_group.display_order IS '표시 순서';
COMMENT ON COLUMN code_group.created_at IS '생성 일시';
COMMENT ON COLUMN code_group.updated_at IS '수정 일시';
COMMENT ON COLUMN code_group.created_by IS '생성자 ID';
COMMENT ON COLUMN code_group.updated_by IS '수정자 ID';
