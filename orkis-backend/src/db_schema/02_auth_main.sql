-- ========================================
-- 권한 메인 테이블 (auth_main)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE auth_main (
    auth_code VARCHAR(10) PRIMARY KEY,
    auth_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    color_start VARCHAR(20),
    color_end VARCHAR(20),
    visible BOOLEAN DEFAULT true,
    selectable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 코멘트 추가
COMMENT ON TABLE auth_main IS '권한 정보 메인 테이블';
COMMENT ON COLUMN auth_main.auth_code IS '권한 코드 (Primary Key)';
COMMENT ON COLUMN auth_main.auth_name IS '권한 이름';
COMMENT ON COLUMN auth_main.description IS '권한 설명';
COMMENT ON COLUMN auth_main.icon IS '권한 아이콘';
COMMENT ON COLUMN auth_main.color_start IS '그라데이션 시작 색상';
COMMENT ON COLUMN auth_main.color_end IS '그라데이션 끝 색상';
COMMENT ON COLUMN auth_main.visible IS '표시 여부';
COMMENT ON COLUMN auth_main.selectable IS '선택 가능 여부';
COMMENT ON COLUMN auth_main.created_at IS '생성 일시';
COMMENT ON COLUMN auth_main.updated_at IS '수정 일시';
