-- ========================================
-- 도움말 항목 테이블 (help_items)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE help_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_help_items_category ON help_items(category_code);
CREATE INDEX idx_help_items_active ON help_items(is_active);
CREATE INDEX idx_help_items_sort_order ON help_items(sort_order);

-- 코멘트 추가
COMMENT ON TABLE help_items IS '도움말 항목 정보 (질문/답변)';
COMMENT ON COLUMN help_items.id IS '도움말 항목 고유 ID (UUID)';
COMMENT ON COLUMN help_items.category_code IS '카테고리 코드 (공통코드 참조: HELP_CATEGORY)';
COMMENT ON COLUMN help_items.question IS '질문 내용';
COMMENT ON COLUMN help_items.answer IS '답변 내용';
COMMENT ON COLUMN help_items.sort_order IS '정렬 순서 (오름차순)';
COMMENT ON COLUMN help_items.is_active IS '활성화 여부';
COMMENT ON COLUMN help_items.view_count IS '조회수';
COMMENT ON COLUMN help_items.created_at IS '생성일시';
COMMENT ON COLUMN help_items.updated_at IS '수정일시';
