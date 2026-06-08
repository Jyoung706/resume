-- ========================================
-- 공지사항 테이블 (notices)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE notices (
    notice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'notice',
    author_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    display_order INTEGER NOT NULL DEFAULT 0
);

-- 인덱스 생성
CREATE INDEX idx_notices_type ON notices(type);
CREATE INDEX idx_notices_is_active ON notices(is_active);
CREATE INDEX idx_notices_created_at ON notices(created_at DESC);
CREATE INDEX idx_notices_display_order ON notices(display_order DESC);

-- 코멘트 추가
COMMENT ON TABLE notices IS '공지사항 정보';
COMMENT ON COLUMN notices.notice_id IS '공지사항 고유 ID (UUID)';
COMMENT ON COLUMN notices.title IS '공지사항 제목';
COMMENT ON COLUMN notices.content IS '공지사항 내용 (HTML 지원)';
COMMENT ON COLUMN notices.type IS '공지사항 유형 (notice, update, event, maintenance)';
COMMENT ON COLUMN notices.author_id IS '작성자 ID';
COMMENT ON COLUMN notices.author_name IS '작성자 이름';
COMMENT ON COLUMN notices.is_active IS '활성화 여부';
COMMENT ON COLUMN notices.created_at IS '생성일시';
COMMENT ON COLUMN notices.updated_at IS '수정일시';
COMMENT ON COLUMN notices.display_order IS '표시 순서 (내림차순)';
