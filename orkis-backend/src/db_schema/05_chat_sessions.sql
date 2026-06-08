-- ========================================
-- 채팅 세션 테이블 (chat_sessions)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE chat_sessions (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    title_modified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_favorite BOOLEAN DEFAULT false,

    -- 외래키 제약조건
    CONSTRAINT fk_chat_sessions_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX idx_chat_sessions_is_favorite ON chat_sessions(is_favorite DESC, updated_at DESC);

-- 코멘트 추가
COMMENT ON TABLE chat_sessions IS '채팅 세션 테이블';
COMMENT ON COLUMN chat_sessions.id IS '세션 ID (Primary Key)';
COMMENT ON COLUMN chat_sessions.title IS '채팅 세션 제목';
COMMENT ON COLUMN chat_sessions.user_id IS '사용자 ID (Foreign Key)';
COMMENT ON COLUMN chat_sessions.message_count IS '메시지 개수';
COMMENT ON COLUMN chat_sessions.last_message_at IS '마지막 메시지 시각';
COMMENT ON COLUMN chat_sessions.title_modified IS '사용자가 제목을 수정했는지 여부';
COMMENT ON COLUMN chat_sessions.created_at IS '생성 일시';
COMMENT ON COLUMN chat_sessions.updated_at IS '수정 일시';
COMMENT ON COLUMN chat_sessions.is_favorite IS '즐겨찾기 여부';
