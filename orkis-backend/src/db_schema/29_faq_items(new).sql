-- ========================================
-- FAQ 항목 테이블 (faq_items)
-- 최종 수정: 2026-04-14
-- 카테고리: 공통코드 TICKET_CATEGORY 참조
-- ========================================

CREATE TABLE faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_faq_items_category ON faq_items(category_code);
CREATE INDEX idx_faq_items_active ON faq_items(is_active);
CREATE INDEX idx_faq_items_pinned ON faq_items(is_pinned);
CREATE INDEX idx_faq_items_sort_order ON faq_items(sort_order);

-- 코멘트 추가
COMMENT ON TABLE faq_items IS 'FAQ 자주 묻는 질문 항목 (질문/답변)';
COMMENT ON COLUMN faq_items.id IS 'FAQ 항목 고유 ID (UUID)';
COMMENT ON COLUMN faq_items.category_code IS '카테고리 코드 (공통코드 참조: TICKET_CATEGORY)';
COMMENT ON COLUMN faq_items.question IS '질문 내용';
COMMENT ON COLUMN faq_items.answer IS '답변 내용';
COMMENT ON COLUMN faq_items.is_pinned IS '상단 고정 여부';
COMMENT ON COLUMN faq_items.sort_order IS '정렬 순서 (오름차순)';
COMMENT ON COLUMN faq_items.is_active IS '활성화 여부';
COMMENT ON COLUMN faq_items.view_count IS '조회수';
COMMENT ON COLUMN faq_items.created_at IS '생성일시';
COMMENT ON COLUMN faq_items.updated_at IS '수정일시';

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_faq_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_faq_items_updated_at
    BEFORE UPDATE ON faq_items
    FOR EACH ROW
    EXECUTE FUNCTION update_faq_items_updated_at();
