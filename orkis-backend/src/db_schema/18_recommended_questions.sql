-- ========================================
-- 추천 질문 테이블 (recommended_questions)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE recommended_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_no VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    icon_path VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_recommended_questions_category ON recommended_questions(category);
CREATE INDEX idx_recommended_questions_type ON recommended_questions(question_type);
CREATE INDEX idx_recommended_questions_active ON recommended_questions(is_active);
CREATE INDEX idx_recommended_questions_sort_order ON recommended_questions(sort_order);

-- 코멘트 추가
COMMENT ON TABLE recommended_questions IS '추천 질문 정보';
COMMENT ON COLUMN recommended_questions.id IS '추천 질문 고유 ID (UUID)';
COMMENT ON COLUMN recommended_questions.question_no IS '질문 번호 (예: NO.152)';
COMMENT ON COLUMN recommended_questions.question IS '질문 내용';
COMMENT ON COLUMN recommended_questions.category IS '카테고리 (Knowledge, Image, Coding, Data, SQL 등)';
COMMENT ON COLUMN recommended_questions.question_type IS '질문 유형 구분';
COMMENT ON COLUMN recommended_questions.icon_path IS '아이콘 경로';
COMMENT ON COLUMN recommended_questions.sort_order IS '정렬 순서 (오름차순)';
COMMENT ON COLUMN recommended_questions.is_active IS '활성화 여부';
COMMENT ON COLUMN recommended_questions.view_count IS '조회수';
COMMENT ON COLUMN recommended_questions.created_at IS '생성일시';
COMMENT ON COLUMN recommended_questions.updated_at IS '수정일시';
