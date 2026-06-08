-- ========================================
-- 채팅 타입 테이블 (chat_types)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE chat_types (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 코멘트 추가
COMMENT ON TABLE chat_types IS '채팅 타입 테이블';
COMMENT ON COLUMN chat_types.id IS 'ID (Primary Key)';
COMMENT ON COLUMN chat_types.type_name IS '타입 이름 (고유값)';
COMMENT ON COLUMN chat_types.description IS '타입 설명';
COMMENT ON COLUMN chat_types.icon IS '아이콘';
COMMENT ON COLUMN chat_types.is_active IS '활성화 여부';
COMMENT ON COLUMN chat_types.created_at IS '생성 일시';
COMMENT ON COLUMN chat_types.updated_at IS '수정 일시';
