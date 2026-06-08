-- ========================================
-- 메뉴 정보 테이블 (menu_info)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE menu_info (
    menu_id VARCHAR(50) PRIMARY KEY,
    parent_menu_id VARCHAR(50),
    menu_name VARCHAR(100) NOT NULL,
    menu_path VARCHAR(200),
    menu_icon VARCHAR(50),
    menu_order INTEGER DEFAULT 0,
    is_use CHAR(1) DEFAULT 'Y',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 제약조건 (자기 참조)
    CONSTRAINT fk_menu_info_parent
        FOREIGN KEY (parent_menu_id) REFERENCES menu_info(menu_id),

    -- 체크 제약조건
    CONSTRAINT chk_menu_info_is_use
        CHECK (is_use IN ('Y', 'N'))
);

-- 인덱스 생성
CREATE INDEX idx_menu_info_order ON menu_info(menu_order);
CREATE INDEX idx_menu_info_parent ON menu_info(parent_menu_id);

-- 코멘트 추가
COMMENT ON TABLE menu_info IS '메뉴 정보 테이블';
COMMENT ON COLUMN menu_info.menu_id IS '메뉴 ID (Primary Key)';
COMMENT ON COLUMN menu_info.parent_menu_id IS '상위 메뉴 ID (Foreign Key, Self Reference)';
COMMENT ON COLUMN menu_info.menu_name IS '메뉴 이름';
COMMENT ON COLUMN menu_info.menu_path IS '메뉴 경로';
COMMENT ON COLUMN menu_info.menu_icon IS '메뉴 아이콘';
COMMENT ON COLUMN menu_info.menu_order IS '메뉴 정렬 순서';
COMMENT ON COLUMN menu_info.is_use IS '사용 여부 (Y/N)';
COMMENT ON COLUMN menu_info.created_at IS '생성 일시';
COMMENT ON COLUMN menu_info.updated_at IS '수정 일시';
