-- ========================================
-- 고객 문의 티켓 테이블 (support_tickets)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    title VARCHAR(200) NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status_code VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    priority_code VARCHAR(50) DEFAULT 'NORMAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    has_answer BOOLEAN DEFAULT false,
    answer TEXT,
    answered_by VARCHAR(50),
    answered_by_name VARCHAR(100),
    answered_at TIMESTAMP WITH TIME ZONE,
    attachments JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    view_count INTEGER DEFAULT 0
);

-- 인덱스 생성
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status_code);
CREATE INDEX idx_support_tickets_category ON support_tickets(category_code);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority_code);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_user_status ON support_tickets(user_id, status_code);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_tickets_updated_at();

-- 코멘트 추가
COMMENT ON TABLE support_tickets IS '고객 문의 티켓 관리 테이블';
COMMENT ON COLUMN support_tickets.id IS '문의 고유 ID (UUID)';
COMMENT ON COLUMN support_tickets.user_id IS '문의 작성자 사용자 ID';
COMMENT ON COLUMN support_tickets.user_name IS '작성자 이름';
COMMENT ON COLUMN support_tickets.user_email IS '작성자 이메일';
COMMENT ON COLUMN support_tickets.title IS '문의 제목';
COMMENT ON COLUMN support_tickets.category_code IS '문의 카테고리 코드 (공통코드: TICKET_CATEGORY)';
COMMENT ON COLUMN support_tickets.description IS '문의 내용';
COMMENT ON COLUMN support_tickets.status_code IS '문의 처리 상태 코드 (공통코드: TICKET_STATUS)';
COMMENT ON COLUMN support_tickets.priority_code IS '문의 우선순위 코드 (공통코드: TICKET_PRIORITY)';
COMMENT ON COLUMN support_tickets.has_answer IS '답변 존재 여부';
COMMENT ON COLUMN support_tickets.answer IS '답변 내용';
COMMENT ON COLUMN support_tickets.answered_by IS '답변자 ID';
COMMENT ON COLUMN support_tickets.answered_by_name IS '답변자 이름';
COMMENT ON COLUMN support_tickets.answered_at IS '답변 일시';
COMMENT ON COLUMN support_tickets.attachments IS '첨부파일 정보 (JSONB)';
COMMENT ON COLUMN support_tickets.tags IS '태그 배열';
COMMENT ON COLUMN support_tickets.view_count IS '조회수';
