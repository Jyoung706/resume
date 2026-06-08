-- ========================================
-- 공통코드 상세 테이블 (code_detail)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE code_detail (
    group_id VARCHAR(50) NOT NULL,
    code_id VARCHAR(50) NOT NULL,
    code_name VARCHAR(100) NOT NULL,
    code_name_en VARCHAR(100),
    description TEXT,
    use_yn CHAR(1) DEFAULT 'Y',
    display_order INTEGER DEFAULT 0,
    attr1 VARCHAR(100),
    attr2 VARCHAR(100),
    attr3 VARCHAR(100),
    attr4 VARCHAR(100),
    attr5 VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),

    -- 복합 기본키
    PRIMARY KEY (group_id, code_id),

    -- 외래키 제약조건
    CONSTRAINT fk_code_group
        FOREIGN KEY (group_id) REFERENCES code_group(group_id) ON DELETE CASCADE,

    -- 체크 제약조건
    CONSTRAINT code_detail_use_yn_check
        CHECK (use_yn IN ('Y', 'N'))
);

-- 인덱스 생성
CREATE INDEX idx_code_detail_use_yn ON code_detail(use_yn);
CREATE INDEX idx_code_detail_display_order ON code_detail(group_id, display_order);
CREATE INDEX idx_code_detail_code_id ON code_detail(code_id);
CREATE INDEX idx_code_detail_code_name ON code_detail(code_name);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_code_detail_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_code_detail_update
    BEFORE UPDATE ON code_detail
    FOR EACH ROW
    EXECUTE FUNCTION update_code_detail_timestamp();

-- 코멘트 추가
COMMENT ON TABLE code_detail IS '공통코드 상세 테이블';
COMMENT ON COLUMN code_detail.group_id IS '코드 그룹 ID (FK, PK)';
COMMENT ON COLUMN code_detail.code_id IS '코드 ID (PK)';
COMMENT ON COLUMN code_detail.code_name IS '코드 명 (한글)';
COMMENT ON COLUMN code_detail.code_name_en IS '코드 명 (영문)';
COMMENT ON COLUMN code_detail.description IS '코드 설명';
COMMENT ON COLUMN code_detail.use_yn IS '사용 여부 (Y/N)';
COMMENT ON COLUMN code_detail.display_order IS '표시 순서';
COMMENT ON COLUMN code_detail.attr1 IS '확장 속성 1 (예: 색상 코드, 아이콘)';
COMMENT ON COLUMN code_detail.attr2 IS '확장 속성 2';
COMMENT ON COLUMN code_detail.attr3 IS '확장 속성 3';
COMMENT ON COLUMN code_detail.attr4 IS '확장 속성 4';
COMMENT ON COLUMN code_detail.attr5 IS '확장 속성 5';
COMMENT ON COLUMN code_detail.created_at IS '생성 일시';
COMMENT ON COLUMN code_detail.updated_at IS '수정 일시';
COMMENT ON COLUMN code_detail.created_by IS '생성자 ID';
COMMENT ON COLUMN code_detail.updated_by IS '수정자 ID';
